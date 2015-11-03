'use strict';

var gleipnir = require('../');
var bunyan = require('bunyan');
var log = bunyan.createLogger({ name: 'gleipnir' });

var client = gleipnir({
    log: log
}, function(err) {
    if (err) {
        throw err;
    }

    client.close();
});
