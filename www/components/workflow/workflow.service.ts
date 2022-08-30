///<reference path="workflow.service.d.ts"/>
module rehagoal.workflow {
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import findNewNameFunc = rehagoal.utilities.findNewNameFunc;
    import objectFromEntries = rehagoal.utilities.objectFromEntries;
    const storageKey = 'workflowStorage';
    const defaultWorkspaceXml = '<xml><block type="task_group" deletable="false" movable="true"></block></xml>';

    interface IWorkflowStorageDataV1 {
        workflowIds: number[],
        workflowsById: {[key: number]: IWorkflowV1},
    }

    export interface IWorkflowStorageV1 extends IWorkflowStorageDataV1 {
        version: 1
    }

    interface IWorkflowStorageDataV2 extends IWorkflowStorageDataV1 {
        workflowNameToId: {[key: string]: number}
        workflowsById: {[key: number]: IWorkflowV2},
    }

    export interface IWorkflowStorageV2 extends IWorkflowStorageDataV2 {
        version: 2
    }

    export interface IWorkflowStorageDataV3 extends IWorkflowStorageDataV2 {
        workflowsById: {[key: number]: IWorkflowV3},
    }

    export interface IWorkflowStorageV3 extends IWorkflowStorageDataV3 {
        version: 3
    }

    const currentVersion = 3;
    export type IWorkflowStorageCurrentVersion = IWorkflowStorageV3;
    export type IWorkflowStorageAnyVersion = IWorkflowStorageV1 | IWorkflowStorageV2 | IWorkflowStorageV3

    interface IWorkflowStorageWrapper {
        version: typeof currentVersion;
        workflowIds: number[]
        workflowsById: Map<number, IWorkflowV3>;
        workflowNameToId: Map<string, number>
    }

    class WorkflowService implements IWorkflowService {
        static $inject = [
            '$log',
            'webStorage',
            'hashString',
            'generateRandomUUID',
            'generateWorkflowVersionHash',
            'findNewName',
            'workflowsDBService'
        ];

        private lastWorkflowId: number = 0;

        constructor(private $log: angular.ILogService,
                    private webStorage: IAngularWebStorageService,
                    private hashString: (str: string) => string,
                    private generateRandomUUID: () => string,
                    private generateWorkflowVersionHash: (workflow_name: string, workspaceXmlHash: string) => string,
                    private findNewName: findNewNameFunc,
                    private workflowsDBService: WorkflowsDB) {
            this.loadStorage().then(() => {
                $log.info("workflowService initialized");
            })
        }

        private storageWrapper: IWorkflowStorageWrapper =  {
            version: currentVersion,
            workflowIds: [0],
            workflowsById: new Map([
                [0, this.makeWorkflow(0, 'Test Workflow', defaultWorkspaceXml)]
            ]),
            workflowNameToId: new Map([
                ['Test Workflow', 0]
            ]),
        };

        private warnNonIntegerId(id: any): void {
            this.$log.warn('Workflow id ' + id + ' is non-integer. Data is corrupted!');
        }

        private filterNonIntegerIds(ids: any[]): number[] {
            let i = ids.length - 1;
            while (i >= 0) {
                let id = ids[i];
                if (!isInteger(id)) {
                    this.warnNonIntegerId(id);
                    ids.splice(i, 1);
                }
                i--;
            }
            return ids;
        }

        private assumeWorkflowIdExists(id: number): void {
            if (!this.storageWrapper.workflowsById.has(id)) {
                throw new Error("Workflow with id '" + id + "' does not exist!");
            }
        }

        private assumeValidNewId(id: any): void {
            if (!isInteger(id)) {
                this.warnNonIntegerId(id);
                throw new Error("id '" + id + ' is non-integer!');
            }
            if (this.storageWrapper.workflowsById.has(id)) {
                throw new Error("Workflow with id '" + id + "' already exists!");
            }
        }

        public deleteWorkflowById(id: number): Promise<void> {
            this.assumeWorkflowIdExists(id);
            const workflow = this.storageWrapper.workflowsById.get(id)!;
            this.storageWrapper.workflowIds.splice(this.storageWrapper.workflowIds.indexOf(id), 1);
            this.storageWrapper.workflowNameToId.delete(workflow.name);
            this.storageWrapper.workflowsById.delete(id);
            return this.persistStorageAndSaveWorkflowsInWorkflowsDB([]);
        }

