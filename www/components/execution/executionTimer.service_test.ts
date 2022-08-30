'use strict';

module rehagoal.workflow {
    describe('rehagoal.workflow', function () {
        let timerService: ExecutionTimerService;
        let $rootScope: angular.IRootScopeService, $document: angular.IDocumentService,
            $timeout: angular.ITimeoutService;
        let spyBrowserExecutionTimerFactory: jasmine.Spy, spyCordovaExecutionTimerFactory: jasmine.Spy;
        let mockCordovaLocalNotification: jasmine.SpyObj<ngCordova.ILocalNotification>,
            mockCordovaWakeupPlugin: jasmine.SpyObj<CordovaWakeupPlugin>

        const SECONDS_PER_MINUTE = 60;
        const MINUTES_PER_HOUR = 60;
        const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

        type TimeBase = 's'|'m'|'h';

        // FIXME: private property accesses in many places (search for regex "(\._[a-zA-Z_]+)|\[\'[a-zA-Z_]+\'\]")

        beforeEach(() => angular.mock.module('rehagoal.workflow', function ($provide: angular.auto.IProvideService) {
            $provide.decorator('BrowserExecutionTimerFactory', function ($delegate: Function) {
                spyBrowserExecutionTimerFactory = jasmine.createSpy('BrowserExecutionTimerFactory', $delegate).and.callThrough();
                return spyBrowserExecutionTimerFactory;
            });
            $provide.decorator('CordovaExecutionTimerFactory', function ($delegate: Function) {
                spyCordovaExecutionTimerFactory = jasmine.createSpy('CordovaExecutionTimerFactory', $delegate).and.callThrough();
                return spyCordovaExecutionTimerFactory;
            });
            mockCordovaWakeupPlugin = jasmine.createSpyObj(['scheduleAfterElapsedSeconds', 'cancel']);
            mockCordovaLocalNotification = jasmine.createSpyObj(['schedule', 'cancel']);
            $provide.value('$cordovaLocalNotification', mockCordovaLocalNotification);
            $provide.value('cordovaWakeupPlugin', mockCordovaWakeupPlugin);
        }));

        beforeEach(inject(function (_$rootScope_: angular.IRootScopeService, _$document_: angular.IDocumentService, _$timeout_: angular.ITimeoutService) {
            $rootScope = _$rootScope_;
            $document = _$document_;
            $timeout = _$timeout_;
        }));

        function getTimerDataObject(description: string, time: number, base: TimeBase) {
            return {description: description, time: time, time_base: base};
        }

        function checkExecutionTimerBaseProperties(executionTimer: ExecutionTimer, timer_desc: string, timer_time: number, spyTrigger: jasmine.Spy) {
            expect(executionTimer['description']).toBeDefined();
            expect(executionTimer['description']).toEqual(timer_desc);
            expect(executionTimer['time']).toBeDefined();
            //the execution timer directly changes all minutes and hours to seconds, thus resulting in a timer time * 60 and a time base of 's'
            expect(executionTimer['time']).toEqual(timer_time * 60);
            expect(executionTimer['time_base']).toBeDefined();
            expect(executionTimer['time_base']).toEqual('s');
            expect(executionTimer['timerServiceCallback']).toBeDefined();
            expect(executionTimer['timerServiceCallback']).toBe(spyTrigger);
            expect(executionTimer.trigger).toBeDefined();
            expect(executionTimer.getTimeInSeconds).toBeDefined();
            expect(executionTimer.getTimeInSeconds()).toEqual(timer_time * 60);
            expect(executionTimer.getDescription).toBeDefined();
            expect(executionTimer.getDescription()).toEqual(timer_desc);
            expect(executionTimer.startTimer).toBeDefined();
            expect(executionTimer.stopTimer).toBeDefined();
        }

        describe('timerService (core)', function () {
            beforeEach(inject(function (_timerService_: ExecutionTimerService) {
                timerService = _timerService_;
            }));
            describe('properties and methods', function () {
                it('should have a controller', function () {
                    expect(timerService).toBeDefined();
                });
                it('should have a method "getTimerCount", default "0"', function () {
                    expect(timerService.getTimerCount).toBeDefined();
                    expect(timerService.getTimerCount()).toEqual(0);
                });
                it('should have a property "lastTimerNotification", default "0"', function () {
                    expect(timerService.lastTimerNotification).toBeDefined();
                    expect(timerService.lastTimerNotification).toBe(0);
                });
                it('should have a property "timerPaused", default "false"', function () {
                    expect(timerService.timerPaused).toBeDefined();
                    expect(timerService.timerPaused).toBeFalsy();
                });
                it('should have a property "timerFactory", default "null"', function () {
                    expect(timerService._timerFactory).toBeDefined();
                    expect(typeof timerService._timerFactory).toEqual("function");
                });

            });
            describe('functional behaviour', function () {
                let $broadcastSpy: jasmine.Spy;

                function setLastTimerNotification(value: number) {
                    timerService['_lastTimerNotification'] = value;
                }


                beforeEach(function() {
                    $broadcastSpy = spyOn($rootScope, '$broadcast');
                });

                function getTimerObject(text: string, time: number, base: TimeBase) {
                    return timerService._timerFactory(getTimerDataObject(text, time, base), () => false);
                }

                function importTimer(text: string, time: number, base: TimeBase) {
                    return timerService.addTimer(text, time, base);
                }

                it('should create a timer instance of type browser by default', function () {
                    expect(timerService._timerFactory).toBe(spyBrowserExecutionTimerFactory);
                });
                it('should add a timer and start it if addTimer is called', function () {
                    const timer_description = "someText";
                    const timer_time = 5;
                    const timer_time_base: TimeBase = 's';

                    const timerFactorySpy = jasmine.createSpyObj('timerFactorySpy', [
                        'startTimer'
                    ]);
                    spyBrowserExecutionTimerFactory.and.returnValue(timerFactorySpy);

                    const timerData = getTimerDataObject(timer_description, timer_time, timer_time_base);
                    expect(timerService.getTimerCount()).toBe(0);
                    timerService.addTimer(timer_description, timer_time, timer_time_base);
                    expect(spyBrowserExecutionTimerFactory).toHaveBeenCalledWith(timerData, jasmine.any(Function));
                    expect(timerFactorySpy.startTimer).toHaveBeenCalledTimes(1);
                    expect(timerService.getTimerCount()).toBe(1);

                });
                it('should remove and stop all listed timers', function () {
                    expect(timerService.getTimerCount()).toBe(0);
                    const timer1 = importTimer("t1", 5, 's');
                    const timer2 = importTimer("t2", 2, 'm');
                    const timer3 = importTimer("t3", 1, 'h');
                    expect(timerService.getTimerCount()).toBe(3);
                    spyOn(timer1, 'stopTimer').and.callThrough();
                    spyOn(timer2, 'stopTimer').and.callThrough();
                    spyOn(timer3, 'stopTimer').and.callThrough();
                    timerService.removeAllTimers();
                    expect(timer1.stopTimer).toHaveBeenCalledTimes(1);
                    expect(timer2.stopTimer).toHaveBeenCalledTimes(1);
                    expect(timer3.stopTimer).toHaveBeenCalledTimes(1);
                    expect(timerService.getTimerCount()).toBe(0);
                });
                it('should remove and stop a single timer if it is listed within the service', function () {
                    expect(timerService.getTimerCount()).toBe(0);
                    const timer = importTimer("t1", 5, 's');
                    expect(timerService.getTimerCount()).toBe(1);
                    spyOn(timer, 'stopTimer');
                    timerService.removeTimer(timer);
                    expect(timer.stopTimer).toHaveBeenCalledTimes(1);
                    expect(timerService.getTimerCount()).toBe(0);
                });
                it('should NOT remove and stop a single timer if it is not listed within the service', function () {
                    const timer1 = importTimer("t1", 5, 's');
                    expect(timerService.getTimerCount()).toBe(1);
                    const timer2 = getTimerObject('t2', 1, 'm');
                    spyOn(timer1, 'stopTimer');
                    timerService.removeTimer(timer2);
                    expect(timer1.stopTimer).not.toHaveBeenCalled();
                    expect(timerService.getTimerCount()).toBe(1);
                });
                it('should stop and restart all timers on resetAllTimers', function () {
                    const timer1 = importTimer("t1", 5, 's');
                    spyOn(timer1, 'stopTimer');
                    spyOn(timer1, 'startTimer');
                    timerService.resetAllTimers();
                    expect(timer1.stopTimer).toHaveBeenCalled();
                    expect(timer1.startTimer).toHaveBeenCalled();
                });
                it('should handle a trigger call and fire a broadcast message', function () {
                    let handlerResult: boolean;

                    // case 1: fire notification:
                    const lastTimerNotification = timerService.lastTimerNotification;
                    expect(timerService.timerPaused).toBeFalsy();
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(0);
                    handlerResult = timerService.handleTrigger();
                    expect(handlerResult).toBeTruthy();
                    expect(timerService.lastTimerNotification).not.toEqual(lastTimerNotification);

                    // flush timeouts
                    $timeout.flush();

                    expect($rootScope.$broadcast).toHaveBeenCalledWith('executionTimerEvent');
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);

                    // case 2: timer is paused
                    timerService.setPaused(true);
                    handlerResult = timerService.handleTrigger();
                    expect(handlerResult).toBeFalsy();
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);

                    // case 3: currentTimer is lower than last notification
                    timerService.setPaused(false);
                    setLastTimerNotification(9999999999999);
                    handlerResult = timerService.handleTrigger();
                    expect(handlerResult).toBeFalsy();
                    expect($rootScope.$broadcast).toHaveBeenCalledTimes(1);
                });
                it('should toggle pause and reset last timer notification on setPaused', function () {
                    const lastNotificationTime = 10;
                    setLastTimerNotification(lastNotificationTime);
                    expect(timerService.timerPaused).toBeFalsy();
                    timerService.setPaused(true);
                    expect(timerService.lastTimerNotification).toEqual(lastNotificationTime);
                    expect(timerService.timerPaused).toBeTruthy();
                    timerService.setPaused(false);
                    expect(timerService.lastTimerNotification).toEqual(0);
                    expect(timerService.timerPaused).toBeFalsy();
                });
            });
        });
        describe('executionTimers', function () {
            let spyTrigger: jasmine.Spy;
            const timer_desc = "test";
            const timer_time = 5;
            const timer_base = 'm';
            const timer_minInterval = 4;

            function getTime(time: number, base: TimeBase) {
                const timer = timerService.addTimer(timer_desc, time, base);
                return timer.getTimeInSeconds();
            }

            beforeEach(function () {
                spyTrigger = jasmine.createSpy('handleTrigger');
            });

            describe('browser timer', function () {
                let browserExecutionTimer: IBrowserExecutionTimer;
                let $interval: angular.IIntervalService;

                function createBrowserExecutionTimer(description: string, time: number, base: TimeBase) {
                    return timerService._timerFactory(getTimerDataObject(description, time, base), spyTrigger) as IBrowserExecutionTimer
                }

                beforeEach(inject(function (_timerService_: ExecutionTimerService, _$interval_: angular.IIntervalService) {
                    timerService = _timerService_;
                    $interval = _$interval_;
                }));

                beforeEach(function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, timer_base);
                });

                it('should have all properties and methods from ExecutionTimer class', function () {
                    //the execution timer directly changes all minutes and hours to seconds, thus resulting in a timer time * 60 and a time base of 's'
                    checkExecutionTimerBaseProperties(browserExecutionTimer, timer_desc, timer_time, spyTrigger);
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    browserExecutionTimer.trigger();
                    expect(spyTrigger).toHaveBeenCalledTimes(1);
                    expect(browserExecutionTimer['timerTime']).toBeDefined();
                    expect(browserExecutionTimer['timerTime']).toEqual(0);
                    expect(browserExecutionTimer['intervalTime']).toBeDefined();
                    expect(browserExecutionTimer['intervalTime']).toEqual(1000);
                });
                it('should set the correct timer value based on time_base', function () {
                    // seconds
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 's');
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time);
                    browserExecutionTimer.stopTimer();

                    // minutes
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 'm');
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time * SECONDS_PER_MINUTE);
                    browserExecutionTimer.stopTimer();

