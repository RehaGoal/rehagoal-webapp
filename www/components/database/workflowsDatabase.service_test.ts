'use strict';
module rehagoal.database {
    import WorkflowsDexie = rehagoal.database.WorkflowsDexie;
    import WorkflowsDB = rehagoal.database.WorkflowsDB;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import DexieFactory = rehagoal.database.DexieFactory;
    import SettingsService = rehagoal.settings.SettingsService;

    describe('rehagoal.database', function () {
        let dexieInstance: WorkflowsDexie;
        let settingsService: SettingsService;

        beforeEach(function () {
            angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                    return function () {
                        dexieInstance = $delegate.apply(null, arguments as any) as WorkflowsDexie;
                        return dexieInstance;
                    };
                });
            });
        });
        describe('workflowsDatabase', function () {
            let workflowsDB: WorkflowsDB;

            beforeEach((done) => angular.mock.inject(function (dexieFactory: DexieFactory) {
                dexieFactory("workflowsDB").delete().then(done);
            }));
            beforeEach(() => angular.mock.inject(function (_workflowsDBService_: WorkflowsDB,
                                                                 _settingsService_: SettingsService) {
                workflowsDB = _workflowsDBService_;
                settingsService = _settingsService_;
            }));
            afterAll(function (done) {
                // reset database
                dexieInstance.delete().then(done);
            });

            describe('method: storeWorkflowsIfStudyModeEnabled', function() {
                const workflowEntry1: WorkflowsDBEntry = {
                    uuid: "myUUID",
                    versionHash: "31b285f35a160f3efe7e7b78cfdf35ef0784d4c74b42e6c76a36ed512ec4c005",
                    name: "Test Workflow",
                    xml: '<xml><block type="task_group" deletable="false" movable="true"></block></xml>',
                    xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826'
                };
                const workflowEntry2: WorkflowsDBEntry = {
                    uuid: "some other uuid",
                    versionHash: "34c822158fef60c57f93faf203d3224e0a3bbc9b850b4314fab6367e5df59e07",
                    name: "Another Test Workflow",
                    xml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="task_group" id="q+_c:3!kIqU,NZxoX*!G" deletable="false" x="0" y="0"><field name="description">&lt;Beschreibung&gt;</field></block></xml>',
                    xmlHash: 'd92d14a8d48e138a5845622af567fe6bac893769b4bae194d907c892e4b07bbf'
                };

                it('should not store workflows if studyMode is disabled', async function (done: DoneFn) {
                    settingsService.studyModeEnabled = false;

                    spyOn(dexieInstance.workflowXML, 'add').and.callThrough();
                    spyOn(dexieInstance.workflowVersions, 'add').and.callThrough();

                    await tryOrFailAsync(async () => {
                        await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                    });
                    expect(dexieInstance.workflowXML.add).not.toHaveBeenCalled();
                    expect(dexieInstance.workflowVersions.add).not.toHaveBeenCalled();
                    done();
                });
                describe('with studyMode enabled', function() {
                    beforeEach(() => {
                        settingsService.studyModeEnabled = true;
                    });

                    describe('table: workflowXML', function() {
                        const xmlEntry1: WorkflowXMLEntry = {
                            xmlHash: workflowEntry1.xmlHash,
                            xml: workflowEntry1.xml
                        };
                        const xmlEntry2: WorkflowXMLEntry = {
                            xmlHash: workflowEntry2.xmlHash,
                            xml: workflowEntry2.xml
                        };

                        async function getWorkflowXMLByPrimaryKey(hash: string): Promise<WorkflowXMLEntry | undefined> {
                            const xmlEntry: WorkflowXMLEntry | undefined = await dexieInstance.workflowXML.get({xmlHash: hash})
                            return xmlEntry;
                        }

                        beforeEach(() => {
                            spyOn(dexieInstance.workflowXML, 'add').and.callThrough();
                        });

                        it('should store a xml under the corresponding hash value (key)', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                            });
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledTimes(1);
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledWith(xmlEntry1);
                            const storedEntry: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey(workflowEntry1.xmlHash);
                            expect(storedEntry).toBeDefined();
                            expect(storedEntry).toEqual(xmlEntry1);
                            done();
                        });
                        it('should store multiple entries under their corresponding hash values (key)', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                            });
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledTimes(1);
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledWith(xmlEntry1);

                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry2]);
                            });
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledTimes(2);
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledWith(xmlEntry2);

                            const storedEntry1: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey(workflowEntry1.xmlHash);
                            expect(storedEntry1).toBeDefined();
                            expect(storedEntry1).toEqual(xmlEntry1);

                            const storedEntry2: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey(workflowEntry2.xmlHash);
                            expect(storedEntry2).toBeDefined();
                            expect(storedEntry2).toEqual(xmlEntry2);
                            done();
                        });
                        it('should not to store a xml under the same hash twice', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1, {uuid: workflowEntry1.uuid, versionHash: workflowEntry1.versionHash, name: workflowEntry1.name, xmlHash: workflowEntry1.xmlHash, xml: "invalid"}]);
                            });
                            expect(dexieInstance.workflowXML.add).toHaveBeenCalledTimes(1);
                            const storedEntry: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey(workflowEntry1.xmlHash);
                            if (storedEntry === undefined) {
                                fail(`Expected a stored entry for hash ${workflowEntry1.xmlHash}`);
                            } else {
                                expect(storedEntry.xml).toEqual(xmlEntry1.xml);
                            }
                            done();
                        });
                        it('should get a previously stored xml for a given hash', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                            });
                            const storedEntry: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey(workflowEntry1.xmlHash);
                            if (storedEntry === undefined) {
                                fail(`Expected a stored entry for hash ${workflowEntry1.xmlHash}`);
                            } else {
                                expect(storedEntry.xml).toEqual(workflowEntry1.xml);
                            }
                            done();
                        });
                        it('should return undefined if no previously stored record could be found', async function (done: DoneFn) {
                            const storedEntry: WorkflowXMLEntry | undefined = await getWorkflowXMLByPrimaryKey('garbage hash');
                            expect(storedEntry).toBeUndefined();
                            done();
                        });
                    });
                    describe('table: workflowVersions', function() {
                        const versionEntry1: WorkflowVersionsEntry = {
                            uuid: workflowEntry1.uuid,
                            versionHash: workflowEntry1.versionHash,
                            xmlHash: workflowEntry1.xmlHash,
                            name: workflowEntry1.name
                        };

                        async function getWorkflowVersionByPrimaryKey(uuid: string, versionHash: string): Promise<WorkflowVersionsEntry | undefined> {
                            const versionEntry: WorkflowVersionsEntry | undefined = await dexieInstance.workflowVersions.get({uuid: uuid, versionHash: versionHash})
                            return versionEntry;
                        }

                        beforeEach(() => {
                            spyOn(dexieInstance.workflowVersions, 'add').and.callThrough();
                        });

                        it('should store a workflow entry', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                            });
                            expect(dexieInstance.workflowVersions.add).toHaveBeenCalledTimes(1);
                            expect(dexieInstance.workflowVersions.add).toHaveBeenCalledWith(versionEntry1);
                            const storedEntry: WorkflowVersionsEntry | undefined = await getWorkflowVersionByPrimaryKey(workflowEntry1.uuid, workflowEntry1.versionHash);
                            expect(storedEntry).toBeDefined();
                            expect(storedEntry).toEqual(versionEntry1);
                            done();
                        });
                        it('should store a workflow entry only once', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1, workflowEntry1]);
                            });
                            expect(dexieInstance.workflowVersions.add).toHaveBeenCalledWith(versionEntry1);
                            expect(dexieInstance.workflowVersions.add).toHaveBeenCalledTimes(1);
                            done();
                        });
                        it('should add an updated workflow entry if versionHash & xmlHash differs', async function (done: DoneFn) {
                            const newEntry: WorkflowsDBEntry = {
                                uuid: versionEntry1.uuid,
                                versionHash: "a new versionHash",
                                xmlHash: "a new xmlHash",
                                xml: "something",
                                name: versionEntry1.name
                            };

                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1, newEntry]);
                            });

                            expect(dexieInstance.workflowVersions.add).toHaveBeenCalledTimes(2);

                            const storedEntry1: WorkflowVersionsEntry | undefined = await getWorkflowVersionByPrimaryKey(workflowEntry1.uuid, workflowEntry1.versionHash);
                            if (storedEntry1 === undefined) {
                                fail(`Expected a stored entry for uuid ${workflowEntry1.uuid} and versionHash ${workflowEntry1.versionHash}`);
                            } else {
                                expect(storedEntry1.xmlHash).toEqual(workflowEntry1.xmlHash);
                            }

                            const storedEntry2: WorkflowVersionsEntry | undefined = await getWorkflowVersionByPrimaryKey(newEntry.uuid, newEntry.versionHash);
                            if (storedEntry2 === undefined) {
                                fail(`Expected a stored entry for uuid ${newEntry.uuid} and versionHash ${newEntry.versionHash}`);
                            } else {
                                expect(storedEntry2.xmlHash).toEqual(newEntry.xmlHash);
                            }

                            done();
                        });
                        it('should get a previously stored entry', async function (done: DoneFn) {
                            await tryOrFailAsync(async () => {
                                await workflowsDB.storeWorkflowsIfStudyModeEnabled([workflowEntry1]);
                            });
                            const storedEntry: WorkflowVersionsEntry | undefined = await getWorkflowVersionByPrimaryKey(workflowEntry1.uuid, workflowEntry1.versionHash);
                            if (storedEntry === undefined) {
                                fail(`Expected a stored entry for uuid ${workflowEntry1.uuid} and versionHash ${workflowEntry1.versionHash}`);
                            } else {
                                expect(storedEntry).toEqual(versionEntry1);
                            }
                            done();
                        });
                        it('should return undefined if no entry could be found for provided uuid+versionHash', async function (done: DoneFn) {
                            const storedEntry: WorkflowVersionsEntry | undefined = await getWorkflowVersionByPrimaryKey('garbage uuid', 'no versionHash');
                            expect(storedEntry).toBeUndefined();
                            done();
                        });
                    });
                });
            });
        });
    });
}
