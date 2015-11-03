'use strict';

var noopLogger = require('./noop-logger');
var levels = Object.keys(noopLogger);

module.exports = function assertLogger(logger) {
    levels.forEach(function(level) {
        if (typeof logger[level] !== 'function') {
            throw new TypeError(
                'Invalid logger passed, must be compatible with bunyan log levels' +
                ' (' + levels.join(', ') + ') - missing `' + level + '()`'
            );
        }
    });

    return logger;
};
