'use strict';
module rehagoal.database {
    import WorkflowsDexie = rehagoal.database.WorkflowsDexie;
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import DexieFactory = rehagoal.database.DexieFactory;
    import SettingsService = rehagoal.settings.SettingsService;
    import generateRandomUUIDFunc = rehagoal.utilities.generateRandomUUIDFunc;

    describe('rehagoal.database', function () {
        let dexieInstance: CalendarDexie;

        beforeEach(function () {
            angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                    return function () {
                        dexieInstance = $delegate.apply(null, arguments as any) as CalendarDexie;
                        return dexieInstance;
                    };
                });
            });
        });
        describe('calendarDatabase', function () {
            let calendarDB: CalendarDB;

            beforeEach((done) => angular.mock.inject(function (dexieFactory: DexieFactory) {
                dexieFactory("calendarDB").delete().then(done);
            }));
            beforeEach(() => angular.mock.inject(function (_calendarDBService_: CalendarDB) {
                calendarDB = _calendarDBService_;
            }));
            afterAll(function (done) {
                dexieInstance.delete().then(done);
            });

            const eventsToSchedule: CalendarEvent[] = [
                {uuid: 'uuid1', date: new Date(2019, 0, 3, 14, 33, 0), workflowIDs: [1, 3, 3, 4]},
                {uuid: 'uuid2', date: new Date(2019, 11, 22, 9, 8, 7), workflowIDs: [0]},
                {uuid: 'uuid3', date: new Date(2019, 5, 13, 4, 13, 0), workflowIDs: [0]},
                {uuid: 'uuid4', date: new Date(2019, 7, 3, 22, 59, 0), workflowIDs: [2, 3]},
                {uuid: 'uuid5', date: new Date(2019, 1, 2, 10, 3, 59), workflowIDs: [1]},
            ];

            async function scheduleEvents() {
                await calendarDB.addEvents(eventsToSchedule);
            }

            describe('addEvents', function() {
                const expectedUUID1 = 'randomUUID1';
                const expectedUUID2 = 'anotherRandomUUID';
                const expectedDate1 = new Date(2019, 11, 13, 14, 10);
                const expectedDate2 = new Date(2019, 11, 13, 13, 48);
                const expectedWorkflowIDs1 = [5, 6, 7, 5, 5, 4];
                const expectedWorkflowIDs2 = [1, 3, 3, 1, 2, 0];
                it('should store an event into the database', async function(done) {
                    expect(await dexieInstance.calendarEvents.count()).toBe(0);
                    await calendarDB.addEvents([{
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1.slice()
                    }]);

                    expect(await dexieInstance.calendarEvents.count()).toBe(1);
                    expect(await dexieInstance.calendarEvents.get(expectedUUID1)).toEqual({
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1
                    });
                    done();
                });
                it('should store multiple events into the database', async function(done) {
                    expect(await dexieInstance.calendarEvents.count()).toBe(0);
                    await calendarDB.addEvents([{
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1.slice()
                    }]);
                    await calendarDB.addEvents([{
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }]);

                    expect(await dexieInstance.calendarEvents.count()).toBe(2);
                    expect(await dexieInstance.calendarEvents.get(expectedUUID1)).toEqual({
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1
                    });
                    expect(await dexieInstance.calendarEvents.get(expectedUUID2)).toEqual({
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2
                    });
                    done();
                });
                it('should store multiple events at once into the database', async function(done) {
                    expect(await dexieInstance.calendarEvents.count()).toBe(0);
                    await calendarDB.addEvents([{
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1.slice()
                    }, {
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }]);

                    expect(await dexieInstance.calendarEvents.count()).toBe(2);
                    expect(await dexieInstance.calendarEvents.get(expectedUUID1)).toEqual({
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1
                    });
                    expect(await dexieInstance.calendarEvents.get(expectedUUID2)).toEqual({
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2
                    });
                    done();
                });
                it('should rollback the transaction, if an error occurs while adding entries', async function(done) {
                    expect(await dexieInstance.calendarEvents.count()).toBe(0);
                    await expectThrowsAsync(async () => await calendarDB.addEvents([{
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1.slice()
                    }, {
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }, {
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }]), /already exists/);
                    expect(await dexieInstance.calendarEvents.count()).toBe(0);
                    await calendarDB.addEvents([{
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1.slice()
                    }]);
                    await expectThrowsAsync(async () => await calendarDB.addEvents([{
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }, {
                        uuid: expectedUUID2,
                        date: expectedDate2,
                        workflowIDs: expectedWorkflowIDs2.slice()
                    }]), /already exists/);
                    expect(await dexieInstance.calendarEvents.count()).toBe(1);
                    expect(await dexieInstance.calendarEvents.get(expectedUUID1)).toEqual({
                        uuid: expectedUUID1,
                        date: expectedDate1,
                        workflowIDs: expectedWorkflowIDs1
                    });
                    done();
                });
            });
            describe('getEventsWithWorkflowID', function() {
                beforeEach(async function(done) {
                    await scheduleEvents();
                    done();
                });

                it('should retrieve all events containing a certain workflow ID', async function (done) {
                    const events0 = await calendarDB.getEventsWithWorkflowID(0);
                    const expectedEvents0 = eventsToSchedule.filter((ev) => ev.workflowIDs.some((id) => id === 0));
                    expect(events0.length).toEqual(2);
                    expect(events0).toEqual(jasmine.arrayWithExactContents(expectedEvents0));

                    const events1 = await calendarDB.getEventsWithWorkflowID(1);
                    const expectedEvents1 = eventsToSchedule.filter((ev) => ev.workflowIDs.some((id) => id === 1));
                    expect(events1.length).toEqual(2);
                    expect(events1).toEqual(jasmine.arrayWithExactContents(expectedEvents1));

                    const events2 = await calendarDB.getEventsWithWorkflowID(2);
                    const expectedEvents2 = eventsToSchedule.filter((ev) => ev.workflowIDs.some((id) => id === 2));
                    expect(events2.length).toEqual(1);
                    expect(events2).toEqual(jasmine.arrayWithExactContents(expectedEvents2));

                    const events3 = await calendarDB.getEventsWithWorkflowID(3);
                    const expectedEvents3 = eventsToSchedule.filter((ev) => ev.workflowIDs.some((id) => id === 3));
                    expect(events3.length).toEqual(2);
                    expect(events3).toEqual(jasmine.arrayWithExactContents(expectedEvents3));

                    const events4 = await calendarDB.getEventsWithWorkflowID(4);
                    const expectedEvents4 = eventsToSchedule.filter((ev) => ev.workflowIDs.some((id) => id === 4));
                    expect(events4.length).toEqual(1);
                    expect(events4).toEqual(jasmine.arrayWithExactContents(expectedEvents4));

                    expect(await calendarDB.getEventsWithWorkflowID(5)).toEqual([]);
                    expect(await calendarDB.getEventsWithWorkflowID(25001)).toEqual([]);
                    expect(await calendarDB.getEventsWithWorkflowID(-1)).toEqual([]);
                    done();
                });
            });
            describe('getEvents', function() {
                it('should return empty array, if no events were scheduled', async function (done) {
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual([]);
                    done();
                });
                it('should return all entries, if offset is 0 and limit is inf', async function(done) {
                    await scheduleEvents();
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(jasmine.arrayWithExactContents(eventsToSchedule));
                    done();
                });
                it('should return selection of entries, if limit is given', async function(done) {
                    await scheduleEvents();
                    let allEvents = await calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
                    let events = await calendarDB.getEvents(0, 3);
                    expect(events.length).toEqual(3);
                    expect(events).toEqual(allEvents.slice(0, 3));
                    events = await calendarDB.getEvents(3, 5);
                    expect(events.length).toEqual(2);
                    expect(events).toEqual(allEvents.slice(3, 3 + 2));
                    events = await calendarDB.getEvents(4, 20);
                    expect(events.length).toEqual(1);
                    expect(events).toEqual(allEvents.slice(4, 4 + 1));
                    events = await calendarDB.getEvents(1, 3);
                    expect(events.length).toEqual(3);
                    expect(events).toEqual(allEvents.slice(1, 1 + 3));
                    done();
                });
            });
            describe('getEventByUUID', function() {
                beforeEach(async function (done) {
                    await scheduleEvents();
                    done();
                });
                it('should return undefined, if the specified uuid does not exist', async function(done) {
                    expect(await calendarDB.getEventByUUID('doesNotExist')).toBeUndefined();
                    expect(await calendarDB.getEventByUUID('nope')).toBeUndefined();
                    done();
                });
                it('should return the event with the corresponding UUID if it is stored', async function(done) {
                    expect(await calendarDB.getEventByUUID(eventsToSchedule[0].uuid)).toEqual(eventsToSchedule[0]);
                    expect(await calendarDB.getEventByUUID(eventsToSchedule[1].uuid)).toEqual(eventsToSchedule[1]);
                    expect(await calendarDB.getEventByUUID(eventsToSchedule[2].uuid)).toEqual(eventsToSchedule[2]);
                    expect(await calendarDB.getEventByUUID(eventsToSchedule[4].uuid)).toEqual(eventsToSchedule[4]);
                    expect(await calendarDB.getEventByUUID(eventsToSchedule[3].uuid)).toEqual(eventsToSchedule[3]);
                    done();
                });
            });
            describe('updateEvents', function() {
                beforeEach(async function (done) {
                    await scheduleEvents();
                    done();
                });
                it('should update a single calendar event, without updating anything else', async function(done) {
                    const expectedEvents = angular.copy(eventsToSchedule);
                    let updateEvent = angular.copy(eventsToSchedule[3]);
                    updateEvent.workflowIDs.splice(1, 1);
                    const numUpdated1 = await calendarDB.updateEvents([updateEvent.uuid], [{workflowIDs: updateEvent.workflowIDs}]);
                    expect(numUpdated1).toBe(1);
                    expectedEvents[3] = updateEvent;
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    updateEvent = angular.copy(eventsToSchedule[1]);
                    updateEvent.date = new Date(2020, 0, 3, 9, 27, 4);
                    const numUpdated2 = await calendarDB.updateEvents([updateEvent.uuid], [{date: updateEvent.date}]);
                    expect(numUpdated2).toBe(1);
                    expectedEvents[1] = updateEvent;
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    done();
                });
                it('should do nothing if an empty array is passed', async function(done) {
                    await calendarDB.updateEvents([], []);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(eventsToSchedule);
                    done();
                });
                it('should fail and rollback transaction if there are missing changes objects', async function(done) {
                    await expectThrowsAsync(async () => {
                        await calendarDB.updateEvents([eventsToSchedule[1].uuid, eventsToSchedule[0].uuid], [{workflowIDs: []}]);
                    }, /Modifications must be an object/);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(eventsToSchedule);
                    await expectThrowsAsync(async () => {
                        await calendarDB.updateEvents([eventsToSchedule[1].uuid, eventsToSchedule[0].uuid],
                            [undefined as unknown as Partial<CalendarEvent>, {workflowIDs: []}]);
                    }, /Modifications must be an object/);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(eventsToSchedule);
                    done();
                });
                it('should update multiple calendar events, without updating anything else', async function(done) {
                    const expectedEvents = angular.copy(eventsToSchedule);
                    const updateEvent1 = angular.copy(eventsToSchedule[3]);
                    updateEvent1.workflowIDs.splice(1, 1);
                    const updateEvent2 = angular.copy(eventsToSchedule[1]);
                    updateEvent2.date = new Date(2020, 4, 5, 9, 27, 4);
                    const numUpdated = await calendarDB.updateEvents([updateEvent1.uuid, updateEvent2.uuid], [
                        {workflowIDs: updateEvent1.workflowIDs},{date: updateEvent2.date}
                        ]);
                    expect(numUpdated).toEqual(2);
                    expectedEvents[3] = updateEvent1;
                    expectedEvents[1] = updateEvent2;
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    done();
                });
            });
            describe('deleteEvents', function() {
                let allEvents: CalendarEvent[];
                beforeEach(async function (done) {
                    await scheduleEvents();
                    allEvents = await calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
                    done();
                });
                it('should delete existing calendar events', async function (done) {
                    let expectedEvents = allEvents.slice();
                    await calendarDB.deleteEvents([]);
                    let nowEvents = await calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
                    expect(nowEvents.length).toBe(5);
                    await calendarDB.deleteEvents([allEvents[0].uuid]);
                    expectedEvents.splice(0, 1);
                    nowEvents = await calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
                    expect(nowEvents.length).toBe(4);
                    expect(nowEvents).toEqual(expectedEvents);

                    await calendarDB.deleteEvents([expectedEvents[2].uuid]);
                    expectedEvents.splice(2, 1);
                    nowEvents = await calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
                    expect(nowEvents.length).toBe(3);
                    expect(nowEvents).toEqual(expectedEvents);

                    await calendarDB.deleteEvents([expectedEvents[0].uuid, expectedEvents[1].uuid]);
                    expectedEvents.splice(0, 2);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);

                    await calendarDB.deleteEvents([expectedEvents[0].uuid]);
                    expectedEvents.splice(0, 1);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    done();
                });
                it('should delete multiple events', async function(done) {
                    let expectedEvents = allEvents.slice();
                    await calendarDB.deleteEvents(expectedEvents.slice(0, 3).map((event) => event.uuid));
                    expectedEvents = expectedEvents.slice(3, 6);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    await calendarDB.deleteEvents([expectedEvents[1].uuid]);
                    expectedEvents = expectedEvents.slice(0, 1);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    done();
                });
                it('should do nothing if the event to delete does not exist', async function(done) {
                    await calendarDB.deleteEvents(['does not exist']);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(allEvents);
                    await calendarDB.deleteEvents(['does not exist', 'does not exist either', 'and this also not']);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(allEvents);
                    done();
                });
                it('should delete all events that can be found, while skipping over events which do not exist', async function(done) {
                    let expectedEvents = allEvents.slice();
                    await calendarDB.deleteEvents(['does not exist', allEvents[0].uuid, allEvents[2].uuid]);
                    expectedEvents.splice(2, 1);
                    expectedEvents.splice(0, 1);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    await calendarDB.deleteEvents([expectedEvents[0].uuid, 'does not exist', 'does not exist either', expectedEvents[2].uuid, 'and this also not']);
                    expectedEvents.splice(2, 1);
                    expectedEvents.splice(0, 1);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(expectedEvents);
                    done();
                })
            });
            describe('removeWorkflowFromCalendarEventsAndGetDeletedEvents', function() {
                it('should remove ids and/or workflows #1', async function(done) {
                    await scheduleEvents();
                    const allEvents = angular.copy(eventsToSchedule);
                    const filteredEvents = allEvents.filter((event) => event.uuid !== "uuid5");
                    filteredEvents.splice(4, 1);
                    filteredEvents[0].workflowIDs.splice(0, 1);
                    await calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents(1);
                    expect((await calendarDB.getEvents(0, Number.POSITIVE_INFINITY))).toEqual(filteredEvents);
                    done();
                });
                it('should remove ids and/or workflows #2', async function(done) {
                    await scheduleEvents();
                    const filteredEvents = angular.copy(eventsToSchedule);
                    filteredEvents.splice(1, 2);
                    await calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents(0);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(filteredEvents);
                    done();
                });
                it('should remove ids and/or workflows #3', async function(done) {
                    await scheduleEvents();
                    const filteredEvents = angular.copy(eventsToSchedule);
                    filteredEvents[0].workflowIDs.splice(1,2);
                    filteredEvents[3].workflowIDs.splice(1,1);
                    await calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents(3);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(filteredEvents);
                    done();
                });
                it('should not ids and/or workflows, if none matches', async function(done) {
                    await scheduleEvents();
                    await calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents(5);
                    expect(await calendarDB.getEvents(0, Number.POSITIVE_INFINITY)).toEqual(eventsToSchedule);
                    done();
                });
            });
        });
    });
}
