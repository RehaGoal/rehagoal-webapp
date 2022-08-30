'use strict';

module rehagoal.metrics {
    import DexieFactory = rehagoal.database.DexieFactory;
    import SettingsService = rehagoal.settings.SettingsService;
    import tryOrFailAsync = rehagoal.testUtilities.tryOrFailAsync;

    const METRICS_PRECISION = 5;

    describe('rehagoal.metrics', function () {
        let metricRegistry: MetricRegistry;
        let dexieFactory: DexieFactory;
        let $Date: DateConstructor;
        let getTimeSpy: jasmine.Spy;
        let getPublicMetricNamesSpy: jasmine.Spy;

        //Modules
        beforeEach(() => angular.mock.module('rehagoal.metrics', function ($provide: angular.auto.IProvideService) {
            $provide.decorator('metricRegistryFactory', function ($delegate: () => MetricRegistry) {
                return function () {
                    metricRegistry = $delegate();
                    spyOn(metricRegistry, 'register').and.callThrough();
                    getPublicMetricNamesSpy = spyOn(metricRegistry, 'getPublicMetricNames').and.callThrough();
                    return metricRegistry;
                };
            });
            $provide.decorator('$Date', function () {
                jasmine.clock().install();
                jasmine.clock().mockDate();
                $Date = Date;
                getTimeSpy = spyOn($Date.prototype, 'getTime').and.callThrough();
                return $Date;
            });
        }));
        beforeEach(() => angular.mock.inject(function (_dexieFactory_: DexieFactory) {
            dexieFactory = _dexieFactory_;
        }));
        beforeEach((done) => {
            dexieFactory('metricsDB').delete().then(done);
        });

        afterEach(function () {
            jasmine.clock().uninstall();
        });

        describe('metric service', function () {
            let metricService: MetricService;
            let metricsDB: MetricsDB;
            let settingsService: SettingsService;
            let $rootScope: angular.IRootScopeService;
            let $q: angular.IQService;
            let $log: angular.ILogService;
            beforeEach(() => angular.mock.inject(function (_metricService_: MetricService,
                                                           _metricsDBService_: MetricsDB,
                                                           _settingsService_: SettingsService,
                                                           _$rootScope_: angular.IRootScopeService,
                                                           _$q_: angular.IQService,
                                                           _$log_: angular.ILogService) {
                metricService = _metricService_;
                metricsDB = _metricsDBService_;
                settingsService = _settingsService_;
                $rootScope = _$rootScope_;
                $q = _$q_;
                $log = _$log_;

                // Prevent measuring of promise delays in order to not collide with Date mocks.
                metricService.debugPromiseDelays = false;

                // force studyModeEnabled for metric tests
                settingsService.studyModeEnabled = true;
            }));

            function expectErrorAndClear(error_msg: string) {
                let logs = $log.error.logs as any as any[][];
                expect(logs).toEqual([[jasmine.objectContaining({message: error_msg})]]);
                $log.error.logs.length = 0;
            }

            function expectWarningAndClear(...warnings: any[]) {
                let logs = $log.warn.logs as any as any[][];
                expect(logs).toEqual([warnings]);
                $log.warn.logs.length = 0;
            }

            function expectNoUncheckedErrors() {
                let allErrors = $log.error.logs.map((l) => {
                    let line = l as any as any[];
                    return (line[0].message || '') + '\n' + (line[0].stack || '')
                });
                since('Expected no unchecked errors in the log. Actual: \n\n' + allErrors + "\n[end of log]")
                    .expect($log.error.logs).toEqual([]);
            }

            function getIntMetricDef(): NumberMetricDefinition {
                return {
                    name: 'MyIntMetric',
                    type: 'int',
                    assignment: ['workflow'],
                    recordPoints: ['myRecordPoint1', 'myRecordPoint2'],
                    snapshots: 1,
                    agg: {
                        operation: 'sum',
                        time: "all"
                    }
                };
            }

            function getFloatMetricDef(): NumberMetricDefinition {
                return {
                    name: 'MyFloatMetric',
                    type: 'float',
                    assignment: ['workflow'],
                    recordPoints: ['myRecordPoint'],
                    snapshots: 1,
                };
            }

            function getDurationMetricDef(): DurationMetricDefinition {
                return {
                    name: 'MyDurationMetric',
                    type: 'duration',
                    assignment: ['workflow'],
                    handleIncomplete: 'ignore',
                    recordStart: 'recordStartPoint',
                    recordStop: 'recordStopPoint',
                    snapshots: 1,
                    agg: {
                        operation: 'average',
                        time: "all"
                    }
                };
            }

            function getMetaMetricDef(metaReference: string): MetaMetricDefinition {
                return {
                    name: 'MyMetaMetric',
                    type: 'meta',
                    assignment: ['workflow'],
                    metaReference: metaReference,
                    recordPoints: ['someRecordPoint'],
                    snapshots: 1,
                    agg: {
                        operation: 'average',
                        time: "all"
                    }
                };
            }

            describe('MetricRegistry', function () {
                it('should register int metric', function () {
                    let metricDefinition: NumberMetricDefinition = getIntMetricDef();
                    metricService.register(metricDefinition);
                    expect(metricRegistry.register).toHaveBeenCalledWith(metricDefinition);
                });
                it('should register float metric', function () {
                    let metricDefinition: NumberMetricDefinition = getFloatMetricDef();
                    metricService.register(metricDefinition);
                    expect(metricRegistry.register).toHaveBeenCalledWith(metricDefinition);
                });
                it('should register duration metric', function () {
                    let metricDefinition: DurationMetricDefinition = getDurationMetricDef();
                    metricService.register(metricDefinition);
                    expect(metricRegistry.register).toHaveBeenCalledWith(metricDefinition);
                });
                it('should register meta metric', function () {
                    let otherDefinition: NumberMetricDefinition = getFloatMetricDef();
                    let metricDefinition: MetaMetricDefinition = getMetaMetricDef(otherDefinition.name);
                    metricService.register(otherDefinition);
                    metricService.register(metricDefinition);
                    expect(metricRegistry.register).toHaveBeenCalledWith(metricDefinition);
                });
                it('should return public metric names using metricRegistry', function() {
                    const publicMetricNames = ['publicMetric1', 'anotherNon-PrivateMetric', 'thirdMetric'];
                    getPublicMetricNamesSpy.and.returnValue(publicMetricNames);
                    const returnNames = metricService.getPublicMetricNames();
                    expect(returnNames).toEqual(publicMetricNames);
                    expect(metricRegistry.getPublicMetricNames).toHaveBeenCalledTimes(1);
                })
            });
            describe('MetricRecorder', function () {
                const SECOND = 1000;
                const MINUTE = SECOND * 60;
                const HOUR = MINUTE * 60;
                const QUARTER_DAY = HOUR * (24 / 4);
                const DAY = HOUR * 24;
                const WEEK = DAY * 7;
                const FIRST_MONDAY_TIMESTAMP = 4 * DAY;

                function expectSingleSnapshot(actual: MetricSnapshotWithAssignment[],
                                              expected: Partial<MetricSnapshotWithAssignment>) {
                    expect(actual.length).toBe(1);
                    expect(actual[0]).toEqual(jasmine.objectContaining(expected));
                }

                function expectMultipleSnapshots(actual: MetricSnapshotWithAssignment[],
                                                 expected: Partial<MetricSnapshotWithAssignment>[]) {
                    // console.log("Actual: " + jasmine.pp(actual));
                    expect(actual.length).toBe(expected.length);
                    for (let i = 0; i < expected.length; ++i) {
                        expect(actual[i]).toEqual(jasmine.objectContaining(expected[i]));
                    }
                }

                afterEach(expectNoUncheckedErrors);

                describe('raw metrics', function () {
                    describe('number metrics', function () {
                        it('should log error if int metric records float value', async function (done: DoneFn) {
                            let def = getIntMetricDef();
                            delete def.agg;
                            delete def.constValue;
                            delete def.accuracy;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            const error_msg = `Error while processing metric "${def.name}": ` +
                                'Trimmed value does not fit into metric type "int"';
                            metricService.register(def);

                            metricService.recordValue(recordPoint, assignment, 0.0);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: 0.0});
                            metricService.recordValue(recordPoint, assignment, 0.023);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, 1.23);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, Number.NaN);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, Number.POSITIVE_INFINITY);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, Number.NEGATIVE_INFINITY);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, -42.00003);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            expect((await metricsDB.getSnapshots(def.name, assignment)).length).toBe(1);
                            done();
                        });
                        it('should record if int metric records float value, but is trimmed to int', async function (done: DoneFn) {
                            let def = getIntMetricDef();
                            delete def.agg;
                            delete def.constValue;
                            def.accuracy = 1;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            const error_msg = `Error while processing metric "${def.name}": ` +
                                'Trimmed value does not fit into metric type "int"';
                            metricService.register(def);

                            metricService.recordValue(recordPoint, assignment, 0.03);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: 0});
                            metricService.recordValue(recordPoint, assignment, 1.23);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: 1});
                            metricService.recordValue(recordPoint, assignment, -1.23);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: -2});
                            metricService.recordValue(recordPoint, assignment, 4200.00000001);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: 4200});
                            metricService.recordValue(recordPoint, assignment, 42.99999999);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {value: 42});

                            metricService.recordValue(recordPoint, assignment, Number.NaN);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            metricService.recordValue(recordPoint, assignment, Number.POSITIVE_INFINITY);
                            await metricService.recorderPromise;
                            expectErrorAndClear(error_msg);
                            done();
                        });
                        it('should record/overwrite int metric with single snapshot', async function (done: DoneFn) {
                            let def = getIntMetricDef();
                            delete def.agg;
                            delete def.constValue;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            metricService.recordValue(recordPoint, assignment, 10);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 0, value: 10, assignment: assignment});
                            metricService.recordValue(recordPoint, assignment, 20);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 1, value: 20, assignment: assignment});
                            metricService.recordValue(recordPoint, assignment, 4);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 2, value: 4, assignment: assignment});
                            done();
                        });
                        it('should record/overwrite float metric with single snapshot', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            delete def.agg;
                            delete def.constValue;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            metricService.recordValue(recordPoint, assignment, 10);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 0, value: 10, assignment: assignment});
                            metricService.recordValue(recordPoint, assignment, 20.2);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 1, value: 20.2, assignment: assignment});
                            metricService.recordValue(recordPoint, assignment, 4.13);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 2, value: 4.13, assignment: assignment});
                            done();
                        });
                        describe('feature accuracy', function () {
                            function getAccuracyTestSpec(accuracy: number, values: number[], expectedValues: number[]) {
                                return async function (done: DoneFn) {
                                    let def = getFloatMetricDef();
                                    def.accuracy = accuracy;
                                    const recordPoint = def.recordPoints[0];
                                    const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                                    metricService.register(def);

                                    since("Expected test specification to be consistent").expect(values.length).toEqual(expectedValues.length);

                                    for (let i = 0; i < values.length; ++i) {
                                        metricService.recordValue(recordPoint, assignment, values[i]);
                                        await metricService.recorderPromise;
                                        expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                            {index: i, value: expectedValues[i]});
                                    }
                                    done();
                                }
                            }

                            it('should trim float to 0.001 accuracy', getAccuracyTestSpec(0.001,
                                [
                                    1,
                                    0.00001234,
                                    0.0005,
                                    0.12345,
                                    1.44446,
                                    -1.23456,
                                    999.9,
                                    1234.1111111111,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    1,
                                    0,
                                    0,
                                    0.123,
                                    1.444,
                                    -1.235,
                                    999.9,
                                    1234.111,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 0.1 accuracy', getAccuracyTestSpec(0.1,
                                [
                                    1,
                                    0.01234,
                                    0.05,
                                    -0.05,
                                    0.12345,
                                    1.44446,
                                    -1.23456,
                                    999.99,
                                    999.9,
                                    1234.1111111111,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    1,
                                    0,
                                    0,
                                    -0.1,
                                    0.1,
                                    1.4000000000000001, // Due to floating point limitations
                                    -1.3,
                                    999.9000000000001, // Due to floating point limitations
                                    999.9000000000001, // Due to floating point limitations
                                    1234.1000000000001, // Due to floating point limitations,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 0.25 accuracy', getAccuracyTestSpec(0.25,
                                [
                                    1,
                                    1.25,
                                    1.24,
                                    9.50,
                                    9.51,
                                    0.01,
                                    0.1,
                                    0.7444,
                                    0.749,
                                    0.75,
                                    -0.75,
                                    -0.4,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    1,
                                    1.25,
                                    1,
                                    9.5,
                                    9.5,
                                    0,
                                    0,
                                    0.5,
                                    0.5,
                                    0.75,
                                    -0.75,
                                    -0.5,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 1.0 accuracy', getAccuracyTestSpec(1.0,
                                [
                                    0,
                                    1,
                                    1.1,
                                    1.9,
                                    1.00001,
                                    1.99999,
                                    -1.9,
                                    -1.4,
                                    22.1,
                                    22.5,
                                    77.9,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    0,
                                    1,
                                    1,
                                    1,
                                    1,
                                    1,
                                    -2,
                                    -2,
                                    22,
                                    22,
                                    77,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 2.5 accuracy', getAccuracyTestSpec(2.5,
                                [
                                    0,
                                    1,
                                    2.5,
                                    2.4,
                                    1.23,
                                    5.2,
                                    -1.1,
                                    -0.0001,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    0,
                                    0,
                                    2.5,
                                    0,
                                    0,
                                    5.0,
                                    -2.5,
                                    -2.5,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 10.30 accuracy', getAccuracyTestSpec(10.30,
                                [
                                    0,
                                    1,
                                    10.2,
                                    -10.2,
                                    -0.1,
                                    10.3,
                                    22,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    -10.3,
                                    -10.3,
                                    10.3,
                                    20.6,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim float to 10000 accuracy', getAccuracyTestSpec(10000,
                                [
                                    0,
                                    1,
                                    -0.1,
                                    5999,
                                    9999.9999,
                                    2.2e4,
                                    2e4,
                                    10001,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    0,
                                    0,
                                    -10000,
                                    0,
                                    0,
                                    20000,
                                    20000,
                                    10000,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                            it('should trim int to 5 accuracy', getAccuracyTestSpec(5,
                                [
                                    0,
                                    1,
                                    -0.1,
                                    4,
                                    4.9999,
                                    -4.5,
                                    5,
                                    10,
                                    55,
                                    22,
                                    26,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ],
                                [
                                    0,
                                    0,
                                    -5,
                                    0,
                                    0,
                                    -5,
                                    5,
                                    10,
                                    55,
                                    20,
                                    25,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    Number.NaN,
                                ]));
                        });
                    });
                    describe('duration metrics', function () {
                        it('should record/overwrite duration metric with single snapshot', async function (done: DoneFn) {
                            let def = getDurationMetricDef();
                            delete def.agg;
                            delete def.durationAccuracy;
                            const start = def.recordStart;
                            const stop = def.recordStop;
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            getTimeSpy.and.returnValue(0);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(1500);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 0, value: 1500, assignment: assignment});

                            getTimeSpy.and.returnValue(1600);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(1852);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 1, value: 252, assignment: assignment});

                            getTimeSpy.and.returnValue(1760);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(5123);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectNoUncheckedErrors();
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 2, value: 3363, assignment: assignment});
                            done();
                        });
                        it('should record multiple duration metrics interleaved', async function (done: DoneFn) {
                            let def1 = getDurationMetricDef();
                            delete def1.agg;
                            let def2 = getDurationMetricDef();
                            delete def2.agg;
                            def2.name += '2';
                            def2.recordStart += '2';
                            def2.recordStop += '2';
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};

                            metricService.register(def1);
                            metricService.register(def2);

                            getTimeSpy.and.returnValue(1234);
                            metricService.record(def1.recordStart, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(5145);
                            metricService.record(def2.recordStart, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(6777);
                            metricService.record(def1.recordStop, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(7749);
                            metricService.record(def2.recordStop, assignment);
                            await metricService.recorderPromise;

                            expectSingleSnapshot(await metricsDB.getSnapshots(def1.name, assignment),
                                {index: 0, value: 5543, assignment: assignment});
                            expectSingleSnapshot(await metricsDB.getSnapshots(def2.name, assignment),
                                {index: 0, value: 2604, assignment: assignment});
                            done();
                        });
                        it('should record duration metric with different assignments interleaved', async function (done: DoneFn) {
                            let def = getDurationMetricDef();
                            delete def.agg;
                            const assignment1: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            const assignment2: RecordPointAssignment = {workflowId: 'myOtherWorkflow'};

                            metricService.register(def);

                            getTimeSpy.and.returnValue(1234);
                            metricService.record(def.recordStart, assignment1);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(5145);
                            metricService.record(def.recordStart, assignment2);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(6777);
                            metricService.record(def.recordStop, assignment1);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(7749);
                            metricService.record(def.recordStop, assignment2);
                            await metricService.recorderPromise;

                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment1),
                                {index: 0, value: 5543, assignment: assignment1});
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment2),
                                {index: 0, value: 2604, assignment: assignment2});
                            done();
                        });
                        describe('feature durationAccuracy', function () {
                            function getDurationAccuracyTestSpec(durationAccuracy: DurationAccuracyValue, durations: number[], expectedDurations: number[]) {
                                return async function (done: DoneFn) {
                                    let def = getDurationMetricDef();
                                    delete def.agg;
                                    def.snapshots = 1;
                                    def.durationAccuracy = durationAccuracy;
                                    const recordStart = def.recordStart;
                                    const recordStop = def.recordStop;
                                    const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                                    metricService.register(def);

                                    since("Test specification is inconsistent. Length of values/expectedValues is not equal: #{expected} != #{actual}")
                                        .expect(durations.length).toEqual(expectedDurations.length);

                                    let time = 0;
                                    for (let i = 0; i < durations.length; ++i) {
                                        let nextTime = time + durations[i];
                                        getTimeSpy.and.returnValues(time, nextTime);
                                        metricService.record(recordStart, assignment);
                                        metricService.record(recordStop, assignment);
                                        await metricService.recorderPromise;
                                        time = nextTime;
                                        expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                            {index: i, value: expectedDurations[i]});
                                    }
                                    done();
                                }
                            }
                            it('should trim duration to full seconds', getDurationAccuracyTestSpec([1,  's'],
                                [
                                    0,
                                    0.5 * SECOND,
                                    0.4 * SECOND,
                                    SECOND,
                                    2.5 * SECOND,
                                    30 * SECOND,
                                    MINUTE + 0.5 * SECOND,
                                    12 * MINUTE + 3.55 * SECOND,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    SECOND,
                                    2 * SECOND,
                                    30 * SECOND,
                                    MINUTE,
                                    12 * MINUTE + 3 * SECOND,
                                ]));
                            it('should trim duration to full minutes', getDurationAccuracyTestSpec([1,  'm'],
                                [
                                    0,
                                    10 * SECOND,
                                    30 * SECOND,
                                    59 * SECOND + 999,
                                    0.5 * MINUTE,
                                    0.4 * MINUTE,
                                    MINUTE,
                                    2.5 * MINUTE,
                                    30 * MINUTE,
                                    HOUR + 0.5 * MINUTE,
                                    12 * HOUR + 3.55 * MINUTE,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    MINUTE,
                                    2 * MINUTE,
                                    30 * MINUTE,
                                    HOUR,
                                    12 * HOUR + 3 * MINUTE,
                                ]));
                            it('should trim duration to full hours', getDurationAccuracyTestSpec([1,  'h'],
                                [
                                    0,
                                    10 * SECOND,
                                    30 * MINUTE,
                                    59 * MINUTE + 999,
                                    0.5 * HOUR,
                                    0.4 * HOUR,
                                    HOUR,
                                    2.5 * HOUR,
                                    30 * HOUR,
                                    DAY + 0.5 * HOUR,
                                    12 * DAY + 3.55 * HOUR,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    HOUR,
                                    2 * HOUR,
                                    30 * HOUR,
                                    DAY,
                                    12 * DAY+ 3 * HOUR,
                                ]));
                            it('should trim duration to full days', getDurationAccuracyTestSpec([1,  'd'],
                                [
                                    0,
                                    10 * SECOND,
                                    30 * MINUTE,
                                    23 * HOUR + 59 * MINUTE + 59 * SECOND + 999,
                                    0.5 * DAY,
                                    0.4 * DAY,
                                    DAY,
                                    2.5 * DAY,
                                    30 * DAY,
                                    DAY + 0.5 * DAY,
                                    12 * DAY + 3.55 * DAY,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    0,
                                    DAY,
                                    2 * DAY,
                                    30 * DAY,
                                    DAY,
                                    12 * DAY+ 3 * DAY,
                                ]));
                            it('should trim duration to 5 seconds steps', getDurationAccuracyTestSpec([5,  's'],
                                [
                                    0,
                                    0.5 * SECOND,
                                    7 * SECOND,
                                    SECOND,
                                    10 * SECOND,
                                    12.5 * SECOND,
                                    MINUTE + 26 * SECOND,
                                    12 * DAY + 33 * SECOND,
                                ],
                                [
                                    0,
                                    0,
                                    5 * SECOND,
                                    0,
                                    10 * SECOND,
                                    10 * SECOND,
                                    MINUTE + 25 * SECOND,
                                    12 * DAY + 30 * SECOND,
                                ]));
                            it('should trim duration to 2.5 minutes steps', getDurationAccuracyTestSpec([2.5,  'm'],
                                [
                                    0,
                                    0.5 * MINUTE,
                                    7 * MINUTE,
                                    7.6 * MINUTE,
                                    10 * MINUTE,
                                    12.5 * MINUTE,
                                    3 * MINUTE + 26 * SECOND,
                                    12 * DAY + 29.5 * MINUTE,
                                ],
                                [
                                    0,
                                    0,
                                    5 * MINUTE,
                                    7.5 * MINUTE,
                                    10 * MINUTE,
                                    12.5 * MINUTE,
                                    2.5 * MINUTE,
                                    12 * DAY + 27.5 * MINUTE,
                                ]));
                            it('should trim duration to 2 hours steps', getDurationAccuracyTestSpec([2,  'h'],
                                [
                                    0,
                                    0.5 * MINUTE,
                                    7 * HOUR,
                                    7.6 * HOUR,
                                    10 * HOUR,
                                    12.5 * HOUR,
                                    29 * HOUR + 33 * MINUTE,
                                    12 * DAY + 29.5 * HOUR,
                                ],
                                [
                                    0,
                                    0,
                                    6 * HOUR,
                                    6 * HOUR,
                                    10 * HOUR,
                                    12 * HOUR,
                                    28 * HOUR,
                                    12 * DAY + 28 * HOUR,
                                ]));
                            it('should trim duration to 0.5 days steps', getDurationAccuracyTestSpec([0.5,  'd'],
                                [
                                    0,
                                    0.5 * MINUTE,
                                    7 * HOUR,
                                    0.75 * DAY,
                                    1.25 * DAY,
                                    10.8 * DAY + HOUR + 33 * MINUTE + 1234,
                                ],
                                [
                                    0,
                                    0,
                                    0,
                                    0.5 * DAY,
                                    DAY,
                                    10.5 * DAY,
                                ]));
                        });
                        describe('feature handleIncomplete', function () {
                            it('should truncate durations to end at the next start of measurement, if "truncate" option is used', async function (done: DoneFn) {
                                let def = getDurationMetricDef();
                                def.handleIncomplete = "truncate";
                                delete def.agg;
                                delete def.durationAccuracy;
                                def.snapshots = 2;
                                const start = def.recordStart;
                                const stop = def.recordStop;
                                const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                                metricService.register(def);

                                // complete measurement
                                getTimeSpy.and.returnValue(0);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                getTimeSpy.and.returnValue(1500);
                                metricService.record(stop, assignment);
                                await metricService.recorderPromise;
                                expectNoUncheckedErrors();
                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                    {index: 0, value: 1500, assignment: assignment});

                                // start of measurement 2
                                getTimeSpy.and.returnValue(1600);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                // start of measurement 3, incomplete measurement 2 (truncated)
                                getTimeSpy.and.returnValue(1852);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                    [
                                        {index: 0, value: 1500, assignment: assignment},
                                        {index: 1, value: 252, assignment: assignment},
                                    ]);
                                // stop of measurement 3
                                getTimeSpy.and.returnValue(2569);
                                metricService.record(stop, assignment);
                                await metricService.recorderPromise;
                                expectNoUncheckedErrors();
                                expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                    [
                                        {index: 1, value: 252, assignment: assignment},
                                        {index: 2, value: 717, assignment: assignment}
                                    ]);
                                expectNoUncheckedErrors();
                                done();
                            });
                            it('should truncate durations to end at the next start of measurement, if "truncate" option is used', async function (done: DoneFn) {
                                let def = getDurationMetricDef();
                                def.handleIncomplete = "ignore";
                                delete def.agg;
                                delete def.durationAccuracy;
                                def.snapshots = 2;
                                const start = def.recordStart;
                                const stop = def.recordStop;
                                const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                                metricService.register(def);

                                // complete measurement
                                getTimeSpy.and.returnValue(0);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                getTimeSpy.and.returnValue(1500);
                                metricService.record(stop, assignment);
                                await metricService.recorderPromise;
                                expectNoUncheckedErrors();
                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                    {index: 0, value: 1500, assignment: assignment});

                                // start of measurement 2
                                getTimeSpy.and.returnValue(1600);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                // start of measurement 3, incomplete measurement 2 (ignored)
                                getTimeSpy.and.returnValue(1852);
                                metricService.record(start, assignment);
                                await metricService.recorderPromise;
                                expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                    [
                                        {index: 0, value: 1500, assignment: assignment},
                                    ]);
                                // stop of measurement 3
                                getTimeSpy.and.returnValue(2569);
                                metricService.record(stop, assignment);
                                await metricService.recorderPromise;
                                expectNoUncheckedErrors();
                                expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                    [
                                        {index: 0, value: 1500, assignment: assignment},
                                        {index: 1, value: 717, assignment: assignment}
                                    ]);
                                expectNoUncheckedErrors();
                                done();
                            });
                        })
                    });
                    describe('feature snapshots', function () {
                        it('should record float metric with three snapshots and overwrite oldest', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.snapshots = 3;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            metricService.recordValue(recordPoint, assignment, 1.2345);
                            metricService.recordValue(recordPoint, assignment, 4.1);
                            metricService.recordValue(recordPoint, assignment, -2.54);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 0, value: 1.2345, assignment},
                                {index: 1, value: 4.1, assignment},
                                {index: 2, value: -2.54, assignment}
                            ]);
                            metricService.recordValue(recordPoint, assignment, 12345);
                            metricService.recordValue(recordPoint, assignment, 222333);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 2, value: -2.54, assignment},
                                {index: 3, value: 12345, assignment},
                                {index: 4, value: 222333, assignment},
                            ]);
                            metricService.recordValue(recordPoint, assignment, -4123);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 3, value: 12345, assignment},
                                {index: 4, value: 222333, assignment},
                                {index: 5, value: -4123, assignment},
                            ]);
                            metricService.recordValue(recordPoint, assignment, 42);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 4, value: 222333, assignment},
                                {index: 5, value: -4123, assignment},
                                {index: 6, value: 42, assignment},
                            ]);
                            metricService.recordValue(recordPoint, assignment, 2);
                            metricService.recordValue(recordPoint, assignment, 5);
                            metricService.recordValue(recordPoint, assignment, 7);
                            metricService.recordValue(recordPoint, assignment, 11);
                            metricService.recordValue(recordPoint, assignment, 13);
                            metricService.recordValue(recordPoint, assignment, 17);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 10, value: 11, assignment},
                                {index: 11, value: 13, assignment},
                                {index: 12, value: 17, assignment},
                            ]);
                            done();
                        });
                        it('should record duration metric with two snapshots and overwrite oldest', async function (done: DoneFn) {
                            let def = getDurationMetricDef();
                            def.snapshots = 2;
                            delete def.agg;
                            const start = def.recordStart;
                            const stop = def.recordStop;
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            getTimeSpy.and.returnValue(12345);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(34691);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 0, value: 22346}
                            ]);

                            getTimeSpy.and.returnValue(45000);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(50000);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 0, value: 22346},
                                {index: 1, value: 5000}
                            ]);

                            getTimeSpy.and.returnValue(50125);
                            metricService.record(start, assignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(60126);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 1, value: 5000},
                                {index: 2, value: 10001},
                            ]);

                            getTimeSpy.and.returnValues(70100, 80102,
                                91200, 100456,
                                111123, 111223,
                                200000, 300000);
                            metricService.record(start, assignment);
                            metricService.record(stop, assignment);
                            metricService.record(start, assignment);
                            metricService.record(stop, assignment);
                            metricService.record(start, assignment);
                            metricService.record(stop, assignment);
                            metricService.record(start, assignment);
                            metricService.record(stop, assignment);
                            await metricService.recorderPromise;

                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {index: 5, value: 100},
                                {index: 6, value: 100000},
                            ]);

                            done();
                        });
                    });
                    describe('feature constValue', function () {
                        it('should record float metric with constValue 1.2342 and one snapshot', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.constValue = 1.2342;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            metricService.record(recordPoint, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 1.2342,
                                assignment
                            });
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 4,
                                value: 1.2342,
                                assignment
                            });
                            done();
                        });
                        it('should record float metric with constValue -42001.1234 and four snapshots', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.constValue = -42001.1234;
                            def.snapshots = 4;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            metricService.record(recordPoint, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: -42001.1234,
                                assignment
                            });
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            metricService.record(recordPoint, assignment);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                [
                                    {index: 4, value: -42001.1234, assignment},
                                    {index: 5, value: -42001.1234, assignment},
                                    {index: 6, value: -42001.1234, assignment},
                                    {index: 7, value: -42001.1234, assignment},
                                ]);
                            done();
                        });
                    });
                    describe('feature constValueMap', function() {
                        it('should record int metric with constValueMap and sum aggregate', async function(done: DoneFn) {
                            let def = getIntMetricDef();
                            const rp1 = def.recordPoints[0];
                            const rp2 = def.recordPoints[1];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            delete def.constValue;
                            def.constValueMap = {};
                            def.constValueMap[rp1] = 1;
                            def.constValueMap[rp2] = 0;
                            def.agg = {
                                operation: 'sum',
                                time: 'all'
                            };
                            metricService.register(def);

                            metricService.record(rp2, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 0,
                                assignment
                            });
                            metricService.record(rp2, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 0,
                                assignment
                            });
                            metricService.record(rp1, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 1,
                                assignment
                            });
                            metricService.record(rp1, assignment);
                            metricService.record(rp1, assignment);
                            metricService.record(rp1, assignment);
                            metricService.record(rp1, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 5,
                                assignment
                            });
                            metricService.record(rp2, assignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {
                                index: 0,
                                value: 5,
                                assignment
                            });
                            done();
                        });
                    })
                    describe('feature timestamp', function () {
                        function getTimestampTestSpec(timeAcc: TimeAccuracy, wrapAroundUnit: number, startAt?: number) {
                            return async function (done: DoneFn) {
                                let def = getFloatMetricDef();
                                delete def.agg;
                                def.timestamp = timeAcc;
                                def.snapshots = 'inf';
                                metricService.register(def);
                                const recordPoint = def.recordPoints[0];
                                const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                                startAt = startAt || 0;


                                const timestamps = [
                                    startAt,
                                    startAt + SECOND,
                                    startAt + 2.6 * SECOND,
                                    startAt + 59 * SECOND,
                                    startAt + wrapAroundUnit - HOUR,
                                    startAt + wrapAroundUnit - MINUTE,
                                    startAt + wrapAroundUnit - SECOND,
                                    startAt + wrapAroundUnit - 1,
                                    startAt + wrapAroundUnit, // 8: next wrapAround
                                    startAt + wrapAroundUnit + wrapAroundUnit / 2,
                                    startAt + 2 * wrapAroundUnit, // 10: next wrapAround
                                    startAt + 3 * wrapAroundUnit, // 11: next wrapAround
                                    startAt + 3 * wrapAroundUnit + wrapAroundUnit - 1
                                ];
                                let values = [
                                    1.23,
                                    2.23,
                                    3.14,
                                    5.15,
                                    6.77,
                                    7.88,
                                    9.12345,
                                    1.2,
                                    3.999,
                                    999,
                                    1123,
                                    1337,
                                    42];
                                for (let i = 0; i < values.length; ++i) {
                                    jasmine.clock().mockDate(new Date(timestamps[i]));
                                    metricService.recordValue(recordPoint, assignment, values[i]);
                                    await metricService.recorderPromise;
                                }
                                expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                    {value: values[0], startOfMeasurement: startAt},
                                    {value: values[1], startOfMeasurement: startAt},
                                    {value: values[2], startOfMeasurement: startAt},
                                    {value: values[3], startOfMeasurement: startAt},
                                    {value: values[4], startOfMeasurement: startAt},
                                    {value: values[5], startOfMeasurement: startAt},
                                    {value: values[6], startOfMeasurement: startAt},
                                    {value: values[7], startOfMeasurement: startAt},
                                    {value: values[8], startOfMeasurement: startAt + wrapAroundUnit},
                                    {value: values[9], startOfMeasurement: startAt + wrapAroundUnit},
                                    {value: values[10], startOfMeasurement: startAt + 2 * wrapAroundUnit},
                                    {value: values[11], startOfMeasurement: startAt + 3 * wrapAroundUnit},
                                    {value: values[12], startOfMeasurement: startAt + 3 * wrapAroundUnit},
                                ]);
                                done();
                            }
                        }

                        it('should record float metric with timestamp "hour" and single snapshot', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            delete def.agg;
                            def.timestamp = 'hour';
                            def.snapshots = 1;
                            metricService.register(def);
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            const second = 1000;
                            const minute = second * 60;
                            const hour = minute * 60;

                            const timestamps = [
                                0,
                                second,
                                2.6 * second,
                                59 * second,
                                29 * minute + 31 * second,
                                30 * minute,
                                31 * minute,
                                59 * minute + 59 * second + 999,
                                hour, // 8: next hour
                                hour + 30 * minute,
                                2 * hour, // 10: next hour
                                3 * hour, // 11: next hour
                                3 * hour + 999
                            ];
                            let values = [
                                1.23,
                                2.23,
                                3.14,
                                5.15,
                                6.77,
                                7.88,
                                9.12345,
                                1.2,
                                3.999,
                                999,
                                1123,
                                1337,
                                42];
                            let expectedTimestamps = [0, 0, 0, 0, 0, 0, 0, 0, hour, hour, 2 * hour, 3 * hour, 3 * hour];
                            for (let i = 0; i < values.length; ++i) {
                                jasmine.clock().mockDate(new Date(timestamps[i]));
                                metricService.recordValue(recordPoint, assignment, values[i]);
                                await metricService.recorderPromise;
                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                    {value: values[i], startOfMeasurement: expectedTimestamps[i]});
                            }
                            done();
                        });
                        it('should record float metric with timestamp "hour" and unlimited snapshots', getTimestampTestSpec('hour', HOUR));
                        it('should record float metric with timestamp "1/4day" and unlimited snapshots', getTimestampTestSpec('1/4day', QUARTER_DAY));
                        it('should record float metric with timestamp "day" and unlimited snapshots', getTimestampTestSpec('day', DAY));
                        it('should record float metric with timestamp "week" and unlimited snapshots', getTimestampTestSpec('week', WEEK, FIRST_MONDAY_TIMESTAMP));
                    });
                    describe('feature recordPoints', function () {
                        it('should record float metric with single record point', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            delete def.agg;
                            def.snapshots = 2;
                            def.recordPoints = ['mySingleRecordPoint'];
                            const assignment: RecordPointAssignment = {workflowId: 'singleRPTest'};
                            metricService.register(def);

                            metricService.recordValue(def.recordPoints[0], assignment, 778);
                            metricService.recordValue(def.recordPoints[0], assignment, 1234);
                            metricService.recordValue(def.recordPoints[0], assignment, 3.1415);
                            metricService.recordValue('anotherRecordPoint', assignment, 3.321);
                            metricService.recordValue(def.recordPoints[0], assignment, 1.783);
                            metricService.recordValue(def.recordPoints[0] + '2', assignment, 1.337);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {value: 3.1415, assignment},
                                {value: 1.783, assignment}
                            ]);
                            done();
                        });
                        it('should record float metric with multiple record points', async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            delete def.agg;
                            def.snapshots = 2;
                            def.recordPoints = ['myRecordPointNumberOne', 'myRecordPoint#2'];
                            const assignment: RecordPointAssignment = {workflowId: 'singleRPTest'};
                            metricService.register(def);

                            metricService.recordValue(def.recordPoints[0], assignment, 778);
                            metricService.recordValue(def.recordPoints[1], assignment, 1234);
                            metricService.recordValue(def.recordPoints[1], assignment, 3.1415);
                            metricService.recordValue('anotherRecordPoint', assignment, 3.321);
                            metricService.recordValue(def.recordPoints[0], assignment, 1.783);
                            metricService.recordValue(def.recordPoints[1] + '2', assignment, 1.337);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment), [
                                {value: 3.1415, assignment},
                                {value: 1.783, assignment}
                            ]);
                            done();
                        });
                    });
                });
                describe('aggregate metrics', function () {
                    function getAggregateFloatTestSpec(aggregateOperation: AggregateFunction, values: number[], expectedAggregates: number[]) {
                        return async function (done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.agg = {
                                time: 'all',
                                operation: aggregateOperation
                            };
                            def.snapshots = 1;
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            since("Test specification is inconsistent. Length of values/expectedValues is not equal: #{expected} != #{actual}").expect(values.length).toEqual(expectedAggregates.length);

                            for (let i = 0; i < values.length; ++i) {
                                metricService.recordValue(recordPoint, assignment, values[i]);
                                await metricService.recorderPromise;
                                const snapshots = await metricsDB.getSnapshots(def.name, assignment);
                                //console.log(snapshots);
                                expectSingleSnapshot(snapshots,
                                    {index: 0, value: expectedAggregates[i]});
                            }
                            done();
                        }
                    }
                    function getAggregateDurationTestSpec(aggregateOperation: AggregateFunction, durations: number[], expectedAggregates: number[]) {
                        return async function (done: DoneFn) {
                            let def = getDurationMetricDef();
                            def.agg = {
                                time: 'all',
                                operation: aggregateOperation
                            };
                            def.snapshots = 1;
                            const recordStart = def.recordStart;
                            const recordStop = def.recordStop;
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                            metricService.register(def);

                            since("Test specification is inconsistent. Length of values/expectedValues is not equal: #{expected} != #{actual}").expect(durations.length).toEqual(expectedAggregates.length);

                            let time = 0;
                            for (let i = 0; i < durations.length; ++i) {
                                let nextTime = time + durations[i];
                                getTimeSpy.and.returnValues(time, nextTime);
                                metricService.record(recordStart, assignment);
                                metricService.record(recordStop, assignment);
                                await metricService.recorderPromise;
                                time = nextTime;
                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                    {index: 0, value: expectedAggregates[i]});
                            }
                            done();
                        }
                    }

                    describe('min aggregate', function () {
                        it('should compute minimum float value with single snapshot', getAggregateFloatTestSpec('min',
                            [
                                Number.POSITIVE_INFINITY,
                                1E99,
                                Number.POSITIVE_INFINITY,
                                1E20,
                                1000,
                                2000,
                                5E5,
                                3000,
                                200,
                                1,
                                5.99,
                                4999.33312,
                                985.321,
                                0,
                                12,
                                0.1234,
                                -1.32,
                                50,
                                -2.0,
                                -2.0001,
                                -30,
                                Number.POSITIVE_INFINITY,
                                Number.NEGATIVE_INFINITY,
                                -9.99999E99,
                                Number.NaN,
                                1
                            ],
                            [
                                Number.POSITIVE_INFINITY,
                                1E99,
                                1E99,
                                1E20,
                                1000,
                                1000,
                                1000,
                                1000,
                                200,
                                1,
                                1,
                                1,
                                1,
                                0,
                                0,
                                0,
                                -1.32,
                                -1.32,
                                -2.0,
                                -2.0001,
                                -30,
                                -30,
                                Number.NEGATIVE_INFINITY,
                                Number.NEGATIVE_INFINITY,
                                Number.NaN,
                                Number.NaN,
                            ]));
                        it('should compute minimum duration with single snapshot', getAggregateDurationTestSpec('min',
                            [
                                20 * WEEK,
                                WEEK,
                                2.5 * WEEK,
                                WEEK,
                                4 * DAY + 2 * HOUR,
                                DAY,
                                DAY / 2,
                                HOUR * 12,
                                HOUR * 11,
                                HOUR * 2.5,
                                MINUTE * 59,
                                SECOND * 30,
                                SECOND,
                                253,
                                50,
                                20,
                                1,
                                44,
                                2,
                                0,
                                1
                            ],
                            [
                                20 * WEEK,
                                WEEK,
                                WEEK,
                                WEEK,
                                4 * DAY + 2 * HOUR,
                                DAY,
                                DAY / 2,
                                DAY / 2,
                                HOUR * 11,
                                HOUR * 2.5,
                                MINUTE * 59,
                                SECOND * 30,
                                SECOND,
                                253,
                                50,
                                20,
                                1,
                                1,
                                1,
                                0,
                                0
                            ]))
                    });
                    describe('max aggregate', function () {
                        it('should compute maximum float value with single snapshot', getAggregateFloatTestSpec('max',
                            [
                                Number.NEGATIVE_INFINITY,
                                -153E9,
                                -200E9,
                                -3500.42,
                                -5000,
                                -5500.42,
                                -1234,
                                -0.53,
                                -0.00001,
                                0,
                                -40,
                                -32,
                                -1E9,
                                50,
                                0,
                                Number.NEGATIVE_INFINITY,
                                0.00001,
                                50.00001,
                                50.0000001,
                                52,
                                1.234E6,
                                1E90,
                                1E99,
                                0,
                                Number.POSITIVE_INFINITY,
                                1E99,
                                Number.NaN,
                                1,
                            ],
                            [
                                Number.NEGATIVE_INFINITY,
                                -153E9,
                                -153E9,
                                -3500.42,
                                -3500.42,
                                -3500.42,
                                -1234,
                                -0.53,
                                -0.00001,
                                0,
                                0,
                                0,
                                0,
                                50,
                                50,
                                50,
                                50,
                                50.00001,
                                50.00001,
                                52,
                                1.234E6,
                                1E90,
                                1E99,
                                1E99,
                                Number.POSITIVE_INFINITY,
                                Number.POSITIVE_INFINITY,
                                Number.NaN,
                                Number.NaN,
                            ]));
                        it('should compute minimum duration with single snapshot', getAggregateDurationTestSpec('max',
                            [
                                1,
                                0,
                                2,
                                44,
                                1,
                                20,
                                50,
                                253,
                                SECOND,
                                SECOND * 30,
                                MINUTE * 59,
                                HOUR * 2.5,
                                HOUR * 11,
                                HOUR * 12,
                                DAY / 2,
                                DAY,
                                4 * DAY + 2 * HOUR,
                                WEEK,
                                2.5 * WEEK,
                                WEEK,
                                20 * WEEK,
                                1
                            ],
                            [
                                1,
                                1,
                                2,
                                44,
                                44,
                                44,
                                50,
                                253,
                                SECOND,
                                SECOND * 30,
                                MINUTE * 59,
                                HOUR * 2.5,
                                HOUR * 11,
                                HOUR * 12,
                                HOUR * 12,
                                DAY,
                                4 * DAY + 2 * HOUR,
                                WEEK,
                                2.5 * WEEK,
                                2.5 * WEEK,
                                20 * WEEK,
                                20 * WEEK
                            ]));
                    });
                    describe('sum aggregate', function () {
                        it('should compute sum float with single snapshot', getAggregateFloatTestSpec('sum',
                            [
                                0,
                                0,
                                1,
                                -1,
                                2,
                                -5,
                                20,
                                3.014,
                                1E9,
                                -1E9,
                                0.0001,
                                1,
                                2,
                                -0.014100058174133,
                                3,
                                1,
                                1,
                                5000,
                                50000,
                                42,
                                0,
                                0,
                                Number.POSITIVE_INFINITY,
                                1,
                                Number.NEGATIVE_INFINITY
                            ],
                            [
                                0,
                                0,
                                1,
                                0,
                                2,
                                -3,
                                17,
                                20.014,
                                1000000020.014,
                                20.014000058174133,
                                20.014100058174133,
                                21.014100058174133,
                                23.014100058174133,
                                23,
                                26,
                                27,
                                28,
                                5028,
                                55028,
                                55070,
                                55070,
                                55070,
                                Number.POSITIVE_INFINITY,
                                Number.POSITIVE_INFINITY,
                                Number.NaN
                            ]));
                        it('should compute sum duration with single snapshot', getAggregateDurationTestSpec('sum',
                            [
                                1,
                                20,
                                43,
                                150,
                                SECOND,
                                786,
                                30 * SECOND,
                                1,
                                999 + 45 * MINUTE + 27 * SECOND,
                                2 * HOUR,
                                4.5 * DAY,
                                10 * WEEK + 42,
                            ],
                            [
                                1,
                                21,
                                64,
                                214,
                                SECOND + 214,
                                2 * SECOND,
                                32 * SECOND,
                                32 * SECOND + 1,
                                46 * MINUTE,
                                2 * HOUR + 46 * MINUTE,
                                4.5 * DAY + 2 * HOUR + 46 * MINUTE,
                                10 * WEEK + 4.5 * DAY + 2 * HOUR + 46 * MINUTE + 42
                            ]));
                    });
                    describe('average aggregate', function () {
                        it('should compute mean float with single snapshot, random values', getAggregateFloatTestSpec('average',
                            [
                                4397.5785659135818,
                                -5125.1953355934465,
                                1533.0290090470537,
                                -1960.8359018654203,
                                -263.72971939095072,
                                30.30346032345934,
                                2718.0152296304864,
                                5273.2726935558239,
                                -428.5361380931659,
                                -3380.5534850368545,
                                -7211.6888640286488,
                                1618.8578418295219,
                                3799.9997798905019,
                                672.00268229045992,
                                -78.515681497534942,
                                4754.3051677882686,
                                5424.8377124795325,
                                -874.17750524522705,
                                -2952.1278865893414,
                                -5674.194468217408
                            ],
                            [
                                4397.5785659135818,
                                -363.80838483993239,
                                268.47074645572962,
                                -288.85591562455784,
                                -283.83067637783643,
                                -231.47498692762045,
                                189.88075829496623,
                                825.30475020257347,
                                685.98909594749125,
                                279.33483784905673,
                                -401.66731686709829,
                                -233.29022030904662,
                                76.962856629380198,
                                119.46570131945732,
                                106.26694246499117,
                                396.76933154769603,
                                692.5380598378041,
                                605.49830622208015,
                                418.25482238990003,
                                113.63235785953461
                            ]));
                        it('should compute mean float with single snapshot, hand-crafted values #1', getAggregateFloatTestSpec('average',
                            [
                                0,
                                1,
                                1,
                                0.00000001,
                                10000,
                                1e8,
                                -2,
                                Number.POSITIVE_INFINITY,
                                Number.NEGATIVE_INFINITY,
                                1,
                                Number.NaN
                            ],
                            [
                                0,
                                0.5,
                                2 / 3.,
                                0.5000000025,
                                2000.400000002,
                                16668333.66666667,
                                14287142.85714286,
                                Number.POSITIVE_INFINITY,
                                Number.NaN,
                                Number.NaN,
                                Number.NaN
                            ]));
                        it('should compute mean float with single snapshot, hand-crafted values #2', getAggregateFloatTestSpec('average',
                            [
                                1,
                                -1,
                                0,
                                2,
                                3,
                                4,
                                -4,
                                -5,
                                99,
                                -100,
                                20000,
                                599999
                            ],
                            [
                                1.0,
                                0.0,
                                0.0,
                                0.5,
                                1.0,
                                1.5,
                                0.7142857142857143,
                                0.0,
                                11.0,
                                -0.10000000000000001,
                                1818.090909090909,
                                51666.5
                            ]));
                        it('should compute mean duration with single snapshot', getAggregateDurationTestSpec('average',
                            [
                                1,
                                1,
                                0,
                                2,
                                3,
                                4,
                                4,
                                5,
                                99,
                                100,
                                20000,
                                599999,
                                999999999,
                                2,
                                25,
                                1300
                            ],
                            [
                                1.0,
                                1.0,
                                0.66666666666666663,
                                1.0,
                                1.3999999999999999,
                                1.8333333333333333,
                                2.1428571428571428,
                                2.5,
                                13.222222222222221,
                                21.899999999999999,
                                1838.090909090909,
                                51684.833333333336,
                                76970785.923076928,
                                71472872.785714284,
                                66708016.266666666,
                                62538846.5
                            ]))
                    });
                    describe('variance aggregate', function () {
                        // this is population variance (maximum likelihood estimate, numpy.var(..., ddof=0))
                        it('should compute variance float with single snapshot, random values',
                            getAggregateFloatTestSpec('variance',
                                [
                                    0,
                                    1,
                                    1,
                                    0.00000001,
                                    10000,
                                    1e8,
                                    -2,
                                    Number.POSITIVE_INFINITY,
                                    Number.NEGATIVE_INFINITY,
                                    1,
                                    Number.NaN
                                ],
                                [
                                    0,
                                    0.25,
                                    0.22222222222222224,
                                    0.24999999750000002,
                                    15998400.239991998,
                                    1388833336110000.0,
                                    1224448991836735.5,
                                    Number.NaN,
                                    Number.NaN,
                                    Number.NaN,
                                    Number.NaN
                                ])
                        );
                        it('should compute variance float with single snapshot, hand-crafted values',
                            getAggregateFloatTestSpec('variance',
                                [
                                    858.14079135,
                                    1050.68103687,
                                    775.35038167,
                                    1182.11698004,
                                    -827.98416008,
                                    -176.19526079,
                                    2922.98597455,
                                    1691.71178495,
                                    1522.11783025,
                                    -1279.80444432,
                                    -589.18781452,
                                    -768.42563539,
                                    116.5443183,
                                    -1200.44009379,
                                    -628.94873083,
                                    677.67116981,
                                    -1211.00954009,
                                    80.74644794,
                                    -498.2453044,
                                    66.83825017],
                                [0.0,
                                    9267.93653622548,
                                    13303.663085860606,
                                    25464.250707333267,
                                    535640.6612665497,
                                    531704.8075747531,
                                    1188329.5767174962,
                                    1121676.498187907,
                                    1031137.2423469538,
                                    1395750.267350919,
                                    1421970.7351147877,
                                    1456767.2982365564,
                                    1356853.8015539933,
                                    1451337.9609447555,
                                    1417543.3353522387,
                                    1336871.543452184,
                                    1390198.4882572927,
                                    1314330.8973328902,
                                    1271825.9016909893,
                                    1209010.2241654901,
                                ])
                        );
                    });
                    describe('feature agg.time', function () {
                        function getAggTimeTestSpec(timeAcc: TimeAccuracy, wrapAroundUnit: number, startAt?: number) {
                            return async function (done: DoneFn) {
                                let def = getFloatMetricDef();
                                def.snapshots = 1;
                                def.agg = {
                                    operation: "sum",
                                    time: timeAcc,
                                };
                                startAt = startAt || 0;
                                const recordPoint = def.recordPoints[0];
                                const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                                metricService.register(def);

                                const timestamps: number[] = [
                                    startAt,
                                    startAt + SECOND,
                                    startAt + 2.6 * SECOND,
                                    startAt + 59 * SECOND,
                                    startAt + wrapAroundUnit - HOUR,
                                    startAt + wrapAroundUnit - MINUTE,
                                    startAt + wrapAroundUnit - SECOND,
                                    startAt + wrapAroundUnit - 1,

                                    startAt + wrapAroundUnit, // 8: next wrapAround
                                    startAt + wrapAroundUnit + wrapAroundUnit / 2,

                                    startAt + 2 * wrapAroundUnit, // 10: next wrapAround

                                    startAt + 3 * wrapAroundUnit, // 11: next wrapAround
                                    startAt + 3 * wrapAroundUnit + wrapAroundUnit - 1
                                ];
                                const values = [
                                    10,
                                    3,
                                    7.1234,
                                    1,
                                    4,
                                    -34,
                                    42,
                                    22,

                                    100,
                                    250,

                                    999,

                                    388219,
                                    123.3,
                                ];
                                const expectedValues = [
                                    10,
                                    13,
                                    20.1234,
                                    21.1234,
                                    25.1234,
                                    -8.8766,
                                    33.123400000000004,
                                    55.123400000000004,

                                    100,
                                    350,

                                    999,

                                    388219,
                                    388342.3
                                ];
                                since("Expected test specification to be consistent.").expect(timestamps.length === values.length
                                    && values.length === expectedValues.length).toBe(true);

                                for (let i = 0; i < values.length; ++i) {
                                    jasmine.clock().mockDate(new Date(timestamps[i]));
                                    metricService.recordValue(recordPoint, assignment, values[i]);
                                    await metricService.recorderPromise;

                                    expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                        {value: expectedValues[i]});
                                }
                                done();
                            }
                        }

                        it('should aggregate into same snapshot only while in the same hour', getAggTimeTestSpec('hour', HOUR));
                        it('should aggregate into same snapshot only while in the same 1/4day', getAggTimeTestSpec('1/4day', QUARTER_DAY));
                        it('should aggregate into same snapshot only while in the same day', getAggTimeTestSpec('day', DAY));
                        it('should aggregate into same snapshot only while in the same week', getAggTimeTestSpec('week', WEEK, FIRST_MONDAY_TIMESTAMP));
                    });
                    describe('feature snapshots', function () {
                        function getAggTimeTwoSnapshotsSpec(timeAcc: TimeAccuracy, wrapAroundUnit: number, startAt = 0) {
                            return async function (done: DoneFn) {
                                let def = getFloatMetricDef();
                                def.agg = {
                                    time: timeAcc,
                                    operation: 'sum',
                                };
                                def.snapshots = 2;
                                const recordPoint = def.recordPoints[0];
                                const assignment: RecordPointAssignment = {workflowId: 'myUniqueWorkflowId'};
                                metricService.register(def);

                                const timestamps = [
                                    startAt,
                                    startAt + SECOND,
                                    startAt + 2.6 * SECOND,
                                    startAt + 59 * SECOND,
                                    startAt + wrapAroundUnit - HOUR,
                                    startAt + wrapAroundUnit - MINUTE,
                                    startAt + wrapAroundUnit - SECOND,
                                    startAt + wrapAroundUnit - 1,

                                    startAt + wrapAroundUnit, // 8: next wrapAround
                                    startAt + wrapAroundUnit + wrapAroundUnit / 2,

                                    startAt + 2 * wrapAroundUnit, // 10: next wrapAround

                                    startAt + 3 * wrapAroundUnit, // 11: next wrapAround
                                    startAt + 3 * wrapAroundUnit + wrapAroundUnit - 1
                                ];
                                const values = [
                                    10,
                                    5,
                                    2,
                                    1,
                                    7,
                                    8,
                                    3,
                                    4,

                                    100,
                                    200,

                                    1000,

                                    5000,
                                    9999,
                                ];
                                const expectedSnapshots: Partial<MetricSnapshotWithAssignment>[][] = [
                                    [{index: 0, value: 10}],
                                    [{index: 0, value: 15}],
                                    [{index: 0, value: 17}],
                                    [{index: 0, value: 18}],
                                    [{index: 0, value: 25}],
                                    [{index: 0, value: 33}],
                                    [{index: 0, value: 36}],
                                    [{index: 0, value: 40}],

                                    [{index: 0, value: 40}, {index: 1, value: 100}],
                                    [{index: 0, value: 40}, {index: 1, value: 300}],

                                    [{index: 1, value: 300}, {index: 2, value: 1000}],

                                    [{index: 2, value: 1000}, {index: 3, value: 5000}],
                                    [{index: 2, value: 1000}, {index: 3, value: 14999}],
                                ];

                                since("Expected test specification to be consistent.").expect(timestamps.length === values.length
                                    && values.length === expectedSnapshots.length).toBe(true);

                                for (let i = 0; i < values.length; ++i) {
                                    jasmine.clock().mockDate(new Date(timestamps[i]));
                                    metricService.recordValue(recordPoint, assignment, values[i]);
                                    await metricService.recorderPromise;

                                    expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                        expectedSnapshots[i]);
                                }

                                done();
                            }
                        }

                        function getAggTimeInfSnapshotsSpec(timeAcc: TimeAccuracy, wrapAroundUnit: number, startAt = 0) {
                            return async function (done: DoneFn) {
                                let def = getFloatMetricDef();
                                def.agg = {
                                    time: timeAcc,
                                    operation: 'sum',
                                };
                                def.snapshots = 'inf';
                                const recordPoint = def.recordPoints[0];
                                const assignment: RecordPointAssignment = {workflowId: 'myUniqueWorkflowId'};
                                metricService.register(def);

                                const timestamps = [
                                    startAt,
                                    startAt + SECOND,
                                    startAt + 2.6 * SECOND,
                                    startAt + 59 * SECOND,
                                    startAt + wrapAroundUnit - HOUR,
                                    startAt + wrapAroundUnit - MINUTE,
                                    startAt + wrapAroundUnit - SECOND,
                                    startAt + wrapAroundUnit - 1,

                                    startAt + wrapAroundUnit, // 8: next wrapAround
                                    startAt + wrapAroundUnit + wrapAroundUnit / 2,

                                    startAt + 2 * wrapAroundUnit, // 10: next wrapAround

                                    startAt + 3 * wrapAroundUnit, // 11: next wrapAround
                                    startAt + 3 * wrapAroundUnit + wrapAroundUnit - 1
                                ];
                                const values = [
                                    10,
                                    5,
                                    2,
                                    1,
                                    7,
                                    8,
                                    3,
                                    4,

                                    100,
                                    200,

                                    1000,

                                    5000,
                                    9999,
                                ];
                                const expectedSnapshots: Partial<MetricSnapshotWithAssignment>[][] = [
                                    [{index: 0, value: 10}],
                                    [{index: 0, value: 15}],
                                    [{index: 0, value: 17}],
                                    [{index: 0, value: 18}],
                                    [{index: 0, value: 25}],
                                    [{index: 0, value: 33}],
                                    [{index: 0, value: 36}],
                                    [{index: 0, value: 40}],

                                    [{index: 0, value: 40}, {index: 1, value: 100}],
                                    [{index: 0, value: 40}, {index: 1, value: 300}],

                                    [{index: 0, value: 40}, {index: 1, value: 300}, {index: 2, value: 1000}],

                                    [{index: 0, value: 40}, {index: 1, value: 300}, {index: 2, value: 1000}, {
                                        index: 3,
                                        value: 5000
                                    }],
                                    [{index: 0, value: 40}, {index: 1, value: 300}, {index: 2, value: 1000}, {
                                        index: 3,
                                        value: 14999
                                    }],
                                ];

                                since("Expected test specification to be consistent.").expect(timestamps.length === values.length
                                    && values.length === expectedSnapshots.length).toBe(true);

                                for (let i = 0; i < values.length; ++i) {
                                    jasmine.clock().mockDate(new Date(timestamps[i]));
                                    metricService.recordValue(recordPoint, assignment, values[i]);
                                    await metricService.recorderPromise;

                                    expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                        expectedSnapshots[i]);
                                }

                                done();
                            }
                        }

                        it('should keep 2 snapshots with separate aggregate values, hourly snapshots', getAggTimeTwoSnapshotsSpec('hour', HOUR));
                        it('should keep 2 snapshots with separate aggregate values, 1/4day snapshots', getAggTimeTwoSnapshotsSpec('1/4day', QUARTER_DAY));
                        it('should keep 2 snapshots with separate aggregate values, day snapshots', getAggTimeTwoSnapshotsSpec('day', DAY));
                        it('should keep 2 snapshots with separate aggregate values, week snapshots', getAggTimeTwoSnapshotsSpec('week', WEEK, FIRST_MONDAY_TIMESTAMP));

                        it('should keep all snapshots with separate aggregate values, hourly snapshots', getAggTimeInfSnapshotsSpec('hour', HOUR));
                        it('should keep all snapshots with separate aggregate values, 1/4day snapshots', getAggTimeInfSnapshotsSpec('1/4day', QUARTER_DAY));
                        it('should keep all snapshots with separate aggregate values, day snapshots', getAggTimeInfSnapshotsSpec('day', DAY));
                        it('should keep all snapshots with separate aggregate values, week snapshots', getAggTimeInfSnapshotsSpec('week', WEEK, FIRST_MONDAY_TIMESTAMP));
                    });
                    describe('feature agg.accuracy', function () {
                        it('should round sum aggregate of float metric', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.499;
                            def.agg = {
                                operation: "sum",
                                time: "all",
                                accuracy: 0.676
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [-0.32106202480403334, -0.34296068210861158, -0.85597467681643957, -0.88290106584245265];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: -3.3800000000000003});
                            done();
                        });
                        it('should round variance aggregate of float metric', async function(done: DoneFn) {
                            // this is for population variance
                            let def = getFloatMetricDef();
                            def.accuracy = 0.185;
                            def.agg = {
                                operation: "variance",
                                time: "all",
                                accuracy: 0.182
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [1.0138509977910144, -0.96447687480992184, -0.73332736671498777, -0.92298013798305123];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: 0.546});
                            done();
                        });
                        it('should round min aggregate of float metric', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.129;
                            def.agg = {
                                operation: "min",
                                time: "all",
                                accuracy: 0.377
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [0.61741436990330301, -0.57792251521771376, -0.078691853042994794, -0.3271118927404113];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: -0.754});
                            done();
                        });
                        it('should round max aggregate of float metric', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.121;
                            def.agg = {
                                operation: "max",
                                time: "all",
                                accuracy: 0.027
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [-0.28727326977816997, 0.78466330425165032, -0.15111791943098757, 1.5056642453911018];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: 1.431});
                            done();
                        });
                        it('should round mean aggregate of float metric', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.186;
                            def.agg = {
                                operation: "average",
                                time: "all",
                                accuracy: 0.104
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [2.5100772124579183, 1.5084149120236543, 1.2661924029970963, 1.2399161949117903];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: 1.456});
                            done();
                        });

                        it('should do aggregate rounding (min) only on result, not intermediate values', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.156;
                            def.agg = {
                                operation: "min",
                                time: "all",
                                accuracy: 0.877
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [-0.35314443632388598, -0.45887930635340995, -1.7478081742880154, 0.35933422510576168];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: -2.6310000000000002});
                            done();
                        });
                        it('should do aggregate rounding (max) only on result, not intermediate values', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.001;
                            def.agg = {
                                operation: "max",
                                time: "all",
                                accuracy: 0.373
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [-1.1496395561524275, 2.6967271896802139, -2.1101987633765327, -0.21654751247361909];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: 2.6109999999999998});
                            done();
                        });
                        it('should do aggregate rounding (sum) only on result, not intermediate values', async function(done: DoneFn) {
                            let def = getFloatMetricDef();
                            def.accuracy = 0.001;
                            def.agg = {
                                operation: "sum",
                                time: "all",
                                accuracy: 0.433
                            };
                            const recordPoint = def.recordPoints[0];
                            const assignment: RecordPointAssignment = {workflowId: 'myWorkflowId'};
                            metricService.register(def);

                            let values = [-0.099386150413682095, -1.9261750049017896, -1.9018048768760576, 0.0027027069134454374];
                            for (let value of values) {
                                metricService.recordValue(recordPoint, assignment, value);
                            }
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment), {index: 0, value: -4.33});
                            done();
                        })
                    });
                    describe('feature agg.durationAccuracy', function () {
                        function getAggDurationAccuracyTestSpec(durationAccuracy: DurationAccuracyValue,
                                                             aggOperation: AggregateFunction,
                                                             aggDurationAccuracy: DurationAccuracyValue,
                                                             durations: number[], expectedDurations: number[]) {
                            return async function (done: DoneFn) {
                                let def = getDurationMetricDef();
                                def.agg = {
                                    time: "all",
                                    operation: aggOperation,
                                    durationAccuracy: aggDurationAccuracy
                                };
                                def.snapshots = 1;
                                def.durationAccuracy = durationAccuracy;
                                const recordStart = def.recordStart;
                                const recordStop = def.recordStop;
                                const assignment: RecordPointAssignment = {workflowId: 'myWorkflow'};
                                metricService.register(def);

                                since("Test specification is inconsistent. Length of values/expectedValues is not equal: #{expected} != #{actual}")
                                    .expect(durations.length).toEqual(expectedDurations.length);

                                let time = 0;
                                for (let i = 0; i < durations.length; ++i) {
                                    let nextTime = time + durations[i];
                                    getTimeSpy.and.returnValues(time, nextTime);
                                    metricService.record(recordStart, assignment);
                                    metricService.record(recordStop, assignment);
                                    await metricService.recorderPromise;
                                    time = nextTime;
                                    expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                        {index: 0, value: expectedDurations[i]});
                                }
                                done();
                            }
                        }
                        function getSumAggDurationAccuracySameUnitTestSpec(unit: DurationAccuracy, unitBase: number,) {
                            return getAggDurationAccuracyTestSpec(
                                [1, unit],
                                "sum",
                                [2, unit],
                                [
                                    1.234 * unitBase,
                                    2.345 * unitBase,
                                    1.1 * unitBase,
                                    3.125 * unitBase,
                                    1.1 * unitBase,
                                    7 * unitBase,
                                ],
                                [
                                    0,              // before agg trimming: 1
                                    2 * unitBase,   // before agg trimming: 3
                                    4 * unitBase,   // before agg trimming: 4
                                    6 * unitBase,   // before agg trimming: 7
                                    8 * unitBase,   // before agg trimming: 8
                                    14 * unitBase,  // before agg trimming: 15
                                ]
                            );
                        }
                        it('should round sum aggregate of duration metric with second accuracy',
                            getSumAggDurationAccuracySameUnitTestSpec("s", SECOND));
                        it('should round sum aggregate of duration metric with minute accuracy',
                            getSumAggDurationAccuracySameUnitTestSpec("m", MINUTE));
                        it('should round sum aggregate of duration metric with hour accuracy',
                            getSumAggDurationAccuracySameUnitTestSpec("h", HOUR));
                        it('should round sum aggregate of duration metric with day accuracy',
                            getSumAggDurationAccuracySameUnitTestSpec("d", DAY));
                    });
                });
                describe('meta metrics', function() {
                    function getMetaCopyLastNValuesTestSpec(last_n: number,
                                                            baseDef: MetricDefinition,
                                                            values: RecordValue[],
                                                            numberOfMetaRecordings: number,
                                                            expectedMetaValues: RecordValue[],
                                                            recordFunc: (values: RecordValue[],
                                                                         assignment: RecordPointAssignment,
                                                                         metaDef: MetaMetricDefinition) => Promise<void>) {
                        return async function (done: DoneFn) {
                            let def = getMetaMetricDef(baseDef.name);
                            def.name = 'LastNValues';
                            def.snapshots = last_n;
                            delete def.agg;
                            metricService.register(baseDef);
                            metricService.register(def);

                            const assignment: RecordPointAssignment = {
                                workflowId: 'myWorkflow',
                            };
                            await recordFunc(values, assignment, def);
                            await metricService.recorderPromise;

                            let expectedSnapshots: Partial<MetricSnapshotWithAssignment>[] = [];
                            let snapshotIndex = Math.max(0, numberOfMetaRecordings - last_n);
                            for (let i = 0; i < expectedMetaValues.length; ++i) {
                                expectedSnapshots.push({
                                    index: snapshotIndex++,
                                    value: expectedMetaValues[i],
                                    assignment: assignment
                                });
                            }

                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),
                                expectedSnapshots);
                            done();
                        }
                    }

                    function getMetaCopyLastNValuesNumberMetricTestSpec(last_n: number,
                                                                        baseDef: NumberMetricDefinition,
                                                                        values: RecordValue[],
                                                                        expectedMetaValues: RecordValue[]) {
                        async function recordValues(values: RecordValue[],
                                                    assignment: RecordPointAssignment,
                                                    def: MetaMetricDefinition) {
                            for (let i = 0; i < values.length; ++i) {
                                metricService.recordValue(baseDef.recordPoints[0], assignment, values[i]);
                                metricService.record(def.recordPoints[0], assignment);
                            }
                        }

                        return getMetaCopyLastNValuesTestSpec(last_n, baseDef, values, values.length, expectedMetaValues, recordValues);
                    }

                    function getMetaCopyLastNValuesDurationMetricTestSpec(last_n: number,
                                                                          baseDef: DurationMetricDefinition,
                                                                          values: RecordValue[],
                                                                          expectedMetaValues: RecordValue[]) {
                        async function recordValues(values: RecordValue[],
                                                    assignment: RecordPointAssignment,
                                                    def: MetaMetricDefinition) {
                            let time = 0;
                            for (let i = 0; i < values.length; ++i) {
                                getTimeSpy.and.returnValue(time);
                                metricService.record(baseDef.recordStart, assignment);
                                await metricService.recorderPromise;
                                time += values[i];
                                getTimeSpy.and.returnValue(time);
                                metricService.record(baseDef.recordStop, assignment);
                                await metricService.recorderPromise;
                                metricService.record(def.recordPoints[0], assignment);
                            }
                        }

                        return getMetaCopyLastNValuesTestSpec(last_n, baseDef, values, values.length, expectedMetaValues, recordValues);
                    }

                    function getMetaCopyLastNValuesMetaMetricTestSpec(last_n: number,
                                                                      values: RecordValue[],
                                                                      expectedMetaValues: RecordValue[]) {
                        let rootDef = getFloatMetricDef();
                        rootDef.snapshots = 2;
                        metricService.register(rootDef);
                        let levelOneDef = getMetaMetricDef(rootDef.name);
                        levelOneDef.recordPoints = ['levelOnePoint'];
                        levelOneDef.name = 'levelOneMeta';
                        levelOneDef.agg = {
                            time: 'all',
                            operation: 'sum'
                        };

                        async function recordValues(values: RecordValue[],
                                                    assignment: RecordPointAssignment,
                                                    def: MetaMetricDefinition) {
                            for (let i = 0; i < values.length; ++i) {
                                metricService.recordValue(rootDef.recordPoints[0], assignment, values[i]);
                                if (i % 2 == 1) {
                                    metricService.record(levelOneDef.recordPoints[0], assignment);
                                    metricService.record(def.recordPoints[0], assignment);
                                }
                            }
                        }

                        return getMetaCopyLastNValuesTestSpec(last_n, levelOneDef, values, Math.floor(values.length / 2), expectedMetaValues, recordValues);
                    }
                    describe('with raw metric', function() {
                        it('should copy value from float metric', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.snapshots = 1;
                            getMetaCopyLastNValuesNumberMetricTestSpec(3, baseDef,
                                [1000.1, 2000.2, 3000.3, 4000.4],
                                [2000.2, 3000.3, 4000.4]
                            )(done);
                        });
                        it('should copy value from int metric', async function(done: DoneFn) {
                            let baseDef = getIntMetricDef();
                            baseDef.snapshots = 2;
                            delete baseDef.agg;
                            getMetaCopyLastNValuesNumberMetricTestSpec(4, baseDef,
                                [1000, 2000, 30, 41, -4300, 27],
                                [30, 41, -4300, 27]
                            )(done);
                        });
                        it('should copy value from duration metric', async function(done: DoneFn) {
                            let baseDef = getDurationMetricDef();
                            baseDef.snapshots = 3;
                            delete baseDef.agg;

                            getMetaCopyLastNValuesDurationMetricTestSpec(2, baseDef,
                                [1001, 256, 127],
                                [256, 127]
                            )(done);
                        });
                    });
                    describe('with meta metric (meta-meta)', function() {
                        it('should copy value from meta metric', async function(done: DoneFn) {
                            getMetaCopyLastNValuesMetaMetricTestSpec(3,
                                [2, 4, 8, 16, 32, 64],
                                [
                                    6, // 2 + 4
                                    24, // 8 + 16
                                    96  // 32 + 64
                                ])(done);
                        });
                    });
                    // TODO: Currently meta metrics do not have the accuracy field. Do we need it?
                    describe('feature agg', function() {
                        it('should aggregate raw snapshots from float metric', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.snapshots = 3;
                            let def = getMetaMetricDef(baseDef.name);
                            def.snapshots = 1;
                            metricService.register(baseDef);
                            metricService.register(def);

                            const assignment: RecordPointAssignment = {workflowId: 'myUniqueWorkflow'};
                            metricService.recordValue(baseDef.recordPoints[0], assignment, 10.33);
                            metricService.recordValue(baseDef.recordPoints[0], assignment, 2.12);
                            metricService.recordValue(baseDef.recordPoints[0], assignment, 4.50);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(baseDef.name, assignment),
                                [{value: 10.33}, {value: 2.12}, {value: 4.50}]);
                            expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, assignment),[]);
                            metricService.record(def.recordPoints[0], assignment);
                            await metricService.recorderPromise;
                            expectMultipleSnapshots(await metricsDB.getSnapshots(baseDef.name, assignment),
                                [{value: 10.33}, {value: 2.12}, {value: 4.50}]);
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, assignment),
                                {index: 0, assignment: assignment, value: 5.6499999999999995});
                            done();
                        });
                        it('should aggregate aggregated values in snapshots from float metric again', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.snapshots = 3;
                            baseDef.agg = {
                                time: 'hour',
                                operation: 'average'
                            };
                            let def = getMetaMetricDef(baseDef.name);
                            def.snapshots = 3;
                            def.agg = {
                                time: 'day',
                                operation: 'average',
                            };
                            metricService.register(baseDef);
                            metricService.register(def);
                            const assignment = {
                                workflowId: 'myWorkflow1',
                                executionId: 123
                            };
                            //Date, measurementValue, recordMeta?
                            let measurements: [Date, number, boolean][] = [
                                //avg: 9.725
                                [new Date(Date.UTC(2019, 1, 2, 3, 4, 20, 123)), 12.34, false],
                                [new Date(Date.UTC(2019, 1, 2, 3, 6, 37, 632)), 7.11, true],

                                //avg: 23.07378
                                [new Date(Date.UTC(2019, 1, 2, 4, 50, 12)), 1.667, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 51, 14)), 9.5499, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 52, 30, 774)), 47.182, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 53, 20, 123)), 99.1, true],
                                [new Date(Date.UTC(2019, 1, 2, 4, 59, 9, 443)), -42.13, true],

                                //avg: 82.342
                                [new Date(Date.UTC(2019, 1, 2, 10, 44, 20, 123)), 82.342, true],

                                //avg: 59.27
                                [new Date(Date.UTC(2019, 2, 28, 23, 0, 11, 1)), 59.27, true],
                            ];
                            for (let measurement of measurements) {
                                const date = measurement[0];
                                const value = measurement[1];
                                jasmine.clock().mockDate(date);
                                metricService.recordValue(baseDef.recordPoints[0], assignment, value);
                                if (measurement[2]) {
                                    metricService.record(def.recordPoints[0], assignment);
                                }
                                await metricService.recorderPromise;
                            }
                            const expectedAssignment = {workflowId: 'myWorkflow1'};
                            let baseSnapshots = await metricsDB.getSnapshots(baseDef.name, expectedAssignment);
                            expectMultipleSnapshots(baseSnapshots,
                                [{value: 23.07378}, {value: 82.342}, {value: 59.27}]);
                            let metaSnapshots = await metricsDB.getSnapshots(def.name, expectedAssignment);
                            expectMultipleSnapshots(metaSnapshots,
                                [
                                    // snapshots 0, 1, 2
                                    {index: 0, assignment: expectedAssignment, value: 38.38026,
                                        startOfMeasurement: Date.UTC(2019, 1, 2)},
                                    // snapshot 3
                                    {index: 1, assignment: expectedAssignment, value: 59.27,
                                        startOfMeasurement: Date.UTC(2019, 2, 28)},
                                ]);

                            done();
                        });
                        it('should round aggregated snapshots to agg.accuracy', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.snapshots = 3;
                            baseDef.agg = {
                                time: 'hour',
                                operation: 'average'
                            };
                            let def = getMetaMetricDef(baseDef.name);
                            def.snapshots = 3;
                            def.agg = {
                                time: 'day',
                                operation: 'average',
                            };
                            def.agg.accuracy = 1.0;
                            metricService.register(baseDef);
                            metricService.register(def);
                            const assignment = {
                                workflowId: 'myWorkflow1',
                                executionId: 123
                            };
                            //Date, measurementValue, recordMeta?
                            let measurements: [Date, number, boolean][] = [
                                //avg: 9.725
                                [new Date(Date.UTC(2019, 1, 2, 3, 4, 20, 123)), 12.34, false],
                                [new Date(Date.UTC(2019, 1, 2, 3, 6, 37, 632)), 7.11, true],

                                //avg: 23.07378
                                [new Date(Date.UTC(2019, 1, 2, 4, 50, 12)), 1.667, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 51, 14)), 9.5499, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 52, 30, 774)), 47.182, false],
                                [new Date(Date.UTC(2019, 1, 2, 4, 53, 20, 123)), 99.1, true],
                                [new Date(Date.UTC(2019, 1, 2, 4, 59, 9, 443)), -42.13, true],

                                //avg: 82.342
                                [new Date(Date.UTC(2019, 1, 2, 10, 44, 20, 123)), 82.342, true],

                                //avg: 59.27
                                [new Date(Date.UTC(2019, 2, 28, 23, 0, 11, 1)), 59.27, true],
                            ];
                            for (let measurement of measurements) {
                                const date = measurement[0];
                                const value = measurement[1];
                                jasmine.clock().mockDate(date);
                                metricService.recordValue(baseDef.recordPoints[0], assignment, value);
                                if (measurement[2]) {
                                    metricService.record(def.recordPoints[0], assignment);
                                }
                                await metricService.recorderPromise;
                            }
                            const expectedAssignment = {workflowId: 'myWorkflow1'};
                            let baseSnapshots = await metricsDB.getSnapshots(baseDef.name, expectedAssignment);
                            expectMultipleSnapshots(baseSnapshots,
                                [{value: 23.07378}, {value: 82.342}, {value: 59.27}]);
                            let metaSnapshots = await metricsDB.getSnapshots(def.name, expectedAssignment);
                            expectMultipleSnapshots(metaSnapshots,
                                [
                                    // snapshots 0, 1, 2
                                    {index: 0, assignment: expectedAssignment, value: 38,
                                        startOfMeasurement: Date.UTC(2019, 1, 2)},
                                    // snapshot 3
                                    {index: 1, assignment: expectedAssignment, value: 59,
                                        startOfMeasurement: Date.UTC(2019, 2, 28)},
                                ]);

                            done();
                        });
                        it('should compute median based on raw float metric', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.name = "B" + baseDef.name;
                            baseDef.assignment = ['workflow', 'execution'];
                            baseDef.snapshots = 'inf';
                            delete baseDef.agg;
                            let def = getMetaMetricDef(baseDef.name);
                            def.name = "A" + def.name;
                            def.assignment = ['workflow'];
                            def.agg = {
                                time: 'all',
                                operation: 'median'
                            };

                            const givenAssignment1: RecordPointAssignment = {workflowId: 'workflow1', executionId: 1};
                            const givenAssignment2: RecordPointAssignment = {workflowId: 'workflow1', executionId: 2};
                            const givenAssignments = [givenAssignment1, givenAssignment2];
                            const expectedAssignment = {workflowId: givenAssignment1.workflowId};

                            metricService.register(baseDef);
                            metricService.register(def);

                            let rawValues: RecordValue[] = [1.25, 2.30, 1.10, 5.443, 2.18493, -3.333];
                            for (let i = 0; i < rawValues.length; ++i) {
                                const assignment = givenAssignments[i % givenAssignments.length];
                                metricService.recordValue(baseDef.recordPoints[0], assignment, rawValues[i]);
                                metricService.record(def.recordPoints[0], assignment);
                            }
                            await metricService.recorderPromise;

                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, expectedAssignment),
                                {index: 0, assignment: expectedAssignment, value: 1.717465, startOfMeasurement: null});

                            done();
                        });
                        it('should compute median for different executions and several time frames', async function(done: DoneFn) {
                            let baseDef = getFloatMetricDef();
                            baseDef.assignment = ['workflow', 'execution'];
                            baseDef.snapshots = 'inf';
                            baseDef.timestamp = 'hour';
                            delete baseDef.agg;
                            let def = getMetaMetricDef(baseDef.name);
                            def.assignment = ['workflow', 'execution'];
                            def.snapshots = 'inf';
                            def.agg = {
                                time: 'day',
                                operation: 'median'
                            };

                            metricService.register(baseDef);
                            metricService.register(def);

                            let recordings: {assignment: RecordPointAssignment, timestamps: number[], values: RecordValue[]}[] = [
                                {
                                    assignment: {workflowId: 'workflow1', executionId: 1},
                                    timestamps: [0, HOUR, 23 * HOUR],
                                    values: [1.25, 2.30, 1.10]
                                },
                                {
                                    assignment: {workflowId: 'workflow1', executionId: 1},
                                    timestamps: [DAY, DAY + 2 * HOUR, DAY + 23 * HOUR],
                                    values: [5.443, 2.18493, -3.333],
                                },
                                {
                                    assignment: {workflowId: 'workflow1', executionId: 2},
                                    timestamps: [0, HOUR + MINUTE, 4 * HOUR, 10 * HOUR],
                                    values: [7.33, 4.123, 5.44, 6.431]
                                }
                            ];
                            for (let recording of recordings) {
                                since("Expected test specification to be consistent").
                                expect(recording.timestamps.length).toEqual(recording.values.length);
                                for (let i = 0; i < recording.values.length; ++i) {
                                    jasmine.clock().mockDate(new Date(recording.timestamps[i]));
                                    metricService.recordValue(baseDef.recordPoints[0], recording.assignment, recording.values[i]);
                                    metricService.record(def.recordPoints[0], recording.assignment);
                                    await metricService.recorderPromise;
                                }
                            }

                            const snapshots = await metricsDB.getSnapshots(def.name, {workflowId: 'workflow1'});

                            expectMultipleSnapshots(snapshots,
                                [
                                    {value: 1.25},
                                    {value: 2.18493},
                                    {value: 5.9355000000000002}
                                    ]
                            );

                            done();
                        })
                    });
                });
                describe('assignment trimming', function() {
                    function trimAssignmentToOptions(suppliedAssignment: RecordPointAssignment,
                                                     assignment: AssignmentOptions) {
                        let expectedAssignment: RecordPointAssignment = {};
                        for (let assignmentOption of assignment) {
                            const key = assignmentOption + "Id";
                            expectedAssignment[key] = suppliedAssignment[key];
                        }
                        return expectedAssignment;
                    }

                    function getNumberMetricAssignmentTestSpec(baseMetricDef: NumberMetricDefinition,
                                                               assignment: AssignmentOptions,
                                                               recordValue: RecordValue,
                                                               suppliedAssignmentOptions?: AssignmentOptions) {
                        return async function (done: DoneFn) {
                            let def = baseMetricDef;
                            def.assignment = assignment;
                            metricService.register(def);
                            const recordPoint = def.recordPoints[0];
                            const suppliedAssignmentBase: RecordPointAssignment = {
                                scheduleId: 3342,
                                workflowId: 'myWorkflow2',
                                workflowVersionId: 'ReallyLongHashThatDescribesTheWorkflowVersion',
                                executionId: 1234,
                                taskId: 987,
                            };
                            let suppliedAssignment;
                            if (suppliedAssignmentOptions === undefined) {
                                suppliedAssignment = suppliedAssignmentBase;
                            } else {
                                suppliedAssignment = trimAssignmentToOptions(suppliedAssignmentBase, suppliedAssignmentOptions);
                            }
                            metricService.recordValue(recordPoint, suppliedAssignment, recordValue);
                            await metricService.recorderPromise;
                            const expectedAssignment = trimAssignmentToOptions(suppliedAssignment, assignment);
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, expectedAssignment),
                                {index: 0, assignment: expectedAssignment, value: recordValue});
                            done();
                        }
                    }

                    function getDurationMetricAssignmentTestSpec(assignment: AssignmentOptions, suppliedAssignmentOptions?: AssignmentOptions) {
                        return async function (done: DoneFn) {
                            let def = getDurationMetricDef();
                            def.assignment = assignment;
                            metricService.register(def);
                            const suppliedAssignmentBase: RecordPointAssignment = {
                                scheduleId: 3342,
                                workflowId: 'myWorkflow2',
                                workflowVersionId: 'ReallyLongHashNumberTwoThatDescribesVersion',
                                executionId: 1234,
                                taskId: 987,
                            };
                            let suppliedAssignment;
                            if (suppliedAssignmentOptions === undefined) {
                                suppliedAssignment = suppliedAssignmentBase;
                            } else {
                                suppliedAssignment = trimAssignmentToOptions(suppliedAssignmentBase, suppliedAssignmentOptions);
                            }
                            const expectedAssignment = trimAssignmentToOptions(suppliedAssignment, assignment);
                            getTimeSpy.and.returnValue(1234);
                            metricService.record(def.recordStart, suppliedAssignment);
                            await metricService.recorderPromise;
                            getTimeSpy.and.returnValue(5678);
                            metricService.record(def.recordStop, expectedAssignment);
                            await metricService.recorderPromise;
                            expectSingleSnapshot(await metricsDB.getSnapshots(def.name, expectedAssignment),
                                {index: 0, assignment: expectedAssignment, value: 4444});
                            done();
                        }
                    }

                    describe('fully supplied assignment', function () {
                        it('should trim assignment of int metric []', getNumberMetricAssignmentTestSpec(getIntMetricDef(), [], 42));
                        it('should trim assignment of int metric [workflow]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow"], 42));
                        it('should trim assignment of int metric [workflow, execution]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow", "execution"], 42));
                        it('should trim assignment of int metric [workflow, execution, task]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow", "execution", "task"], 42));
                        it('should trim assignment of int metric [task]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["task"], 42));
                        it('should trim assignment of int metric [workflow, task]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow", "task"], 42));
                        it('should trim assignment of int metric [workflow, workflowVersion]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['workflow', 'workflowVersion'], 42.1337));
                        it('should trim assignment of int metric [workflowVersion, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['workflowVersion', 'execution'], 42.1337));
                        it('should trim assignment of int metric [schedule, workflowVersion]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['schedule', 'workflowVersion'], 42.1337));
                        it('should trim assignment of int metric [schedule]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["schedule"], 42));
                        it('should trim assignment of int metric [schedule, workflow]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["schedule", "workflow"], 42));
                        it('should trim assignment of float metric []', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), [], 42.1337));
                        it('should trim assignment of float metric [workflow]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow"], 42.1337));
                        it('should trim assignment of float metric [workflow, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow", "execution"], 42.1337));
                        it('should trim assignment of float metric [workflow, execution, task]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow", "execution", "task"], 42.1337));
                        it('should trim assignment of float metric [task]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["task"], 42.1337));
                        it('should trim assignment of float metric [workflow, task]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow", "task"], 42.1337));
                        it('should trim assignment of float metric [workflow, workflowVersion]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['workflow', 'workflowVersion'], 42.1337));
                        it('should trim assignment of float metric [workflowVersion, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['workflowVersion', 'execution'], 42.1337));
                        it('should trim assignment of float metric [schedule, workflowVersion]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ['schedule', 'workflowVersion'], 42.1337));
                        it('should trim assignment of float metric [schedule]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["schedule"], 42.1337));
                        it('should trim assignment of float metric [schedule, workflow]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["schedule", "workflow"], 42.1337));
                        it('should trim assignment of duration metric []', getDurationMetricAssignmentTestSpec([]));
                        it('should trim assignment of duration metric [workflow]', getDurationMetricAssignmentTestSpec(["workflow"]));
                        it('should trim assignment of duration metric [workflow, execution]', getDurationMetricAssignmentTestSpec(["workflow", "execution"]));
                        it('should trim assignment of duration metric [workflow, execution, task]', getDurationMetricAssignmentTestSpec(["workflow", "execution", "task"]));
                        it('should trim assignment of duration metric [task]', getDurationMetricAssignmentTestSpec(["task"]));
                        it('should trim assignment of duration metric [workflow, task]', getDurationMetricAssignmentTestSpec(["workflow", "task"]));
                        it('should trim assignment of duration metric [workflow, workflowVersion]', getDurationMetricAssignmentTestSpec(['workflow', 'workflowVersion']));
                        it('should trim assignment of duration metric [workflowVersion, execution]', getDurationMetricAssignmentTestSpec(['workflowVersion', 'execution']));
                        it('should trim assignment of duration metric [schedule, workflowVersion]', getDurationMetricAssignmentTestSpec(['schedule', 'workflowVersion']));
                        it('should trim assignment of duration metric [schedule]', getDurationMetricAssignmentTestSpec(["schedule"]));
                        it('should trim assignment of duration metric [schedule, workflow]', getDurationMetricAssignmentTestSpec(["schedule", "workflow"]));
                    });
                    describe('partially supplied assignment', function () {
                        it('should trim assignment of int metric [] from [schedule, workflow, execution]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), [], 42, ["schedule", "workflow", "execution"]));
                        it('should trim assignment of int metric [workflow] from [workflow, execution]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow"], 42, ["workflow", "execution"]));
                        it('should trim assignment of int metric [workflow, execution] from [workflow, execution]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow", "execution"], 42));
                        it('should trim assignment of int metric [task] from [task]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["task"], 42));
                        it('should trim assignment of int metric [schedule] from [schedule, workflow]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["schedule"], 42, ["schedule", "workflow"]));
                        it('should trim assignment of int metric [workflow, workflowVersion] from [schedule, workflow, workflowVersion, execution]', getNumberMetricAssignmentTestSpec(getIntMetricDef(), ["workflow", "workflowVersion"], 42, ["schedule", "workflow", "workflowVersion", "execution"]));
                        it('should trim assignment of float metric [] from [schedule, workflow, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), [], 42, ["schedule", "workflow", "execution"]));
                        it('should trim assignment of float metric [workflow] from [workflow, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow"], 42, ["workflow", "execution"]));
                        it('should trim assignment of float metric [workflow, execution] from [workflow, execution]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["workflow", "execution"], 42, ["workflow", "execution"]));
                        it('should trim assignment of float metric [task] from [task]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["task"], 42, ["task"]));
                        it('should trim assignment of float metric [schedule] from [schedule, workflow]', getNumberMetricAssignmentTestSpec(getFloatMetricDef(), ["schedule"], 42, ["schedule", "workflow"]));
                        it('should trim assignment of duration metric [] from [schedule, workflow, execution]', getDurationMetricAssignmentTestSpec([], ["schedule", "workflow", "execution"]));
                        it('should trim assignment of duration metric [workflow] from [workflow, execution]', getDurationMetricAssignmentTestSpec(["workflow"], ["workflow", "execution"]));
                        it('should trim assignment of duration metric [workflow, execution] from [workflow, execution]', getDurationMetricAssignmentTestSpec(["workflow", "execution"], ["workflow", "execution"]));
                        it('should trim assignment of duration metric [task] from [task]', getDurationMetricAssignmentTestSpec(["task"], ["task"]));
                        it('should trim assignment of duration metric [schedule] from [schedule, workflow]', getDurationMetricAssignmentTestSpec(["schedule"], ["schedule", "workflow"]));
                    });
                    describe('duration metric', function() {
                        function getDurationMetricStartTimeTrimmingTestSpec(assignmentOptions: AssignmentOptions,
                                                                            suppliedAssignment1: RecordPointAssignment,
                                                                            suppliedAssignment2: RecordPointAssignment,
                                                                            expectedAssignment1: RecordPointAssignment,
                                                                            expectedAssignment2: RecordPointAssignment) {
                            return async function(done: DoneFn) {
                                let def = getDurationMetricDef();
                                def.assignment = assignmentOptions;
                                metricService.register(def);

                                getTimeSpy.and.returnValue(1100);
                                metricService.record(def.recordStart, suppliedAssignment1);
                                await metricService.recorderPromise;

                                getTimeSpy.and.returnValue(1500);
                                metricService.record(def.recordStart, suppliedAssignment2);
                                await metricService.recorderPromise;

                                getTimeSpy.and.returnValue(2000);
                                metricService.record(def.recordStop, suppliedAssignment1);
                                await metricService.recorderPromise;

                                getTimeSpy.and.returnValue(2100);
                                metricService.record(def.recordStop, suppliedAssignment2);
                                await metricService.recorderPromise;

                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name,
                                    expectedAssignment1),
                                    {index: 0, value: 900, assignment: expectedAssignment1});

                                expectSingleSnapshot(await metricsDB.getSnapshots(def.name,
                                    expectedAssignment2),
                                    {index: 0, value: 600, assignment: expectedAssignment2});

                                done();
                            }
                        }
                        it('should trim assignment of duration startTime [schedule, workflow], differing schedule', getDurationMetricStartTimeTrimmingTestSpec(
                            ['schedule', 'workflow'],
                            {scheduleId: 321, workflowId: 'myWorkflow2', executionId: 1234, taskId: 987},
                            {scheduleId: 322, workflowId: 'myWorkflow2', executionId: 1235, taskId: 987},
                            {scheduleId: 321, workflowId: 'myWorkflow2'},
                            {scheduleId: 322, workflowId: 'myWorkflow2'}
                        ));
                        it('should trim assignment of duration startTime [schedule, workflow, workflowVersion], differing workflowVersion', getDurationMetricStartTimeTrimmingTestSpec(
                            ['workflow', 'workflowVersion'],
                            {scheduleId: 321, workflowId: 'myWorkflow2', workflowVersionId: 'MyVersion1', executionId: 1234, taskId: 987},
                            {scheduleId: 322, workflowId: 'myWorkflow2', workflowVersionId: 'MyVersion2', executionId: 1235, taskId: 987},
                            {workflowId: 'myWorkflow2',  workflowVersionId: 'MyVersion1'},
                            {workflowId: 'myWorkflow2', workflowVersionId: 'MyVersion2'}
                        ));
                        it('should trim assignment of duration startTime [workflow, execution], differing execution', getDurationMetricStartTimeTrimmingTestSpec(
                            ['workflow', 'execution'],
                            {workflowId: 'myWorkflow2', executionId: 1234, taskId: 987},
                            {workflowId: 'myWorkflow2', executionId: 1235, taskId: 987},
                            {workflowId: 'myWorkflow2', executionId: 1234},
                            {workflowId: 'myWorkflow2', executionId: 1235}
                        ));
                        it('should trim assignment of duration startTime [workflow, execution], differing workflow', getDurationMetricStartTimeTrimmingTestSpec(
                            ['workflow', 'execution'],
                            {workflowId: 'myWorkflow2', executionId: 1234, taskId: 987},
                            {workflowId: 'myWorkflow3', executionId: 1234, taskId: 987},
                            {workflowId: 'myWorkflow2', executionId: 1234},
                            {workflowId: 'myWorkflow3', executionId: 1234}
                        ));
                        it('should trim assignment of duration startTime [workflow], differing workflow', getDurationMetricStartTimeTrimmingTestSpec(
                            ['workflow'],
                            {workflowId: 'myWorkflow2'},
                            {workflowId: 'myWorkflow3', executionId: 1234, taskId: 987},
                            {workflowId: 'myWorkflow2'},
                            {workflowId: 'myWorkflow3'}
                        ));
                        it('should trim assignment of duration startTime [workflow, task], differing task', getDurationMetricStartTimeTrimmingTestSpec(
                            ['workflow', 'task'],
                            {workflowId: 'myWorkflow2', executionId: 1234, taskId: 987},
                            {workflowId: 'myWorkflow2', executionId: 1234, taskId: 123},
                            {workflowId: 'myWorkflow2', taskId: 987},
                            {workflowId: 'myWorkflow2', taskId: 123}
                        ));
                    })
                });

                it('should not record if study mode is disabled', async function(done: DoneFn) {
                    settingsService.studyModeEnabled = false;

                    let metricDef1 = getIntMetricDef();
                    metricDef1.constValue = 1;
                    metricDef1.recordPoints = ['recordPoint1NoValue'];
                    let metricDef2 = getFloatMetricDef();
                    metricDef2.recordPoints = ['recordPoint2'];
                    let metricDef3 = getDurationMetricDef();
                    metricDef3.recordStart = 'startPoint';
                    metricDef3.recordStop = 'recordPoint1NoValue';
                    let metricDef4 = getMetaMetricDef(metricDef2.name);
                    metricDef4.recordPoints = ['recordPoint1NoValue'];
                    metricService.register(metricDef1);
                    metricService.register(metricDef2);
                    metricService.register(metricDef3);
                    metricService.register(metricDef4);

                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getSnapshots(metricDef1.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef2.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef3.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef4.name, {})).toEqual([]);

                        const assignment = {workflowId: 'workflowId', executionId: 1, taskId: 4};
                        getTimeSpy.and.returnValue(0);
                        metricService.record('startPoint', assignment);
                        metricService.recordValue('recordPoint2', assignment, 1.234);
                        await metricService.recorderPromise;
                        getTimeSpy.and.returnValue(1500);
                        metricService.record('recordPoint1NoValue', assignment);
                        await metricService.recorderPromise;

                        expect(await metricsDB.getSnapshots(metricDef1.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef2.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef3.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef4.name, {})).toEqual([]);
                    });
                    done();
                });
                it('should record using registered metrics', async function (done: DoneFn) {
                    let metricDef1 = getIntMetricDef();
                    metricDef1.constValue = 1;
                    metricDef1.recordPoints = ['recordPoint1NoValue'];
                    let metricDef2 = getFloatMetricDef();
                    metricDef2.recordPoints = ['recordPoint2'];
                    let metricDef3 = getDurationMetricDef();
                    metricDef3.recordStart = 'startPoint';
                    metricDef3.recordStop = 'recordPoint1NoValue';
                    let metricDef4 = getMetaMetricDef(metricDef2.name);
                    metricDef4.recordPoints = ['recordPoint1NoValue'];
                    metricService.register(metricDef1);
                    metricService.register(metricDef2);
                    metricService.register(metricDef3);
                    metricService.register(metricDef4);

                    await tryOrFailAsync(async () => {
                        expect(await metricsDB.getSnapshots(metricDef1.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef2.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef3.name, {})).toEqual([]);
                        expect(await metricsDB.getSnapshots(metricDef4.name, {})).toEqual([]);

                        const assignment = {workflowId: 'workflowId', executionId: 1, taskId: 4};
                        getTimeSpy.and.returnValue(0);
                        metricService.record('startPoint', assignment);
                        metricService.recordValue('recordPoint2', assignment, 1.234);
                        await metricService.recorderPromise;
                        getTimeSpy.and.returnValue(1500);
                        metricService.record('recordPoint1NoValue', assignment);
                        await metricService.recorderPromise;

                        let snapshots1 = await metricsDB.getSnapshots(metricDef1.name, {});
                        expectSingleSnapshot(snapshots1, {
                            index: 0,
                            value: 1,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        let snapshots2 = await metricsDB.getSnapshots(metricDef2.name, {});
                        expectSingleSnapshot(snapshots2, {
                            index: 0,
                            value: 1.234,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        let snapshots3 = await metricsDB.getSnapshots(metricDef3.name, {});
                        expectSingleSnapshot(snapshots3, {
                            index: 0,
                            value: 1500,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        let snapshots4 = await metricsDB.getSnapshots(metricDef4.name, {});
                        expectSingleSnapshot(snapshots4, {
                            index: 0,
                            value: 1.234,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });

                        getTimeSpy.and.returnValue(2000);
                        metricService.record('startPoint', assignment);
                        metricService.recordValue('recordPoint2', assignment, 2.33);
                        await metricService.recorderPromise;
                        getTimeSpy.and.returnValue(2500);
                        metricService.record('recordPoint1NoValue', assignment);
                        await metricService.recorderPromise;

                        snapshots1 = await metricsDB.getSnapshots(metricDef1.name, {});
                        expectSingleSnapshot(snapshots1, {
                            index: 0,
                            value: 2,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        snapshots2 = await metricsDB.getSnapshots(metricDef2.name, {});
                        expectSingleSnapshot(snapshots2, {
                            // TODO: should the index here be 1 or 0?
                            //       The metric definition says that there should only be a single snapshot,
                            //       but it is not aggregated, therefore replaced.
                            index: 1,
                            value: 2.33,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        snapshots3 = await metricsDB.getSnapshots(metricDef3.name, {});
                        expectSingleSnapshot(snapshots3, {
                            index: 0,
                            value: 1000,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                        snapshots4 = await metricsDB.getSnapshots(metricDef4.name, {});
                        expectSingleSnapshot(snapshots4, {
                            index: 0,
                            value: 2.33,
                            startOfMeasurement: null,
                            assignment: {workflowId: 'workflowId'}
                        });
                    });

                    done();
                });
                it('should log a warning, if no metric is registered for that recordPoint', async function (done: DoneFn) {
                    metricService.record('unregisteredRecordPoint', {});
                    await metricService.recorderPromise;
                    expectWarningAndClear("No metrics are affected by the recordPoint 'unregisteredRecordPoint'.");
                    done();
                });
                it('should trim assignment to assignment from definition', async function (done: DoneFn) {
                    const expectedSnapshot: Partial<MetricSnapshotWithAssignment> = {
                        index: 0,
                        assignment: {workflowId: 'uniqueId'},
                        startOfMeasurement: null,
                    };
                    let metricDef1: NumberMetricDefinition = getFloatMetricDef();
                    metricDef1.assignment = ['workflow'];
                    metricService.register(metricDef1);
                    const recordAssignment = {workflowId: 'uniqueId', executionId: 1, taskId: 1234};
                    const metricAssignment = {workflowId: recordAssignment.workflowId};
                    metricService.recordValue(metricDef1.recordPoints[0], {
                        workflowId: 'uniqueId',
                        executionId: 1,
                        taskId: 1234
                    }, 10.123);
                    await metricService.recorderPromise;
                    let snapshotsInvalid = await metricsDB.getSnapshots(metricDef1.name, recordAssignment);
                    since("There should be no snapshots with this assignment, since assignment definition only specified ['workflow']; Actual: #{actual}").expect(snapshotsInvalid).toEqual([]);
                    let snapshotsValid = await metricsDB.getSnapshots(metricDef1.name, metricAssignment);
                    expectSingleSnapshot(snapshotsValid, expectedSnapshot);
                    done();
                });
                it('should throw error, if recordPoint is invalid (empty or non-string)', function () {
                    const error_msg = 'eventPoint should be non-empty string.';
                    expect(() => {
                        metricService.record(null as any, {});
                    }).toThrowError(error_msg);
                    expect(() => {
                        metricService.record(undefined as any, {});
                    }).toThrowError(error_msg);
                    expect(() => {
                        metricService.record(' ', {});
                    }).toThrowError(error_msg);
                    expect(() => {
                        metricService.record('', {});
                    }).toThrowError(error_msg);
                });
                it('should delete all previously recorded snapshots for a certain metric on a clear point', async function (done: DoneFn) {
                    let def1 = getIntMetricDef();
                    def1.constValue = 1;
                    const clearPoint = 'clearEvent';
                    const recordPoint = def1.recordPoints[0];
                    const assignment = {workflowId: 'someWorkflow', executionId: 1234};
                    const assignmentEmpty = {};
                    def1.deleteSnapshotsEvents = [clearPoint];
                    metricService.register(def1);

                    let def2 = getIntMetricDef();
                    def2.constValue = 3;
                    def2.name += '2';
                    metricService.register(def2);

                    metricService.record(clearPoint, assignment);
                    metricService.record(recordPoint, assignment);
                    await metricService.recorderPromise;
                    expectSingleSnapshot(await metricsDB.getSnapshots(def1.name, {}), {value: 1});
                    expectSingleSnapshot(await metricsDB.getSnapshots(def2.name, {}), {value: 3});
                    metricService.record(recordPoint, assignment);
                    metricService.record(recordPoint, assignment);
                    metricService.record(recordPoint, assignment);
                    await metricService.recorderPromise;
                    expectSingleSnapshot(await metricsDB.getSnapshots(def1.name, {}), {value: 4});
                    expectSingleSnapshot(await metricsDB.getSnapshots(def2.name, {}), {value: 12});
                    metricService.record(clearPoint, assignment);
                    await metricService.recorderPromise;
                    expectMultipleSnapshots(await metricsDB.getSnapshots(def1.name, {}), []);
                    expectSingleSnapshot(await metricsDB.getSnapshots(def2.name, {}), {value: 12});
                    metricService.record(clearPoint, assignment);
                    await metricService.recorderPromise;
                    expectMultipleSnapshots(await metricsDB.getSnapshots(def1.name, {}), []);
                    metricService.record(recordPoint, assignment);
                    await metricService.recorderPromise;
                    expectSingleSnapshot(await metricsDB.getSnapshots(def1.name, {}), {value: 1});
                    expectSingleSnapshot(await metricsDB.getSnapshots(def2.name, {}), {value: 15});
                    done();
                });
                it('should clear incomplete time measuremens on clearIncompleteEvents', async function (done: DoneFn) {
                    const def = getDurationMetricDef();
                    const startPoint = def.recordStart;
                    const stopPoint = def.recordStop;
                    const clearPoint = 'myClearEvent';
                    const assignment = {workflowId: 'myWorkflowId'};
                    def.clearIncompleteEvents = [clearPoint];
                    delete def.agg;
                    def.snapshots = 'inf';
                    metricService.register(def);

                    metricService.record(startPoint, assignment);
                    metricService.record(stopPoint, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def.name, {})).length).toEqual(1);
                    metricService.record(startPoint, assignment);
                    metricService.record(stopPoint, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def.name, {})).length).toEqual(2);
                    metricService.record(clearPoint, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def.name, {})).length).toEqual(2);
                    metricService.record(startPoint, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def.name, assignment)).not.toBeNull();
                    metricService.record(clearPoint, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def.name, assignment)).toBeNull();
                    expect((await metricsDB.getSnapshots(def.name, {})).length).toEqual(2);
                    done();
                });
                it('should clear incomplete time measuremens on clearIncompleteEvents, interleaved metrics', async function (done: DoneFn) {
                    const startPoint1 = 'start1';
                    const stopPoint1 = 'stop1';
                    const clearPoint1 = 'myClearEvent1';
                    const startPoint2 = 'start2';
                    const stopPoint2 = 'stop2';
                    const clearPoint2 = 'myClearEvent2';
                    const assignment = {workflowId: 'myWorkflowId'};

                    const def1 = getDurationMetricDef();
                    def1.recordStart = startPoint1;
                    def1.recordStop = stopPoint1;
                    def1.clearIncompleteEvents = [clearPoint1];
                    delete def1.agg;
                    def1.snapshots = 'inf';
                    metricService.register(def1);

                    const def2 = getDurationMetricDef();
                    def2.name += "2";
                    def2.recordStart = startPoint2;
                    def2.recordStop = stopPoint2;
                    def2.clearIncompleteEvents = [clearPoint2];
                    delete def2.agg;
                    def2.snapshots = 'inf';
                    metricService.register(def2);


                    //t=0 start1
                    metricService.record(startPoint1, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).toBeNull();

                    //t=1 start2
                    metricService.record(startPoint2, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).not.toBeNull();

                    //t=2 clear1
                    metricService.record(clearPoint1, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).not.toBeNull();

                    //t=3 stop2
                    metricService.record(stopPoint2, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(0);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);

                    //t=4 start1
                    metricService.record(startPoint1, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);

                    //t=5 clear2
                    metricService.record(clearPoint2, assignment);
                    await metricService.recorderPromise;
                    expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);

                    //t=6 stop1
                    metricService.record(stopPoint1, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);

                    //t=7 clear1
                    metricService.record(clearPoint1, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).toBeNull();

                    //t=8 clear2
                    metricService.record(clearPoint2, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).toBeNull();

                    //t=9 start2
                    metricService.record(startPoint2, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).not.toBeNull();

                    //t=10 start1
                    metricService.record(startPoint1, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).not.toBeNull();

                    //t=11 clear1
                    metricService.record(clearPoint1, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(1);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).not.toBeNull();

                    //t=12 stop2
                    metricService.record(stopPoint2, assignment);
                    await metricService.recorderPromise;
                    expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(1);
                    expect((await metricsDB.getSnapshots(def2.name, {})).length).toEqual(2);
                    expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                    expect(await metricsDB.getStartTime(def2.name, assignment)).toBeNull();

                    done();
                });

                describe('asynchronous failures', function () {
                    function makeErrorMessage(metricDef: MetricDefinition, msg: string): string {
                        const error_prefix = `Error while processing metric "${metricDef.name}": `;
                        return error_prefix + msg;
                    }

                    it('should log error, if recordValue is used, but a metric does not support values (constValue)', async function (done: DoneFn) {
                        let metricDef1: NumberMetricDefinition = getFloatMetricDef();
                        metricDef1.constValue = 10.32;
                        metricService.register(metricDef1);
                        metricService.recordValue(metricDef1.recordPoints[0], {workflowId: 'uniqueId'}, 10.123);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef1, 'Value is already provided by constValue definition.'));
                        done();
                    });
                    it('should log error, if recordValue is used, but a metric does not support values (constValueMap)', async function (done: DoneFn) {
                        let metricDef1: NumberMetricDefinition = getFloatMetricDef();
                        metricDef1.constValueMap = {};
                        metricDef1.constValueMap[metricDef1.recordPoints[0]] = 1.234;
                        metricService.register(metricDef1);
                        metricService.recordValue(metricDef1.recordPoints[0], {workflowId: 'uniqueId'}, 10.123);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef1, 'Value is already provided by constValueMap definition.'));
                        done();
                    });
                    it('should log error, if record is used but recordValue is needed', async function (done: DoneFn) {
                        let metricDef1: NumberMetricDefinition = getFloatMetricDef();
                        metricDef1.constValue = undefined;
                        metricService.register(metricDef1);
                        metricService.record(metricDef1.recordPoints[0], {workflowId: 'uniqueId'});
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef1, 'Value is needed for NumberMetric without constValue/constValueMap.'));
                        done();
                    });
                    it('should log error, if recordValue is used with value which is not a number', async function (done: DoneFn) {
                        const error_reason = 'recordValue needs value to be a number!';
                        let metricDef: NumberMetricDefinition = getFloatMetricDef();
                        metricDef.constValue = undefined;
                        metricService.register(metricDef);

                        metricService.recordValue(metricDef.recordPoints[0], {workflowId: 'uniqueId'}, undefined as any);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef, error_reason));

                        let metricDef2: NumberMetricDefinition = getIntMetricDef();
                        metricDef2.constValue = undefined;
                        metricService.register(metricDef2);

                        metricService.recordValue(metricDef2.recordPoints[0], {workflowId: 'uniqueId'}, null as any);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef2, error_reason));
                        metricService.recordValue(metricDef2.recordPoints[0], {workflowId: 'uniqueId'}, 'disallowedValue' as any);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef2, error_reason));
                        metricService.recordValue(metricDef2.recordPoints[0], {workflowId: 'uniqueId'}, {} as any);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(metricDef2, error_reason));
                        done();
                    });
                    it('should log error, if not all required assignments are supplied', async function (done: DoneFn) {
                        let metricDef: NumberMetricDefinition = getFloatMetricDef();
                        metricDef.assignment = ['workflow', 'execution'];
                        metricDef.constValue = undefined;
                        metricService.register(metricDef);

                        const error_prefix = makeErrorMessage(metricDef,
                            'Not all assignments required by definition are supplied. ' +
                            'Required: workflow,execution; Supplied: ');
                        const expected_error_msg1 = error_prefix + '{}';
                        metricService.recordValue('myRecordPoint', {}, 1.2);
                        await metricService.recorderPromise;
                        expectErrorAndClear(expected_error_msg1);
                        let snapshots = await metricsDB.getSnapshots(metricDef.name, {});
                        expect(snapshots).toEqual([]);

                        const expected_error_msg2 = error_prefix + '{"workflowId":"uniqueId"}';
                        metricService.recordValue('myRecordPoint', {workflowId: 'uniqueId'}, 1.2);
                        await metricService.recorderPromise;
                        expectErrorAndClear(expected_error_msg2);
                        snapshots = await metricsDB.getSnapshots(metricDef.name, {});
                        expect(snapshots).toEqual([]);
                        done();
                    });
                    it('should clear incomplete time measurements on clearIncompleteEvents, before recording', async function(done: DoneFn) {
                        const startPoint1 = 'start1';
                        const stopPoint1 = 'stop1';
                        const assignment = {workflowId: 'myWorkflowId'};

                        const def1 = getDurationMetricDef();
                        def1.recordStart = startPoint1;
                        def1.recordStop = stopPoint1;
                        def1.clearIncompleteEvents = [stopPoint1];
                        delete def1.agg;
                        def1.snapshots = 'inf';
                        metricService.register(def1);

                        metricService.record(startPoint1, assignment);
                        await metricService.recorderPromise;
                        expect(await metricsDB.getStartTime(def1.name, assignment)).not.toBeNull();

                        metricService.record(stopPoint1, assignment);
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(def1, 'startTime is null!'));
                        expect(await metricsDB.getStartTime(def1.name, assignment)).toBeNull();
                        expect((await metricsDB.getSnapshots(def1.name, {})).length).toEqual(0);
                        done();
                    });
                    it('should complain about incomplete assignment for clearIncompleteEvent', async function (done: DoneFn) {
                        const def = getDurationMetricDef();
                        const startPoint = def.recordStart;
                        const stopPoint = def.recordStop;
                        const clearPoint = 'myClearEvent';
                        const assignment = {workflowId: 'myWorkflowId'};
                        def.clearIncompleteEvents = [clearPoint];
                        delete def.agg;
                        def.snapshots = 'inf';
                        metricService.register(def);

                        metricService.record(startPoint, assignment);
                        metricService.record(clearPoint, {});
                        await metricService.recorderPromise;
                        expectErrorAndClear(makeErrorMessage(def,  'Not all assignments required by definition are supplied. Required: workflow; Supplied: {}'));
                        expect(await metricsDB.getStartTime(def.name, assignment)).not.toBeNull();
                        done();
                    });
                });

                it('should record float metric, round to accuracy and compute average', async function (done: DoneFn) {
                    const recordPoint = 'myRecordPoint1';
                    let metricDef1: NumberMetricDefinition = {
                        name: 'My Metric',
                        type: 'float',
                        assignment: ['workflow', 'execution'],
                        recordPoints: [recordPoint],
                        snapshots: 1,
                        agg: {
                            operation: 'average',
                            time: 'all',
                            accuracy: 0.05,
                        },
                        accuracy: 0.01,
                    };
                    metricService.register(metricDef1);

                    const workflowId = 'uniqueWorkflow1';
                    const executionId = 2;
                    const assignment: RecordPointAssignment = {workflowId: workflowId, executionId: executionId};
                    const baseSnapshot: Partial<MetricSnapshotWithAssignment> = {
                        index: 0,
                        assignment: assignment,
                        startOfMeasurement: null,
                    };
                    metricService.recordValue(recordPoint, assignment, 1.395);
                    await metricService.recorderPromise;
                    let snapshots = await metricsDB.getSnapshots(metricDef1.name, assignment);
                    const expectedSnapshot1: Partial<MetricSnapshotWithAssignment> = extend(baseSnapshot, {
                        value: jasmine.numberCloseTo(1.35, METRICS_PRECISION)
                    });
                    expectSingleSnapshot(snapshots, expectedSnapshot1);

                    metricService.recordValue(recordPoint, {workflowId: workflowId, executionId: executionId}, 10.214);
                    await metricService.recorderPromise;
                    const expectedSnapshot2 = extend(baseSnapshot, {
                        value: jasmine.numberCloseTo(5.8, METRICS_PRECISION)
                    });
                    snapshots = await metricsDB.getSnapshots(metricDef1.name, {
                        workflowId: workflowId,
                        executionId: executionId
                    });
                    expectSingleSnapshot(snapshots, expectedSnapshot2);

                    metricService.recordValue(recordPoint, {workflowId: workflowId, executionId: executionId}, 4.153);
                    await metricService.recorderPromise;
                    const expectedSnapshot3 = extend(baseSnapshot, {
                        value: jasmine.numberCloseTo(5.25, METRICS_PRECISION)
                    });
                    snapshots = await metricsDB.getSnapshots(metricDef1.name, {
                        workflowId: workflowId,
                        executionId: executionId
                    });
                    expectSingleSnapshot(snapshots, expectedSnapshot3);

                    done();
                });

                describe('example metrics', function() {
                    it('[Anzahl gestarteter Ablaufplanungen pro Woche]: should record float metric with empty assignment', async function(done: DoneFn) {
                        let def: MetricDefinition = {
                            name: 'Anzahl gestarteter Ablaufplanungen pro Woche',
                            type: 'int',
                            constValue: 1,
                            recordPoints: ['scheduleStart'],
                            assignment: [],
                            snapshots: "inf",
                            agg: {
                                operation: "sum",
                                time: "week"
                            }
                        };
                        metricService.register(def);

                        jasmine.clock().mockDate(new Date(Date.UTC(2019, 1, 1))); // Friday
                        metricService.record('scheduleStart', {scheduleId: 1});
                        await metricService.recorderPromise;
                        metricService.record('scheduleStart', {scheduleId: 2});
                        await metricService.recorderPromise;
                        metricService.record('scheduleStart', {scheduleId: 3});
                        await metricService.recorderPromise;
                        jasmine.clock().mockDate(new Date(Date.UTC(2019, 1, 2))); // Saturday
                        metricService.record('scheduleStart', {scheduleId: 4});
                        await metricService.recorderPromise;
                        jasmine.clock().mockDate(new Date(Date.UTC(2019, 1, 4))); // Monday
                        metricService.record('scheduleStart', {scheduleId: 5});
                        await metricService.recorderPromise;
                        metricService.record('scheduleStart', {scheduleId: 6});
                        await metricService.recorderPromise;
                        metricService.record('scheduleStart', {scheduleId: 7});
                        await metricService.recorderPromise;

                        const expectedStart1 = new Date(Date.UTC(2019, 0, 28)).getTime(); //Monday
                        const expectedStart2 = new Date(Date.UTC(2019, 1, 4)).getTime(); //Monday
                        expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, {}), [
                            {index: 0, value: 4, startOfMeasurement: expectedStart1, assignment: {}},
                            {index: 1, value: 3, startOfMeasurement: expectedStart2, assignment: {}}
                        ]);
                        done();
                    });
                    it('[Anzahl der Workflows in der Ablaufplanung pro abgeschlossener Ablaufplanung]', async function(done: DoneFn) {
                        let def: MetricDefinition = {
                            name: 'Anzahl der Workflows in der Ablaufplanung pro abgeschlossener Ablaufplanung',
                            type: 'int',
                            recordPoints: ['scheduleEnd'],
                            assignment: ["schedule"],
                            snapshots: "inf",
                        };
                        metricService.register(def);

                        metricService.recordValue('scheduleEnd', {scheduleId: 1}, 5);
                        metricService.recordValue('scheduleEnd', {scheduleId: 2}, 10);
                        metricService.recordValue('scheduleEnd', {scheduleId: 3}, 15);
                        metricService.recordValue('scheduleEnd', {scheduleId: 4}, 20);
                        metricService.recordValue('scheduleEnd', {scheduleId: 5}, 25);
                        metricService.recordValue('scheduleEnd', {scheduleId: 6}, 50);
                        metricService.recordValue('scheduleEnd', {scheduleId: 7}, 100);
                        await metricService.recorderPromise;

                        expectMultipleSnapshots(await metricsDB.getSnapshots(def.name, {}), [
                            {index: 0, value: 5, assignment: {scheduleId: 1}},
                            {index: 0, value: 10, assignment: {scheduleId: 2}},
                            {index: 0, value: 15, assignment: {scheduleId: 3}},
                            {index: 0, value: 20, assignment: {scheduleId: 4}},
                            {index: 0, value: 25, assignment: {scheduleId: 5}},
                            {index: 0, value: 50, assignment: {scheduleId: 6}},
                            {index: 0, value: 100, assignment: {scheduleId: 7}},
                        ]);
                        done();
                    });
                })
            });
        })
    });
}

