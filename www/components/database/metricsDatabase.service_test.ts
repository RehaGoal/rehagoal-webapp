'use strict';

module rehagoal.database {
    import MetricsDB = rehagoal.metrics.MetricsDB;
    import RecordPointAssignment = rehagoal.metrics.RecordPointAssignment;
    import MetricSnapshot = rehagoal.metrics.MetricSnapshot;
    import MetricSnapshotWithAssignment = rehagoal.metrics.MetricSnapshotWithAssignment;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;
    import MetricsDexie = rehagoal.database.MetricsDexie;
    import DexieFactory = rehagoal.database.DexieFactory;

    describe('rehagoal.database', function () {
        let dexieInstance: MetricsDexie;

        beforeEach(function () {
            angular.mock.module('rehagoal.database', function ($provide: angular.auto.IProvideService) {
                $provide.decorator('dexieFactory', function ($delegate: DexieFactory) {
                    return function () {
                        dexieInstance = $delegate.apply(null, arguments as any) as MetricsDexie;
                        return dexieInstance;
                    };
                });
            });
        });
        describe('metricsDatabase', function () {
            let metricsDB: MetricsDB;
            beforeEach((done) => angular.mock.inject(function (dexieFactory: DexieFactory) {
                // Ensure previous entries (i.e. by real metrics) are removed
                dexieFactory("metricsDB").delete().then(done);
            }));
            beforeEach(() => angular.mock.inject(function (_metricsDBService_: MetricsDB) {
                metricsDB = _metricsDBService_;
            }));
            afterAll(function (done) {
                // reset database
                dexieInstance.delete().then(done);
            });

            function getTestSpecInvalidAssignments(assignmentFunction: (assignment: RecordPointAssignment) => Promise<any>) {
                return async function (done: DoneFn) {
                    const invalidAssignment1 = {
                        zBadId: 1234,
                        executionId: 4321,
                    };
                    const invalidAssignment2 = null;
                    const invalidAssignment3 = [1, 2, 4];
                    await expectThrowsAsync(
                        async () => await assignmentFunction(invalidAssignment1),
                        /Property zBadId is not allowed/
                    );
                    await expectThrowsAsync(
                        async () => await assignmentFunction(invalidAssignment2 as any as RecordPointAssignment),
                        /should be of object type/
                    );
                    await expectThrowsAsync(
                        async () => await assignmentFunction(invalidAssignment3),
                        /should not be an array/
                    );
                    done();
                }
            }

            function getTestSpecNoDefaultKeys(funcUnderTest: (metricName: string, assignment: RecordPointAssignment) => Promise<any>) {
                return async function (done: DoneFn | (() => void)) {

                    await expectThrowsAsync(
                        async () => funcUnderTest('', {}),
                        /Metric name should not be empty/
                    );
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {scheduleId: -1}),
                        /option scheduleId should not be -1/
                    );
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {workflowId: ''}),
                        /option workflowId should not be ""/
                    );
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {workflowVersionId: ''}),
                        /option workflowVersionId should not be ""/
                    );
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {executionId: -1}),
                        /option executionId should not be -1/
                    );
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {taskId: -1}),
                        /option taskId should not be -1/
                    );
                    done();
                }
            }

            function getTestSpecNoDefaultKeysWithSnapshots(funcUnderTest: (metricName: string, assignment: RecordPointAssignment, snapshot?: MetricSnapshot) => Promise<any>) {
                return async function (done: DoneFn) {
                    await getTestSpecNoDefaultKeys(funcUnderTest)(() => {
                    });
                    const invalidSnapshot: MetricSnapshot = {index: -1, value: 1234, startOfMeasurement: null};
                    await expectThrowsAsync(
                        async () => funcUnderTest('myMetric', {workflowId: 'asdf'}, invalidSnapshot),
                        /Snapshot index should not be -1/
                    );
                    done();
                }
            }

            describe('storeNewSnapshot', function () {
                const snapshot: MetricSnapshot = {
                    index: 23,
                    value: 1337.42,
                    startOfMeasurement: null,
                };
                it('should store a snapshot', async function (done) {
                    const metricName = 'My super metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1234,
                        workflowId: 'longworkflowuuid1',
                        executionId: 42,
                    };
                    spyOn(dexieInstance.snapshots, 'add').and.callThrough();
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot);
                    });
                    expect(dexieInstance.snapshots.add).toHaveBeenCalledTimes(1);
                    expect(dexieInstance.snapshots.add).toHaveBeenCalledWith(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot));
                    expect<jasmine.Expected<MetricSnapshotWithAssignment>>(await dexieInstance.snapshots.toArray()).toEqual(
                        [jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot)]);
                    done();
                });
                it('should verify that assignment only contains valid keys', getTestSpecInvalidAssignments(
                    async (assignment) => metricsDB.storeNewSnapshot('myMetric', assignment, snapshot)
                ));
                it('should verify that no default (placeholder) database values are used', getTestSpecNoDefaultKeysWithSnapshots(
                    async (metricName, assignment, snap) => metricsDB.storeNewSnapshot(metricName, assignment, snap || snapshot)
                ));
            });
            describe('getSnapshots', function () {
                it('should store and load a snapshot', async function (done) {
                    const metricName = 'My super metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1234,
                        workflowId: 'longworkflowuuid1',
                        executionId: 42,
                    };
                    const snapshot: MetricSnapshot = {
                        index: 23,
                        value: 1337.42,
                        startOfMeasurement: null,
                    };
                    spyOn(dexieInstance.snapshots, 'where').and.callThrough();
                    const expectedSnapshot: MetricSnapshotWithAssignment = extend(snapshot, {assignment});
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot);
                        let snapshots = await metricsDB.getSnapshots(metricName, assignment);
                        expect(snapshots).toEqual([expectedSnapshot]);
                    });
                    expect(dexieInstance.snapshots.where).toHaveBeenCalledWith({
                        metricName,
                        "assignment.scheduleId": assignment.scheduleId,
                        "assignment.workflowId": assignment.workflowId,
                        "assignment.executionId": assignment.executionId,
                    });
                    done();
                });
            });
            describe('overwriteSnapshot', function () {
                const snapshot1: MetricSnapshot = {
                    index: 23,
                    value: 1337.42,
                    startOfMeasurement: null,
                };
                it('should overwrite a stored snapshot', async function (done) {
                    const metricName = 'My super metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1234,
                        workflowId: 'longworkflowuuid1',
                        executionId: 42,
                    };
                    spyOn(dexieInstance.snapshots, 'add').and.callThrough();
                    spyOn(dexieInstance.snapshots, 'update').and.callThrough();
                    const snapshot2: MetricSnapshot = extend(snapshot1, {value: 42});
                    const expectedSnapshot1: MetricSnapshotWithAssignment = extend(snapshot1, {assignment});
                    const expectedSnapshot2: MetricSnapshotWithAssignment = extend(snapshot2, {assignment});
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot1);
                        let snapshots1 = await metricsDB.getSnapshots(metricName, assignment);
                        expect(snapshots1).toEqual([expectedSnapshot1]);
                        await metricsDB.overwriteSnapshot(metricName, assignment, snapshot2);
                        let snapshots2 = await metricsDB.getSnapshots(metricName, assignment);
                        expect(snapshots2).toEqual([expectedSnapshot2]);
                    });
                    expect(dexieInstance.snapshots.add).toHaveBeenCalledTimes(1);
                    expect(dexieInstance.snapshots.add).toHaveBeenCalledWith(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot1));
                    expect(dexieInstance.snapshots.update).toHaveBeenCalledTimes(1);
                    expect(dexieInstance.snapshots.update).toHaveBeenCalledWith(jasmine.any(Object), jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot2));
                    done();
                });
                it('should verify that assignment only contains valid keys', getTestSpecInvalidAssignments(
                    async (assignment) => metricsDB.overwriteSnapshot('myMetric', assignment, snapshot1)
                ));
                it('should verify that no default (placeholder) database values are used', getTestSpecNoDefaultKeysWithSnapshots(
                    async (metricName, assignment, snap) => metricsDB.overwriteSnapshot(metricName, assignment, snap || snapshot1)
                ));
            });
            describe('getLastSnapshot', function () {
                it('should return last snapshot', async function (done) {
                    const metricName = 'My super metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1234,
                        workflowId: 'longworkflowuuid1',
                        executionId: 42,
                    };
                    const snapshot1: MetricSnapshot = {
                        index: 23,
                        value: 1337.42,
                        startOfMeasurement: null,
                    };
                    const snapshot2: MetricSnapshot = {
                        index: 24,
                        value: 42,
                        startOfMeasurement: null,
                    };

                    const snapshot3: MetricSnapshot = {
                        index: 25,
                        value: 42,
                        startOfMeasurement: null,
                    };
                    let whereSpy = spyOn(dexieInstance.snapshots, 'where').and.callThrough();
                    const expectedSnapshot1: MetricSnapshotWithAssignment = extend(snapshot1, {assignment});
                    const expectedSnapshot2: MetricSnapshotWithAssignment = extend(snapshot2, {assignment});
                    const expectedSnapshot3: MetricSnapshotWithAssignment = extend(snapshot3, {assignment});
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getLastSnapshot(metricName, assignment)).toBeNull();
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot1);
                        expect(await metricsDB.getLastSnapshot(metricName, assignment)).toEqual(expectedSnapshot1);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot2);
                        expect(await metricsDB.getLastSnapshot(metricName, assignment)).toEqual(expectedSnapshot2);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot3);
                        expect(await metricsDB.getLastSnapshot(metricName, assignment)).toEqual(expectedSnapshot3);
                    });
                    expect(dexieInstance.snapshots.where).toHaveBeenCalledTimes(8); // lastSnapshot + internal primaryKey query
                    expect(whereSpy.calls.first().args).toEqual([{
                        metricName: 'My super metric',
                        'assignment.scheduleId': 1234,
                        'assignment.workflowId': 'longworkflowuuid1',
                        'assignment.executionId': 42
                    }]);
                    done();
                });
            });
            describe('getSnapshotCount', function () {
                it('should count snapshots', async function (done) {
                    const metricName = 'My super metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1234,
                        workflowId: 'longworkflowuuid1',
                        executionId: 42,
                    };
                    const snapshot1: MetricSnapshot = {
                        index: 23,
                        value: 1337.42,
                        startOfMeasurement: null,
                    };
                    const snapshot2: MetricSnapshot = {
                        index: 24,
                        value: 42,
                        startOfMeasurement: null,
                    };
                    const assignmentKeys = {
                        'assignment.scheduleId': assignment.scheduleId,
                        'assignment.workflowId': assignment.workflowId,
                        'assignment.executionId': assignment.executionId,
                    };
                    let whereSpy = spyOn(dexieInstance.snapshots, 'where').and.callThrough();
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getSnapshotCount('otherMetric', {})).toBe(0);
                        expect(await metricsDB.getSnapshotCount(metricName, {})).toBe(0);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toBe(0);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot1);
                        expect(await metricsDB.getSnapshotCount(metricName, {})).toBe(1);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toBe(1);
                        expect(await metricsDB.getSnapshotCount('otherMetric', {})).toBe(0);
                        expect(await metricsDB.getSnapshotCount('otherMetric', assignment)).toBe(0);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot2);
                        expect(await metricsDB.getSnapshotCount(metricName, {})).toBe(2);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toBe(2);
                    });
                    expect(dexieInstance.snapshots.where).toHaveBeenCalledTimes(9 * 2); // where + internal PK
                    expect(whereSpy.calls.argsFor(0)).toEqual([{metricName: 'otherMetric'}]);
                    expect(whereSpy.calls.argsFor(2)).toEqual([{metricName}]);
                    expect(whereSpy.calls.argsFor(4)).toEqual([extend({metricName}, assignmentKeys)]);
                    expect(whereSpy.calls.argsFor(6)).toEqual([{metricName}]);
                    expect(whereSpy.calls.argsFor(8)).toEqual([extend({metricName}, assignmentKeys)]);
                    expect(whereSpy.calls.argsFor(8)).toEqual([extend({metricName}, assignmentKeys)]);
                    expect(whereSpy.calls.argsFor(10)).toEqual([{metricName: 'otherMetric'}]);
                    expect(whereSpy.calls.argsFor(12)).toEqual([extend({metricName: 'otherMetric'}, assignmentKeys)]);
                    expect(whereSpy.calls.argsFor(14)).toEqual([{metricName}]);
                    expect(whereSpy.calls.argsFor(16)).toEqual([extend({metricName}, assignmentKeys)]);
                    done();
                });
            });
            describe('storeStartTime', function () {
                it('should store start time', async function (done) {
                    const metricName = 'Time-based metric';
                    const assignment: RecordPointAssignment = {
                        scheduleId: 1101,
                        workflowId: 'thisisaworkflowwithuuid',
                        executionId: 1,
                    };
                    const startTime = 12345.6789;
                    spyOn(dexieInstance.timeMeasurements, 'add').and.callThrough();
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeStartTime(metricName, assignment, startTime);
                    });
                    expect(dexieInstance.timeMeasurements.add).toHaveBeenCalledWith({
                        metricName,
                        assignment: jasmine.objectContaining(assignment),
                        startTime
                    });
                    done();
                });
                it('should verify that assignment only contains valid keys', getTestSpecInvalidAssignments(
                    async (assignment) => metricsDB.storeStartTime('myMetric', assignment, 1234)
                ));
                it('should verify that no default (placeholder) database values are used', getTestSpecNoDefaultKeys(
                    async (metricName, assignment) => metricsDB.storeStartTime(metricName, assignment, 1234)
                ));
                it('should not allow storing a startTime twice without clearing', async function (done) {
                    const metricName = 'metric1';
                    const assignment: RecordPointAssignment = {
                        workflowId: 'uuid1',
                        executionId: 1234,
                    };
                    const startTime1 = 1234.5;
                    const startTime2 = 42.413;
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeStartTime(metricName, assignment, startTime1);
                    });
                    await expectThrowsAsync(async () => {
                        await metricsDB.storeStartTime(metricName, assignment, startTime2);
                    }, /already exists/);
                    done();
                });
            });
            describe('getStartTime', function () {
                it('should store/load startTime', async function (done) {
                    const metricName = 'metric1';
                    const assignment: RecordPointAssignment = {
                        workflowId: 'uuid1',
                        executionId: 1234,
                    };
                    spyOn(dexieInstance.timeMeasurements, 'add').and.callThrough();
                    let whereSpy = spyOn(dexieInstance.timeMeasurements, 'where').and.callThrough();
                    const startTime1 = 1234.5;
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getStartTime(metricName, assignment)).toBe(null);
                        await metricsDB.storeStartTime(metricName, assignment, startTime1);
                        expect(await metricsDB.getStartTime(metricName, assignment)).toEqual(startTime1);
                    });
                    expect(dexieInstance.timeMeasurements.add).toHaveBeenCalledTimes(1);
                    expect(dexieInstance.timeMeasurements.where).toHaveBeenCalledTimes(2 * 2);
                    const equalityCriteria = {
                        metricName,
                        'assignment.workflowId': assignment.workflowId,
                        'assignment.executionId': assignment.executionId,
                    };
                    const equalityArgs = [jasmine.objectContaining(equalityCriteria)];
                    expect(whereSpy.calls.allArgs()).toEqual([
                        equalityArgs,
                        jasmine.any(Array),
                        equalityArgs,
                        jasmine.any(Array),
                    ]);
                    done();
                });
            });
            describe('clearStartTime', function () {
                it('should remove start time from database', async function (done) {
                    const metricName = 'metric1';
                    const assignment: RecordPointAssignment = {
                        workflowId: 'uuid1',
                        executionId: 1234,
                    };
                    const startTime1 = 1234.5;
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getStartTime(metricName, assignment)).toBe(null);
                        await metricsDB.storeStartTime(metricName, assignment, startTime1);
                        expect(await metricsDB.getStartTime(metricName, assignment)).toEqual(startTime1);
                        await metricsDB.clearStartTime(metricName, assignment);
                        expect(await metricsDB.getStartTime(metricName, assignment)).toBeNull();
                    });
                    done();
                });
                it('should ignore clearing of startTime without existing start time', async function (done) {
                    const metricName = 'metric1';
                    const assignment: RecordPointAssignment = {
                        workflowId: 'uuid1',
                        executionId: 1234,
                    };
                    await tryOrFailAsync(async () => {
                        await metricsDB.clearStartTime(metricName, assignment);
                        expect(await metricsDB.getStartTime(metricName, assignment)).toBeNull();
                    });
                    done();
                });
                it('should verify that assignment only contains valid keys', getTestSpecInvalidAssignments(
                    async (assignment) => metricsDB.clearStartTime('myMetric', assignment)
                ));
                it('should verify that no default (placeholder) database values are used', getTestSpecNoDefaultKeys(
                    async (metricName, assignment) => metricsDB.clearStartTime(metricName, assignment)
                ));
            });
            describe('removeOldestSnapshot', function () {
                it('should remove oldest snapshot', async function (done) {
                    const metricName = 'myMetric1';
                    const assignment: RecordPointAssignment = {scheduleId: 1234, executionId: 32, taskId: 10};
                    const snapshot: MetricSnapshot = {index: 0, value: 42, startOfMeasurement: null};
                    const snapshot2: MetricSnapshot = {index: 1, value: 44, startOfMeasurement: null};
                    const snapshot3: MetricSnapshot = {index: 2, value: 44, startOfMeasurement: null};
                    spyOn(dexieInstance.snapshots, 'delete').and.callThrough();
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(0);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(1);
                        await metricsDB.removeOldestSnapshot(metricName, assignment);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(0);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot2);
                        await metricsDB.storeNewSnapshot(metricName, assignment, snapshot3);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(3);
                        await metricsDB.removeOldestSnapshot(metricName, assignment);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(2);
                        let snapshots = await metricsDB.getSnapshots(metricName, assignment);
                        expect(snapshots).toContain(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot2));
                        expect(snapshots).toContain(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot3));
                        await metricsDB.removeOldestSnapshot(metricName, assignment);
                        expect(await metricsDB.getSnapshotCount(metricName, assignment)).toEqual(1);
                        snapshots = await metricsDB.getSnapshots(metricName, assignment);
                        expect(snapshots).toContain(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot3));

                    });
                    expect(dexieInstance.snapshots.delete).toHaveBeenCalledTimes(3);
                    done();
                });
                it('should reject if there is no snapshot to be deleted', async function (done) {
                    await expectThrowsAsync(async () => {
                        await metricsDB.removeOldestSnapshot('someMetric', {});
                    }, /There are no snapshots stored for the given assignment/);
                    done();
                });
                it('should verify that assignment only contains valid keys', getTestSpecInvalidAssignments(
                    async (assignment) => metricsDB.removeOldestSnapshot('myMetric', assignment)
                ));
            });
            describe('getSnapshotsWithinTimeFrame', function () {
                it('should return snapshot within time frame', async function (done) {
                    const metricName1 = 'myMetric';
                    const metricName2 = 'myOtherMetric';
                    const assignment: RecordPointAssignment = {workflowId: 'asdf', workflowVersionId: 'hash'};
                    const snapshot1: MetricSnapshot = {index: 0, startOfMeasurement: 1000, value: 1342};
                    const snapshot2: MetricSnapshot = {index: 1, startOfMeasurement: 2400, value: -123};
                    const snapshot3: MetricSnapshot = {index: 0, startOfMeasurement: 1400, value: 1567};
                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getSnapshotsWithinTimeFrame(metricName1, assignment, new Date(0), new Date(9999999999))).toEqual([]);
                        await metricsDB.storeNewSnapshot(metricName1, assignment, snapshot1);
                        await metricsDB.storeNewSnapshot(metricName1, assignment, snapshot2);
                        await metricsDB.storeNewSnapshot(metricName2, assignment, snapshot3);
                        let snaps1 = await metricsDB.getSnapshotsWithinTimeFrame(metricName2, assignment, new Date(0), new Date(9999999999));
                        expect(snaps1).toContain(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot3));
                        let snaps2 = await metricsDB.getSnapshotsWithinTimeFrame(metricName2, assignment, new Date(0), new Date(1399));
                        expect(snaps2.length).toEqual(0);
                        let snaps3 = await metricsDB.getSnapshotsWithinTimeFrame(metricName2, assignment, new Date(1400), new Date(1401));
                        expect(snaps3.length).toEqual(1);
                        expect(snaps3[0]).toEqual(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot3));
                        let snaps4 = await metricsDB.getSnapshotsWithinTimeFrame(metricName2, assignment, new Date(1399), new Date(1400));
                        expect(snaps4.length).toEqual(0);
                        let snaps5 = await metricsDB.getSnapshotsWithinTimeFrame(metricName1, assignment, new Date(0), new Date(1001));
                        expect(snaps5.length).toEqual(1);
                        expect(snaps5[0]).toEqual(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot1));
                        let snaps6 = await metricsDB.getSnapshotsWithinTimeFrame(metricName1, assignment, new Date(1000), new Date(2401));
                        expect(snaps6.length).toEqual(2);
                        expect(snaps6[0]).toEqual(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot1));
                        expect(snaps6[1]).toEqual(jasmine.objectContaining<MetricSnapshotWithAssignment>(snapshot2));
                    });
                    done();
                });
                it('should reject if a snapshot does not contain a timestamp', async function (done) {
                    const metricName1 = 'helloMetric';
                    const assignment: RecordPointAssignment = {workflowId: 'asdf', taskId: 123};
                    const snapshot1: MetricSnapshot = {index: 0, startOfMeasurement: null, value: 1342};
                    await tryOrFailAsync(async () => {
                        await metricsDB.storeNewSnapshot(metricName1, assignment, snapshot1);
                    });
                    await expectThrowsAsync(async () => {
                        let snaps1 = await metricsDB.getSnapshotsWithinTimeFrame(metricName1, assignment, new Date(0), new Date(9999999999));
                    }, /Expected snapshot to have a timestamp, but is has not/);
                    done();
                })
            });
            describe('getNewExecutionId', function () {
                const workflow1 = 'UUID-of-workflow1';
                const workflow2 = 'UUID-of-second-workflow';
                it('should return a new unique id for each call', async function (done) {
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(0);
                    expect(await metricsDB.getNewExecutionId(workflow2)).toEqual(0);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(1);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(2);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(3);
                    expect(await metricsDB.getNewExecutionId(workflow2)).toEqual(1);
                    expect(await metricsDB.getNewExecutionId(workflow2)).toEqual(2);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(4);
                    done();
                });
                it('should store lastId into database', async function (done) {
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(0);
                    expect(await metricsDB.getNewExecutionId(workflow2)).toEqual(0);
                    const entry1 = (await dexieInstance.lastIds.get({name: workflow1, type: 'workflowExecution'}))!;
                    expect(entry1).toEqual(jasmine.objectContaining<typeof entry1>({lastId: 0}));
                    const entry2 = (await dexieInstance.lastIds.get({name: workflow2, type: 'workflowExecution'}))!;
                    expect(entry2).toEqual(jasmine.objectContaining<typeof entry2>({lastId: 0}));
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(1);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(2);
                    expect(await metricsDB.getNewExecutionId(workflow1)).toEqual(3);
                    expect(await metricsDB.getNewExecutionId(workflow2)).toEqual(1);
                    const entry3 = (await dexieInstance.lastIds.get({name: workflow1, type: 'workflowExecution'}))!;
                    expect(entry3).toEqual(jasmine.objectContaining<typeof entry3>({lastId: 3}));
                    const entry4 = (await dexieInstance.lastIds.get({name: workflow2, type: 'workflowExecution'}))!;
                    expect(entry4).toEqual(jasmine.objectContaining<typeof entry4>({lastId: 1}));
                    done();
                });
            });
            describe('getNewScheduleId', function () {
                it('should return a new unique id for each call', async function (done) {
                    expect(await metricsDB.getNewScheduleId()).toEqual(0);
                    expect(await metricsDB.getNewScheduleId()).toEqual(1);
                    expect(await metricsDB.getNewScheduleId()).toEqual(2);
                    expect(await metricsDB.getNewScheduleId()).toEqual(3);
                    expect(await metricsDB.getNewScheduleId()).toEqual(4);
                    expect(await metricsDB.getNewScheduleId()).toEqual(5);
                    done();
                });
                it('should store lastId into database', async function (done) {
                    expect(await metricsDB.getNewScheduleId()).toEqual(0);
                    const entry1 = (await dexieInstance.lastIds.get({name: 'schedule', type: 'schedule'}))!;
                    expect(entry1).toEqual(jasmine.objectContaining<typeof entry1>({lastId: 0}));
                    expect(await metricsDB.getNewScheduleId()).toEqual(1);
                    const entry2 = (await dexieInstance.lastIds.get({name: 'schedule', type: 'schedule'}))!;
                    expect(entry2).toEqual(jasmine.objectContaining<typeof entry2>({lastId: 1}));
                    expect(await metricsDB.getNewScheduleId()).toEqual(2);
                    const entry3 = (await dexieInstance.lastIds.get({name: 'schedule', type: 'schedule'}))!;
                    expect(entry3).toEqual(jasmine.objectContaining<typeof entry3>({lastId: 2}));
                    done();
                })
            });
            describe('exportMetricSnapshots', function() {
                const snap1: MetricSnapshot = {
                    index: 0,
                    startOfMeasurement: null,
                    value: 112233
                };
                const snap2: MetricSnapshot = {
                    index: 4,
                    startOfMeasurement: 1000.1234,
                    sumOfMeasurements: 123,
                    numberOfMeasurements: 4,
                    value: 23,
                };
                it('should export no metric snapshots with empty metric names array', async function(done) {
                    expect(await metricsDB.exportMetricSnapshots([])).toEqual([]);
                    done();
                });
                it('should export no metric snapshots with empty metric names array but entries in DB', async function(done){
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId'}, {
                        index: 0,
                        startOfMeasurement: null,
                        value: 112233
                    });
                    expect(await metricsDB.exportMetricSnapshots([])).toEqual([]);
                    done();
                });
                it('should export no metric snapshots with unknown metric name array but entries in DB', async function(done){
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId'}, {
                        index: 0,
                        startOfMeasurement: null,
                        value: 112233
                    });
                    expect(await metricsDB.exportMetricSnapshots(['idunnothis'])).toEqual([]);
                    done();
                });
                it('should export metric snapshots for the given metric names', async function(done) {
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId'}, snap1);
                    await metricsDB.storeNewSnapshot('someMetricName2', {workflowId: 'someId'}, snap1);
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId2', executionId: 2, taskId: 3}, snap2);
                    expect(await metricsDB.exportMetricSnapshots(['someMetricName'])).toEqual([
                        rehagoal.utilities.extend(snap1, {
                            metricName: 'someMetricName',
                            assignment: {
                                scheduleId: -1,
                                workflowId: 'someId',
                                workflowVersionId: '',
                                executionId: -1,
                                taskId: -1
                            }
                        }),
                        rehagoal.utilities.extend(snap2, {
                            metricName: 'someMetricName',
                            assignment: {
                                scheduleId: -1,
                                workflowId: 'someId2',
                                workflowVersionId: '',
                                executionId: 2,
                                taskId: 3,
                            }
                        })
                    ]);
                    done();
                });
                it('should export metric snapshots for the given metric names #2', async function(done) {
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId'}, snap1);
                    await metricsDB.storeNewSnapshot('someMetricName2', {workflowId: 'someId'}, snap1);
                    await metricsDB.storeNewSnapshot('someMetricName', {workflowId: 'someId2', executionId: 2, taskId: 3}, snap2);
                    expect(await metricsDB.exportMetricSnapshots(['someMetricName', 'someMetricName2'])).toEqual([
                        rehagoal.utilities.extend(snap1, {
                            metricName: 'someMetricName',
                            assignment: {
                                scheduleId: -1,
                                workflowId: 'someId',
                                workflowVersionId: '',
                                executionId: -1,
                                taskId: -1
                            }
                        }),
                        rehagoal.utilities.extend(snap2, {
                            metricName: 'someMetricName',
                            assignment: {
                                scheduleId: -1,
                                workflowId: 'someId2',
                                workflowVersionId: '',
                                executionId: 2,
                                taskId: 3,
                            }
                        }),
                        rehagoal.utilities.extend(snap1, {
                            metricName: 'someMetricName2',
                            assignment: {
                                scheduleId: -1,
                                workflowId: 'someId',
                                workflowVersionId: '',
                                executionId: -1,
                                taskId: -1,
                            }
                        })
                    ]);
                    done();
                });
            });
        });
    });
}
