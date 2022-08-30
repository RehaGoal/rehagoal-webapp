module rehagoal.calendar {
    import CalendarDB = rehagoal.database.CalendarDB;
    import generateRandomUUIDFunc = rehagoal.utilities.generateRandomUUIDFunc;
    const moduleName = 'rehagoal.calendar';

    export interface ICalendarService {
        getStartupPromise(): Promise<any>
        addCalendarEvent(date: Date, workflowIDs: number[]): Promise<CalendarEvent>
        deleteCalendarEvent(eventUUID: string): Promise<void>
        removeWorkflowFromCalendarEventsAndGetDeletedEvents(workflowID: number): Promise<CalendarEvent[]>
        getCalendarEventByUUID(eventUUID: string): Promise<CalendarEvent | undefined>
        getCalendarEvents(offset: number, limit: number): Promise<CalendarEvent[]>
    }

    class CalendarService implements ICalendarService {
        static $inject = [
            '$log',
            '$rootScope',
            'calendarDBService',
            'calendarSchedulerService',
            'generateRandomUUID'
        ];

        private readonly _startupPromise: Promise<any>;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private calendarDB: CalendarDB,
                    private calendarScheduler: ICalendarSchedulerService,
                    private generateRandomUUID: generateRandomUUIDFunc) {
            // TODO: Possibly delay other operations until startup is complete?
            this._startupPromise = this.calendarServiceStartup().then(
                () => $log.info('CalendarService startup complete.')
            );
        }

        getStartupPromise(): Promise<any> {
            return this._startupPromise;
        }

        /**
         * Returns the maximum age (as a Date) a CalendarEvent can have (given the current Date) before it is counted
         * as missed event.
         * Currently this date is defined as the start of today (i.e. hours/minutes/seconds/millis set to 0), therefore
         * every event yesterday and older will be counted as missed.
         */
        private static getAgeLimitForNow(): Date {
            const ageLimit = new Date();
            ageLimit.setHours(0);
            ageLimit.setMinutes(0);
            ageLimit.setSeconds(0);
            ageLimit.setMilliseconds(0);
            return ageLimit;
        }

        private async calendarServiceStartup() {
            const calendarEvents = await this.calendarDB.getEvents(0, Number.POSITIVE_INFINITY);
            const ageLimit = CalendarService.getAgeLimitForNow();
            const missedEvents = await this.rescheduleEventsAndGetMissed(calendarEvents, ageLimit);
            if (missedEvents.length > 0) {
                await this.calendarDB.deleteEvents(missedEvents.map(event => event.uuid));
                this.$rootScope.$broadcast('calendarEventComponent::missedEvents', missedEvents);
            }
        }

        /**
         * Unschedules the given events and reschedules them depending on their scheduled date, returning a list of
         * missed events, which were not rescheduled.
         * For this every given event is checked, whether it is older than the given ageLimit (Date). Events older than
         * the age limit are not rescheduled but instead returned in a list of missed events. Events which are in the
         * past, but not older than ageLimit are scheduled immediately. Events which are in the future are scheduled
         * regularly for their date.
         * @param events
         * @param ageLimit
         */
        private async rescheduleEventsAndGetMissed(events: CalendarEvent[], ageLimit: Date): Promise<CalendarEvent[]> {
            const now = new Date();
            const missedEvents: CalendarEvent[] = [];
            const scheduleImmediateEvents: CalendarEvent[] = [];
            const scheduleFutureEvents: CalendarEvent[] = [];
            // Unschedule all known events (might still be scheduled e.g. on Cordova)
            await this.calendarScheduler.unscheduleEvents(events.map(event => event.uuid));
            for (const event of events) {
                const scheduledDate = event.date;
                if (scheduledDate.getTime() <= now.getTime()) {
                    // Event is in the past or happening right now
                    if (scheduledDate.getTime() < ageLimit.getTime()) {
                        // Event is older than ageLimit => missed
                        missedEvents.push(event);
                    } else {
                        // Event is younger than ageLimit => schedule now
                        scheduleImmediateEvents.push(event);
                    }
                } else {
                    // Event is in the future
                    scheduleFutureEvents.push(event);
                }
            }
            // Reschedule non-missed events
            await this.calendarScheduler.scheduleEvents(scheduleFutureEvents);
            await this.calendarScheduler.scheduleEventsImmediate(scheduleImmediateEvents);
            return missedEvents;
        }

        /**
         * Creates a new calendar event, schedules it and stores it in the database.
         * A random UUID is assigned to the calendar event.
         * @param date Date for which the calendar event is scheduled (when it should be triggered)
         * @param workflowIDs Sequence of workflow IDs to associate to the calendar event
         * @return (Promise for) CalendarEvent which has been scheduled and persisted.
         */
        async addCalendarEvent(date: Date, workflowIDs: number[]): Promise<CalendarEvent> {
            /* Spec:
             *      - Generate random UUID
             *      - Create event consisting of parameters (date & workflowIDs) and generated UUID
             *      - Store event in CalendarDatabase
             *      - Schedule event using CalendarScheduler
             *      - await finish of above operations
             *      - return calendar event (promise)
             *   Failure conditions:
             *      - Should fail if event cannot be stored in database (a), or cannot be scheduled (b).
             *          - Rollback (a): Unschedule event, if already scheduled.
             *          - Rollback (b): Remove event from database, if already stored.
             */
            // TODO: This method could be vectorized
            const uuid = this.generateRandomUUID();
            const calendarEvent: CalendarEvent = {
                date,
                uuid,
                workflowIDs
            };
            await this.calendarDB.addEvents([calendarEvent]);
            try {
                await this.calendarScheduler.scheduleEvents([calendarEvent]);
            } catch (scheduleError) {
                this.$log.error('Error while scheduling calendar event... performing DB rollback.');
                await this.calendarDB.deleteEvents([calendarEvent.uuid]);
                throw scheduleError;
            }
            return calendarEvent;
        }

        /**
         * Deletes a calendar event with the given UUID from the database and unschedules it.
         * @param eventUUID UUID of the event to remove & unschedule
         */
        async deleteCalendarEvent(eventUUID: string): Promise<void> {
            /* Implement spec
             *      - Delete CalendarEvent by uuid from CalendarDatabase
             *      - await promise
             *      - unschedule CalendarEvent from CalendarScheduler
             *      - return
             *   Failure conditions:
             *      - If no event with given UUID is stored in CalendarDatabase: no failure
             *      - If no event with given UUID is scheduled in CalendarScheduler: no failure
             */
            // TODO: This method could be vectorized
            await this.calendarDB.deleteEvents([eventUUID]);
            await this.calendarScheduler.unscheduleEvents([eventUUID]);
        }

        /**
         * Removes a workflow by ID from all persisted calendar events. If a CalendarEvent has no associated workflows
         * afterwards, it is removed. All removed calendar events are returned in a promise.
         * @param workflowID ID of the workflow to remove from persisted calendar events
         * @return (Promise of) calendar events, which have been deleted because they contain no workflows anymore.
         */
        async removeWorkflowFromCalendarEventsAndGetDeletedEvents(workflowID: number): Promise<CalendarEvent[]> {
            return this.calendarDB.removeWorkflowFromCalendarEventsAndGetDeletedEvents(workflowID);
        }

        /**
         * Lookup a persisted calendar event by its UUID and return it.
         * @param eventUUID UUID of the calendar event to lookup
         * @return (Promise of) CalendarEvent with the given UUID
         */
        async getCalendarEventByUUID(eventUUID: string): Promise<CalendarEvent | undefined> {
            return this.calendarDB.getEventByUUID(eventUUID);
        }

        /**
         * Retrieves and returns at most `limit` persisted calendar events, starting from the given offset.
         * @param offset Offset at which to start extracting entries
         * @param limit Maximum number of calendar events to retrieve
         * @return calendar events from the given offset, at maximum `limit` entries
         */
        async getCalendarEvents(offset: number, limit: number): Promise<CalendarEvent[]> {
            return this.calendarDB.getEvents(offset, limit);
        }
    }

    angular.module(moduleName)
        .service('calendarService', CalendarService)
}
