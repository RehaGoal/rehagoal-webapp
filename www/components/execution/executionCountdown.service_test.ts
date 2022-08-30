module rehagoal.workflow {

    describe('rehagoal.workflow', function () {

        let $intervalSpy: jasmine.Spy & jasmine.SpyObj<angular.IIntervalService>;

        beforeEach(() => angular.mock.module('rehagoal.workflow', function ($provide: angular.auto.IProvideService) {
            $provide.decorator('$interval', ($delegate: angular.IIntervalService) => {
                let intervalSpy: any = jasmine.createSpy('$interval', $delegate).and.callThrough();
                intervalSpy.cancel = $delegate.cancel;
                intervalSpy.flush = $delegate.flush;
                $intervalSpy = intervalSpy;
                spyOn($intervalSpy, 'cancel').and.callThrough();
                return $intervalSpy;
            })
        }));

        describe('ExecutionCountdownService', function () {
            let $interval: angular.IIntervalService;
            let $timeout: angular.ITimeoutService;
            let $Date: DateConstructor;
            let $rootScope: angular.IRootScopeService;
            let cordovaWakeupPlugin: CordovaWakeupPlugin;
            let countdownService: ExecutionCountdownService;
            let curTime = 0;
            let getTimeSpy: jasmine.Spy;
            let cordovaWakeupScheduleSpy: jasmine.Spy;
            let wakeupScheduledPromise: Promise<WakeupReference>;

            beforeEach(() => inject(function (_$interval_: typeof $interval,
                                                         _$timeout_: typeof $timeout,
                                                         _$Date_: typeof $Date,
                                                         _$rootScope_: typeof $rootScope,
                                                         _cordovaWakeupPlugin_: typeof cordovaWakeupPlugin,
                                                         _countdownService_: typeof countdownService) {
                $interval = _$interval_;
                $timeout = _$timeout_;
                $Date = _$Date_;
                $rootScope = _$rootScope_;
                cordovaWakeupPlugin = _cordovaWakeupPlugin_;
                countdownService = _countdownService_;
            }));
            beforeEach(() => {
                getTimeSpy = spyOn($Date.prototype, 'getTime').and.callFake(() => {
                    return curTime;
                });
            });

            const wakeUpReference = {alarmId: 60000, registerId: 0};

            function flushTime(millis: number) {
                curTime += millis;
                $interval.flush(millis);
                $timeout.flush(millis);
            }

            beforeEach(() => {
                cordovaWakeupScheduleSpy = spyOn(cordovaWakeupPlugin, 'scheduleAfterElapsedSeconds').and.callFake(() => {
                    wakeupScheduledPromise = Promise.resolve(wakeUpReference);
                    return wakeupScheduledPromise;
                });
                spyOn(cordovaWakeupPlugin, 'cancel');
                spyOn($rootScope, '$broadcast').and.callThrough();
            });

            describe('startCountdown', function () {
                describe('wakeup', function() {
                    let wakeUpSupportedSpy: jasmine.Spy;
                    beforeEach(function() {
                        wakeUpSupportedSpy = spyOnProperty(cordovaWakeupPlugin, 'supported', 'get').and.returnValue(true);
                    });
                    it('should schedule cordova wakeup if supported', function () {
                        countdownService.startCountdown(4, 's');
                        expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalled();
                    });
                    it('should not schedule cordova wakeup if unsupported', function() {
                        wakeUpSupportedSpy.and.returnValue(false);
                        countdownService.startCountdown(4, 's');
                        expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).not.toHaveBeenCalled();
                    });
                    it('should convert time in seconds', function() {
                        countdownService.startCountdown(32, 's');
                        expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledWith(
                            32,
                            jasmine.any(Function)
                        );
                    });
                    it('should convert time in minutes', function() {
                        countdownService.startCountdown(2, 'm');
                        expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledWith(
                            2 * 60,
                            jasmine.any(Function)
                        );
                    });
                    it('should convert time in hours', function() {
                        countdownService.startCountdown(5, 'h');
                        expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledWith(
                            5 * 60 * 60,
                            jasmine.any(Function)
                        );
                    });
                });
                it('should schedule $interval each second', function() {
                    countdownService.startCountdown(22, 's');
                    expect($intervalSpy).toHaveBeenCalledWith(jasmine.any(Function), 1000);
                });
            });
            describe('stopCountdown', function () {
                it('should do nothing if no countdown is running', function() {
                    countdownService.stopCountdown();
                    expect($intervalSpy.cancel).not.toHaveBeenCalled();
                    expect(cordovaWakeupPlugin.cancel).not.toHaveBeenCalled();
                });
                it('should cancel $interval', function() {
                    let countdownCallbackSpy = jasmine.createSpy('countdownCalback');
                    countdownService.setCountdownCallback(countdownCallbackSpy);
                    countdownService.startCountdown(4, 's');
                    flushTime(2000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(2);
                    expect($intervalSpy).toHaveBeenCalled();
                    expect($intervalSpy.cancel).not.toHaveBeenCalled();
                    countdownService.stopCountdown();
                    expect($intervalSpy.cancel).toHaveBeenCalled();
                    flushTime(2000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(2);
                });
                it('should cancel wakeup, if present', async function(done) {
                    spyOnProperty(cordovaWakeupPlugin, 'supported', 'get').and.returnValue(true);
                    countdownService.startCountdown(4, 's');
                    await wakeupScheduledPromise;
                    flushTime(2000);
                    expect(cordovaWakeupPlugin.cancel).not.toHaveBeenCalled();
                    countdownService.stopCountdown();
                    expect(cordovaWakeupPlugin.cancel).toHaveBeenCalled();
                    done();
                });
                it('should NOT cancel wakeup, if NOT present', function() {
                    countdownService.startCountdown(4, 's');
                    flushTime(2000);
                    countdownService.stopCountdown();
                    expect(cordovaWakeupPlugin.cancel).not.toHaveBeenCalled();
                });
                it('should only cancel $interval once', function() {
                    countdownService.startCountdown(4, 's');
                    flushTime(2000);
                    countdownService.stopCountdown();
                    expect($intervalSpy.cancel).toHaveBeenCalledTimes(1);
                    flushTime(2000);
                    countdownService.stopCountdown();
                    countdownService.stopCountdown();
                    expect($intervalSpy.cancel).toHaveBeenCalledTimes(1);
                });
                it('should only cancel wakeup once', async function(done) {
                    spyOnProperty(cordovaWakeupPlugin, 'supported', 'get').and.returnValue(true);
                    countdownService.startCountdown(4, 's');
                    await wakeupScheduledPromise;
                    flushTime(2000);
                    expect(cordovaWakeupPlugin.cancel).not.toHaveBeenCalled();
                    countdownService.stopCountdown();
                    flushTime(2000);
                    countdownService.stopCountdown();
                    expect(cordovaWakeupPlugin.cancel).toHaveBeenCalledTimes(1);
                    done();
                });
            });
            describe('setCountdownCallback', function () {
                let countdownCallbackSpy: jasmine.Spy;
                let countdownCallbackSpy2: jasmine.Spy;
                beforeEach(function() {
                    countdownCallbackSpy = jasmine.createSpy('countdownCallback');
                    countdownCallbackSpy2 = jasmine.createSpy('countdownCallback2');
                });
                it('should set callback to be called for every interval', function() {
                    countdownService.startCountdown(6, 's');
                    expect($intervalSpy).toHaveBeenCalledWith(jasmine.any(Function), 1000);
                    countdownService.setCountdownCallback(countdownCallbackSpy);
                    expect(countdownCallbackSpy).not.toHaveBeenCalled();
                    flushTime(250);
                    expect(countdownCallbackSpy).not.toHaveBeenCalled();
                    flushTime(250);
                    expect(countdownCallbackSpy).not.toHaveBeenCalled();
                    flushTime(250);
                    expect(countdownCallbackSpy).not.toHaveBeenCalled();
                    flushTime(250);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    for (let i = 1; i < 6; ++i) {
                        flushTime(1000);
                        expect(countdownCallbackSpy).toHaveBeenCalledTimes(i + 1);
                    }
                    flushTime(1000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(6);
                    flushTime(1000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(6);
                });
                it('should change callback when called twice', function() {
                    countdownService.startCountdown(6, 's');
                    expect($intervalSpy).toHaveBeenCalledWith(jasmine.any(Function), 1000);
                    countdownService.setCountdownCallback(countdownCallbackSpy);
                    expect(countdownCallbackSpy).not.toHaveBeenCalled();
                    flushTime(1000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    countdownService.setCountdownCallback(countdownCallbackSpy2);
                    for (let i = 1; i < 6; ++i) {
                        flushTime(1000);
                        expect(countdownCallbackSpy2).toHaveBeenCalledTimes(i);
                        expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    }
                });
                it('should call callback during wakeup', function() {
                    spyOnProperty(cordovaWakeupPlugin, 'supported', 'get').and.returnValue(true);
                    countdownService.setCountdownCallback(countdownCallbackSpy);
                    countdownService.startCountdown(6, 's');
                    expect(cordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalled();
                    const wakeupCallback = cordovaWakeupScheduleSpy.calls.argsFor(0)[1];
                    wakeupCallback();
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    wakeupCallback();
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(2);
                });
            });
            describe('onFinish', function() {
                it('should broadcast executionCountdownEvent when countdown has finished', function() {
                    const countdownCallbackSpy = jasmine.createSpy('countdownCallback');
                    countdownService.startCountdown(6, 's');
                    countdownService.setCountdownCallback(countdownCallbackSpy);
                    for (let i = 0; i < 4; ++i) {
                        expect(countdownCallbackSpy).not.toHaveBeenCalled();
                        flushTime(250);
                    }
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    for (let i = 1; i < 5; ++i) {
                        flushTime(1000);
                        expect(countdownCallbackSpy).toHaveBeenCalledTimes(i + 1);
                    }
                    expect($rootScope.$broadcast).not.toHaveBeenCalledWith('executionCountdownEvent');
                    flushTime(1000);
                    expect($rootScope.$broadcast).toHaveBeenCalledWith('executionCountdownEvent');
                    flushTime(1000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(6);
                    flushTime(1000);
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(6);
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                });
            });
            describe('forceCountdownFinish', function() {
                it('should cancel running countdown, call countdown and finish callbacks, and broadcast executionCountdownEvent', async function(done) {
                    spyOnProperty(cordovaWakeupPlugin, 'supported', 'get').and.returnValue(true);
                    const countdownCallbackSpy = jasmine.createSpy('countdownCallback');
                    countdownService.startCountdown(6, 's');
                    await wakeupScheduledPromise;
                    countdownService.setCountdownCallback((remainingSeconds) => countdownCallbackSpy(remainingSeconds));
                    for (let i = 0; i < 4; ++i) {
                        expect(countdownCallbackSpy).not.toHaveBeenCalled();
                        flushTime(250);
                    }
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(1);
                    expect(countdownCallbackSpy.calls.mostRecent().args).toEqual([5]);
                    expect($rootScope.$broadcast).not.toHaveBeenCalledWith('executionCountdownEvent');
                    expect($intervalSpy.cancel).not.toHaveBeenCalled();
                    expect(cordovaWakeupPlugin.cancel).not.toHaveBeenCalled();
                    countdownService.forceCountdownFinish();
                    expect($intervalSpy.cancel).toHaveBeenCalled();
                    expect(cordovaWakeupPlugin.cancel).toHaveBeenCalled();
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(2);
                    expect(countdownCallbackSpy.calls.mostRecent().args).toEqual([0]);
                    flushTime(1);
                    expect($rootScope.$broadcast).toHaveBeenCalledWith('executionCountdownEvent');
                    for (let i = 0; i < 6; ++i) {
                        flushTime(1000);
                    }
                    expect(countdownCallbackSpy).toHaveBeenCalledTimes(2);
                    done();
                });
            });
        });
    });
}
