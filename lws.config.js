/* jshint node: true */
'use strict';

const WsCli = require('local-web-server/lib/cli-app');

const defaultOptions = new WsCli().getDefaultOptions();

const options = Object.assign({}, defaultOptions, {
    moduleDir: ['./e2e-tests/lws-middleware', ...defaultOptions.moduleDir],
    stack: ['csp', ...defaultOptions.stack],
    directory: './www/',
    hostname: 'localhost',
    port: 8000,
    // The CSP is taken from rehagoal-server with the addition of:
    // connect-src 'self' blob: http://127.0.0.1:8080
    // which is required for
    // 1) the E2E tests to fetch objectURLs of images in order to compare them with the image files
    // 2) to allow the rehagoal-server (API server) to be hosted on a different port (origin).
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'none'; object-src 'none'; connect-src 'self' blob: http://127.0.0.1:8080"
});

module.exports = options;