        public getWorkflows(): IWorkflow[] {
            return [...this.storageWrapper.workflowsById.values()];
        }

        public getWorkflowById(id: number): IWorkflow | null {
            if (!angular.isNumber(id)) {
                throw new Error('getWorkflowById needs the `id` argument to be a Number!');
            }
            return this.storageWrapper.workflowsById.get(id) || null;
        }

        public getWorkflowByName(name: string): IWorkflow | null {
            if (this.storageWrapper.workflowNameToId.has(name)) {
                const id = this.storageWrapper.workflowNameToId.get(name)!;
                return this.storageWrapper.workflowsById.get(id)!;
            }
            return null;
        }

        /**
         * Upgrade routine for the workflow storage which will
         * run incrementaly for each (newer) version
         * @param storage
         */
        private upgradeWorkflowStorage(storage: IWorkflowStorageAnyVersion): IWorkflowStorageCurrentVersion {
            if (storage.version < 2) {
                storage = this.upgradeWorkflowStorageV2(storage as IWorkflowStorageV1);
            }
            if (storage.version < 3) {
                storage = this.upgradeWorkflowStorageV3(storage as IWorkflowStorageV2);
            }
            if (storage.version > currentVersion) {
                this.$log.warn("Storage version is newer than current version, data might be incompatible!");
            }
            return storage as IWorkflowStorageCurrentVersion;
        }

        /**
         * Upgrade workflow storage to v2:
         * - Workflow names are now unique.
         * - Workflow storage has new field workflowNameToId.
         * @param storage
         */
        private upgradeWorkflowStorageV2(storage: IWorkflowStorageV1): IWorkflowStorageV2 {
            const usedWorkflowNames = new Set<string>();
            const newStorage: IWorkflowStorageV2 = {
                ...storage,
                workflowNameToId: Object.create(null),
                version: 2
            };
            for (let id in newStorage.workflowsById) {
                if (Object.prototype.hasOwnProperty.call(newStorage.workflowsById, id)) {
                    const workflow = newStorage.workflowsById[id];
                    if (usedWorkflowNames.has(workflow.name)) {
                        workflow.name = this.findNewName(usedWorkflowNames, workflow.name);
                    }
                    usedWorkflowNames.add(workflow.name);
                    newStorage.workflowNameToId[workflow.name] = workflow.id;
                }
            }
            this.$log.info("Successfully upgraded to workflow storage v2");
            return newStorage;
        }

        /**
         * Upgrade workflow storage to v3:
         * WorkflowVersioning:
         * - workflows have a radnomUUID (stays intact while exporting / importing)
         * - workflows have a version hash (combined hash from xmlHash & Name)
         * @param storage
         */
        private upgradeWorkflowStorageV3(storage: IWorkflowStorageV2): IWorkflowStorageV3 {
            const newStorage: IWorkflowStorageV3 = {
                ...storage,
                workflowsById: {},
                version: 3
            };
            for (let id in storage.workflowsById) {
                if (Object.prototype.hasOwnProperty.call(storage.workflowsById, id)) {
                    const oldWorkflow = storage.workflowsById[id];
                    let uuid = (oldWorkflow as IWorkflowV3).uuid;
                    if (!uuid || !angular.isString(uuid)) {
                        uuid = this.generateRandomUUID();
                    }
                    let xmlHash = (oldWorkflow as IWorkflowV3).xmlHash;
                    const newWorkflow = {
                        ...oldWorkflow,
                        uuid,
                        xmlHash
                    };
                    if (!xmlHash || !angular.isString(xmlHash)) {
                        this.updateXmlHash(newWorkflow);
                    }
                    newStorage.workflowsById[id] = newWorkflow;
                }
            }
            newStorage.version = 3;
            this.$log.info("Successfully upgraded to workflow storage v3");
            return newStorage;
        }

