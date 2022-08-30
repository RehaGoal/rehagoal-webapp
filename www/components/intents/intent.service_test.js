"use strict";
describe('rehagoal.intents', function () {
    var $rootScope, $window, $log, $document;
    var listenerCallback;
    var mockIntentImportService;

    beforeEach(module('rehagoal.intents', function ($provide) {
        $provide.value('$log', {
            info: jasmine.createSpy().and.callThrough(),
            debug: jasmine.createSpy().and.callThrough()
        });
        $provide.value('$rootScope', {
            $broadcast: jasmine.createSpy().and.callThrough()
        });
        $provide.value('$document', [{
            addEventListener: jasmine.createSpy().and.callFake(function(event, callback){
                listenerCallback = callback;
            })
        }]);
        mockIntentImportService = {
            onNewIntent: function () {}
        };
        $provide.value('intentImportService', mockIntentImportService);
    }));

    beforeEach(inject(function ( _$rootScope_, _$window_, _$log_, _$document_) {
        $rootScope = _$rootScope_;
        $window = _$window_;
        $log = _$log_;
        $document = _$document_;
    }));

    describe('service: intent', function() {
        var intentService;

        describe('properties and methods', function () {
            beforeEach(inject(function (_intentService_) {
                intentService = _intentService_;
            }));
            it('should be defined', function () {
                expect(intentService).toBeDefined();
            });
            it('should have an eventListener "deviceready" registered', function () {
               var listener = 'deviceready';
               expect($document[0].addEventListener).toHaveBeenCalledWith(listener, jasmine.any(Function));
            });

            describe('eventListener behaviour', function() {
                var onNewIntentCallback, getUriCallback;

                beforeEach(function() {
                    $window['cordova'] = true;
                    $window['plugins'] = {webintent: {
                        onNewIntent: jasmine.createSpy('onNewIntent').and.callFake(function(callback) {
                            onNewIntentCallback = callback;
                        }),
                        getUri: jasmine.createSpy('getUri').and.callFake(function(callback) {
                            getUriCallback = callback;
                        })
                    }};
                    listenerCallback();
                    spyOn(intentService, 'handleUriIntent').and.callThrough();
                    spyOn(mockIntentImportService, 'onNewIntent').and.callThrough();

                });

                it('logs "NO INTENT" if intent is invalid, e.g. uri = null', function() {
                    var uri = null;
                    getUriCallback(uri);
                    expect(intentService.handleUriIntent).toHaveBeenCalled();
                    expect($log.info).toHaveBeenCalledWith('IntentService: No intent.');
                    expect(mockIntentImportService.onNewIntent).not.toHaveBeenCalled();
                });
                it('if uri of intent is undefined, IntentService.handleUriIntent does nothing', function() {
                    getUriCallback();
                    expect(intentService.handleUriIntent).toHaveBeenCalled();
                    expect(mockIntentImportService.onNewIntent).not.toHaveBeenCalled();
                });
                it('logs "INTENT + uri" with valid intent', function() {
                    var uri = 'https://rehagoal-server.local/api/v2/RANDOM';
                    getUriCallback(uri);
                    expect(intentService.handleUriIntent).toHaveBeenCalled();
                    expect($log.info).toHaveBeenCalledWith('IntentService: Intent: '+ uri);
                    expect(mockIntentImportService.onNewIntent).toHaveBeenCalledWith(uri);
                });
                it('should create new intent only once on multiple getUri calls with same uri', function() {
                    var uri = 'one';
                    onNewIntentCallback(uri);
                    getUriCallback(uri);
                    getUriCallback(uri);
                    expect(mockIntentImportService.onNewIntent).toHaveBeenCalledTimes(1);
                    uri = 'two';
                    onNewIntentCallback(uri);
                    getUriCallback(uri);
                    expect(mockIntentImportService.onNewIntent).toHaveBeenCalledTimes(2);
                });
            });

            //TODO: add unit tests for createImportIntent(url)
            //it('should create an start activity intent if url is valid', function() {});
            //it('should NOT create an intent if url did not match rehagoal url', function() {});

        });
    });
});
