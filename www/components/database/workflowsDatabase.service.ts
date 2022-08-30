module rehagoal.database {
    import TableDump = rehagoal.exchange.TableDump;
    const moduleName = 'rehagoal.database';

    interface WorkflowXMLPrimaryKey {
        xmlHash: string
    }

    interface WorkflowVersionsPrimaryKey {
        uuid: string
        versionHash: string
    }

    export interface WorkflowXMLEntry extends WorkflowXMLPrimaryKey {
        xml: string
    }

    export interface WorkflowVersionsEntry extends  WorkflowVersionsPrimaryKey{
        xmlHash: string
        name: string
    }

    /**
     * General interface for workflow entries which will be used to
     * store a history within the database
     */
    export interface WorkflowsDBEntry extends WorkflowVersionsEntry, WorkflowXMLEntry {};

    export interface WorkflowsDexie extends dexie.Dexie {
        workflowXML: dexie.Dexie.Table<WorkflowXMLEntry, WorkflowXMLPrimaryKey>
        workflowVersions: dexie.Dexie.Table<WorkflowVersionsEntry, WorkflowVersionsPrimaryKey>
    }

    export interface WorkflowsDB {
        storeWorkflowsIfStudyModeEnabled(entries: WorkflowsDBEntry[]): Promise<void>
        dumpDB(): Promise<TableDump[]>
    }

    class WorkflowsDatabaseService implements WorkflowsDB {
        static $inject = [
            'dexieFactory',
            'settingsService'
        ];

        private dexie: WorkflowsDexie;

        /**
         * Initializes the Dexie IndexedDB (workflowsDB) with two tables:
         *   - workflowXML: index on xmlHash
         *   - workflowVersions: (compound) indices on
         *      - uuid+versionHash
         *      - xmlHash+name, which has to be unique (& identifier)
         * @param dexieFactory  DexieInstance factory
         */
        constructor(private dexieFactory: DexieFactory,
                    private settingsService: rehagoal.settings.SettingsService) {
            this.dexie = dexieFactory<WorkflowsDexie>('workflowsDB');
            this.dexie.version(1).stores({
                workflowXML: 'xmlHash',
                workflowVersions: '[uuid+versionHash],&[xmlHash+name]'
            });
        }

        /**
         * Exports all entries from all tables of this database to a datastructure.
         * The datastructure includes the table names and every field stored in the database.
         * @returns Promise, which will be resolved with the database dump datastructure.
         */
        public async dumpDB(): Promise<TableDump[]> {
            const db = this.dexie;
            return db.transaction('r', db.tables, () => {
                return Promise.all(
                    db.tables.map((table: dexie.Dexie.Table<any, any>) => table.toArray()
                        .then((rows: any[]) => ({table: table.name, rows: rows}))
                    )
                );
            });
        }

        /**
         * Stores workflow entries to provide specific versions for later re-use.
         * It creates an entry for each object inside the array for the xml content,
         * if the xml hash value has not been stored already. Same goes for the
         * version entry if the WorkflowVersionsPrimaryKey has not been stored before.
         * Otherwise it will not add the workflow or overwrite an existing entry.
         * @param entries     array containing entries to store inside the database
         * @return Promise
         */
        async storeWorkflowsIfStudyModeEnabled(entries: WorkflowsDBEntry[]): Promise<void> {
            const db = this;
            if(!db.settingsService.studyModeEnabled) {
                // if studyMode is disabled, there is no need to store workflows
                return;
            }
            await db.dexie.transaction('rw', db.dexie.workflowXML, db.dexie.workflowVersions, async () => {
                await Promise.all(entries.map(async (entry: WorkflowsDBEntry) => {
                    const xmlEntry: WorkflowXMLEntry = {
                        xml: entry.xml,
                        xmlHash: entry.xmlHash
                    };
                    const versionsEntry: WorkflowVersionsEntry = {
                        uuid: entry.uuid,
                        name: entry.name,
                        xmlHash: entry.xmlHash,
                        versionHash: entry.versionHash
                    };
                    await db.storeWorkflowXML(xmlEntry);
                    await db.storeWorkflowAsVersion(versionsEntry);
                }));
            });
        }

        /**
         * Stores the xml under the provided hash value inside the database if
         * the hash has not already been stored.
         * @param xmlEntry   entry to store inside the database
         */
        private async storeWorkflowXML(xmlEntry: WorkflowXMLEntry): Promise<void> {
            const db = this;
            return db.dexie.transaction('rw', db.dexie.workflowXML, async () => {
                const entry: WorkflowXMLEntry | undefined = await db.dexie.workflowXML.get({xmlHash: xmlEntry.xmlHash});
                if (entry === undefined) {
                    await db.dexie.workflowXML.add(xmlEntry);
                }
            });
        }

        /**
         * Stores a provided workflow version entry inside the database if the primary key
         * has not already been stored.
         * @param workflowEntry      entry which should be stored inside the database
         */
        private async storeWorkflowAsVersion(workflowEntry: WorkflowVersionsEntry): Promise<void> {
            const db = this;
            return db.dexie.transaction('rw', db.dexie.workflowVersions, async () => {
                const entry: WorkflowVersionsEntry | undefined = await db.dexie.workflowVersions.get({uuid: workflowEntry.uuid, versionHash: workflowEntry.versionHash});
                if (entry === undefined) {
                    await db.dexie.workflowVersions.add(workflowEntry);
                }
            });
        }
    }

    angular.module(moduleName).service('workflowsDBService', WorkflowsDatabaseService);
}
