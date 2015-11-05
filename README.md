# gleipnir

Convenience wrapper for [amqp.node](https://github.com/squaremo/amqp.node).

## Installation

```
npm install --save gleipnir
```

## Features

* Attempts to reconnect a certain number of times before giving up (configurable)
* Logs initialization events to help find issues
* Automatically asserts given queues, exchanges and bindings before triggering callback

## Usage

```js
var gleipnir = require('gleipnir');

// Connect to AMQP
var url = 'amqp://user:pass@somehost:1337/';
var client = gleipnir(url, function(err, channel, connection) {
    // Check for any connect/init errors
    if (err) {
        throw err;
    }

    // `channel` and `connection` are the raw items from `amqp.node`.
    // Use them as you normally would:
    channel.publish(
        'some-exchange',
        'some-routing-key',
        new Buffer('i haf message')
    );
});
```

## Asserting queues, exchanges and bindings

One of the most useful features of gleipnir is automatic asserting and binding. Just specify an object of the queues, exchanges and bindings and gleipnir will make sure they exist, or call back with an error.

```js
var gleipnir = require('gleipnir');

var options = {
    url: 'amqp://user:pass@somehost:1337/'
    assert: {
        queues: [
            // If only a name is given, default options are used for it
            'topic-q',

            // To specify options:
            { name: 'some-queue', options: { durable: true }  },

            // Here's how to bind an anonymous queue to an exchange:
            { binding: { exchange: 'some-ex' }, options: { autoDelete: true } }
        ],
        exchanges: [
            // If only a name is given, `fanout` will be used as type,
            'some-ex',

            // To specify options:
            { name: 'some-other-ex', type: 'topic', options: { durable: false } }
        ],
        bindings: [
            { queue: 'some-queue', exchange: 'some-ex' },
            { queue: 'topic-q', exchange: 'some-other-ex', pattern: 'food' }
        ]
    }
};

var client = gleipnir(options, function(err) {
    // Check for any connect/init/assertion errors
    if (err) {
        throw err;
    }
});
```

## Other modules

- [gleipnir-publish](https://github.com/rexxars/gleipnir-publish) - publishes messages
- [gleipnir-assert](https://github.com/rexxars/gleipnir-assert) - used internally for the assertion bits

## License

MIT-licensed. See `LICENSE`.