        private async loadStorage(): Promise<void> {
            if (!this.webStorage.has(storageKey)) {
                //persist new storage object and store default test workflow
                await this.persistStorageAndSaveWorkflowsInWorkflowsDB([this.getWorkflowById(0)!]);
            } else {
                let tmpStorage: IWorkflowStorageCurrentVersion;
                let upgraded = false;
                {
                    let tmpStorageAnyVersion: IWorkflowStorageAnyVersion = this.webStorage.get(storageKey);
                    if (!Object.prototype.hasOwnProperty.call(tmpStorageAnyVersion, 'version')) {
                        this.$log.warn('Missing version information in storage data. Data might be corrupted!');
                        tmpStorageAnyVersion.version = 1;
                    }
                    if (tmpStorageAnyVersion.version !== currentVersion) {
                        this.$log.warn('Version of stored data does not match current version. Data might be incompatible!');
                        tmpStorage = this.upgradeWorkflowStorage(tmpStorageAnyVersion);
                        upgraded = true;
                    } else {
                        tmpStorage = tmpStorageAnyVersion as IWorkflowStorageCurrentVersion;
                    }
                    if (!Object.prototype.hasOwnProperty.call(tmpStorage, 'workflowIds') ||
                        !Object.prototype.hasOwnProperty.call(tmpStorage, 'workflowsById') ||
                        !Object.prototype.hasOwnProperty.call(tmpStorage, 'workflowNameToId')) {
                        this.$log.warn('Needed storage information is missing. Skipping loading.');
                        return;
                    }
                }
                const idsUnfiltered = Array.from(tmpStorage.workflowIds);
                const ids = this.filterNonIntegerIds(idsUnfiltered);

                const workflowList = [];

                const workflowNames = Object.create(null);
                for (let id in tmpStorage.workflowsById) {
                    if (Object.prototype.hasOwnProperty.call(tmpStorage.workflowsById, id)) {
                        let valid = false;
                        let idNumber: number | undefined = undefined;
                        let flow = tmpStorage.workflowsById[id];
                        if (!isInteger(id)) {
                            this.warnNonIntegerId(id);
                        } else if ((idNumber = Number(id)) && !ids.includes(idNumber)) {
                            this.$log.warn('Workflow id ' + id + ' not listed in workflowIds. Data is corrupted!');
                        } else if (flow.name in workflowNames) {
                            this.$log.warn('Duplicate workflow name "' + flow.name + '". Data is corrupted!');
                        } else if (!(Object.prototype.hasOwnProperty.call(flow, "id") && flow.id === idNumber)) {
                            this.$log.warn('Workflow id mismatch in workflowsById (' + idNumber + ' != ' + flow.id + '). Data is corrupted!');
                        } else if (!(Object.prototype.hasOwnProperty.call(flow, "uuid"))) {
                            this.$log.warn('Workflow: ' + flow.name + ' has no unique id. Data is corrupted!');
                        } else if (!(Object.prototype.hasOwnProperty.call(flow, "xmlHash"))) {
                            this.$log.warn('Workflow: ' + flow.name + ' has no xmlHash. Data is corrupted!');
                        } else if (!(Object.prototype.hasOwnProperty.call(tmpStorage.workflowNameToId, flow.name))) {
                            this.$log.warn('Workflow name "' + flow.name + '" not listed in workflowNameToId.');
                            // add missing name to workflowNameToId
                            tmpStorage.workflowNameToId[flow.name] = idNumber;
                            valid = true;
                        } else {
                            valid = true;
                        }
                        if (!valid) {
                            if (idNumber !== undefined) {
                                ids.splice(ids.indexOf(idNumber!), 1);
                            }
                            delete tmpStorage.workflowsById[id];
                            if (Object.prototype.hasOwnProperty.call(tmpStorage.workflowNameToId, flow.name)) {
                                delete tmpStorage.workflowNameToId[flow.name];
                            }
                        } else {
                            //Add workflow name to the list of used names
                            workflowNames[flow.name] = true;
                            workflowList.push(flow);
                        }
                    }
                }
                // Remove name->id mappings for unused names.
                for (let name in tmpStorage.workflowNameToId) {
                    if (Object.prototype.hasOwnProperty.call(tmpStorage.workflowNameToId, name)) {
                        if (!(name in workflowNames)) {
                            this.$log.warn('Workflow name to id mapping for non-existent name detected: "' + name + '"');
                            delete tmpStorage.workflowNameToId[name];
                        }
                    }
                }
                tmpStorage.workflowIds = Array.from(ids);
                this.storageWrapper = this.serializableStorageToStorageWrapper(tmpStorage);
                if (upgraded) {
                    await this.persistStorageAndSaveWorkflowsInWorkflowsDB(workflowList);
                }
            }
        }

