'use strict';

var assert = require('assert');
var mocha = require('mocha');
var pkg = require('../package.json');

var assertLogger = require('../src/util/assert-logger');
var assertUrl = require('../src/util/assert-url');
var noopLogger = require('../src/util/noop-logger');

var describe = mocha.describe;
var it = mocha.it;
var undef;

describe(pkg.name + ' utils', function() {
    describe('logger asserter', function() {
        it('throws on invalid logger', function() {
            assert.throws(function() {
                assertLogger({});
            }, /Invalid logger/);
        });

        it('asserts valid logger', function() {
            assert.doesNotThrow(function() {
                assertLogger(noopLogger);
            });
        });
    });

    describe('noop logger', function() {
        it('has all the expected log methods', function() {
            ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].forEach(function(level) {
                assert.equal(typeof noopLogger[level], 'function');
            });
        });
    });

    describe('url asserter', function() {
        it('accepts and parses URL-strings', function() {
            var url = assertUrl('amqp://guest:pass@somehost:1398/foo');

            assert.equal(url.hostname, 'somehost');
            assert.equal(url.port, 1398);
            assert.equal(url.protocol, 'amqp');
            assert.equal(url.auth, 'guest:pass');
            assert.equal(url.vhost, '/foo');
            assert.equal(url.username, 'guest');
            assert.equal(url.password, 'pass');
        });

        it('switches port based on protocol if no port explicitly given', function() {
            var url = assertUrl('amqps://guest:guest@localhost');
            assert.equal(url.protocol, 'amqps');
            assert.equal(url.port, 5671);

            url = assertUrl('amqp://guest:guest@localhost');
            assert.equal(url.protocol, 'amqp');
            assert.equal(url.port, 5672);
        });

        it('throws if url is not an object', function() {
            assert.throws(function() {
                assertUrl(function() {});
            }, /must be a valid/);
        });

        it('doesn\'t set vhost if it matches default value', function() {
            var url = assertUrl('amqp://localhost/');
            assert.equal(url.vhost, undef);
        });

        it('throws if required parts of URL-string is missing', function() {
            assert.throws(function() {
                assertUrl('foo');
            }, /No protocol given/);
        });
    });
});
