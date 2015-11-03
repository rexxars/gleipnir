'use strict';

var logger = require('./util/noop-logger');

module.exports = {
    url: 'amqp://localhost',

    reconnect: {
        limit: 5,
        timeout: 50
    },

    socket: {
        timeout: 1000
    },

    assert: {
        queues: [],
        exchanges: [],
        binds: []
    },

    log: logger
};