        private makeWorkflow(id: number, name: string, workspaceXml: string, uuid?: string): IWorkflow {
            if (!uuid || !angular.isString(uuid)) {
                uuid = this.generateRandomUUID();
            }
            const xmlHash = this.generateXmlHash(workspaceXml);
            return {
                id: id,
                name: name,
                workspaceXml: workspaceXml,
                remoteId: null,
                uuid: uuid,
                xmlHash: xmlHash
            };
        }

        private newWorkflowNoPersist(workflowName: string, workspaceXml: string, uuid: string): IWorkflow {
            let lastId;
            if (this.storageWrapper.workflowIds.length === 0) {
                lastId = -1;
            } else {
                lastId = this.storageWrapper.workflowIds[this.storageWrapper.workflowIds.length - 1];
            }
            const newId = lastId + 1;
            this.assumeValidNewId(newId);
            if (this.storageWrapper.workflowNameToId.has(workflowName)) {
                workflowName = this.findNewName(new Set(this.storageWrapper.workflowNameToId.keys()), workflowName);
            }
            const newFlow = this.makeWorkflow(newId, workflowName, workspaceXml, uuid);
            this.storageWrapper.workflowsById.set(newId, newFlow);
            this.storageWrapper.workflowNameToId.set(workflowName, newId);
            this.storageWrapper.workflowIds.push(newId);
            this.lastWorkflowId = newId;
            return newFlow;
        }

        public async newWorkflow(name: string, workspaceXml: string, uuid: string): Promise<IWorkflow> {
            if (!name || !angular.isString(name)) {
                name = 'New Workflow';
            }
            if (!workspaceXml || !angular.isString(workspaceXml)) {
                workspaceXml = defaultWorkspaceXml;
            }
            const newFlow = this.newWorkflowNoPersist(name, workspaceXml, uuid);
            await this.persistStorageAndSaveWorkflowsInWorkflowsDB([newFlow]);
            return newFlow;
        }

        public async renameWorkflow(previousName: string, workflow: IWorkflow): Promise<void> {
            this.assumeWorkflowIdExists(workflow.id);
            if (previousName != workflow.name) {
                this.storageWrapper.workflowNameToId.delete(previousName);
                if (this.storageWrapper.workflowNameToId.has(workflow.name)) {
                    workflow.name = this.findNewName(new Set(this.storageWrapper.workflowNameToId.keys()), workflow.name);
                }
            }
            this.storageWrapper.workflowNameToId.set(workflow.name, workflow.id);
            return this.persistStorageAndSaveWorkflowsInWorkflowsDB([workflow]);
        }

        public async saveWorkflow(workflow: IWorkflow): Promise<void> {
            this.assumeWorkflowIdExists(workflow.id);
            this.updateXmlHash(workflow);

            this.storageWrapper.workflowsById.set(workflow.id, workflow);
            this.storageWrapper.workflowNameToId.set(workflow.name, workflow.id);
            return this.persistStorageAndSaveWorkflowsInWorkflowsDB([workflow]);

        }

        /**
         * Validates that a provided workflow object contains a uuid and the
         * correct xmlHash and generates a versionHash for it
         * @param workflow, the workflow that should be saved in the workflowDB
         * @returns entry   could be stored
         * @throws Error    if uuid or xmlHash is missing
         */
        public validateWorkflowForWorkflowsDB(workflow: IWorkflow): WorkflowsDBEntry {
            if (!workflow.uuid || !angular.isString(workflow.uuid) || !workflow.xmlHash || !angular.isString(workflow.xmlHash)) {
                throw new Error("UUID or xmlHash are missing");
            }

            const newXmlHash = this.generateXmlHash(workflow.workspaceXml);
            if (workflow.xmlHash !== newXmlHash) {
                this.$log.warn('Workflow: ' + workflow.name + ' xmlHash doesn\'t match recalculated Hash ' +
                    'of xml - using new calculated!');
                this.updateXmlHash(workflow);
            }

            return {
                uuid: workflow.uuid,
                versionHash: this.generateWorkflowVersionHash(workflow.name, workflow.xmlHash),
                xmlHash: workflow.xmlHash,
                xml: workflow.workspaceXml,
                name: workflow.name
            };
        }

