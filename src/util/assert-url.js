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

    if (url.pathname !== '/' && !url.vhost) {
        url.vhost = url.pathname;
    }

    if (typeof url !== 'object') {
        throw new TypeError('`options.url` must be a valid AMQP connection URL or an object of connection details');
    }

    if (url.host && !url.hostname) {
        url = merge({}, url);
        url.hostname = url.host;
        delete url.host;
    }

    var uri = merge({
        hostname: 'localhost'
    }, url, {
        port: parseInt(url.port || (url.protocol === 'amqps:' ? 5671 : 5672), 10)
    });

    if (uri.auth) {
        var auth = uri.auth.split(':', 2);
        uri.username = auth[0];
        uri.password = auth[1];
    }

    uri.protocol = uri.protocol.replace(/:$/, '');

    return uri;
};
