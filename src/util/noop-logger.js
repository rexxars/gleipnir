'use strict';

var levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
var noop = function() { };

module.exports = levels.reduce(function(log, level) {
    log[level] = noop;
    return log;
}, {});
