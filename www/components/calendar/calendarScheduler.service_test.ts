'use strict';

module rehagoal.calendar {
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    import INotification = ngCordova.INotification;
    import NotificationEvent = ngCordova.NotificationEvent;
    import IAngularWebNotification = angularWebNotification.IAngularWebNotification;
    describe('rehagoal.calendar', function () {
        describe('CalendarSchedulerService', function () {
            let isCordovaSpy: jasmine.Spy;

            beforeEach(() => angular.mock.module('rehagoal.calendar'));
            beforeEach(() => angular.mock.module('rehagoal.utilities', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('isCordova', function ($delegate: () => boolean) {
                    isCordovaSpy = jasmine.createSpy('isCordova', $delegate).and.callThrough();
                    return isCordovaSpy;
                })
            }));
            beforeEach(() => inject(function(_isCordova_: () => boolean) {

            }));
            describe('constructor', function() {
                function testConstructorSchedulerImpl(cordovaExpected: boolean) {
                    inject(function(_calendarSchedulerService_: ICalendarSchedulerService,
                                    _cordovaCalendarScheduler_: CalendarScheduler,
                                    _webCalendarScheduler_: CalendarScheduler) {
                        const calendarSchedulerService = _calendarSchedulerService_;
                        const cordovaCalendarScheduler = _cordovaCalendarScheduler_;
                        const webCalendarScheduler = _webCalendarScheduler_;
                        const expectedCalendarScheduler = cordovaExpected ? cordovaCalendarScheduler : webCalendarScheduler;
                        const unexpectedCalendarScheduler = cordovaExpected ? webCalendarScheduler : cordovaCalendarScheduler;
                        expect(isCordovaSpy).toHaveBeenCalledTimes(1);
                        expect(calendarSchedulerService['schedulerImpl']).toEqual(expectedCalendarScheduler);
                        expect(calendarSchedulerService['schedulerImpl']).not.toEqual(unexpectedCalendarScheduler);
                        expect(expectedCalendarScheduler['eventHandler']).toEqual(calendarSchedulerService['calendarEventHandler']);
                        expect(unexpectedCalendarScheduler['eventHandler']).not.toEqual(calendarSchedulerService['calendarEventHandler']);
                    });
                }
                it('should set schedulerImpl to cordova, if isCordova returns true', function () {
                    isCordovaSpy.and.returnValue(true);
                    testConstructorSchedulerImpl(true);
                });
                it('should set schedulerImpl to web scheduler, if isCordova returns false', function () {
                    isCordovaSpy.and.returnValue(false);
                    testConstructorSchedulerImpl(false);
                });
            });

            describe('methods', function() {
                let calendarSchedulerService: ICalendarSchedulerService;
                let calendarSchedulerImpl: CalendarScheduler;
                let $rootScope: angular.IRootScopeService;

                const testEvent: CalendarEvent = {
                    uuid: 'testUUID',
                    date: new Date(2019, 1, 2, 3, 4),
                    workflowIDs: [0, 1, 2]
                };
                const events = [testEvent];

                beforeEach(inject((_$rootScope_: angular.IRootScopeService) => {
                    $rootScope = _$rootScope_;
                }));

                function forwardCallsToSchedulerImplTestSuite() {
                    describe('scheduleEvents', function() {
                        it('should forward call to schedulerImpl.registerEvents', async function(done) {
                            let registerEventsSpy = spyOn(calendarSchedulerImpl, 'registerEvents').and.returnValue(Promise.resolve());
                            await calendarSchedulerService.scheduleEvents(events);
                            expect(registerEventsSpy).toHaveBeenCalledWith(events);
                            done();
                        });
                    });
                    describe('scheduleEventsImmediate', function() {
                        it('should forward call to schedulerImpl.triggerEvents', async function(done) {
                            let triggerEventsSpy = spyOn(calendarSchedulerImpl, 'triggerEvents').and.returnValue(Promise.resolve());
                            await calendarSchedulerService.scheduleEventsImmediate(events);
                            expect(triggerEventsSpy).toHaveBeenCalledWith(events);
                            done();
                        });
                    });
                    describe('unscheduleEvents', function() {
                        it('should forward call to schedulerImpl.unregisterEvents', async function(done) {
                            let unregisterEventsSpy = spyOn(calendarSchedulerImpl, 'unregisterEvents').and.returnValue(Promise.resolve());
                            const uuids = events.map((event) => event.uuid);
                            await calendarSchedulerService.unscheduleEvents(uuids);
                            expect(unregisterEventsSpy).toHaveBeenCalledWith(uuids);
                            done();
                        });
                    });
                }

                describe('on web', function() {
                    beforeEach(function () {
                        isCordovaSpy.and.returnValue(false);
                    });
                    beforeEach(() => inject(function(_calendarSchedulerService_: ICalendarSchedulerService) {
                        calendarSchedulerService = _calendarSchedulerService_;
                    }));
                    beforeEach(() => inject(function(_webCalendarScheduler_: CalendarScheduler) {
                        calendarSchedulerImpl = _webCalendarScheduler_;
                    }));
                    forwardCallsToSchedulerImplTestSuite();

                    describe('scheduleEventsImmediate', function() {
                        it('should broadcast "CalendarScheduler::calendarEventTriggered" if event is triggered', async function(done) {
                            let broadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();
                            await calendarSchedulerService.scheduleEventsImmediate(events);
                            expect(broadcastSpy).toHaveBeenCalledWith("CalendarScheduler::calendarEventTriggered", testEvent);
                            done();
                        })
                    });
                });
                describe('on cordova', function() {
                    beforeEach(function () {
                        isCordovaSpy.and.returnValue(true);
                    });
                    beforeEach(() => inject(function(_calendarSchedulerService_: ICalendarSchedulerService) {
                        calendarSchedulerService = _calendarSchedulerService_;
                    }));
                    beforeEach(() => inject(function(_cordovaCalendarScheduler_: CalendarScheduler) {
                        calendarSchedulerImpl = _cordovaCalendarScheduler_;
                    }));
                    forwardCallsToSchedulerImplTestSuite();
                });
            });
        });
        const testEvent1: CalendarEvent = {
            uuid: 'testUUID1',
            workflowIDs: [42, 3],
            date: new Date(2019, 1, 2, 3 , 4)
        };
        const testEvent2SameUUID: CalendarEvent = {
            uuid: 'testUUID1',
            workflowIDs: [1, 2, 4],
            date: new Date(2019, 5, 3, 2 , 1)
        };
        const testEvent3: CalendarEvent = {
            uuid: 'testUUID3',
            workflowIDs: [1, 2, 4],
            date: new Date(2019, 6, 4, 1 , 34)
        };
        const testEvent4: CalendarEvent = {
            uuid: 'testUUID4',
            workflowIDs: [123],
            date: new Date(2020, 11, 10, 3 , 28)
        };
        describe('WebCalendarScheduler', function () {
            const CHECK_EVENTS_INTERVAL = 30 * MILLISECONDS_PER_SECOND;
            describe('constructor', function () {
                let $intervalSpy: jasmine.Spy;
                beforeEach(() => angular.mock.module('rehagoal.calendar', function ($provide: angular.auto.IProvideService) {
                    $provide.decorator('$interval', function ($delegate: angular.IIntervalService) {
                        $intervalSpy = jasmine.createSpy('$interval', $delegate).and.callThrough();
                        return $intervalSpy;
                    });
                }));
                beforeEach(() => {
                    jasmine.clock().install();
                });
                afterEach(() => {
                    jasmine.clock().uninstall();
                });
                beforeEach(inject(function(_$interval_: angular.IIntervalService) {
                }));
                function testScheduleNextInterval(mockDate: Date, expectedInterval: number) {
                    jasmine.clock().mockDate(mockDate);
                    expect($intervalSpy).not.toHaveBeenCalled();
                    inject(function(_webCalendarScheduler_: CalendarScheduler) {
                    });
                    expect($intervalSpy).toHaveBeenCalledWith(jasmine.any(Function), expectedInterval, 1);
                }
                it('should schedule $interval for next 30 seconds, if next minute is further away than 30 seconds #1', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 0), CHECK_EVENTS_INTERVAL);
                });
                it('should schedule $interval for next 30 seconds, if next minute is further away than 30 seconds #2', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 29), CHECK_EVENTS_INTERVAL);
                });
                it('should schedule $interval for next 30 seconds, if next minute is further away than 30 seconds #2', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 30), CHECK_EVENTS_INTERVAL);
                });
                it('should schedule $interval for for next full minute, if next minute is closer than 30 seconds #1', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 45), 15 * MILLISECONDS_PER_SECOND);
                });
                it('should schedule $interval for for next full minute, if next minute is closer than 30 seconds #2', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 59), 1 * MILLISECONDS_PER_SECOND);
                });
                it('should schedule $interval for for next full minute, if next minute is closer than 30 seconds #3 (ignoring millis)', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 45, 500), 15 * MILLISECONDS_PER_SECOND);
                });
                it('should schedule $interval for for next full minute, if next minute is closer than 30 seconds #4', function() {
                    testScheduleNextInterval(new Date(2020, 1, 11, 13, 9, 31), 29 * MILLISECONDS_PER_SECOND);
                });
            });
            describe('behaviour', function() {
                let webCalendarScheduler : CalendarScheduler;
                let $interval: angular.IIntervalService;
                let $Date: DateConstructor;
                let $intervalSpy: jasmine.Spy;
                let $intervalCancelSpy: jasmine.Spy;
                let intervalCallbackFinished: Promise<any> = Promise.resolve();
                let webNotification: IAngularWebNotification;
                let showNotificationSpy: jasmine.Spy;
                beforeEach(() => angular.mock.module('rehagoal.calendar', function ($provide: angular.auto.IProvideService) {
                    $provide.decorator('$interval', function ($delegate: angular.IIntervalService) {
                        $intervalSpy = jasmine.createSpy('$interval', $delegate).and.callFake(function(func: Function, delay: number, count?: number, invokeApply?: boolean, ...args: any[]) {
                            // reschedule of checkForEvents occurs asynchronously, thus we have to wait for the interval callback to have finished
                            // This wrapper helps us to do this (gives us a promise to wait for).
                            // Only works with asynchronous interval callbacks
                            const wrapperFunc = async (...wrapperArgs: any[]) => {
                                intervalCallbackFinished = new Promise((resolve, reject) => {
                                    func(...wrapperArgs).then(resolve).catch(reject);
                                });
                                await intervalCallbackFinished;
                            };
                            $delegate(wrapperFunc, delay, count, invokeApply, ...args);
                        });
                        $intervalCancelSpy = spyOn($intervalSpy as any, 'cancel').and.callThrough();
                        $interval = $delegate;
                        return $intervalSpy;
                    });
                }));
                beforeEach(function() {
                    jasmine.clock().install();
                });
                beforeEach(() => inject(function(_$interval_: angular.IIntervalService, _$Date_: DateConstructor, _webCalendarScheduler_: CalendarScheduler, _webNotification_: IAngularWebNotification) {
                    $interval = _$interval_;
                    $Date = _$Date_;
                    webCalendarScheduler = _webCalendarScheduler_;
                    webNotification = _webNotification_;
                    showNotificationSpy = spyOn(webNotification, "showNotification").and.callThrough();
                }));
                afterEach(function() {
                    jasmine.clock().uninstall();
                });
                async function flushIntervalAndAwaitIntervalHandler(flushMs: number) {
                    $interval.flush(flushMs);
                    // In case the no callback was invoked, the promise will simply be the last one, there will be already resolved
                    await intervalCallbackFinished;
                }
                describe('triggering of events', function() {
                    it('should not throw exceptions with missing eventHandler', async function(done) {
                        await tryOrFailAsync(async () => {
                            for (let i = 0; i < 10; ++i) {
                                await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            }
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            jasmine.clock().mockDate(testEvent1.date);
                            for (let i = 0; i < 10; ++i) {
                                await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            }
                        });
                        done();
                    });
                    describe('registerEvents', function() {
                        it('should not allow registration of multiple events with the same UUID (same call)', async function(done) {
                            await expectThrowsAsync(async () => {
                                await webCalendarScheduler.registerEvents([testEvent1, testEvent1]);
                            }, 'Found a duplicate event UUID: testUUID1.');
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                            done();
                        });
                        it('should not allow registration of multiple events with the same UUID (different call)', async function(done) {
                            await expectThrowsAsync(async () => {
                                await webCalendarScheduler.registerEvents([testEvent1]);
                                await webCalendarScheduler.registerEvents([testEvent1]);
                            }, /already an event registered with UUID testUUID1/);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(1);
                            done();
                        });
                        it('should not allow registration of multiple events with the same UUID (same call, different events)', async function(done) {
                            await expectThrowsAsync(async () => {
                                await webCalendarScheduler.registerEvents([testEvent1, testEvent2SameUUID]);
                            }, 'Found a duplicate event UUID: testUUID1.');
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                            done();
                        });
                        it('should allow registration of multiple events', async function(done) {
                            await webCalendarScheduler.registerEvents([testEvent1, testEvent3]);
                            await webCalendarScheduler.registerEvents([testEvent4]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(3);
                            done();
                        });
                    });
                    describe('unregisterEvents', function() {
                        it('should not throw errors for non-registered events', async function(done) {
                            await webCalendarScheduler.unregisterEvents(['testUUID1', 'testUUID2']);
                            await webCalendarScheduler.unregisterEvents(['testUUID3']);
                            await webCalendarScheduler.unregisterEvents([]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                            done();
                        });
                        it('should allow de-registration and re-registration of events', async function(done) {
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(1);
                            await webCalendarScheduler.unregisterEvents([testEvent1.uuid]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                            await webCalendarScheduler.registerEvents([testEvent2SameUUID, testEvent3]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(2);
                            await expectThrowsAsync(async () => {
                                await webCalendarScheduler.registerEvents([testEvent3]);
                            }, /already an event registered with UUID testUUID3/);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(2);
                            await webCalendarScheduler.unregisterEvents([testEvent3.uuid]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(1);
                            await webCalendarScheduler.registerEvents([testEvent3]);
                            expect((await webCalendarScheduler.getRegisteredEvents()).length).toBe(2);
                            done();
                        });
                    });
                    describe('with registered eventHandler', function() {
                        let triggerSpy: jasmine.Spy;
                        beforeEach(function() {
                            triggerSpy = jasmine.createSpy('triggerEvent');
                            webCalendarScheduler.setEventHandler(triggerSpy);
                        });
                        it('should not trigger events if none scheduled', async function (done) {
                            for (let i = 0; i < 10; ++i) {
                                await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                                expect(triggerSpy).not.toHaveBeenCalled();
                            }
                            done();
                        });
                        it('should not trigger for events in the future', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3));
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            for (let i = 0; i < 10; ++i) {
                                await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                                expect(triggerSpy).not.toHaveBeenCalled();
                            }

                            done();
                        });
                        it('should trigger once an event is in the present', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3));
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(CHECK_EVENTS_INTERVAL);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(CHECK_EVENTS_INTERVAL-1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            since(`Expected not to show notification @ ${new Date()}`).expect(showNotificationSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(1); // exactly trigger timestamp
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected to trigger @ ${new Date()}`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            since(`Expected to show notification @ ${new Date()}`).expect(showNotificationSpy).toHaveBeenCalledTimes(1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger again @ ${new Date()} (has already triggered)`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            since(`Expected not show notification again @ ${new Date()}`).expect(showNotificationSpy).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should trigger once an event is in the present (next full minute check)', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3, 45));
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            jasmine.clock().tick(5000);
                            await flushIntervalAndAwaitIntervalHandler(5000);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(5000);
                            await flushIntervalAndAwaitIntervalHandler(5000);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(5000-1);
                            await flushIntervalAndAwaitIntervalHandler(5000-1);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(1); // exactly trigger timestamp
                            await flushIntervalAndAwaitIntervalHandler(1);
                            since(`Expected to trigger @ ${new Date()}`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            await flushIntervalAndAwaitIntervalHandler(2 * CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger again @ ${new Date()} (has already triggered)`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should trigger once an event is in the past (1 ms late)', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3));
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            jasmine.clock().tick(CHECK_EVENTS_INTERVAL * 2 - 1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL * 2 - 1);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(2); // trigger timestamp + 1 ms
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected to trigger @ ${new Date()}`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger again @ ${new Date()} (has already triggered)`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should trigger once an event is in the past (3500 ms late, next full minute)', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3, 50));
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            jasmine.clock().tick(13500);
                            await flushIntervalAndAwaitIntervalHandler(13500);
                            since(`Expected to trigger @ ${new Date()}`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger again @ ${new Date()} (has already triggered)`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should trigger once an event is in the past (2 minutes late)', async function(done) {
                            jasmine.clock().mockDate(new Date(2019, 1, 2, 3, 3));
                            await webCalendarScheduler.registerEvents([testEvent1]);
                            jasmine.clock().tick(CHECK_EVENTS_INTERVAL);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger @ ${new Date()}`).expect(triggerSpy).not.toHaveBeenCalled();
                            jasmine.clock().tick(3 * MINUTE_IN_MILLISECONDS - CHECK_EVENTS_INTERVAL); // 2 minutes late
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected to trigger @ ${new Date()}`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            await flushIntervalAndAwaitIntervalHandler(CHECK_EVENTS_INTERVAL);
                            since(`Expected not to trigger again @ ${new Date()} (has already triggered)`).expect(triggerSpy).toHaveBeenCalledTimes(1);
                            done();
                        });
                        describe('triggerEvents', function() {
                            it('should trigger events immediately, even if not registered', async function(done) {
                                jasmine.clock().mockDate(new Date(2000, 1, 2, 3, 3));
                                await webCalendarScheduler.triggerEvents([testEvent1, testEvent3]);
                                expect(triggerSpy).toHaveBeenCalledTimes(2);
                                expect(triggerSpy.calls.argsFor(0)).toEqual([testEvent1]);
                                expect(triggerSpy.calls.argsFor(1)).toEqual([testEvent3]);
                                done();
                            });
                            it('should call webNotification.showNotification for triggered events', async function(done) {
                                jasmine.clock().mockDate(new Date(2000, 1, 2, 3, 3));
                                await webCalendarScheduler.triggerEvents([testEvent1, testEvent4]);
                                expect(showNotificationSpy).toHaveBeenCalledWith(
                                    "RehaGoal: Anstehende Kalenderereignisse",
                                    {
                                        body: "- 03:04: 2 Workflows\n- 03:28: 1 Workflow",
                                        icon: "xxhdpi-icon.png"
                                    }
                                );
                                done();
                            });
                        });
                    });
                });
            });
        });
        describe('CordovaCalendarScheduler', function() {
            describe('methods', function () {
                let cordovaCalendarScheduler: CalendarScheduler;
                let $rootScope: angular.IRootScopeService;
                let cordovaLocalNotificationSpy: jasmine.SpyObj<ngCordova.ILocalNotification>;
                beforeEach(() => angular.mock.module('rehagoal.calendar', function ($provide: angular.auto.IProvideService) {
                    $provide.decorator('$cordovaLocalNotification', function ($delegate: ngCordova.ILocalNotification) {
                        cordovaLocalNotificationSpy = jasmine.createSpyObj<ngCordova.ILocalNotification>('cordovaLocalNotification',[
                            'schedule',
                            'getIds',
                            'getAll',
                            'cancel'
                        ]);
                        let notificationStorage: string[] = [];
                        cordovaLocalNotificationSpy.schedule.and.callFake(async function(notification: INotification) {
                            let notificationClone = angular.copy(notification);
                            notificationClone.data = JSON.stringify(notificationClone.data);
                            notificationStorage.push(JSON.stringify(notificationClone));
                        });
                        cordovaLocalNotificationSpy.getIds.and.callFake(async function() {
                            return notificationStorage.map((x) => JSON.parse(x).id);
                        });
                        cordovaLocalNotificationSpy.getAll.and.callFake(async function() {
                            return notificationStorage.map((x) => JSON.parse(x));
                        });
                        cordovaLocalNotificationSpy.cancel.and.callFake(async function(ids: number[]) {
                            const idSet = new Set(ids);
                            notificationStorage = notificationStorage.filter((x) => !idSet.has(JSON.parse(x).id));
                        });
                        return cordovaLocalNotificationSpy;
                    });
                }));
                beforeEach(() => inject(function(_cordovaCalendarScheduler_: CalendarScheduler,
                                                            _$document_: angular.IDocumentService,
                                                            _$rootScope_: angular.IRootScopeService) {
                    cordovaCalendarScheduler = _cordovaCalendarScheduler_;
                    $rootScope = _$rootScope_;
                    // Trigger cordova ready
                    (_$document_[0] as Document).dispatchEvent(new Event('deviceready'));
                }));
                describe('registerEvents', function () {
                    it('should not allow registration of multiple events with the same UUID (same call)', async function(done) {
                        await expectThrowsAsync(async () => {
                            await cordovaCalendarScheduler.registerEvents([testEvent1, testEvent1]);
                        }, 'Found a duplicate event UUID: testUUID1.');
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                        done();
                    });
                    it('should not allow registration of multiple events with the same UUID (different call)', async function(done) {
                        await expectThrowsAsync(async () => {
                            await cordovaCalendarScheduler.registerEvents([testEvent1]);
                            await cordovaCalendarScheduler.registerEvents([testEvent1]);
                        }, /already an event registered with UUID testUUID1/);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(1);
                        done();
                    });
                    it('should not allow registration of multiple events with the same UUID (same call, different events)', async function(done) {
                        await expectThrowsAsync(async () => {
                            await cordovaCalendarScheduler.registerEvents([testEvent1, testEvent2SameUUID]);
                        }, 'Found a duplicate event UUID: testUUID1.');
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                        done();
                    });
                    it('should allow registration of multiple events', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1, testEvent3]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 1,
                            text: 'Ereignis startet um 03:04',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent1,
                            trigger: {
                                at: testEvent1.date
                            }
                        }));
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 2,
                            text: 'Ereignis startet um 01:34',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent3,
                            trigger: {
                                at: testEvent3.date
                            }
                        }));
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(2);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(2);
                        await cordovaCalendarScheduler.registerEvents([testEvent4]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 3,
                            text: 'Ereignis startet um 03:28',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent4,
                            trigger: {
                                at: testEvent4.date
                            }
                        }));
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(3);
                        await cordovaCalendarScheduler.registerEvents([]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(3);
                        done();
                    });
                });
                describe('unregisterEvents', function() {
                    it('should not throw errors for non-registered events', async function(done) {
                        await cordovaCalendarScheduler.unregisterEvents(['testUUID1', 'testUUID2']);
                        expect(cordovaLocalNotificationSpy.cancel).toHaveBeenCalledTimes(1);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                        await cordovaCalendarScheduler.unregisterEvents(['testUUID3']);
                        expect(cordovaLocalNotificationSpy.cancel).toHaveBeenCalledTimes(2);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                        await cordovaCalendarScheduler.unregisterEvents([]);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(0);
                        done();
                    });
                    it('should allow de-registration and re-registration of events', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1]);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(1);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(1);
                        await cordovaCalendarScheduler.unregisterEvents([testEvent1.uuid]);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(2);
                        expect(cordovaLocalNotificationSpy.cancel).toHaveBeenCalledTimes(1);
                        await cordovaCalendarScheduler.registerEvents([testEvent2SameUUID, testEvent3]);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(3);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        await expectThrowsAsync(async () => {
                            await cordovaCalendarScheduler.registerEvents([testEvent3]);
                        }, /already an event registered with UUID testUUID3/);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(4);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        await cordovaCalendarScheduler.unregisterEvents([testEvent3.uuid]);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(5);
                        expect(cordovaLocalNotificationSpy.cancel).toHaveBeenCalledTimes(2);
                        await cordovaCalendarScheduler.registerEvents([testEvent3]);
                        expect(cordovaLocalNotificationSpy.getAll).toHaveBeenCalledTimes(6);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(4);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents()).length).toBe(2);
                        expect((await cordovaCalendarScheduler.getRegisteredEvents())).toEqual(
                            jasmine.arrayWithExactContents([testEvent2SameUUID, testEvent3])
                        );
                        done();
                    });
                });
                describe('triggerEvents', function () {
                    it('should schedule events with undefined trigger', async function(done) {
                        await cordovaCalendarScheduler.triggerEvents([testEvent1, testEvent3]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 1,
                            text: 'Ereignis startet um 03:04',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent1,
                        }));
                        expect(cordovaLocalNotificationSpy.schedule.calls.argsFor(0)[0]).not.toEqual(jasmine.objectContaining({
                            trigger: jasmine.anything()
                        }));
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 2,
                            text: 'Ereignis startet um 01:34',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent3,
                        }));
                        expect(cordovaLocalNotificationSpy.schedule.calls.argsFor(1)[0]).not.toEqual(jasmine.objectContaining({
                            trigger: jasmine.anything()
                        }));
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(2);
                        await cordovaCalendarScheduler.triggerEvents([testEvent4]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledWith(jasmine.objectContaining({
                            id: 3,
                            text: 'Ereignis startet um 03:28',
                            title: 'Geplantes Ereignis',
                            wakeup: true,
                            launch: true,
                            data: testEvent4,
                        }));
                        expect(cordovaLocalNotificationSpy.schedule.calls.argsFor(2)[0]).not.toEqual(jasmine.objectContaining({
                            trigger: jasmine.anything()
                        }));
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        await cordovaCalendarScheduler.triggerEvents([]);
                        expect(cordovaLocalNotificationSpy.schedule).toHaveBeenCalledTimes(3);
                        done();
                    });
                });
                async function broadcastLocalNotificationEvent(calendarEvent: CalendarEvent | undefined, eventType: "trigger" | "click"): Promise<void> {
                    const notifications = await cordovaLocalNotificationSpy.getAll();
                    const defaultNotification: INotification = {
                        id: 0,
                        title: 'Some other notification',
                        text: 'Some notification text',
                    };
                    let notification: INotification | undefined = defaultNotification;
                    if (calendarEvent) {
                        notification = notifications.find((notification) => JSON.parse(notification.data).uuid === calendarEvent.uuid)
                    }
                    if (calendarEvent && !notification) {
                        throw new Error('[TEST] Could not find registered notification for event with UUID ' + calendarEvent.uuid)
                    }
                    const notificationEvent: NotificationEvent = {
                        event: eventType,
                        foreground: true,
                        queued: true,
                        notification: notification!.id!
                    };
                    $rootScope.$broadcast('$cordovaLocalNotification:' + eventType, notification, notificationEvent);
                }
                describe('without registered event handler', function() {
                    it('should not throw errors when notification is triggered', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1]);
                        await broadcastLocalNotificationEvent(testEvent1, "trigger");
                        done();
                    });
                    it('should not throw errors when notification is clicked', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1]);
                        await broadcastLocalNotificationEvent(testEvent1, "click");
                        done();
                    });
                });
                describe('with registered event handler', function() {
                    let triggerSpy: jasmine.Spy;
                    beforeEach(function() {
                        triggerSpy = jasmine.createSpy('triggerEvent');
                        cordovaCalendarScheduler.setEventHandler(triggerSpy);
                    });
                    it('should not trigger events if none scheduled', async function (done) {
                        await broadcastLocalNotificationEvent(undefined, "trigger");
                        await broadcastLocalNotificationEvent(undefined, "click");
                        expect(triggerSpy).not.toHaveBeenCalled();
                        done();
                    });
                    it('should trigger event handler, on cordova trigger event', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1]);
                        await broadcastLocalNotificationEvent(testEvent1, "trigger");
                        expect(triggerSpy).toHaveBeenCalledWith(testEvent1);
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should trigger event handler, on cordova click event', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent3, "click");
                        expect(triggerSpy).toHaveBeenCalledWith(testEvent3);
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should trigger event handler, on cordova trigger event, with triggered event', async function(done) {
                        await cordovaCalendarScheduler.triggerEvents([testEvent4]);
                        await broadcastLocalNotificationEvent(testEvent4, "trigger");
                        expect(triggerSpy).toHaveBeenCalledWith(testEvent4);
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should trigger event handler, on cordova click event, with triggered event', async function(done) {
                        await cordovaCalendarScheduler.triggerEvents([testEvent1]);
                        await broadcastLocalNotificationEvent(testEvent1, "click");
                        expect(triggerSpy).toHaveBeenCalledWith(testEvent1);
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should trigger event handler, on cordova trigger event, with triggered event', async function(done) {
                        await cordovaCalendarScheduler.triggerEvents([testEvent4]);
                        await broadcastLocalNotificationEvent(testEvent4, "trigger");
                        expect(triggerSpy).toHaveBeenCalledWith(testEvent4);
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        done();
                    });
                    it('should trigger event handler, on cordova trigger/click event, multiple times', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent3, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent3, "click");
                        expect(triggerSpy).toHaveBeenCalledTimes(2);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent3, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(3);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent3, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(4);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent3]);
                        done();
                    });
                    it('should trigger correct events, on cordova events, with multiple registered events', async function(done) {
                        await cordovaCalendarScheduler.registerEvents([testEvent1, testEvent3, testEvent4]);
                        await broadcastLocalNotificationEvent(testEvent3, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(1);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent3]);
                        await broadcastLocalNotificationEvent(testEvent1, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(2);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent1]);
                        await broadcastLocalNotificationEvent(testEvent4, "trigger");
                        expect(triggerSpy).toHaveBeenCalledTimes(3);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent4]);
                        await broadcastLocalNotificationEvent(testEvent1, "click");
                        expect(triggerSpy).toHaveBeenCalledTimes(4);
                        expect(triggerSpy.calls.mostRecent().args).toEqual([testEvent1]);
                        done();
                    })
                });
            });
        });
    });
}
