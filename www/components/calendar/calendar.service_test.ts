'use strict';

module rehagoal.calendar {
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    import INotification = ngCordova.INotification;
    import NotificationEvent = ngCordova.NotificationEvent;
    import CalendarDB = rehagoal.database.CalendarDB;
    import generateRandomUUIDFunc = rehagoal.utilities.generateRandomUUIDFunc;
    describe('rehagoal.calendar', function () {
        let calendarDB: jasmine.SpyObj<CalendarDB>;
        let calendarScheduler: jasmine.SpyObj<ICalendarSchedulerService>;
        let calendarEvents: CalendarEvent[] = [];
        let generateRandomUUID: generateRandomUUIDFunc;
        let generateRandomUUIDSpy: jasmine.Spy;
        let $rootScope: angular.IRootScopeService;
        describe('CalendarService', function () {
            beforeEach(() => angular.mock.module('rehagoal.calendar'));
            beforeEach(() => angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                    $provide.decorator('calendarDBService', function ($delegate: () => boolean) {
                        let calendarDB = jasmine.createSpyObj('calendarDB', [
                            'addEvents',
                            'getEventByUUID',
                            'getEventsWithWorkflowID',
                            'getEvents',
                            'updateEvents',
                            'deleteEvents',
                            'removeWorkflowFromCalendarEventsAndGetDeletedEvents'
                        ]);
                        calendarDB.addEvents.and.callFake(async function (events: CalendarEvent[]) {
                            calendarEvents.push(...events);
                        });
                        calendarDB.getEventByUUID.and.callFake(async function(uuid: string) {
                            return calendarEvents.filter((event) => event.uuid === uuid)[0];
                        });
                        calendarDB.getEventsWithWorkflowID.and.callFake(async function(workflowID: number) {
                            return calendarEvents.filter((event) => event.workflowIDs.indexOf(workflowID) !== -1);
                        });
                        calendarDB.getEvents.and.callFake(async function(offset: number, limit: number) {
                            return calendarEvents.slice(offset, offset + limit);
                        });
                        calendarDB.updateEvents.and.callFake(async function(uuids: string[], changes: Partial<CalendarEvent>[]) {
                            for (let event of calendarEvents) {
                                const updateIndex = uuids.indexOf(event.uuid);
                                if (updateIndex !== -1) {
                                    angular.merge(event, changes[updateIndex]);
                                }
                            }
                        });
                        calendarDB.deleteEvents.and.callFake(async function(uuids: string[]) {
                            calendarEvents = calendarEvents.filter((event) => uuids.indexOf(event.uuid) === -1);
                        });
                        return calendarDB;
                    });
                    $provide.decorator('calendarSchedulerService', function () {
                        let calendarScheduler: jasmine.SpyObj<ICalendarSchedulerService> = jasmine.createSpyObj('calendarScheduler', [
                            'scheduleEvents',
                            'scheduleEventsImmediate',
                            'unscheduleEvents'
                        ]);
                        return calendarScheduler;
                    });
                    $provide.decorator('generateRandomUUID', function($delegate: generateRandomUUIDFunc) {
                        generateRandomUUIDSpy = jasmine.createSpy('generateRandomUUID', $delegate);
                        return generateRandomUUIDSpy;
                    });
            }));

            beforeEach(() => {
                calendarEvents = [];
            });
            beforeEach(inject((_$rootScope_: angular.IRootScopeService,
                               _calendarSchedulerService_: jasmine.SpyObj<ICalendarSchedulerService>,
                               _calendarDBService_: jasmine.SpyObj<CalendarDB>,
                               _generateRandomUUID_: generateRandomUUIDFunc) => {
                $rootScope =_$rootScope_;
                calendarScheduler = _calendarSchedulerService_;
                calendarDB = _calendarDBService_;
                spyOn($rootScope, '$broadcast').and.callThrough();
            }));

            describe('constructor', function () {
                const broadcastMissedEventName = 'calendarEventComponent::missedEvents';
                beforeEach(() => jasmine.clock().install());
                beforeEach(inject((_calendarSchedulerService_: jasmine.SpyObj<ICalendarSchedulerService>) => {
                    calendarScheduler = _calendarSchedulerService_;
                }));
                afterEach(() => jasmine.clock().uninstall());
                it('should not schedule/notify about events, if there are none', async function (done) {
                    inject(async (calendarService: ICalendarService) => {
                        await tryOrFailAsync(async () => {
                            await calendarService.getStartupPromise();
                            expect(calendarDB.getEvents).toHaveBeenCalledWith(0, Number.POSITIVE_INFINITY);
                            expect($rootScope.$broadcast).not.toHaveBeenCalled();
                            expect(calendarDB.deleteEvents).not.toHaveBeenCalled();
                            expect(calendarScheduler.scheduleEvents).toHaveBeenCalledWith([]);
                            expect(calendarScheduler.scheduleEventsImmediate).toHaveBeenCalledWith([]);
                        });
                        done();
                    });
                });
                it('should broadcast missed events, reschedule events depending on their date/age', async function(done) {
                    const actualDate = new Date(2020, 1, 1, 4, 5, 6);
                    const dateInFuture1 = new Date(2020, 1, 2, 3, 4, 5);
                    const dateInFuture2 = new Date(2020, 4, 2, 3, 4, 5);
                    const dateInFuture3 = new Date(2021, 1, 2, 3, 4, 5);
                    const dateInPresent1 = new Date(actualDate.getTime());
                    const dateInPast1 = new Date(2020, 1, 1, 4, 5, 5);
                    const dateInPast2 = new Date(2020, 1, 1, 0, 0, 0);
                    const dateInPastMissed = new Date(2020, 1, 0, 5, 6, 7);
                    const dateInPastMissed2 = new Date(2020, 0, 0, 0, 0, 0);
                    const futureEvent1: CalendarEvent = {
                        date: dateInFuture1,
                        workflowIDs: [1, 2, 7],
                        uuid: 'uuidFuture1',
                    };
                    const futureEvent2: CalendarEvent = {
                        date: dateInFuture2,
                        workflowIDs: [1, 2, 33],
                        uuid: 'uuidFuture2',
                    };
                    const futureEvent3: CalendarEvent = {
                        date: dateInFuture3,
                        workflowIDs: [42, 1, 2],
                        uuid: 'uuidFuture3',
                    };
                    const presentEvent1: CalendarEvent = {
                        date: dateInPresent1,
                        workflowIDs: [4, 1, 3, 6],
                        uuid: 'uuidPresent1'
                    };
                    const pastEvent1: CalendarEvent = {
                        date: dateInPast1,
                        workflowIDs: [3],
                        uuid: 'uuidPast1',
                    };
                    const pastEvent2: CalendarEvent = {
                        date: dateInPast2,
                        workflowIDs: [3, 1, 1, 2],
                        uuid: 'uuidPast2',
                    };
                    const missedEvent1: CalendarEvent = {
                        date: dateInPastMissed,
                        workflowIDs: [1, 4, 5, 6],
                        uuid: 'uuidMissed1',
                    };
                    const missedEvent2: CalendarEvent = {
                        date: dateInPastMissed2,
                        workflowIDs: [4, 5, 6],
                        uuid: 'uuidMissed2',
                    };
                    jasmine.clock().mockDate(actualDate);
                    calendarEvents.push(
                        pastEvent1,
                        missedEvent2,
                        futureEvent1,
                        pastEvent2,
                        missedEvent1,
                        presentEvent1,
                        futureEvent2,
                        futureEvent3,
                    );
                    const previousEventUUIDs = calendarEvents.map((event)=>event.uuid);
                    inject(async (calendarService: ICalendarService) => {
                        await calendarService.getStartupPromise();
                        expect(calendarDB.getEvents).toHaveBeenCalledWith(0, Number.POSITIVE_INFINITY);
                        expect(calendarScheduler.unscheduleEvents).toHaveBeenCalledWith(previousEventUUIDs);
                        expect($rootScope.$broadcast).toHaveBeenCalledWith(broadcastMissedEventName, [missedEvent2, missedEvent1]);
                        expect(calendarDB.deleteEvents).toHaveBeenCalledWith([missedEvent2.uuid, missedEvent1.uuid]);
                        expect(calendarScheduler.scheduleEvents).toHaveBeenCalledWith([futureEvent1, futureEvent2, futureEvent3]);
                        expect(calendarScheduler.scheduleEventsImmediate).toHaveBeenCalledWith([pastEvent1, pastEvent2, presentEvent1]);
                        done();
                    });
                });
            });

            describe('methods', function () {
                let calendarService: ICalendarService;

                const event1: CalendarEvent = {
                    uuid: 'uuid001',
                    workflowIDs: [1, 2, 3, 123, 42],
                    date: new Date(2020, 3, 4, 5, 6)
                };
                const event2: CalendarEvent = {
                    uuid: '2.uuid',
                    workflowIDs: [1, 2, 3, 42],
                    date: new Date(2020, 5, 4, 1, 2)
                };

                beforeEach(async (done) => {
                    inject((_calendarService_: ICalendarService) => {
                        calendarService = _calendarService_;
                    });
                    await calendarService.getStartupPromise();

                    // Reset calls since they are called in the constructor
                    calendarScheduler.unscheduleEvents.calls.reset();
                    calendarScheduler.scheduleEvents.calls.reset();
                    calendarScheduler.scheduleEventsImmediate.calls.reset();
                    done();
                });

                describe('addCalendarEvent', function () {
                    it('should add a calendar event to the database and schedule it', async function (done) {
                        generateRandomUUIDSpy.and.returnValue(event1.uuid);
                        const event1Return = await calendarService.addCalendarEvent(event1.date, event1.workflowIDs);
                        expect(event1Return).toEqual(event1);
                        expect(generateRandomUUIDSpy).toHaveBeenCalledTimes(1);
                        expect(calendarDB.addEvents).toHaveBeenCalledWith([event1Return]);
                        expect(calendarScheduler.scheduleEvents).toHaveBeenCalledWith([event1Return]);
                        expect(calendarScheduler.scheduleEvents).toHaveBeenCalledTimes(1);
                        expect(calendarDB.addEvents).toHaveBeenCalledBefore(calendarScheduler.scheduleEvents);
                        expect(calendarDB.addEvents).toHaveBeenCalledTimes(1);

                        generateRandomUUIDSpy.and.returnValue(event2.uuid);
                        const event2Return = await calendarService.addCalendarEvent(event2.date, event2.workflowIDs);
                        expect(event2Return).toEqual(event2);
                        expect(generateRandomUUIDSpy).toHaveBeenCalledTimes(2);
                        expect(calendarDB.addEvents.calls.mostRecent().args).toEqual([[event2Return]]);
                        expect(calendarScheduler.scheduleEvents.calls.mostRecent().args).toEqual([[event2Return]]);
                        expect(calendarScheduler.scheduleEvents).toHaveBeenCalledTimes(2);
                        expect(calendarDB.addEvents).toHaveBeenCalledTimes(2);
                        done();
                    });

                    it('should delete calendar event from DB, if scheduling fails', async function (done) {
                        calendarScheduler.scheduleEvents.and.returnValue(Promise.reject(new Error('Testing addCalendarEventRollback')));
                        generateRandomUUIDSpy.and.returnValue(event1.uuid);
                        await expectThrowsAsync(async () => {
                            await calendarService.addCalendarEvent(event1.date, event1.workflowIDs);
                        }, 'Testing addCalendarEventRollback');
                        expect(calendarDB.deleteEvents).toHaveBeenCalledTimes(1);
                        expect(calendarDB.deleteEvents).toHaveBeenCalledWith([event1.uuid]);
                        done();
                    });
                });
                describe('deleteCalendarEvent', function () {
                    it('should delete and unschedule event by UUID', async function (done) {
                        await calendarService.deleteCalendarEvent('uuid1');
                        expect(calendarDB.deleteEvents).toHaveBeenCalledWith(['uuid1']);
                        expect(calendarDB.deleteEvents).toHaveBeenCalledTimes(1);
                        expect(calendarScheduler.unscheduleEvents).toHaveBeenCalledWith(['uuid1']);
                        expect(calendarScheduler.unscheduleEvents).toHaveBeenCalledTimes(1);
                        expect(calendarDB.deleteEvents).toHaveBeenCalledBefore(calendarScheduler.unscheduleEvents);

                        await calendarService.deleteCalendarEvent('another1Uuid');
                        expect(calendarDB.deleteEvents).toHaveBeenCalledWith(['another1Uuid']);
                        expect(calendarDB.deleteEvents).toHaveBeenCalledTimes(2);
                        expect(calendarScheduler.unscheduleEvents).toHaveBeenCalledWith(['another1Uuid']);
                        expect(calendarScheduler.unscheduleEvents).toHaveBeenCalledTimes(2);
                        done();
                    });
                });
                describe('removeWorkflowFromCalendarEventsAndGetDeletedEvents', function () {
                    it('should forward call to calendarDB', async function (done) {
                        calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents.and.returnValue([event1]);
                        const return1 = await calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents(123);
                        expect(calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents).toHaveBeenCalledWith(123);
                        expect(return1).toEqual([event1]);

                        calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents.and.returnValue([event2, event1]);
                        const return2 = await calendarService.removeWorkflowFromCalendarEventsAndGetDeletedEvents(42);
                        expect(calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents).toHaveBeenCalledWith(42);
                        expect(return2).toEqual([event2, event1]);
                        done();
                    });
                });
                describe('getCalendarEventByUUID', function () {
                    it('should forward call to calendarDB', async function (done) {
                        await calendarDB.addEvents([event1, event2]);
                        const return1 = await calendarService.getCalendarEventByUUID('uuid001');
                        expect(calendarDB.getEventByUUID).toHaveBeenCalledWith('uuid001');
                        expect(return1).toEqual(event1);

                        const return2 = await calendarService.getCalendarEventByUUID('2.uuid');
                        expect(calendarDB.getEventByUUID).toHaveBeenCalledWith('2.uuid');
                        expect(return2).toEqual(event2);
                        done();
                    });
                });
                describe('getCalendarEvents', function () {
                    it('should forward call to calendarDB', async function (done) {
                        await calendarDB.addEvents([event1, event2]);

                        const return1 = await calendarService.getCalendarEvents(0, Number.POSITIVE_INFINITY);
                        expect(calendarDB.getEvents).toHaveBeenCalledWith(0, Number.POSITIVE_INFINITY);
                        expect(return1).toEqual([event1, event2]);

                        const return2 = await calendarService.getCalendarEvents(1, 1);
                        expect(calendarDB.getEvents).toHaveBeenCalledWith(1, 1);
                        expect(return2).toEqual([event2]);

                        const return3 = await calendarService.getCalendarEvents(1, 0);
                        expect(calendarDB.getEvents).toHaveBeenCalledWith(1, 0);
                        expect(return3).toEqual([]);
                        done();
                    });
                });
            });
        });
    });
}