                    // hours
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 'h');
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time * SECONDS_PER_HOUR);
                    browserExecutionTimer.stopTimer();
                });
                it('should use default time_base if not (s/m/h) is given and log error', function () {
                    // seconds
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 'x' as TimeBase);
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time);
                    browserExecutionTimer.stopTimer();

                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 'g' as TimeBase);
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time);
                    browserExecutionTimer.stopTimer();

                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, timer_time, 'z' as TimeBase);
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['timerTime']).toEqual(timer_time);
                    browserExecutionTimer.stopTimer();
                    //Testing log error in own describe, since it requires some overwriting of log error function
                });

                it('should trigger after given time and reset interval (multiple triggers) - seconds', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 4, 's');
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    browserExecutionTimer.startTimer();
                    $interval.flush(4050);
                    expect(spyTrigger).toHaveBeenCalledTimes(1);
                    $interval.flush(4050);
                    expect(spyTrigger).toHaveBeenCalledTimes(2);
                });
                it('should trigger after given time and reset interval (multiple triggers) - minutes', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 4, 'm');
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    browserExecutionTimer.startTimer();
                    $interval.flush(4050 * SECONDS_PER_MINUTE);
                    expect(spyTrigger).toHaveBeenCalledTimes(1);
                    $interval.flush(4050 * SECONDS_PER_MINUTE);
                    expect(spyTrigger).toHaveBeenCalledTimes(2);
                });
                it('should trigger after given time and reset interval (multiple triggers) - hours', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 2, 'h');
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    browserExecutionTimer.startTimer();
                    $interval.flush(2050 * SECONDS_PER_HOUR);
                    expect(spyTrigger).toHaveBeenCalledTimes(1);
                    $interval.flush(2050 * SECONDS_PER_HOUR);
                    expect(spyTrigger).toHaveBeenCalledTimes(2);
                });

                function checkTriggerOnlyAfterMinInterval() {
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    browserExecutionTimer.startTimer();
                    $interval.flush(3900);
                    expect(spyTrigger).toHaveBeenCalledTimes(0);
                    $interval.flush(200);
                    expect(spyTrigger).toHaveBeenCalledTimes(1);
                }

                it('should NOT trigger in minInterval - seconds', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 0, 's');
                    checkTriggerOnlyAfterMinInterval();
                    spyTrigger = jasmine.createSpy('handleTrigger');
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 1, 's');
                    checkTriggerOnlyAfterMinInterval();
                    spyTrigger = jasmine.createSpy('handleTrigger');
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 2, 's');
                    checkTriggerOnlyAfterMinInterval();
                    spyTrigger = jasmine.createSpy('handleTrigger');
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 3, 's');
                    checkTriggerOnlyAfterMinInterval();
                });

                it('should NOT trigger in minInterval - minutes', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 0.01, 'm');
                    checkTriggerOnlyAfterMinInterval();
                });

                it('should NOT trigger in minInterval - hours', function () {
                    browserExecutionTimer = createBrowserExecutionTimer(timer_desc, 0.001, 'h');
                    checkTriggerOnlyAfterMinInterval();
                });


                it('should stop a running interval timer if stopTimer is called', function () {
                    expect(browserExecutionTimer['stopHandle']).toBeNull();
                    browserExecutionTimer.startTimer();
                    expect(browserExecutionTimer['stopHandle']).toBeDefined();
                    browserExecutionTimer.stopTimer();
                    expect(browserExecutionTimer['stopHandle']).toBeNull();
                });
                it('should always change the time base to seconds', function () {
                    let timer, time;
                    timer = timerService.addTimer(timer_desc, 4, 's');
                    time = timer.getTimeInSeconds();
                    expect(time).toBe(4);
                    expect(timer['time_base']).toBe('s');
                    timer = timerService.addTimer(timer_desc, 1, 'm');
                    time = timer.getTimeInSeconds();
                    expect(time).toBe(SECONDS_PER_MINUTE);
                    expect(timer['time_base']).toBe('s');
                    timer = timerService.addTimer(timer_desc, 1, 'h');
                    time = timer.getTimeInSeconds();
                    expect(time).toBe(SECONDS_PER_HOUR);
                    expect(timer['time_base']).toBe('s');
                });
                it('should set waiting time to 4 seconds if the waiting time is less than 4 seconds', function () {
                    expect(getTime(0, 's')).toBe(timer_minInterval);
                    expect(getTime(1, 's')).toBe(timer_minInterval);
                    expect(getTime(2, 's')).toBe(timer_minInterval);
                    expect(getTime(3, 's')).toBe(timer_minInterval);
                    expect(getTime(4, 's')).toBe(4);

                    expect(getTime(0, 'm')).toBe(timer_minInterval);

                    expect(getTime(0, 'h')).toBe(timer_minInterval);
                });
                it('should set waiting time to the correct amount of seconds if the waiting base is minutes or hours', function () {
                    expect(getTime(1, 'm')).not.toBe(timer_minInterval);
                    expect(getTime(1, 'm')).toBe(60);
                    expect(getTime(2, 'h')).not.toBe(timer_minInterval);
                    expect(getTime(2, 'h')).toBe(7200);
                });

                it('should still work even with floating point numbers', function () {
                    expect(getTime(0.1, 's')).toBe(timer_minInterval);
                    expect(getTime(5.1, 's')).toBe(5.1);
                    expect(getTime(0.01, 'm')).toBe(timer_minInterval);
                    expect(getTime(0.1, 'm')).toBe(6);
                    expect(getTime(0.01, 'h')).toBe(36);
                });
                it('test timer input with not normal integers (NaN, Infinity, etc.)', function () {
                    const nan = NaN;
                    const inf = Infinity;
                    const und = undefined;
                    const neg = -5;

                    expect(getTime(nan, 's')).toBe(timer_minInterval);
                    expect(getTime(inf, 's')).toBe(timer_minInterval);
                    expect(getTime(neg, 's')).toBe(timer_minInterval);
                    expect(getTime(und as any, 's')).toBe(timer_minInterval);

                    expect(getTime(nan, 'm')).toBe(timer_minInterval);
                    expect(getTime(inf, 'm')).toBe(timer_minInterval);
                    expect(getTime(neg, 'm')).toBe(timer_minInterval);
                    expect(getTime(und as any, 'm')).toBe(timer_minInterval);

                    expect(getTime(nan, 'h')).toBe(timer_minInterval);
                    expect(getTime(inf, 'h')).toBe(timer_minInterval);
                    expect(getTime(neg, 'h')).toBe(timer_minInterval);
                    expect(getTime(und as any, 'h')).toBe(timer_minInterval);
                });
                describe('log testing', function () {
                    let log: angular.ILogService;
                    beforeEach(function () {
                        inject(function ($log: angular.ILogService) {
                            log = $log;
                        });

                        spyOn(log, 'warn').and.callFake(function(message: string) {
                            throw new Error(message);
                        })
                    });

                    function createExecutionTimerWithCustomData(custom_time: number, custom_time_base: TimeBase) {
                        browserExecutionTimer = createBrowserExecutionTimer(timer_desc, custom_time, custom_time_base);
                        return browserExecutionTimer;
                    }

                    function createExecutionTimerWithCustomTime(custom_time: number) {
                        return createExecutionTimerWithCustomData(custom_time, timer_base);
                    }

                    function createExecutionTimerWithCustomTimeBase(custom_time_base: TimeBase) {
                        return createExecutionTimerWithCustomData(timer_time, custom_time_base);
                    }

                    describe('timeInput', function () {
                        it('Test TimeInput Log warn for wrong Time inputs', function () {
                            expect(() => createExecutionTimerWithCustomTime(1).startTimer()).not.toThrowError(/Bad Time in execution timer: /);
                            expect(() => createExecutionTimerWithCustomTime(456).startTimer()).not.toThrowError(/Bad Time in execution timer: /);
                            expect(() => createExecutionTimerWithCustomTime(13895).startTimer()).not.toThrowError(/Bad Time in execution timer: /);
                        });
                        it('Test TimeInput Log warn don\'t occur for correct Time inputs', function () {
                            const nan = NaN;
                            const inf = Infinity;
                            const und = undefined;
                            const neg = -5;
                            expect(() => createExecutionTimerWithCustomTime(nan).startTimer()).toThrowError(/Bad Time in execution timer: /);
                            expect(() => createExecutionTimerWithCustomTime(inf).startTimer()).toThrowError(/Bad Time in execution timer: /);
                            expect(() => createExecutionTimerWithCustomTime(und as any).startTimer()).toThrowError(/Bad Time in execution timer: /);
                            expect(() => createExecutionTimerWithCustomTime(neg).startTimer()).toThrowError(/Bad Time in execution timer: /);
                        });
                    });

                    describe('timeBase', function () {
                        it('Test TimeBase Log warn for wrong Time Bases', function () {
                            expect(() => createExecutionTimerWithCustomTimeBase('a' as TimeBase).startTimer()).toThrowError(/Unknown time_base in Execution Timer/);
                            expect(() => createExecutionTimerWithCustomTimeBase('b' as TimeBase).startTimer()).toThrowError(/Unknown time_base in Execution Timer/);
                            expect(() => createExecutionTimerWithCustomTimeBase('c' as TimeBase).startTimer()).toThrowError(/Unknown time_base in Execution Timer/);
                        });
                        it('Test TimeBase Log warn don\'t occur for correct Time Bases', function () {
                            expect(() => createExecutionTimerWithCustomTimeBase('s').startTimer()).not.toThrowError(/Unknown time_base in Execution Timer/);
                            expect(() => createExecutionTimerWithCustomTimeBase('m').startTimer()).not.toThrowError(/Unknown time_base in Execution Timer/);
                            expect(() => createExecutionTimerWithCustomTimeBase('h').startTimer()).not.toThrowError(/Unknown time_base in Execution Timer/);
                        });
                    });

                    describe('minTime', function () {
                        it('Test minTime Log warn for to small Time', function () {
                            expect(() => createExecutionTimerWithCustomData(1, 's').startTimer()).toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(2, 's').startTimer()).toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(3, 's').startTimer()).toThrowError(/Timer is below minTimerIntervalTime/);

                            expect(() => createExecutionTimerWithCustomData(0.01, 'm').startTimer()).toThrowError(/Timer is below minTimerIntervalTime/);

                            expect(() => createExecutionTimerWithCustomData(0.001, 'h').startTimer()).toThrowError(/Timer is below minTimerIntervalTime/);


                        });
                        it('Test minTime Log warn doesn\'t occur for correct Times', function () {
                            expect(() => createExecutionTimerWithCustomData(5, 's').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(6, 's').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(99, 's').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);

                            expect(() => createExecutionTimerWithCustomData(0.5, 'm').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(1, 'm').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);

                            expect(() => createExecutionTimerWithCustomData(0.1, 'h').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);
                            expect(() => createExecutionTimerWithCustomData(1, 'h').startTimer()).not.toThrowError(/Timer is below minTimerIntervalTime/);
                        });
                    });
                });
            });

            describe('cordova timer factory initialization', function () {
                it('should set timerFactory on deviceready event', function () {
                    let addEventListenerSpy: jasmine.Spy = spyOn($document[0], 'addEventListener').and.callThrough();
                    inject(function (_timerService_: ExecutionTimerService) {
                        timerService = _timerService_;
                    });
                    expect(($document[0] as Document).addEventListener).toHaveBeenCalledWith('deviceready', jasmine.any(Function));
                    expect(timerService._timerFactory).toBe(spyBrowserExecutionTimerFactory);
                    let deviceReadyCallback = addEventListenerSpy.calls.argsFor(0)[1];
                    deviceReadyCallback();
                    expect(spyBrowserExecutionTimerFactory).not.toBe(spyCordovaExecutionTimerFactory);
                    expect(timerService._timerFactory).toBe(spyCordovaExecutionTimerFactory);
                });
            });

            describe('cordova timer', function () {
                let cordovaExecutionTimer: ExecutionTimer, cordovaExecutionTimerService: ICordovaExecutionTimerService, $q: angular.IQService;

                function createCordovaExecutionTimer(description: string, time: number, base: TimeBase) {
                    return timerService._timerFactory(getTimerDataObject(description, time, base), spyTrigger) as ICordovaExecutionTimer;
                }


                beforeEach(inject(function (_timerService_: ExecutionTimerService) {
                    timerService = _timerService_;
                }));

                beforeEach(inject(function (_cordovaExecutionTimerService_: ICordovaExecutionTimerService, _$q_: angular.IQService) {
                    cordovaExecutionTimerService = _cordovaExecutionTimerService_;
                    $q = _$q_;
                }));

                beforeEach(function () {
                    installPromiseMatchers({
                        flushHttpBackend: false,
                        flushInterval: false,
                        flushTimeout: false
                    });
                });

                beforeEach(function () {
                    //timerService._timerFactory = spyCordovaExecutionTimerFactory;
                    ($document[0] as Document).dispatchEvent(new Event('deviceready'));
                    cordovaExecutionTimer = createCordovaExecutionTimer(timer_desc, timer_time, timer_base);
                });

                it('should have all properties and methods from ExecutionTimer class', function () {
                    checkExecutionTimerBaseProperties(cordovaExecutionTimer, timer_desc, timer_time, spyTrigger);
                });
                it('should have timerReference field', function () {
                    expect(cordovaExecutionTimer['timerReference']).toBeDefined();
                    expect(cordovaExecutionTimer['timerReference']).toEqual(null);
                });
                it('should set the timerReference after scheduling the timer object', function () {
                    const timerReference = {
                        alarmId: 4,
                        registerId: 1,
                    };
                    spyOn(cordovaExecutionTimerService, 'scheduleTimer').and.returnValue($q.resolve(timerReference));
                    cordovaExecutionTimer.startTimer();
                    $rootScope.$apply();
                    expect(cordovaExecutionTimer['timerReference']).toBe(timerReference);
                });
                it('should cancel a scheduled timer if stopTimer is called', function () {
                    const timerReference = {
                        alarmId: 4,
                        registerId: 3,
                    };
                    spyOn(cordovaExecutionTimerService, 'cancelTimer').and.callThrough();
                    cordovaExecutionTimer.stopTimer();
                    expect(mockCordovaLocalNotification.cancel).not.toHaveBeenCalled();
                    expect(cordovaExecutionTimerService.cancelTimer).not.toHaveBeenCalled();
                    cordovaExecutionTimer['timerReference'] = timerReference;
                    cordovaExecutionTimer.stopTimer();
                    expect(mockCordovaLocalNotification.cancel).toHaveBeenCalledTimes(1);
                    expect(cordovaExecutionTimerService.cancelTimer).toHaveBeenCalledWith(timerReference);
                });
                it('should cancel a timer currently being scheduled, if stopTimer is called', function() {
                    const timerReference = {
                        alarmId: 11,
                        registerId: 7,
                    };
                    let timerIdDeferred = $q.defer();
                    spyOn(cordovaExecutionTimerService, 'scheduleTimer').and.returnValue(timerIdDeferred.promise);
                    spyOn(cordovaExecutionTimerService, 'cancelTimer').and.callThrough();
                    cordovaExecutionTimer.startTimer();
                    expect(cordovaExecutionTimer['timerIdPromise']).not.toBeNull();
                    expect(cordovaExecutionTimer['timerReference']).toBeNull();
                    cordovaExecutionTimer.stopTimer();
                    expect(cordovaExecutionTimerService.cancelTimer).not.toHaveBeenCalledWith(timerReference);
                    expect(mockCordovaLocalNotification.cancel).not.toHaveBeenCalled();
                    timerIdDeferred.resolve(timerReference);
                    $rootScope.$apply();
                    expect(cordovaExecutionTimerService.cancelTimer).toHaveBeenCalledTimes(1);
                    expect(mockCordovaLocalNotification.cancel).toHaveBeenCalledTimes(1);
                });
                it('should cancel a timer currently being scheduled, if stopTimer is called (case 2: previous timer was started & stopped)', function() {
                    const timerReference1 = {
                        alarmId: 11,
                        registerId: 7,
                    };
                    const timerReference2 = {
                        alarmId: 12,
                        registerId: 8,
                    };
                    let timerIdDeferred: angular.IDeferred<WakeupReference>;
                    const scheduleTimerSpy = spyOn(cordovaExecutionTimerService, 'scheduleTimer');
                    const cancelTimerSpy = spyOn(cordovaExecutionTimerService, 'cancelTimer').and.callThrough();

                    // First timer
                    timerIdDeferred = $q.defer();
                    scheduleTimerSpy.and.returnValue(timerIdDeferred.promise);
                    cordovaExecutionTimer.startTimer();
                    expect(cordovaExecutionTimer['timerIdPromise']).not.toBeNull();
                    expect(cordovaExecutionTimer['timerReference']).toBeNull();
                    cordovaExecutionTimer.stopTimer();
                    expect(cordovaExecutionTimerService.cancelTimer).not.toHaveBeenCalled();
                    expect(mockCordovaLocalNotification.cancel).not.toHaveBeenCalled();
                    timerIdDeferred.resolve(timerReference1);
                    $rootScope.$apply();
                    expect(cordovaExecutionTimerService.cancelTimer).toHaveBeenCalledTimes(1);
                    expect(cancelTimerSpy.calls.mostRecent().args).toEqual([timerReference1]);
                    expect(mockCordovaLocalNotification.cancel).toHaveBeenCalledTimes(1);

                    // Second timer
                    timerIdDeferred = $q.defer();
                    scheduleTimerSpy.and.returnValue(timerIdDeferred.promise);
                    cordovaExecutionTimer.startTimer();
                    expect(cordovaExecutionTimer['timerIdPromise']).not.toBeNull();
                    expect(cordovaExecutionTimer['timerReference']).toBeNull();
                    cordovaExecutionTimer.stopTimer();
                    expect(cordovaExecutionTimerService.cancelTimer).toHaveBeenCalledTimes(1);
                    expect(mockCordovaLocalNotification.cancel).toHaveBeenCalledTimes(1);
                    timerIdDeferred.resolve(timerReference2);
                    $rootScope.$apply();
                    expect(cordovaExecutionTimerService.cancelTimer)
                    expect(cordovaExecutionTimerService.cancelTimer).toHaveBeenCalledTimes(2);
                    expect(cancelTimerSpy.calls.mostRecent().args).toEqual([timerReference2]);
                    expect(mockCordovaLocalNotification.cancel).toHaveBeenCalledTimes(2);
                });
                it('should NOT handle the trigger event if no timerReference has been set', function () {
                    spyOn(cordovaExecutionTimer, 'startTimer');
                    expect(cordovaExecutionTimer.trigger()).toBeFalsy();
                    expect(spyTrigger).not.toHaveBeenCalled();
                    expect(cordovaExecutionTimer.startTimer).toHaveBeenCalled();
                });
                it('should DO handle the trigger event if a timerReference has been set', function () {
                    cordovaExecutionTimer['timerReference'] = {
                        alarmId: 5,
                        registerId: 0
                    };

                    // mock of the trigger handler of timerService, which will fire the timer object trigger
                    spyTrigger.and.returnValue(true);

                    spyOn(cordovaExecutionTimer, 'startTimer');
                    expect(cordovaExecutionTimer.trigger()).toBeTruthy();
                    expect(spyTrigger).toHaveBeenCalled();
                    expect(mockCordovaLocalNotification.schedule).toHaveBeenCalled();
                    expect(cordovaExecutionTimer.startTimer).toHaveBeenCalled();
                });

                describe('timer service (cordova)', function () {
                    it('should have a method called scheduleTimer', function () {
                        expect(cordovaExecutionTimerService.scheduleTimer).toBeDefined();
                    });
                    it('should have a method called cancelTimer', function () {
                        expect(cordovaExecutionTimerService.cancelTimer).toBeDefined();
                    });
                    it('should create and schedule a timer', function () {
                        spyOn(cordovaExecutionTimer, 'trigger').and.callThrough();
                        cordovaExecutionTimerService.scheduleTimer(cordovaExecutionTimer);
                        expect(mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledTimes(1);
                        expect(mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledWith(timer_time * 60, jasmine.any(Function));
                        cordovaExecutionTimerService.scheduleTimer(cordovaExecutionTimer);
                        expect(mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds).toHaveBeenCalledTimes(2);
                        expect(cordovaExecutionTimer.trigger).not.toHaveBeenCalled();
                    });
                    it('should trigger timer on wakeup', function (done) {
                        const providedReference = {
                            alarmId: 3,
                            registerId: 4,
                        };
                        spyOn(cordovaExecutionTimer, 'trigger').and.callThrough();
                        mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds.and.returnValue(Promise.resolve(providedReference));
                        cordovaExecutionTimerService.scheduleTimer(cordovaExecutionTimer).then(() => {
                            const wakeupCallback = mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds.calls.argsFor(0)[1];
                            wakeupCallback();
                            expect(cordovaExecutionTimer.trigger).toHaveBeenCalled();
                        }).finally(done);
                    });
                    it('should remove a scheduled timer', function (done) {
                        const providedReference = {
                            alarmId: 3,
                            registerId: 4,
                        };
                        mockCordovaWakeupPlugin.scheduleAfterElapsedSeconds.and.returnValue(Promise.resolve(providedReference));
                        cordovaExecutionTimerService.scheduleTimer(cordovaExecutionTimer)
                            .then((reference) => {
                                expect(reference).toEqual(providedReference);
                                cordovaExecutionTimerService.cancelTimer(reference);
                                expect(mockCordovaWakeupPlugin.cancel).toHaveBeenCalledWith(reference);
                            }).finally(done);
                    });
                });
            });
        });
    });
}
