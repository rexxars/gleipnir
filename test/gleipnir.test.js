'use strict';

var assert = require('assert');
var mocha = require('mocha');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var pkg = require('../package.json');

var beforeEach = mocha.beforeEach;
var describe = mocha.describe;
var it = mocha.it;

describe(pkg.name, function() {
    var connectionStubs = {}, channelStubs = {}, connectStub, assertStub;

    beforeEach(function() {
        assertStub = sinon.stub().yieldsAsync();

        channelStubs.close = sinon.stub();
        channelStubs.assertQueue = sinon.stub().yieldsAsync();
        channelStubs.assertExchange = sinon.stub().yieldsAsync();
        channelStubs.bindQueue = sinon.stub().yieldsAsync();

        connectionStubs.createChannel = sinon.stub().yieldsAsync(null, channelStubs);
        connectionStubs.close = sinon.stub();
    });

    it('can be called without options/callback', function(done) {
        getGleipnir()(function() {
            sinon.assert.callCount(connectionStubs.createChannel, 1);
            done();
        });
    });

    it('can be called with callback only', function(done) {
        getGleipnir()(function() {
            sinon.assert.callCount(connectionStubs.createChannel, 1);
            done();
        });
    });

    it('can be called with connect URL as string', function(done) {
        getGleipnir()('amqp://foo', function() {
            sinon.assert.callCount(connectionStubs.createChannel, 1);
            sinon.assert.calledWith(connectStub, sinon.match(function(conn) {
                return conn.hostname === 'foo';
            }));
            done();
        });
    });

    it('calls back with error should channel creation fail', function(done) {
        connectionStubs.createChannel = sinon.stub().yieldsAsync(new Error('Channel creation failed'));
        getGleipnir(connectionStubs)(function(err) {
            assert.equal(err && err.message, 'Channel creation failed');
            done();
        });
    });

    it('retries connect on failure then yields with connect failure', function(done) {
        connectStub = sinon.stub().yieldsAsync(new Error('connect failure'));
        var gleipnir = getGleipnir(connectionStubs, channelStubs, connectStub);

        gleipnir({ reconnect: { limit: 3, timeout: 1 } }, function(err) {
            assert.equal(
                err && err.message,
                'Failed to connect to amqp://localhost after 3 attempts - giving up. Last error: connect failure'
            );

            sinon.assert.callCount(connectStub, 4);
            done();
        });
    });

    it('asserts and binds if given in options', function(done) {
        var gleip = getGleipnir();
        var assertStuff = { queues: ['foo'] };
        gleip({
            assert: assertStuff
        }, function(err) {
            assert(!err);
            sinon.assert.callCount(assertStub, 1);
            sinon.assert.calledWith(
                assertStub,
                sinon.match.same(channelStubs),
                sinon.match(function(obj) {
                    return obj.queues && obj.queues.length === 1 && obj.queues[0] === 'foo';
                })
            );
            done();
        });
    });

    it('calls ready-listeners at once if the client is already ready', function(done) {
        assertStub = sinon.stub().yields();
        connectionStubs.createChannel = sinon.stub().yields(null, channelStubs);
        channelStubs.assertQueue = sinon.stub().yields();
        channelStubs.assertExchange = sinon.stub().yields();
        channelStubs.bindQueue = sinon.stub().yields();
        connectStub = sinon.stub().yields(null, connectionStubs);

        var callCount = 0;
        var gleip = getGleipnir(connectionStubs, channelStubs, connectStub)();

        var incCallCount = function() {
            callCount++;
        };

        for (var i = 0; i < 3; i++) {
            gleip.addReadyListener(incCallCount);
        }

        process.nextTick(function() {
            assert.equal(3, callCount);
            done();
        });
    });

    it('calls ready-listeners when the client is ready', function(done) {
        var callCount = 0;
        var gleip = getGleipnir()(function() {
            assert.equal(3, callCount);
            done();
        });

        var incCallCount = function() {
            callCount++;
        };

        for (var i = 0; i < 3; i++) {
            gleip.addReadyListener(incCallCount);
        }
    });

    it('can be queried for connection status', function(done) {
        var gleip = getGleipnir()(function() {
            assert.equal(true, gleip.isConnected());
            done();
        });

        assert.equal(false, gleip.isConnected());
    });

    function getGleipnir(connStubs, chanStubs, amqpConnectStub) {
        connectStub = amqpConnectStub || sinon.stub().yieldsAsync(null, connStubs || connectionStubs);

        return proxyquire('../', {
            'amqplib/callback_api': {
                connect: connectStub
            },
            'gleipnir-assert': assertStub
        });
    }
});
