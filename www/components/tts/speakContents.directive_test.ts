module rehagoal.tts {
    const passiveSpeakableClass = 'speakable-content';
    const activeSpeakableClass = 'speaking-content';

    describe('rehagoal.tts', function () {
        let $compile: angular.ICompileService;
        let $rootScope: angular.IRootScopeService;
        let $q: angular.IQService;
        let ttsService: TTSService;

        beforeEach(() => angular.mock.module('rehagoal.tts'));
        beforeEach(angular.mock.inject(function (_$compile_: angular.ICompileService,
                                                 _$rootScope_: angular.IRootScopeService,
                                                 _$q_: angular.IQService,
                                                 _ttsService_: TTSService) {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $q = _$q_;
            ttsService = _ttsService_;
        }));

        function clickOnElement(element: HTMLElement) {
            const clickEvent: Event = new MouseEvent('click');
            element.dispatchEvent(clickEvent);
        }

        describe('speakContents directive', function () {
            let addEventListenerSpy: jasmine.Spy;
            let removeEventListenerSpy: jasmine.Spy;
            let speakSpy: jasmine.Spy;
            let speakDeferred: angular.IDeferred<void>;
            beforeEach(function () {
                addEventListenerSpy = spyOn(HTMLElement.prototype, 'addEventListener').and.callThrough();
                removeEventListenerSpy = spyOn(HTMLElement.prototype, 'removeEventListener').and.callThrough();
                speakSpy = spyOn(ttsService, 'speak').and.callFake(() => {
                    speakDeferred = $q.defer();
                    return speakDeferred.promise;
                });
            })
            it('should initialize element properly', function () {
                expect(addEventListenerSpy).toHaveBeenCalledTimes(0);
                const element = $compile('<b speak-contents></b>')($rootScope);
                expect(element.hasClass(passiveSpeakableClass)).toBe(true,
                    `element should have ${passiveSpeakableClass} class when initialized.`);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when initialized.`);
                expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
                expect(addEventListenerSpy).toHaveBeenCalledWith('click', jasmine.any(Function));
            });
            it('should destroy element properly', function () {
                const element = $compile('<b speak-contents></b>')($rootScope);
                expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
                expect(addEventListenerSpy).toHaveBeenCalledWith('click', jasmine.any(Function));
                const clickHandler = addEventListenerSpy.calls.mostRecent().args[1];
                element.remove();
                expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
                expect(removeEventListenerSpy).toHaveBeenCalledWith('click', clickHandler);
                expect(element.hasClass(passiveSpeakableClass)).toBe(false,
                    `element should NOT have ${passiveSpeakableClass} class when destroyed.`);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when destroyed.`);
            });
            it('should speak text contents & highlight when clicking on the element, TTS enabled, TTS successful', function () {
                spyOn(ttsService, 'isTTSEnabled').and.returnValue(true);
                const element = $compile('<b speak-contents>Text to read</b>')($rootScope);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when initialized.`);
                clickOnElement(element[0]);
                expect(element.hasClass(activeSpeakableClass)).toBe(true,
                    `element should have ${activeSpeakableClass} class after clicking on the element (TTS enabled).`);
                expect(speakSpy).toHaveBeenCalledWith('Text to read');
                speakDeferred.resolve();
                $rootScope.$apply();
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class after TTS finished.`);
            });
            it('should NOT speak text contents & NOT highlight when clicking on the element, TTS disabled', function () {
                spyOn(ttsService, 'isTTSEnabled').and.returnValue(false);
                const element = $compile('<b speak-contents>Text to read</b>')($rootScope);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when initialized.`);
                clickOnElement(element[0]);
                expect(speakSpy).not.toHaveBeenCalled();
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should have ${activeSpeakableClass} class after clicking on the element (TTS disabled).`);
            });
            it('should speak text contents & highlight when clicking on the element, TTS enabled, TTS failing', function () {
                spyOn(ttsService, 'isTTSEnabled').and.returnValue(true);
                const element = $compile('<b speak-contents>Another Text to read</b>')($rootScope);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when initialized.`);
                clickOnElement(element[0]);
                expect(speakSpy).toHaveBeenCalledWith('Another Text to read');
                expect(element.hasClass(activeSpeakableClass)).toBe(true,
                    `element should have ${activeSpeakableClass} class after clicking on the element (TTS enabled).`);
                speakDeferred.reject(new Error('mocked test error (ttsService)'));
                expect(() => $rootScope.$apply()).toThrowError(/mocked test error \(ttsService\)/);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class after TTS has failed.`);
            });
            it('should not allow speaking, while element is already being spoken', function () {
                spyOn(ttsService, 'isTTSEnabled').and.returnValue(true);
                const element = $compile('<b speak-contents>Read me plz</b>')($rootScope);
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class when initialized.`);
                clickOnElement(element[0]);
                expect(element.hasClass(activeSpeakableClass)).toBe(true,
                    `element should have ${activeSpeakableClass} class after clicking on the element.`);
                expect(speakSpy).toHaveBeenCalledWith('Read me plz');
                clickOnElement(element[0]);
                expect(element.hasClass(activeSpeakableClass)).toBe(true,
                    `element should still have ${activeSpeakableClass} class while speak is still in progress.`);
                expect(speakSpy).toHaveBeenCalledTimes(1);
                speakDeferred.resolve();
                $rootScope.$apply();
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class after TTS has finished.`);
                element.text("Text number 2");
                clickOnElement(element[0]);
                expect(element.hasClass(activeSpeakableClass)).toBe(true,
                    `element should have ${activeSpeakableClass} class after clicking on the element another time.`);
                expect(speakSpy).toHaveBeenCalledTimes(2);
                expect(speakSpy.calls.mostRecent().args).toEqual(["Text number 2"]);
                speakDeferred.resolve();
                $rootScope.$apply();
                expect(element.hasClass(activeSpeakableClass)).toBe(false,
                    `element should NOT have ${activeSpeakableClass} class after TTS has finished another time.`);
            });
        });
    });
}