        private getSerializableStorage(): IWorkflowStorageCurrentVersion {
            return {
                version: this.storageWrapper.version,
                workflowIds: this.storageWrapper.workflowIds,
                workflowNameToId: objectFromEntries(this.storageWrapper.workflowNameToId.entries()),
                workflowsById: objectFromEntries(this.storageWrapper.workflowsById.entries())
            }
        }

        private serializableStorageToStorageWrapper(tmpStorage: IWorkflowStorageCurrentVersion): IWorkflowStorageWrapper {
            return {
                version: tmpStorage.version,
                workflowIds: tmpStorage.workflowIds,
                workflowNameToId: new Map(Object.entries(tmpStorage.workflowNameToId)),
                workflowsById: new Map(Object.entries(tmpStorage.workflowsById)
                                        .map(entry => [Number(entry[0]), entry[1]])
                )
            };
        }

        /**
         * Persists the workflowStorage within the localStorage and calls the
         * workflowsDatabaseService afterwards to store each workflow from the
         * provided array. In case the array contains no entry, only the localStorage
         * will be persisted
         * @param workflowList  Array containing none or more workflows which
         *                      should be stored within the workflowDatabaseService
         */
        private persistStorageAndSaveWorkflowsInWorkflowsDB(workflowList: IWorkflow[]): Promise<void> {
            this.webStorage.set(storageKey, this.getSerializableStorage());
            return this.saveWorkflowsInWorkflowsDB(workflowList);
        }

        private async saveWorkflowsInWorkflowsDB(workflowList: IWorkflow[]): Promise<void> {
            if (!workflowList.length) {
                return Promise.resolve();
            }

            const workflowDBEntries = [];
            for (const workflow of workflowList) {
                workflowDBEntries.push(this.validateWorkflowForWorkflowsDB(workflow));
            }
            return this.workflowsDBService.storeWorkflowsIfStudyModeEnabled(workflowDBEntries);
        }

        public async persistAllWorkflowsInWorkflowsDB(): Promise<void> {
            return this.saveWorkflowsInWorkflowsDB(this.getWorkflows());
        }

        public async setRemoteID(workflow_name: string, remoteId: string): Promise<void> {
            const workflow = this.getWorkflowByName(workflow_name);
            if (workflow != null) {
                workflow.remoteId = remoteId;
                this.storageWrapper.workflowsById.set(workflow.id, workflow);
            }
            return this.persistStorageAndSaveWorkflowsInWorkflowsDB([]);
        }

        public getVersion(): number {
            return currentVersion;
        }

        /**
         * returns the hased xml based on the given xml as param using the hashString function in
         * utilities module
         * @param xml                   xml of a workflow
         * @return {string}             contains hash value of that input xml
         */
        private generateXmlHash(xml: string): string {
            return this.hashString(xml);
        }

        /**
         * overwrites the current xmlHash attribute of the workflow object by recalculating the hash
         * for the current xml in that given workflow
         * @param workflow              where the xmlHash should be updated
         * @throws Error                if workflow or workspaceXml of given workflow is undefined
         */
        private updateXmlHash(workflow: IWorkflow) {
            if (!workflow || !workflow.workspaceXml) {
                throw new Error("Workflow or xml is undefined therefore can't calculate xmlHash!")
            }
            workflow.xmlHash = this.generateXmlHash(workflow.workspaceXml);
        }

    }

    function isInteger(v: any): boolean {
        return Number(v) == v && v % 1 === 0;
    }

    angular.module('rehagoal.workflow')
        .service('workflowService', WorkflowService);
}
