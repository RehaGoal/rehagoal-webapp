module rehagoal.workflow {
    import PGPCryptoService = rehagoal.crypto.PGPCryptoService;
    import ImageService = rehagoal.images.ImageService;
    import MetricService = rehagoal.metrics.MetricService;
    import MetricsDB = rehagoal.metrics.MetricsDB;
    import Table = dexie.Dexie.Table;
    import MetricSnapshotWithAssignment = rehagoal.metrics.MetricSnapshotWithAssignment;
    import MetricSnapshotDBEntry = rehagoal.metrics.MetricSnapshotDBEntry;
    import OpenPGPNamespace = rehagoal.crypto.OpenPGPNamespace;
    import SettingsService = rehagoal.settings.SettingsService;
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import IWakeUpTimer = ngCordova.IWakeupTimer;
    describe('rehagoal.workflow', function () {

        beforeEach(() => angular.mock.module('rehagoal.workflow', function($provide: angular.auto.IProvideService) {
        }));

        describe('CordovaWakeuptimerService', function () {

            let $document: angular.IDocumentService;
            let $window: angular.IWindowService;
            let $log: angular.ILogService;
            let wakeUpPlugin: CordovaWakeupPlugin;

            beforeEach(() => inject(function (_$document_: typeof $document,
                                                         _$window_: typeof $window,
                                                         _$log_: typeof $log) {
                $document = _$document_;
                $window = _$window_;
                $log = _$log_;
            }));

            let addEventListenerSpy: jasmine.Spy;
            let fakeWakeuptimer: jasmine.SpyObj<IWakeUpTimer>;

            beforeEach(() => {
                addEventListenerSpy = spyOn($document[0], 'addEventListener').and.callThrough();
                fakeWakeuptimer = jasmine.createSpyObj<IWakeUpTimer>([
                    'schedule',
                    'cancel'
                ]);
            });

            function mockDeviceReadyEvent() {
                expect(($document[0] as Document).addEventListener).toHaveBeenCalledWith('deviceready', jasmine.any(Function));
                const eventCallback = addEventListenerSpy.calls.argsFor(0)[1];
                $window.wakeuptimer = fakeWakeuptimer;
                eventCallback();
            }

            describe('constructor', function () {
               it('should register deviceready event listener and acquire wakeupPlugin', function() {
                   expect(($document[0] as Document).addEventListener).not.toHaveBeenCalled();
                   inject(function (_cordovaWakeupPlugin_: CordovaWakeupPlugin) {
                       wakeUpPlugin = _cordovaWakeupPlugin_;
                   });
                   mockDeviceReadyEvent();
                   expect((wakeUpPlugin as any).wakeupPlugin).toBe(fakeWakeuptimer);
               });
            });

            describe('functional behaviour', function() {
                let wakeupCallback: jasmine.Spy;
                let wakeupCallback2: jasmine.Spy;
                beforeEach(() => {
                    wakeupCallback = jasmine.createSpy('wakeupCallback');
                    wakeupCallback2 = jasmine.createSpy('wakeupCallback2');
                });
                beforeEach(() => inject(function (_cordovaWakeupPlugin_: CordovaWakeupPlugin) {
                    wakeUpPlugin = _cordovaWakeupPlugin_;
                }));
                let successCallback: ngCordova.successCallback;
                let errorCallback: ngCordova.errorCallback;


                function mockSuccessfulSchedule() {
                    fakeWakeuptimer.schedule.and.callFake(function(success: ngCordova.successCallback,
                                                                   error: ngCordova.errorCallback,
                                                                   options: ngCordova.WakeupOptions) {
                        successCallback = success;
                        errorCallback = error;
                        for (let alarm of options.alarms) {
                            const alarmId = 60000 + alarm.extra.registerId;
                            success({type: 'set', id: alarmId, extra: JSON.stringify(alarm.extra)});
                        }
                    });
                }

                function mockManualSchedule() {
                    fakeWakeuptimer.schedule.and.callFake(function(success: ngCordova.successCallback,
                                                                   error: ngCordova.errorCallback,
                                                                   options: ngCordova.WakeupOptions) {
                        successCallback = success;
                        errorCallback = error;
                    });
                }

                function mockTriggerWakeup(registerId: number, alarmId?: number) {
                    if (alarmId === undefined) {
                        alarmId = 60000 + registerId;
                    }
                    successCallback({type: 'wakeup', id: 60000 + registerId, extra: JSON.stringify({registerId})});
                }

                describe('supported', function() {
                    it('should return true if cordova is defined', function() {
                        $window.cordova = {} as Cordova;
                        expect(wakeUpPlugin.supported).toBe(true);
                    });
                    it('should return false if cordova is undefined', function() {
                        $window.cordova = undefined as any as Cordova;
                        expect(wakeUpPlugin.supported).toBe(false);
                    });
                });
                describe('scheduleAfterElapsedSeconds', function() {
                    function getAlarmOptions (args: {seconds: number, registerId: number}) {
                        return {
                            alarms: [
                                {
                                    type: 'relative',
                                    time: {seconds: args.seconds},
                                    extra: {registerId: args.registerId},
                                }
                            ]
                        };
                    }
                    describe('with plugin loaded', function() {
                        beforeEach(function() {
                            mockDeviceReadyEvent();
                        });

                        it('should schedule wakeup in wakeupPlugin', async function(done) {
                            mockSuccessfulSchedule();
                            const seconds = 123;
                            const wakeupReference = await wakeUpPlugin.scheduleAfterElapsedSeconds(seconds, wakeupCallback);

                            expect(fakeWakeuptimer.schedule).toHaveBeenCalledWith(
                                (wakeUpPlugin as any).cordovaSuccessCallback,
                                (wakeUpPlugin as any).cordovaErrorCallback,
                                getAlarmOptions({seconds, registerId: 0})
                            );
                            expect(wakeupReference).toEqual({
                                alarmId: 60000,
                                registerId: 0
                            });
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            done();
                        });
                        it('should schedule multiple wakeups in wakeupPlugin', async function(done) {
                            mockSuccessfulSchedule();
                            const seconds1 = 123;
                            const seconds2 = 32;
                            const wakeupReference1 = await wakeUpPlugin.scheduleAfterElapsedSeconds(seconds1, wakeupCallback);
                            const wakeupReference2 = await wakeUpPlugin.scheduleAfterElapsedSeconds(seconds2, wakeupCallback);

                            expect(fakeWakeuptimer.schedule.calls.argsFor(0)).toEqual([
                                (wakeUpPlugin as any).cordovaSuccessCallback,
                                (wakeUpPlugin as any).cordovaErrorCallback,
                                getAlarmOptions({seconds: seconds1, registerId: 0})
                            ]);
                            expect(fakeWakeuptimer.schedule.calls.argsFor(1)).toEqual([
                                (wakeUpPlugin as any).cordovaSuccessCallback,
                                (wakeUpPlugin as any).cordovaErrorCallback,
                                getAlarmOptions({seconds: seconds2, registerId: 1})
                            ]);
                            expect(wakeupReference1).toEqual({
                                alarmId: 60000,
                                registerId: 0
                            });
                            expect(wakeupReference2).toEqual({
                                alarmId: 60001,
                                registerId: 1
                            });
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            done();
                        });
                        // We cannot test that the Promise is still pending, therefore we check the logs instead.
                        it('should log once if cordovaSuccessCallback is invoked without a result', function () {
                            mockManualSchedule();
                            wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback).then(() => {
                                fail('should not resolve');
                            });
                            spyOn($log, 'debug');
                            successCallback('null');
                            expect($log.debug).toHaveBeenCalledTimes(1);
                        });
                        it('should log unhandled type if cordovaSuccessCallback is invoked with incorrect type', function () {
                            mockManualSchedule();
                            wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback).then(() => {
                                fail('should not resolve');
                            });
                            let logSpy = spyOn($log, 'debug');
                            successCallback({type: 'something', id: 0});
                            expect($log.debug).toHaveBeenCalledTimes(2);
                            expect(logSpy.calls.argsFor(1)[0]).toMatch('wakeup unhandled type');
                        });
                        it('should log twice if cordovaSuccessCallback is invoked with a result & set type', function () {
                            mockManualSchedule();
                            wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                            let logSpy = spyOn($log, 'debug').and.callThrough();
                            successCallback({type: 'set', id: 1, extra: JSON.stringify({registerId: 1})});
                            expect($log.debug).toHaveBeenCalledTimes(2);
                            expect(logSpy.calls.argsFor(1)[0]).toMatch('set');
                        });
                        it('should not call wakeupCallback if wakeup event for unregistered alarm is received', async function(done) {
                            mockSuccessfulSchedule();
                            await wakeUpPlugin.scheduleAfterElapsedSeconds(5, wakeupCallback);
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            mockTriggerWakeup(123);
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            done();
                        });
                        it('should call wakeupCallback if wakeup event is received', async function(done) {
                            mockSuccessfulSchedule();
                            await wakeUpPlugin.scheduleAfterElapsedSeconds(5, wakeupCallback);
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            mockTriggerWakeup(0);
                            expect(wakeupCallback).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should call wakeupCallback for each registered wakeup separately, if wakeup event is received', async function(done) {
                            mockSuccessfulSchedule();
                            let ref1 = await wakeUpPlugin.scheduleAfterElapsedSeconds(5, wakeupCallback);
                            let ref2 = await wakeUpPlugin.scheduleAfterElapsedSeconds(10, wakeupCallback2);
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            expect(wakeupCallback2).not.toHaveBeenCalled();
                            mockTriggerWakeup(ref1.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(1);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(0);
                            mockTriggerWakeup(ref1.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(2);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(0);
                            mockTriggerWakeup(ref2.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(2);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(1);
                            mockTriggerWakeup(ref1.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(3);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(1);
                            mockTriggerWakeup(ref1.registerId);
                            mockTriggerWakeup(ref2.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(4);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(2);
                            mockTriggerWakeup(ref2.registerId);
                            expect(wakeupCallback).toHaveBeenCalledTimes(4);
                            expect(wakeupCallback2).toHaveBeenCalledTimes(3);
                            done();
                        });
                        it('should log an error if cordovaErrorCallback is invoked', async function(done) {
                            mockSuccessfulSchedule();
                            await wakeUpPlugin.scheduleAfterElapsedSeconds(5, wakeupCallback);
                            let logSpy = spyOn($log, 'debug').and.callThrough();
                            errorCallback();
                            expect(wakeupCallback).not.toHaveBeenCalled();
                            expect(logSpy).toHaveBeenCalledWith('WakeupPlugin: unknown error received');
                            let error = 'test error';
                            errorCallback(error);
                            expect(logSpy.calls.argsFor(1)).toEqual(['WakeupPlugin: error received: ' + error]);
                            done();
                        });
                    });
                    describe('with plugin not loaded', function() {
                        it('should reject promise', async function(done) {
                            await expectThrowsAsync(async () => {
                                await wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                            }, 'WakeUpPlugin not yet initialized!');
                            done();
                        });
                        it('should not cancel failed schedule', async function(done) {
                            await expectThrowsAsync(async () => {
                                await wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                            }, 'WakeUpPlugin not yet initialized!');
                            wakeUpPlugin.cancel({alarmId: 60000, registerId: 0});
                            expect(fakeWakeuptimer.cancel).not.toHaveBeenCalled();
                            done();
                        });
                    });
                });
                describe('cancel', function() {
                    beforeEach(function() {
                        mockDeviceReadyEvent();
                    });

                    it('should cancel scheduled wakeup', async function(done) {
                        mockSuccessfulSchedule();
                        let ref = await wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                        wakeUpPlugin.cancel(ref);
                        mockTriggerWakeup(ref.registerId);
                        expect(wakeupCallback).not.toHaveBeenCalled();
                        done();
                    });

                    it('should cancel scheduled wakeup, if called after wakeup', async function(done) {
                        mockSuccessfulSchedule();
                        let ref = await wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                        mockTriggerWakeup(ref.registerId);
                        mockTriggerWakeup(ref.registerId);
                        expect(wakeupCallback).toHaveBeenCalledTimes(2);
                        wakeUpPlugin.cancel(ref);
                        mockTriggerWakeup(ref.registerId);
                        expect(wakeupCallback).toHaveBeenCalledTimes(2);
                        done();
                    });
                    it('should cancel only cancelled wakeup, not others', async function(done) {
                        mockSuccessfulSchedule();
                        let ref = await wakeUpPlugin.scheduleAfterElapsedSeconds(123, wakeupCallback);
                        let ref2 = await wakeUpPlugin.scheduleAfterElapsedSeconds(42, wakeupCallback2);
                        mockTriggerWakeup(ref.registerId);
                        mockTriggerWakeup(ref2.registerId);
                        expect(wakeupCallback).toHaveBeenCalledTimes(1);
                        expect(wakeupCallback2).toHaveBeenCalledTimes(1);
                        wakeUpPlugin.cancel(ref);
                        mockTriggerWakeup(ref.registerId);
                        mockTriggerWakeup(ref2.registerId);
                        expect(wakeupCallback).toHaveBeenCalledTimes(1);
                        expect(wakeupCallback2).toHaveBeenCalledTimes(2);
                        done();
                    });
                    it('should not cancel non-registered alarm', function() {
                        wakeUpPlugin.cancel({alarmId: 60000, registerId: 0});
                        expect(fakeWakeuptimer.cancel).not.toHaveBeenCalled();
                    });
                })
            });
        });
    });
}
