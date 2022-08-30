"use strict";

describe('rehagoal.tts', function () {
    beforeEach(module('rehagoal.tts'));
    describe('TTS service', function() {
        describe('constructor', function() {
            var ttsService = null;
            var mespeakService, webSpeechService, cordovaSpeechService;
            var settingsService;
            var $rootScope;
            beforeEach(function() {
                inject(function (_settingsService_, _$rootScope_) {
                    settingsService = _settingsService_;
                    $rootScope = _$rootScope_;
                });
                settingsService.ttsEnabled = true;
            });
            it('should use mespeak service by default', function() {
                inject(function(_mespeakService_, _webSpeechService_, _cordovaSpeechService_) {
                    mespeakService = _mespeakService_;
                    webSpeechService = _webSpeechService_;
                    cordovaSpeechService = _cordovaSpeechService_;
                });
                spyOn(mespeakService, 'isSupported').and.returnValue(true);
                spyOn(webSpeechService, 'isSupported').and.returnValue(false);
                spyOn(cordovaSpeechService, 'isSupported').and.returnValue(false);
                spyOn(mespeakService, 'speak');
                spyOn(webSpeechService, 'speak');
                spyOn(cordovaSpeechService, 'speak');
                inject(function (_ttsService_) {
                    ttsService = _ttsService_;
                });
                $rootScope.$apply();
                ttsService.speak("text");
                expect(mespeakService.speak).toHaveBeenCalled();
                expect(webSpeechService.speak).not.toHaveBeenCalled();
                expect(cordovaSpeechService.speak).not.toHaveBeenCalled();
            });
            it('should use webSpeechService if supported', function() {
                inject(function(_mespeakService_, _webSpeechService_, _cordovaSpeechService_) {
                    mespeakService = _mespeakService_;
                    webSpeechService = _webSpeechService_;
                    cordovaSpeechService = _cordovaSpeechService_;
                });
                spyOn(mespeakService, 'isSupported').and.returnValue(true);
                spyOn(webSpeechService, 'isSupported').and.returnValue(true);

                spyOn(mespeakService, 'speak');
                spyOn(webSpeechService, 'speak');
                spyOn(cordovaSpeechService, 'speak');
                inject(function (_ttsService_) {
                    ttsService = _ttsService_;
                });
                $rootScope.$apply();
                ttsService.speak("text");
                expect(mespeakService.speak).not.toHaveBeenCalled();
                expect(webSpeechService.speak).toHaveBeenCalled();
                expect(cordovaSpeechService.speak).not.toHaveBeenCalled();
            });
            it('should use cordova service if supported', function() {
                inject(function(_mespeakService_, _webSpeechService_, _cordovaSpeechService_) {
                    mespeakService = _mespeakService_;
                    webSpeechService = _webSpeechService_;
                    cordovaSpeechService = _cordovaSpeechService_;
                });
                spyOn(mespeakService, 'isSupported').and.returnValue(true);
                spyOn(webSpeechService, 'isSupported').and.returnValue(true);
                spyOn(cordovaSpeechService, 'isSupported').and.returnValue(true);

                spyOn(mespeakService, 'speak');
                spyOn(webSpeechService, 'speak');
                spyOn(cordovaSpeechService, 'speak');
                inject(function (_ttsService_) {
                    ttsService = _ttsService_;
                });
                $rootScope.$apply();
                ttsService.speak("text");
                expect(mespeakService.speak).not.toHaveBeenCalled();
                expect(webSpeechService.speak).not.toHaveBeenCalled();
                expect(cordovaSpeechService.speak).toHaveBeenCalled();
            });
        });
        describe('method speak', function() {
            var ttsService = null;
            var mespeakService, webSpeechService, cordovaSpeechService;
            var settingsService;
            var $rootScope;
            beforeEach(function() {
                inject(function (_settingsService_, _$rootScope_,
                                 _mespeakService_, _webSpeechService_, _cordovaSpeechService_) {
                    settingsService = _settingsService_;
                    $rootScope = _$rootScope_;
                    mespeakService = _mespeakService_;
                    webSpeechService = _webSpeechService_;
                    cordovaSpeechService = _cordovaSpeechService_;
                });
                spyOn(mespeakService, 'isSupported').and.returnValue(true);
                spyOn(webSpeechService, 'isSupported').and.returnValue(false);
                spyOn(cordovaSpeechService, 'isSupported').and.returnValue(false);
                inject(function(_ttsService_) {
                    ttsService = _ttsService_;
                });
                $rootScope.$apply();
            });
            it('should be defined', function() {
                expect(ttsService.speak).toBeDefined();
            });
            it('should not call the activeService if ttsEnabled is false', function() {
                settingsService.ttsEnabled = false;
                spyOn(mespeakService, 'speak');
                spyOn(webSpeechService, 'speak');
                spyOn(cordovaSpeechService, 'speak');
                ttsService.speak("test");
                expect(mespeakService.speak).not.toHaveBeenCalled();
                expect(webSpeechService.speak).not.toHaveBeenCalled();
                expect(cordovaSpeechService.speak).not.toHaveBeenCalled();
            });
            it('should call the activeService if ttsEnabled is true', function() {
                settingsService.ttsEnabled = true;
                spyOn(mespeakService, 'speak');
                spyOn(webSpeechService, 'speak');
                spyOn(cordovaSpeechService, 'speak');
                ttsService.speak("test");
                expect(mespeakService.speak).toHaveBeenCalled();
                expect(webSpeechService.speak).not.toHaveBeenCalled();
                expect(cordovaSpeechService.speak).not.toHaveBeenCalled();
            });
            it('should resolve promise after speech', function() {
                settingsService.ttsEnabled = true;
                var resolved = false;
                var speed = 150;
                spyOn(mespeakService, 'speak').and.callFake(function(text, speed, onSuccess, onFail) {
                    onSuccess && onSuccess();
                });
                ttsService.speak("test").then(function() {
                    resolved = true;
                });
                expect(mespeakService.speak).toHaveBeenCalled();
                expect(resolved).toBe(false);
                $rootScope.$apply();
                expect(resolved).toBe(true);
            });
            it('should resolve promise immediately if ttsEnabled is false', function() {
                settingsService.ttsEnabled = false;
                var resolved = false;
                spyOn(mespeakService, 'speak');
                ttsService.speak("test").then(function() {
                    resolved = true;
                });
                expect(mespeakService.speak).not.toHaveBeenCalled();
                $rootScope.$apply();
                expect(resolved).toBe(true);
            });
        });
        describe('speed change slider', function(){
            let settingsService;
            let mespeakService, webSpeechService, cordovaSpeechService;
            beforeEach(function() {
                inject(function (_settingsService_,
                                 _mespeakService_, _webSpeechService_, _cordovaSpeechService_) {
                    settingsService = _settingsService_;
                    mespeakService = _mespeakService_;
                    webSpeechService = _webSpeechService_;
                    cordovaSpeechService = _cordovaSpeechService_;
                });
            });
            it('Index should be correct for default slider', function() {
                settingsService.changeSpeechSpeeds(3);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(2);
            });
            it('Index should be correct for minimum slider', function() {
                settingsService.changeSpeechSpeeds(1);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(0);
            });
            it('Index should be correct for maximum slider', function() {
                settingsService.changeSpeechSpeeds(5);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(4);
            });
            it('should have the correct default values for all services', function() {
                settingsService.changeSpeechSpeeds(3);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(2);
                expect(cordovaSpeechService.getSpeed(curIndex)).toBe(cordovaSpeechService.speedValues[2]);
                expect(mespeakService.getSpeed(curIndex)).toBe(mespeakService.speedValues[2]);
                expect(webSpeechService.getSpeed(curIndex)).toBe(webSpeechService.speedValues[2]);
            });
            it('should have the correct lowest values for all services', function() {
                settingsService.changeSpeechSpeeds(1);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(0);
                expect(cordovaSpeechService.getSpeed(curIndex)).toBe(cordovaSpeechService.speedValues[0]);
                expect(mespeakService.getSpeed(curIndex)).toBe(mespeakService.speedValues[0]);
                expect(webSpeechService.getSpeed(curIndex)).toBe(webSpeechService.speedValues[0]);
            });
            it('should have the correct highest values for all services', function() {
                settingsService.changeSpeechSpeeds(5);
                let curIndex = settingsService.currentTTSSpeedIndex;
                expect(curIndex).toBe(4);
                expect(cordovaSpeechService.getSpeed(curIndex)).toBe(cordovaSpeechService.speedValues[4]);
                expect(mespeakService.getSpeed(curIndex)).toBe(mespeakService.speedValues[4]);
                expect(webSpeechService.getSpeed(curIndex)).toBe(webSpeechService.speedValues[4]);
            });

        });
    });
});