//jshint strict: false
module.exports = function (config) {
    config.set({

        basePath: './www',

        files: [
            '../node_modules/jasmine2-custom-message/jasmine2-custom-message.js',
            '../node_modules/jasmine-promise-matchers/dist/jasmine-promise-matchers.js',
            'components/utilities/dev/*.js',

            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/ng-file-upload/ng-file-upload.min.js',
            'bower_components/ngCordova/dist/ng-cordova.js',
            'bower_components/ngCordova/dist/ng-cordova-mocks.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-animate/angular-animate.min.js',
            'bower_components/angular-webstorage/angular-webstorage.js',
            'bower_components/google-blockly/blockly_compressed.js',
            'bower_components/google-blockly/blocks_compressed.js',
            'bower_components/google-blockly/javascript_compressed.js',
            'bower_components/google-blockly/msg/js/de.js',
            'bower_components/angular-xeditable/dist/js/xeditable.js',
            'bower_components/angular-scroll-glue/src/scrollglue.js',
            'bower_components/qrcode-generator/js/qrcode.js',
            'bower_components/qrcode-generator/js/qrcode_UTF8.js',
            'bower_components/angular-qrcode/angular-qrcode.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'bower_components/angular-bootstrap-lightbox/dist/angular-bootstrap-lightbox.js',
            'bower_components/simple-web-notification/web-notification.js',
            'bower_components/angular-web-notification/angular-web-notification.js',
            'bower_components/lodash/lodash.js',
            'bower_components/restangular/src/restangular.js',
            'bower_components/reflect-metadata/Reflect.js',
            'bower_components/sjcl/sjcl.js',
            'bower_components/dexie/dist/dexie.js',
            'bower_components/openpgp/dist/openpgp.js',
            'bower_components/jsonparse2/dist/umd/index.js',

            'app.js',
            'version.js',
            'components/utilities/utilities.module.js',
            'components/utilities/streamUtilities.js',
            'components/utilities/ngAnimateCallbacks/onAnimate.directive.js',
            'components/utilities/onLoad/onLoad.directive.js',
            'components/utilities/scrollIntoView/scrollIntoViewEvent.directive.js',
            'components/settings/settings.module.js',
            'components/settings/quotaUsageBar.component.js',
            'components/settings/settings.service.js',
            'components/authentication/auth.module.js',
            'components/authentication/auth.service.js',
            'components/crypto/bytes.js',
            'components/database/database.module.js',
            'components/database/calendarDatabase.service.js',
            'components/database/clipboardDatabase.service.js',
            'components/database/imagesDatabase.service.js',
            'components/database/metricsDatabase.service.js',
            'components/database/gamificationDatabase.service.js',
            'components/database/workflowsDatabase.service.js',
            'components/gamification/gamification.module.js',
            'components/gamification/gamification.service.js',
            'components/gamification/gamificationSettings.service.js',
            'components/blockly/blockly.module.js',
            'components/blocklyConfig/blocklyConfig.module.js',
            'components/blocklyConfig/blockly.config.js',
            'components/blocklyConfig/blockly.config.service.js',
            'components/blocklyConfig/blockly-blocks.run.js',
            'components/blockly/blockly.service.js',
            'components/blockly/blockly.directive.js',
            'components/blockly/blocklyImage.service.js',
            'components/blockly/ngBlockly.provider.js',
            'components/calendar/calendar.module.js',
            'components/calendar/calendar.service.js',
            'components/calendar/calendarScheduler.service.js',
            'components/calendar/calendarEventHandler.component.js',
            'components/clipboard/clipboard.module.js',
            'components/clipboard/blocklyClipboard.service.js',
            'components/crypto/cryptoFunctions.js',
            'components/crypto/crypto.module.js',
            'components/crypto/pgpCrypto.service.js',
            'components/metrics/metric.module.js',
            'components/metrics/metrics.run.js',
            'components/metrics/metric.factory.js',
            'components/metrics/metricRegistry.factory.js',
            'components/metrics/metric.service.js',
            'components/metrics/metricIdGenerator.service.js',
            'components/modal/leaveModal.module.js',
            'components/modal/leaveModal.component.js',
            'components/modal/infoModal.module.js',
            'components/modal/infoModal.component.js',
            'components/modal/loginModal.module.js',
            'components/modal/loginModal.controller.js',
            'components/modal/promptModal.module.js',
            'components/modal/promptModal.component.js',
            'components/lists/listBuilder.component.js',
            'components/lists/changeOrder.directive.js',
            'components/images/images.module.js',
            'components/images/images.service.js',
            'components/intents/intents.module.js',
            'components/intents/intent.service.js',
            'components/intents/intent_import.service.js',
            'components/toggleSwitch/toggleSwitch.module.js',
            'components/toggleSwitch/toggleSwitch.component.js',
            'components/toggleSwitch/toggleSwitch.css',
            'components/imageThumbnailChooser/imageThumbnailChooser.module.js',
            'components/imageThumbnailChooser/imageThumbnailChooser.component.js',
            'components/imageThumbnailChooser/imageThumbnailChooser.css',
            'components/tts/mespeak/mespeak.min.js',
            'components/tts/mespeak/mespeak.module.js',
            'components/tts/mespeak/mespeak.service.js',
            'components/tts/tts.module.js',
            'components/tts/tts.services.module.js',
            'components/tts/tts.service.js',
            'components/tts/speakContents.directive.js',
            'components/restClient/restClient.run.js',
            'components/restClient/restClient.config.js',
            'components/smartCompanion/smartCompanion.module.js',
            'components/smartCompanion/smartCompanion.service.js',
            'components/smartCompanion/smartCompanion.js',
            'components/smartCompanion/wearDataApi.js',
            'components/smartCompanion/wearCompanion.service.js',
            'components/smartCompanion/bluetoothCompanion.service.js',
            'components/workflow/workflow.module.js',
            'components/workflow/workflow_builder.iface.js',
            'components/workflow/workflow_execution.iface.js',
            'components/workflow/workflow.service.js',
            'components/workflow/workflow_execution.service.js',
            'components/workflow/workflow_execution_builder.service.js',
            'components/workflow/workflow_version_study_persist.controller.js',
            'components/**/*.html',
            'views/**/*.html',
            'views/**/*.js',
            'components/overview/workflowMenuStrip.js',
            'components/overview/overviewToolbar.js',
            'components/overview/serverExportButton.js',
            'components/progress/progress.component.js',
            'components/execution/executionBlock.component.js',
            'components/execution/executionBlockParallel.component.js',
            'components/execution/executionLog.component.js',
            'components/execution/executionTimer.service.js',
            'components/execution/executionCountdown.service.js',
            'components/execution/cordovaWakeuptimer.service.js',
            'components/exchange/exchange.module.js',
            'components/exchange/workflowExport.service.js',
            'components/exchange/workflowImport.service.js',
            'components/exchange/importJob.factory.js',
            'components/exchange/download.service.js',
            'components/exchange/studyExport.service.js',
            'components/exchange/restWorkflowExchange.service.js',
            'components/gamification/gamification.module.js',
            'components/gamification/gamificationSettings.service.js',
            'components/gamification/navbarGamification.component.js',
            'components/gamification/navbarGamificationStatusController.js',
            'components/**/*_test.js',
            'bower_components/jquery/dist/jquery.min.js',
            'bower_components/bootstrap/dist/js/bootstrap.min.js',

            {
                pattern: 'bower_components/openpgp/dist/openpgp.worker.js',
                watched: true,
                served: true,
                included: false
            },
            {
                pattern: 'components/crypto/worker/crypto.worker.js',
                watched: true,
                served: true,
                included: false,
            },
        ],
        autoWatch: true,

        frameworks: ['jasmine'],

        browsers: ['Chrome'],

        customLaunchers: {
            Chrome_no_sandbox: {
                base: 'Chrome',
                flags: ['--no-sandbox']
            },
            Chrome_container_no_sandbox: {
                base: 'Chrome',
                flags: ['--no-sandbox', '--disable-dev-shm-usage']
            }
        },

        plugins: [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine',
            'karma-coverage',
            'karma-junit-reporter',
            'karma-ng-html2js-preprocessor',
            'karma-sourcemap-loader',
        ],

        reporters: ['coverage', 'junit'],

        preprocessors: {
            '!(bower_components)/**/*.html': ['ng-html2js'],
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            '!(bower_components)/**/!(*_test|*.min).js': ['sourcemap', 'coverage']
        },

        junitReporter: {
            outputFile: '../../reports/unittest/unit.xml',
            suite: 'rehagoal',
            useBrowserName: true
        },

        coverageReporter: { reporters: [
            /*{
                type: 'text-summary'
            },*/
            {
                type: 'html',
                dir: '../reports/coverage/karma'
            },
            {
                type: 'json',
                dir: '../reports/coverage/karma'
            },
            {
                type: 'lcovonly',
                dir: '../reports/coverage/karma'
            }
        ]},

        ngHtml2JsPreprocessor: {
            // strip this from the file path
            stripPrefix: 'public/',
            //stripSuffix: '.ext',
            // prepend this to the
            //prependPrefix: 'served/',

            /*// or define a custom transform function
            // - cacheId returned is used to load template
            //   module(cacheId) will return template at filepath
            cacheIdFromPath: function(filepath) {
                // example strips 'public/' from anywhere in the path
                // module(app/templates/template.html) => app/public/templates/template.html
                var cacheId = filepath.strip('public/', '');
                return cacheId;
            },*/

            // - setting this option will create only a single module that contains templates
            //   from all the files, so you can load them all with module('foo')
            // - you may provide a function(htmlPath, originalPath) instead of a string
            //   if you'd like to generate modules dynamically
            //   htmlPath is a originalPath stripped and/or prepended
            //   with all provided suffixes and prefixes
            moduleName: 'rehagoal.templates'
        }
    });
};
