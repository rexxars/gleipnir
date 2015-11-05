'use strict';

var url = require('url');
var util = require('util');
var amqp = require('amqplib/callback_api');
var merge = require('lodash.merge');
var runOnce = require('lodash.once');
var assert = require('gleipnir-assert');

var assertUrl = require('./util/assert-url');
var assertLogger = require('./util/assert-logger');
var clientDefaults = require('./defaults');

function Gleipnir(opts, callback) {
    if (typeof opts === 'function' && !callback) {
        callback = opts;
        opts = {};
    }

    if (typeof opts === 'string') {
        opts = { url: opts };
    }

    // Ensure we're only calling `callback` once (in case of reconnect failure etc)
    callback = runOnce(callback || function() {});

    // Merge in all the options
    var options = merge({}, clientDefaults, opts);

    // Ensure we have a valid URL and logger
    options.url = assertUrl(options.url);
    options.log = assertLogger(options.log);

    // Listeners
    var listeners = {
        ready: []
    };

    // Instance variables
    var connection, channel, isReady = false;

    // Connection state
    var state = resetConnectionState({});
    var reconnectTimer;

    // Choo-choo!
    connect();

    return {
        connect: connect,
        close: close,
        isConnected: isConnected,
        addReadyListener: addReadyListener
    };

    function connect() {
        state.connecting = true;
        state.closing = false;
        state.closed = false;

        options.log.debug('Attempting to connect to AMQP (%s)', options.url);
        amqp.connect(options.url, options.socket, onConnect);
    }

    function onConnect(err, conn) {
        if (err) {
            return onConnectFailure(err);
        }

        options.log.debug('Connection to AMQP established successfully');
        connection = conn;

        state = resetConnectionState(state);
        state.connected = true;

        createChannel();
    }

    function onChannelCreated(err, chan) {
        if (err) {
            return onChannelCreationFailed(err);
        } else if (state.closing) {
            return null;
        }

        options.log.debug('AMQP channel created');

        channel = chan;
        assertAndBind();
    }

    function onChannelCreationFailed(err) {
        options.log.error('Failed to create channel (%s)', err.message);

        close();
        callback(err);
    }

    function onConnectFailure(err) {
        clearTimeout(reconnectTimer);

        if (state.closing || state.closed) {
            return;
        } else if (state.reconnectAttempts >= options.reconnect.limit) {
            var errMsg = util.format(
                'Failed to connect to %s after %d attempts - giving up. Last error: %s',
                url.format(options.url),
                state.reconnectAttempts,
                err.message
            );

            options.log.error(errMsg);

            close();
            callback(new Error(errMsg));
            return;
        }

        state.reconnectAttempts++;
        state.reconnectTimeout *= 2;

        options.log.warn(
            'Failed to connect to %s (%s), retrying after %d ms (attempt #%d)',
            url.format(options.url),
            err.message,
            state.reconnectTimeout,
            state.reconnectAttempts
        );

        reconnectTimer = setTimeout(connectIfNotClosed, state.reconnectTimeout);
    }

    function connectIfNotClosed() {
        if (!state.closed) {
            connect();
        }
    }

    function createChannel() {
        if (state.closing) {
            return;
        }

        options.log.debug('Setting up AMQP channel');
        connection.createChannel(onChannelCreated);
    }

    function close() {
        options.log.debug('Closing connection');
        state.closing = true;

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        if (channel) {
            channel.close(function() {
                connection.close();
            });
        } else if (connection) {
            connection.close();
        }

        state.closed = true;
    }

    function resetConnectionState(connState) {
        connState.connected = false;
        connState.connecting = false;
        connState.publishing = false;
        connState.reconnectAttempts = 0;
        connState.reconnectTimeout = options.reconnect.timeout;
        return connState;
    }

    function assertAndBind() {
        var shouldAssert = Object.keys(options.assert).some(function(type) {
            return options.assert[type].length > 0;
        });

        if (!shouldAssert) {
            options.log.debug('Nothing to assert based on configuration');
            onReady();
            return;
        }

        options.log.debug('Found items to assert, calling `gleipnir-assert`');
        assert(channel, options.assert, onReady);
    }

    function onReady(err) {
        if (err) {
            return callback(err);
        }

        isReady = true;

        while (listeners.ready.length) {
            var listener = listeners.ready.shift();
            listener(channel, connection);
        }

        callback(null, channel, connection);
    }

    function addReadyListener(listener) {
        // Are we already in ready state?
        if (isReady) {
            return process.nextTick(function() {
                listener(channel, connection);
            });
        }

        listeners.ready.push(listener);
    }

    function isConnected() {
        return state.connected;
    }
}

module.exports = Gleipnir;
