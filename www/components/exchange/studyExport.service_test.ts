module rehagoal.exchange {
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
    import jsonStringifyStreamedType = rehagoal.utilities.jsonStringifyStreamedType;
    describe('rehagoal.exchange', function () {
        describe('StudyExportService', function () {
            let studyExportService: StudyExportService;
            let pgpCryptoService: PGPCryptoService;
            let settingsService: SettingsService;
            let imageService: ImageService;
            let workflowsDBService: WorkflowsDB;
            let metricService: MetricService;
            let metricDB: MetricsDB;
            let readFileAsText: (file: Blob) => Promise<string>;
            let jsonStringifyStreamed: jsonStringifyStreamedType;
            let jsonStringifyStreamedSpy: jasmine.Spy;

            beforeEach(() => angular.mock.module('rehagoal.exchange', function($provide: angular.auto.IProvideService) {
                $provide.value('openpgpService', jasmine.createSpyObj('openpgp', ['initWorker']));
                $provide.decorator('jsonStringifyStreamed', function($delegate: jsonStringifyStreamedType) {
                    jsonStringifyStreamedSpy = jasmine.createSpy('jsonStringifyStreamed', $delegate).and.callThrough();
                    return jsonStringifyStreamedSpy;
                });
            }));
            beforeEach(() => inject(function (_studyExportService_: StudyExportService,
                                              _pgpCryptoService_: PGPCryptoService,
                                              _settingsService_: SettingsService,
                                              _imageService_: ImageService,
                                              _workflowsDBService_: WorkflowsDB,
                                              _metricService_: MetricService,
                                              _metricsDBService_: MetricsDB,
                                              _readFileAsText_: typeof readFileAsText,
                                              _jsonStringifyStreamed_: jsonStringifyStreamedType) {
                studyExportService = _studyExportService_;
                pgpCryptoService = _pgpCryptoService_;
                settingsService = _settingsService_;
                imageService = _imageService_;
                workflowsDBService = _workflowsDBService_;
                metricService = _metricService_;
                metricDB = _metricsDBService_;
                readFileAsText = _readFileAsText_;
                jsonStringifyStreamed = _jsonStringifyStreamed_;
            }));

            describe('exportAsBlob', function () {
                const encryptedData = 'PGP encrypted mock data';
                const publicMetricNames = ['[m0] mock metric public', '[m42] second public mock metric'];
                const imageBlob1Data = 'binary image mock data 1';
                const imageBlob2Data = 'binary image mock data 2';
                const userPseudonym = 'thisIsAMockPseudonym';
                const imageDBDump: TableDump[] = [{
                    table: 'files',
                    rows: [
                        {hash: 'c0ffe', data: new Blob([imageBlob1Data])},
                        {hash: 'beef', data: new Blob([imageBlob2Data])}
                    ]
                }, {
                    table: 'filenames',
                    rows: [
                        {workflow: 1234, name: 'my image 1', hash: 'c0ffe'},
                        {workflow: 1234, name: 'image2', hash: 'beef'},
                        {worflow: 42, name: 'other image', hash: 'beef'}
                    ]
                }];
                const workflowsDBDump: TableDump[] = [{
                    table: 'workflowVersions',
                    rows: [
                        {uuid: 'f0d0dc64-b40b-4e13-b5f0-5fe3ae32af85', name: 'Test Workflow', xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826', versionHash: '31b285f35a160f3efe7e7b78cfdf35ef0784d4c74b42e6c76a36ed512ec4c005'}
                    ]
                }, {
                    table: 'workflowXML',
                    rows: [
                        {xml: '<xml><block type="task_group" deletable="false" movable="true"></block></xml>', xmlHash: '3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826'}
                    ]
                }];
                const exportedMetricSnapshots: MetricSnapshotDBEntry[] = [
                    {index: 0, value: 42.42, startOfMeasurement: null, numberOfMeasurements: 2,
                        assignment: {workflowId: 'UUID1'}, metricName: '[m0] mock metric public'},
                    {index: 0, value: 42.24, startOfMeasurement: 12345,
                        assignment: {workflowId: '42UUID24', executionId: 0}, metricName: '[m42] second public mock metric'},
                    {index: 4, value: 123, startOfMeasurement: null,
                        assignment: {workflowId: 'UUID1', workflowVersionId: 'versionHash0'}, metricName: '[m42] second public mock metric'},
                ];
                let exportMetricSnapshotsSpy: jasmine.Spy;
                let JSONstringifySpy: jasmine.Spy;
                beforeEach(() => {
                    JSONstringifySpy = spyOn(JSON, 'stringify').and.callThrough();
                    spyOn(metricService, 'getPublicMetricNames').and.returnValue(publicMetricNames);
                    spyOn(pgpCryptoService, 'signAndEncryptForStudyOperator').and.returnValue(Promise.resolve(new Blob([encryptedData])));
                    exportMetricSnapshotsSpy = spyOn(metricDB, 'exportMetricSnapshots').and.returnValue(Promise.resolve(exportedMetricSnapshots));
                    spyOn(imageService, 'dumpDB').and.returnValue(Promise.resolve(imageDBDump));
                    spyOn(workflowsDBService, 'dumpDB').and.returnValue(Promise.resolve(workflowsDBDump));
                    settingsService.userPseudonym = userPseudonym;
                })
                // TODO: Remove?
                xit('should export relevant study data as a Blob (naive method)', async function(done) {
                    const passphrase = 'password';
                    const exportedBlob = await studyExportService.exportAsBlob(passphrase);

                    expect(metricService.getPublicMetricNames).toHaveBeenCalledTimes(1);
                    expect(imageService.dumpDB).toHaveBeenCalledTimes(1);
                    expect(metricDB.exportMetricSnapshots).toHaveBeenCalledTimes(1);
                    expect(metricService.getPublicMetricNames).toHaveBeenCalledBefore(exportMetricSnapshotsSpy);
                    expect(metricDB.exportMetricSnapshots).toHaveBeenCalledWith(publicMetricNames);
                    expect(JSON.stringify).toHaveBeenCalledWith({
                        pseudonym: userPseudonym,
                        imageDB: imageDBDump,
                        workflowsDB: workflowsDBDump,
                        metricSnapshots: exportedMetricSnapshots,
                    });
                    const actualExportObj = JSONstringifySpy.calls.mostRecent().args[0];
                    expect(actualExportObj.imageDB[0].rows[0].data).toEqual('data:application/octet-stream;base64,' + btoa(imageBlob1Data));
                    expect(actualExportObj.imageDB[0].rows[1].data).toEqual('data:application/octet-stream;base64,' + btoa(imageBlob2Data));
                    expect(actualExportObj.workflowsDB[0].rows[0].xmlHash).toEqual('3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826');
                    expect(pgpCryptoService.signAndEncryptForStudyOperator).toHaveBeenCalledWith({
                        plaintext: JSON.stringify(actualExportObj), userPassphrase: passphrase
                    });
                    expect(await readFileAsText(exportedBlob)).toEqual(encryptedData);
                    done();
                });
                it('should export relevant study data as a Blob (streamed method)', async function(done) {
                    const passphrase = 'password';
                    const exportedBlob = await studyExportService.exportAsBlob(passphrase);

                    expect(metricService.getPublicMetricNames).toHaveBeenCalledTimes(1);
                    expect(imageService.dumpDB).toHaveBeenCalledTimes(1);
                    expect(metricDB.exportMetricSnapshots).toHaveBeenCalledTimes(1);
                    expect(metricService.getPublicMetricNames).toHaveBeenCalledBefore(exportMetricSnapshotsSpy);
                    expect(metricDB.exportMetricSnapshots).toHaveBeenCalledWith(publicMetricNames);
                    expect(jsonStringifyStreamedSpy).toHaveBeenCalledWith({
                        pseudonym: userPseudonym,
                        imageDB: imageDBDump,
                        workflowsDB: workflowsDBDump,
                        metricSnapshots: exportedMetricSnapshots,
                    }, jasmine.any(Function), false);
                    const actualExportObj = jsonStringifyStreamedSpy.calls.mostRecent().args[0];
                    expect(await readFileAsText(actualExportObj.imageDB[0].rows[0].data)).toEqual(imageBlob1Data);
                    expect(await readFileAsText(actualExportObj.imageDB[0].rows[1].data)).toEqual(imageBlob2Data);
                    expect(actualExportObj.workflowsDB[0].rows[0].xmlHash).toEqual('3441fe6a9cddac2dd9f71e9ccf181b6dfc80b9b9b64c6702b1d862ef96280826');
                    expect(pgpCryptoService.signAndEncryptForStudyOperator).toHaveBeenCalledWith({
                        plaintextStream: jasmine.any(ReadableStream),
                        userPassphrase: passphrase,
                        streamed: true
                    });

                    expect(await readFileAsText(exportedBlob)).toEqual(encryptedData);
                    done();
                });
            });
        });
    });
}
