//jshint strict: false

const path = require('path');
const JUnitXmlReporter = require('jasmine-reporters').JUnitXmlReporter;
let SpecReporter = require('jasmine-spec-reporter').SpecReporter;

function insertIf(condition, ...elements) {
    return condition ? elements: [];
}

function hasEnvEnabled(envName) {
    return process.env.hasOwnProperty(envName) && /1|true|yes|enabled/i.test(process.env[envName]);
}

exports.config = {

    allScriptsTimeout: 11000,

    specs: [
        '*.js'
    ],

    capabilities: {
        'browserName': 'chrome',
        'chromeOptions': {
            'args': ['no-sandbox', 'disable-dev-shm-usage'],
            prefs: {
                'download': {
                    'prompt_for_download': false,
                    'directory_upgrade': true,
                    'default_directory': '/tmp/e2e-tests/downloads/'
                }
            }
        },
        'unexpectedAlertBehaviour': 'ignore'
    },

    baseUrl: 'http://localhost:8000/',

    framework: 'jasmine',

    onPrepare: function() {
        setTimeout(function() {
            browser.driver.executeScript(function() {
                return {
                    width: window.screen.availWidth,
                    height: window.screen.availHeight
                };
            }).then(function(result) {
                browser.driver.manage().window().setSize(result.width, result.height);
            });
        });
        jasmine.getEnv().addReporter(new SpecReporter({
            spec: {
                displayStacktrace: false,
                displayDuration: true
            },
            summary: {
                displayStacktrace: true
            }
        }));
        jasmine.getEnv().addReporter(new JUnitXmlReporter({
            consolidateAll: true,
            savePath: path.join(__dirname, '../reports/e2e-junit/')
        }));
    },

    plugins : [{
        package: 'protractor-istanbul-plugin',
        logAssertions: true,
        failAssertions: true
    }, //Conditional screenshots
        ...insertIf(!hasEnvEnabled('DISABLE_SCREENSHOTS'), {
        package: 'protractor-screenshoter-plugin',
        imageToAscii: 'none'
    })],

    /*onPrepare: function() {
        // returning the promise makes protractor wait for the reporter config before executing tests
        return global.browser.getProcessedConfig().then(function(config) {
            //it is ok to be empty
        });
    },*/

    jasmineNodeOpts: {
        defaultTimeoutInterval: 30000,
        // Disable protractor dot reporter (use jasmine-spec-reporter instead, s.a.)
        print: function() {}
    }

};
