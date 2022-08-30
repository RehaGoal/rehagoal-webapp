

module rehagoal.database {
    import generateRandomUUIDFunc = rehagoal.utilities.generateRandomUUIDFunc;
    const moduleName = 'rehagoal.database';

    export interface CalendarEvent {
        uuid: string,
        date: Date;
        workflowIDs: number[]
    }

    type CalendarEventPrimaryKey = string;

    export interface CalendarDexie extends dexie.Dexie {
        calendarEvents: dexie.Dexie.Table<CalendarEvent, CalendarEventPrimaryKey>
    }

    export interface CalendarDB {
        /**
         * Adds the given events to the database. A (random) UUID needs to be generated in advance. The operation is
         * wrapped in a transaction, such that if anything goes wrong, no entry is persisted. The transaction fails, if
         * an entry with the given UUID already exists in the database.
         * @param events calendar events to persist in the database.
         */
        addEvents(events: CalendarEvent[]): Promise<void>

        /**
         * Returns all calendar events in the database which contain the given workflow id.
         * @param workflowID workflow id to search for in the calendar events
         * @return calendar events from the database which have the given workflowID stored in the list of workflow IDs.
         */
        getEventsWithWorkflowID(workflowID: number): Promise<CalendarEvent[]>

        /**
         * Retrieves and returns at most `limit` calendar events from the database, starting from the given offset in
         * the database table.
         * @param offset Offset at which to start extracting entries from the table
         * @param limit Maximum number of calendar events to retrieve
         * @return calendar events from the given offset in the database table, at maximum `limit` entries
         */
        getEvents(offset: number, limit: number): Promise<CalendarEvent[]>

        /**
         * Return the CalendarEvent with the given uuid, or undefined if it does not exist.
         * @param uuid uuid to lookup
         * @return CalendarEvent from the database with the given UUID or undefined
         */
        getEventByUUID(uuid: string): Promise<CalendarEvent | undefined>

        /**
         * Updates the calendar events corresponding to the given UUIDs by applying the changes specified.
         * The operation is performed in a transaction, so if an update fails, the changes are reverted.
         * The transaction does NOT fail, if the UUIDs are not found in the database, rather the number of updated
         * entries is returned after the transaction completes.
         * @param uuids UUIDs of calendar events to update. Non-existing entries are ignored.
         * @param changes partial objects of CalendarEvents, specifiying which field should be changed to which value
         * @return number of entries modified by the transaction, i.e. should be uuids.length, if everything went fine
         */
        updateEvents(uuids: string[], changes: (Partial<CalendarEvent>)[]): Promise<number>

        /**
         * Deletes the calendar events specified by the given UUIDs from the database. In case a UUID is not found,
         * no error occurs.
         * @param uuids UUIDs of calendar events to delete
         */
        deleteEvents(uuids: string[]): Promise<void>

        /**
         * Removes a workflow by ID from all persisted calendar events. If a CalendarEvent has no associated workflows
         * afterwards, it is removed. All removed calendar events are returned in a promise.
         * @param workflowID ID of the workflow to remove from persisted calendar events
         * @return (Promise of) calendar events, which have been deleted because they contain no workflows anymore.
         */
        removeWorkflowFromCalendarEventsAndGetDeletedEvents(workflowID: number): Promise<CalendarEvent[]>
    }

    class CalendarDatabaseService implements CalendarDB {
        static $inject = [
            'dexieFactory',
        ];

        private dexie: CalendarDexie;

        constructor(private dexieFactory: DexieFactory) {
            this.dexie = dexieFactory<CalendarDexie>('calendarDB');
            this.dexie.version(1).stores({
                calendarEvents: '&uuid,date,*workflowIDs',
            });
        }

        async addEvents(events: CalendarEvent[]): Promise<void> {
            return this.dexie.transaction('rw', this.dexie.calendarEvents, () => {
                return this.dexie.calendarEvents.bulkAdd(events).then(()=>{});
            });
        }

        async getEventByUUID(uuid: string): Promise<CalendarEvent | undefined> {
            return this.dexie.calendarEvents.get(uuid);
        }

        async getEventsWithWorkflowID(workflowID: number): Promise<CalendarEvent[]> {
            return this.dexie.calendarEvents.where('workflowIDs').equals(workflowID).toArray();
        }

        async getEvents(offset: number, limit: number): Promise<CalendarEvent[]> {
            return this.dexie.calendarEvents.offset(offset).limit(limit).toArray();
        }

        async updateEvents(uuids: string[], changes: Partial<CalendarEvent>[]): Promise<number> {
            const updatedCounts = await this.dexie.transaction('rw', this.dexie.calendarEvents, () => {
                return Promise.all(uuids.map((uuid, i) => {
                    return this.dexie.calendarEvents.update(uuid, changes[i]);
                }));
            });
            return updatedCounts.reduce((a, b) => a + b, 0);
        }

        async deleteEvents(uuids: string[]): Promise<void> {
            return this.dexie.calendarEvents.bulkDelete(uuids);
        }

        async removeWorkflowFromCalendarEventsAndGetDeletedEvents(workflowID: number): Promise<CalendarEvent[]> {
            return this.dexie.transaction('rw', this.dexie.calendarEvents, async () => {
                const affectedEvents = await this.getEventsWithWorkflowID(workflowID);
                const calendarEventsDeleted: CalendarEvent[] = [];
                const calendarEventUpdateUUIDs: string[] = [];
                const calendarEventUpdateChanges: Partial<CalendarEvent>[] = [];
                for (const event of affectedEvents) {
                    const originalWorkflowIDs = event.workflowIDs;
                    const newWorkflowIDs = originalWorkflowIDs.filter((id) => id !== workflowID);
                    if (newWorkflowIDs.length === 0) {
                        calendarEventsDeleted.push(event);
                    } else {
                        calendarEventUpdateUUIDs.push(event.uuid);
                        calendarEventUpdateChanges.push({workflowIDs: newWorkflowIDs});
                    }
                }
                await this.deleteEvents(calendarEventsDeleted.map(event => event.uuid));
                await this.updateEvents(calendarEventUpdateUUIDs, calendarEventUpdateChanges);
                return calendarEventsDeleted;
            })
        }
    }

    angular.module(moduleName).service('calendarDBService', CalendarDatabaseService);
}
