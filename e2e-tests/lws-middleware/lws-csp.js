/* jshint esversion: 8 */
/* jshint node: true */

'use strict';

const EventEmitter = require('events');

class LwsCsp extends EventEmitter {
    description() {
        return 'Adds the Content-Security-Policy header to the response, as specified in the options.';
    }

    optionDefinitions() {
        return [
            { name: 'contentSecurityPolicy', type: String, description: 'Content-Security-Policy header value to send in the response.' }
        ];
    }

    middleware(config) {
        if (config.contentSecurityPolicy) {
            this.emit('verbose', 'csp.config', {contentSecurityPolicy: config.contentSecurityPolicy});
        }
        return async (/** BaseContext */ ctx, /** Next */ next) => {
            if (config.contentSecurityPolicy) {
                ctx.set('Content-Security-Policy', config.contentSecurityPolicy);
            }
            return next();
        };
    }
}

module.exports = LwsCsp;
