'use strict';

import MetricDefinition = rehagoal.metrics.MetricDefinition;
import MetricType = rehagoal.metrics.MetricType;
import AbstractMetricDefinition = rehagoal.metrics.AbstractMetricDefinition;
import DurationMetricDefinitionMixin = rehagoal.metrics.DurationMetricDefinitionMixin;
import extend = rehagoal.utilities.extend;
import Metric = rehagoal.metrics.Metric;
import DurationMetricDefinition = rehagoal.metrics.DurationMetricDefinition;
import NumberMetricDefinition = rehagoal.metrics.NumberMetricDefinition;
import MetaMetricDefinition = rehagoal.metrics.MetaMetricDefinition;
import RecordPoint = rehagoal.metrics.RecordPoint;
import assertUnreachable = rehagoal.utilities.assertUnreachable;

describe('rehagoal.metrics', function () {
    //Modules
    beforeEach(() => angular.mock.module('rehagoal.metrics'));

    beforeEach(() => angular.mock.inject(function () {
    }));

    describe('metricFactory', function () {
        let metricFactory: (def: MetricDefinition) => Metric;
        type MapMetricType = {
            'int': NumberMetricDefinition,
            'float': NumberMetricDefinition,
            'meta': MetaMetricDefinition,
            'duration': DurationMetricDefinition,
        }

        function makeMetricDefinitionOfType(type: 'int' | 'float'): MapMetricType['int' | 'float']
        function makeMetricDefinitionOfType(type: 'duration'): MapMetricType['duration']
        function makeMetricDefinitionOfType(type: 'meta'): MapMetricType['meta']
        function makeMetricDefinitionOfType(type: MetricType): MapMetricType[MetricType]
        function makeMetricDefinitionOfType(type: MetricType): MapMetricType[MetricType] {
            let basicMetricDefinition: AbstractMetricDefinition = {
                name: 'MyMetric',
                assignment: ['workflow'],
                snapshots: 1
            };
            switch (type) {
                case 'int':
                case 'float':
                    return extend(basicMetricDefinition, {
                        type: type,
                        recordPoints: ['myRecordPoint'],
                    });
                case 'meta':
                    return extend(basicMetricDefinition, {
                        type: type,
                        metaReference: 'MyReferencedMetric',
                        recordPoints: ['myRecordPoint'],
                    });
                case 'duration':
                    let durationMixin: DurationMetricDefinitionMixin = {
                        type: "duration",
                        handleIncomplete: "ignore",
                        recordStart: 'myRecordStart',
                        recordStop: 'myRecordStop'
                    };
                    return extend(basicMetricDefinition, durationMixin);
                default:
                    return assertUnreachable(type);
            }
        }

        function testForNumberMetricTypes(testFunc: (type: 'int' | 'float') => void) {
            testForMetricTypes(testFunc, ['int', 'float']);
        }

        function testForMetricTypes<T extends MetricType[]>(testFunc: (type: typeof types[number]) => void, types: T) {
            for (let type of types) {
                testFunc(type);
            }
        }

        function testForAllMetricTypes(testFunc: (type: MetricType) => void) {
            const allTypes: MetricType[] = ['int', 'float', 'duration', 'meta'];
            testForMetricTypes(testFunc, allTypes);
        }

        function assignRecordPoints(metricDefinition: MetricDefinition, recordPoints: RecordPoint[]) {
            switch (metricDefinition.type) {
                case 'int':
                case 'float':
                case 'meta':
                    (metricDefinition as (NumberMetricDefinition | MetaMetricDefinition)).recordPoints = recordPoints;
                    break;
                case 'duration':
                    let durationDef = metricDefinition as DurationMetricDefinition;
                    if (recordPoints.length > 0) {
                        durationDef.recordStart = recordPoints[0];
                    }
                    if (recordPoints.length > 1) {
                        durationDef.recordStart = recordPoints[1];
                    }
                    break;
                default:
                    assertUnreachable(metricDefinition);
            }
        }

        function sinceMetricType(type: MetricType): ExpectWrapper {
            return since("Expectation failed for MetricType '" + type + "': #{message}");
        }

        beforeEach(() => angular.mock.inject(function (_metricFactory_: (def: MetricDefinition) => Metric) {
            metricFactory = _metricFactory_;
        }));
        it('should return factory function', function () {
            expect(typeof metricFactory).toBe('function');
        });
        it('should create NumberMetric for int or float type', function () {
            testForNumberMetricTypes((type: 'int' | 'float') => {
                let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                let metric = metricFactory(metricDefinition);
                expect(metric).toBeDefined();
                expect((<any>metric).constructor.name).toBe('NumberMetric');
                expect(metric.definition).toEqual(metricDefinition);
            });
        });
        it('should create NumberMetric for int or float type with constValueMap', function () {
            testForNumberMetricTypes((type: 'int' | 'float') => {
                let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType(type);
                delete metricDefinition.constValue;
                metricDefinition.recordPoints = ['rp', 'rp2'];
                metricDefinition.constValueMap = {
                    'rp2': 0,
                    'rp': 3,
                }
                let metric = metricFactory(metricDefinition);
                expect(metric).toBeDefined();
                expect((<any>metric).constructor.name).toBe('NumberMetric');
                expect(metric.definition).toEqual(metricDefinition);
            });
        });
        it('should create DurationMetric for duration type', function () {
            let metricDefinition: MetricDefinition = makeMetricDefinitionOfType('duration');
            let metric = metricFactory(metricDefinition);
            expect(metric).toBeDefined();
            expect((<any>metric).constructor.name).toBe('DurationMetric');
            expect(metric.definition).toEqual(metricDefinition);
        });
        it('should create MetaMetric for meta type', function () {
            let metricDefinition: MetricDefinition = makeMetricDefinitionOfType('meta');
            let metric = metricFactory(metricDefinition);
            expect(metric).toBeDefined();
            expect((<any>metric).constructor.name).toBe('MetaMetric');
            expect(metric.definition).toEqual(metricDefinition);
        });

        describe('constraint verification', function () {
            describe('basicConstraints', function () {
                it('should not throw for a valid metric definition', function () {
                    testForAllMetricTypes((type) => {
                        let metricDefinition = makeMetricDefinitionOfType(type);
                        expect(() => metricFactory(metricDefinition)).not.toThrow();
                    });
                });
                it('should throw if metric name is empty', function () {
                    testForAllMetricTypes((type) => {
                        let metricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.name = "";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/empty/);
                    });
                });
                it('should throw if metric name is padded with whitespaces', function () {
                    testForAllMetricTypes((type) => {
                        let metricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.name = "   ";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/empty/);
                        metricDefinition.name = " metricName";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/padded with whitespaces/);
                        metricDefinition.name = "metricName  ";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/padded with whitespaces/);
                        metricDefinition.name = "\tmetricName\n";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/padded with whitespaces/);
                    });
                });
                it('should throw if there are no recordPoints', function () {
                    const types: ('int' | 'float' | 'meta')[] = ['int', 'float', 'meta'];
                    testForMetricTypes((type: typeof types[0]) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        assignRecordPoints(metricDefinition, []);
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/No record points/);
                    }, types);
                });
                it('should not allow recordPoints with empty name', function () {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        assignRecordPoints(metricDefinition, ['']);
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/RecordPoint with name "" at index 0 should have length > 0/);
                    });
                });
                it('should not allow recordPoints with padded name', function () {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        assignRecordPoints(metricDefinition, [' hello ']);
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/RecordPoint with name " hello " at index 0 should not be padded with whitespaces/);
                    });
                });
                it('should not allow repeated recordPoints', function() {
                    const types: ('int' | 'float' | 'meta')[] = ['int', 'float', 'meta'];
                    testForMetricTypes((type: typeof types[0]) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        assignRecordPoints(metricDefinition, ['p1', 'p1']);
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/RecordPoint with name "p1" at index 1 has already been specified/);
                    }, types);
                });
                it('should not allow snapshots with non-integer values', function() {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        for (let value of [1.1, -1.2, -999.0, 1.0000001]) {
                            metricDefinition.snapshots = value;
                            sinceMetricType(type).
                            expect(() => metricFactory(metricDefinition)).toThrowError(/snapshots has to be integer/);
                        }
                    });
                });
                it('should allow snapshots = "inf"', function() {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.snapshots = "inf";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).not.toThrowError();
                    });
                });
                it('should allow snapshots with positive integer values', function() {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        for (let value of [1, 2, 999, 40]) {
                            metricDefinition.snapshots = value;
                            sinceMetricType(type).
                            expect(() => metricFactory(metricDefinition)).not.toThrowError();
                        }
                    });
                });
                it('should not allow snapshots with negative integer values', function() {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        for (let value of [-1, -2, -999, -40, 0]) {
                            metricDefinition.snapshots = value;
                            sinceMetricType(type).
                            expect(() => metricFactory(metricDefinition)).toThrowError(/> 0/);
                        }
                    });
                });
                it('should not allow to use agg and timestamp fields together', function() {
                    testForAllMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.agg = {
                            time: "day",
                            operation: "average",
                            accuracy: 0.01
                        };
                        metricDefinition.timestamp = "day";
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/"agg" and "timestamp" are mutually exclusive/);
                    });
                });
                it('should not allow negative agg.accuracy', function() {
                    const aggAccuracyMetricTypes: MetricType[] = ['meta', 'int', 'float'];
                    testForMetricTypes((type: MetricType) => {
                        let metricDefinition: MetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.agg = {
                            time: "day",
                            operation: "average",
                            accuracy: -1.01
                        };
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/negative/);
                        metricDefinition.agg.accuracy = -3.3;
                        sinceMetricType(type).
                        expect(() => metricFactory(metricDefinition)).toThrowError(/negative/);
                    }, aggAccuracyMetricTypes);
                });
            });
            describe('NumberMetric', function () {
                it('should not allow float constValue for int metricType', function() {
                    let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType('int');
                    metricDefinition.constValue = 10.1;
                    expect(() => metricFactory(metricDefinition)).toThrowError(/should not be float/);
                    metricDefinition.constValue = 1.004;
                    expect(() => metricFactory(metricDefinition)).toThrowError(/should not be float/);
                });
                it('should not allow negative values for accuracy', function() {
                    testForNumberMetricTypes((type: 'int' | 'float') => {
                        let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.accuracy = -0.1;
                        expect(() => metricFactory(metricDefinition)).toThrowError(/negative/);
                    });
                });
                it('should not allow both constValueMap and constValue', function() {
                    testForNumberMetricTypes((type: 'int' | 'float') => {
                        let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.recordPoints = ['rp1', 'rp2'];
                        metricDefinition.constValue = 2;
                        metricDefinition.constValueMap = {
                            'rp1': 0,
                            'rp2': 1
                        };
                        expect(() => metricFactory(metricDefinition)).toThrowError(/constValue and constValueMap are mutually exclusive/);
                    });
                });
                it('should not allow constValueMap with missing recordPoints', function() {
                    testForNumberMetricTypes((type: 'int' | 'float') => {
                        let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.recordPoints = ['rp1', 'rp3', 'rp2'];
                        delete metricDefinition.constValue;
                        metricDefinition.constValueMap = {
                            'rp1': 0,
                            'rp2': 1
                        };
                        expect(() => metricFactory(metricDefinition)).toThrowError(/every record point should have a matching entry in constValueMap\. Expected arrays to equal: !angular\.equals\(\["rp1","rp2"\], \["rp1","rp2","rp3"\]\)/);
                    });
                });
                it('should not allow constValueMap with additional recordPoints', function() {
                    testForNumberMetricTypes((type: 'int' | 'float') => {
                        let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType(type);
                        metricDefinition.recordPoints = ['rp1', 'rp2'];
                        delete metricDefinition.constValue;
                        metricDefinition.constValueMap = {
                            'rp1': 0,
                            'rp2': 1,
                            'rp3': 42
                        };
                        expect(() => metricFactory(metricDefinition)).toThrowError(/every record point should have a matching entry in constValueMap\. Expected arrays to equal: !angular\.equals\(\["rp1","rp2","rp3"\], \["rp1","rp2"\]\)/);
                    });
                });
                it('should not allow float constValueMap for int metricType', function() {
                    let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType('int');
                    delete metricDefinition.constValue;
                    metricDefinition.constValueMap = {};
                    metricDefinition.constValueMap[metricDefinition.recordPoints[0]] = 1.234;
                    expect(() => metricFactory(metricDefinition)).toThrowError(/every value in constValueMap should be int for int metrics/);
                });
                it('should not allow arbitrary object in constValueMap', function() {
                    let metricDefinition: NumberMetricDefinition = makeMetricDefinitionOfType('float');
                    metricDefinition.recordPoints = ['rp1', 'rp2'];
                    delete metricDefinition.constValue;
                    metricDefinition.constValueMap = {
                        'rp1': 1,
                        'rp2': {} as any as number
                    };
                    expect(() => metricFactory(metricDefinition)).toThrowError(/every value in constValueMap should be a number/);
                });
            });
            describe('DurationMetric', function() {
                it('should not allow negative DurationAccuracyValues', function() {
                    let metricDefinition: DurationMetricDefinition = makeMetricDefinitionOfType('duration');
                    metricDefinition.durationAccuracy = [-1, "s"];
                    expect(() => metricFactory(metricDefinition)).toThrowError(/negative/);
                    metricDefinition.durationAccuracy = [-9.01, "s"];
                    expect(() => metricFactory(metricDefinition)).toThrowError(/negative/);
                });
                it('should not allow negative DurationAccuracyValues in agg', function() {
                    let metricDefinition: DurationMetricDefinition = makeMetricDefinitionOfType('duration');
                    metricDefinition.agg = {
                        time: "day",
                        operation: "average",
                    };
                    metricDefinition.agg.durationAccuracy = [-1, "s"];
                    expect(() => metricFactory(metricDefinition)).toThrowError(/agg.durationAccuracy should not be negative/);
                    metricDefinition.agg.durationAccuracy = [-9.01, "h"];
                    expect(() => metricFactory(metricDefinition)).toThrowError(/agg.durationAccuracy should not be negative/);
                });
            });
        })
    });
});
