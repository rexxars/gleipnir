'use strict';

var parseUrl = require('url').parse;
var merge = require('lodash.merge');

module.exports = function assertUrl(url) {
    if (typeof url === 'string') {
        url = parseUrl(url);

        ['protocol', 'hostname'].forEach(function(param) {
            if (!url[param]) {
                throw new Error('Invalid connection string given. No ' + param + ' given.');
            }
        });
    }

    if (typeof url !== 'object') {
        throw new TypeError('`options.url` must be a valid AMQP connection URL or an object of connection details');
    }

    var uri = merge({}, {
        hostname: 'localhost',
        port: url.protocol === 'amqp:' ? 5672 : 5671
    }, url);

    if (uri.auth) {
        var auth = uri.auth.split(':', 2);
        uri.username = auth[0];
        uri.password = auth[1];
    }

    uri.protocol = uri.protocol.replace(/:$/, '');

    return uri;
};
