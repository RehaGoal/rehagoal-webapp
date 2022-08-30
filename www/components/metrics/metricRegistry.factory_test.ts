'use strict';

module rehagoal.metrics {
    describe('rehagoal.metrics', function () {
        //Modules
        beforeEach(() => angular.mock.module('rehagoal.metrics', function($provide: angular.auto.IProvideService) {
        }));

        describe('MetricRegistry', function () {
            let metricRegistry: MetricRegistryImpl;
            function getIntMetricDef(): NumberMetricDefinition {
                return {
                    name: 'MyIntMetric',
                    type: 'int',
                    assignment: ['workflow'],
                    recordPoints: ['myRecordPoint1', 'myRecordPoint2'],
                    constValue: 1,
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
                    constValue: 1,
                    snapshots: 1,
                    agg: {
                        operation: 'sum',
                        time: "all"
                    }
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
            beforeEach(() => angular.mock.inject(function(_metricRegistryFactory_: () => MetricRegistryImpl) {
                metricRegistry = _metricRegistryFactory_();
            }));
            it('should register int metric', function() {
                let metricDefinition: NumberMetricDefinition = getIntMetricDef();
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('NumberMetric');
            });
            it('should register float metric', function() {
                let metricDefinition: NumberMetricDefinition = getFloatMetricDef();
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('NumberMetric');
            });
            it('should register duration metric', function() {
                let metricDefinition: DurationMetricDefinition = getDurationMetricDef();
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('DurationMetric');
            });
            it('should register meta metric', function() {
                let dependencyMetricDefinition: NumberMetricDefinition = getIntMetricDef();
                metricRegistry.register(dependencyMetricDefinition);

                let metricDefinition: MetaMetricDefinition = getMetaMetricDef(dependencyMetricDefinition.name);
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('MetaMetric');
            });
            it('should not allow registering a meta metric, where metaReference metric is not registered', function() {
                let metricDefinition: MetaMetricDefinition = getMetaMetricDef('notRegisteredMetric');
                expect(() => metricRegistry.register(metricDefinition)).toThrowError(/unfulfilled dependencies/);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(false);
                expect(() => metricRegistry.getMetric(metricDefinition.name)).toThrowError(/is not registered/);
            });
            it('should not allow registering a meta metric, where timestamps are required (week), but the referenced metric does not support it', function() {
                let dependencyMetricDefinition: NumberMetricDefinition = getIntMetricDef();
                metricRegistry.register(dependencyMetricDefinition);

                let metricDefinition: MetaMetricDefinition = getMetaMetricDef(dependencyMetricDefinition.name);
                metricDefinition.agg = {
                    operation: 'sum',
                    time: 'week'
                };
                expect(() => metricRegistry.register(metricDefinition)).toThrowError(/requires timestamps/);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(false);
                expect(() => metricRegistry.getMetric(metricDefinition.name)).toThrowError(/is not registered/);
            });
            it('should not allow registering a meta metric, where timestamps are required (hour), but the referenced metric does not support it', function() {
                let dependencyMetricDefinition: NumberMetricDefinition = getIntMetricDef();
                metricRegistry.register(dependencyMetricDefinition);

                let metricDefinition: MetaMetricDefinition = getMetaMetricDef(dependencyMetricDefinition.name);
                metricDefinition.agg = {
                    operation: 'sum',
                    time: 'hour'
                };
                expect(() => metricRegistry.register(metricDefinition)).toThrowError(/requires timestamps/);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(false);
                expect(() => metricRegistry.getMetric(metricDefinition.name)).toThrowError(/is not registered/);
            });
            it('should allow registering a meta metric, where timestamps (week) are required, and the referenced metric provides them (timestamp = week)', function() {
                let dependencyMetricDefinition: NumberMetricDefinition = getIntMetricDef();
                dependencyMetricDefinition.timestamp = 'week';
                delete dependencyMetricDefinition.agg;
                metricRegistry.register(dependencyMetricDefinition);

                let metricDefinition: MetaMetricDefinition = getMetaMetricDef(dependencyMetricDefinition.name);
                metricDefinition.agg = {
                    operation: 'sum',
                    time: 'week'
                };
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('MetaMetric');
            });
            it('should allow registering a meta metric, where timestamps (hour) are required, and the referenced metric provides them (agg.time = hour)', function() {
                let dependencyMetricDefinition: NumberMetricDefinition = getIntMetricDef();
                dependencyMetricDefinition.agg = {
                    time: 'hour',
                    operation: 'average'
                };
                metricRegistry.register(dependencyMetricDefinition);

                let metricDefinition: MetaMetricDefinition = getMetaMetricDef(dependencyMetricDefinition.name);
                metricDefinition.agg = {
                    operation: 'variance',
                    time: 'hour'
                };
                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);
                expect((<any>metric).constructor.name).toBe('MetaMetric');
            });
            it('should not allow duplicate registrations', function() {
                let metricDefinition = getIntMetricDef();
                let metricDefinition2 = getIntMetricDef();
                metricDefinition2.constValue = 42;
                expect(metricDefinition2).not.toEqual(metricDefinition);

                metricRegistry.register(metricDefinition);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric = metricRegistry.getMetric(metricDefinition.name);
                expect(metric.definition).toEqual(metricDefinition);

                expect(() => {
                    metricRegistry.register(metricDefinition);
                }).toThrowError(/.*MyIntMetric.* has already been registered/);
                expect(metricRegistry.isMetricRegistered(metricDefinition.name)).toBe(true);
                let metric2 = metricRegistry.getMetric(metricDefinition.name);
                expect(metric2.definition).toEqual(metricDefinition);
                expect(metric2.definition).not.toEqual(metricDefinition2);
            });
            it('should return metrics registered for recordPoint', function() {
                const rp1 = 'myRecordPoint1';
                const rp2 = 'myRecordPoint2';
                const rpStop = 'myStopPoint2';
                const rpFloat = 'customFloatRecordPoint';
                const recordPoints1 = [rp1, rp2];
                const recordPoints2 = [rp1, rp2];
                const recordPoints3 = [rp1, rpStop];
                const recordPoints4 = [rpFloat];
                let metricDefinition1: NumberMetricDefinition = getIntMetricDef();
                metricDefinition1.recordPoints = recordPoints1.slice(0);
                metricRegistry.register(metricDefinition1);
                let metricDefinition2: NumberMetricDefinition = getIntMetricDef();
                metricDefinition2.name += "2";
                metricDefinition2.recordPoints = recordPoints2.slice(0);
                metricRegistry.register(metricDefinition2);
                let metricDefinition3: DurationMetricDefinition = getDurationMetricDef();
                metricDefinition3.recordStart = recordPoints3[0];
                metricDefinition3.recordStop = recordPoints3[1];
                metricRegistry.register(metricDefinition3);
                let metricDefinition4: NumberMetricDefinition = getFloatMetricDef();
                metricDefinition4.recordPoints = recordPoints4.slice(0);
                metricRegistry.register(metricDefinition4);

                const rp1Metrics = metricRegistry.getMetricsForEventPoint(rp1, 'record');
                const rp1MetricDefs = rp1Metrics.map((metric) => metric.definition);
                const rp2Metrics = metricRegistry.getMetricsForEventPoint(rp2, 'record');
                const rp2MetricDefs = rp2Metrics.map((metric) => metric.definition);
                const rpStopMetrics = metricRegistry.getMetricsForEventPoint(rpStop, 'record');
                const rpStopMetricDefs = rpStopMetrics.map((metric) => metric.definition);
                const rpFloatMetrics = metricRegistry.getMetricsForEventPoint(rpFloat, 'record');
                const rpFloatMetricDefs = rpFloatMetrics.map((metric) => metric.definition);
                expect(rp1MetricDefs).toEqual([metricDefinition1, metricDefinition2, metricDefinition3]);
                expect(rp2MetricDefs).toEqual([metricDefinition1, metricDefinition2]);
                expect(rpStopMetricDefs).toEqual([metricDefinition3]);
                expect(rpFloatMetricDefs).toEqual([metricDefinition4]);
                expect(rp1Metrics.every((metric) => !!metric.record && !!metric.recordValue));
                expect(rp2Metrics.every((metric) => !!metric.record && !!metric.recordValue));
                expect(rpStopMetrics.every((metric) => !!metric.record && !!metric.recordValue));
                expect(rpFloatMetrics.every((metric) => !!metric.record && !!metric.recordValue));
            });
            it('should return metrics registered for clearPoint', function() {
                const rp1 = 'aRecordPoint1';
                const rp2 = 'aRecordPoint2';
                const rpStart = 'startPoint1';
                const rpStop = 'stopPoint1';
                const cp1 = 'aClearPoint1';
                const cp2 = 'aClearPoint2';
                let metricDefinition1: NumberMetricDefinition = getIntMetricDef();
                metricDefinition1.recordPoints = [rp1];
                metricDefinition1.deleteSnapshotsEvents = [cp1];
                let metricDefinition2: NumberMetricDefinition = getIntMetricDef();
                metricDefinition2.recordPoints = [rp1, rp2];
                metricDefinition2.name += "2";
                let metricDefinition3: NumberMetricDefinition = getFloatMetricDef();
                metricDefinition3.recordPoints = [rp1, rp2];
                metricDefinition3.deleteSnapshotsEvents = [rp1];
                let metricDefinition4: DurationMetricDefinition = getDurationMetricDef();
                metricDefinition4.recordStart = rpStart;
                metricDefinition4.recordStop = rpStop;
                metricDefinition4.deleteSnapshotsEvents = [cp1, cp2];
                metricRegistry.register(metricDefinition1);
                metricRegistry.register(metricDefinition2);
                metricRegistry.register(metricDefinition3);
                metricRegistry.register(metricDefinition4);

                const rp1RecordMetrics = metricRegistry.getMetricsForEventPoint(rp1, 'record');
                const rp1RecordMetricDefs = rp1RecordMetrics.map((metric) => metric.definition);
                const rp2RecordMetrics = metricRegistry.getMetricsForEventPoint(rp2, 'record');
                const rp2RecordMetricDefs = rp2RecordMetrics.map((metric) => metric.definition);
                const rpStartRecordMetrics = metricRegistry.getMetricsForEventPoint(rpStart, 'record');
                const rpStartRecordMetricDefs = rpStartRecordMetrics.map((metric) => metric.definition);
                const rpStopRecordMetrics = metricRegistry.getMetricsForEventPoint(rpStop, 'record');
                const rpStopRecordMetricDefs = rpStopRecordMetrics.map((metric) => metric.definition);
                const cp1RecordMetrics = metricRegistry.getMetricsForEventPoint(cp1, 'record');
                const cp1RecordMetricDefs = cp1RecordMetrics.map((metric) => metric.definition);
                const cp2RecordMetrics = metricRegistry.getMetricsForEventPoint(cp2, 'record');
                const cp2RecordMetricDefs = cp2RecordMetrics.map((metric) => metric.definition);

                const rp1ClearMetrics = metricRegistry.getMetricsForEventPoint(rp1, 'clear');
                const rp1ClearMetricDefs = rp1ClearMetrics.map((metric) => metric.definition);
                const rp2ClearMetrics = metricRegistry.getMetricsForEventPoint(rp2, 'clear');
                const rp2ClearMetricDefs = rp2ClearMetrics.map((metric) => metric.definition);
                const rpStartClearMetrics = metricRegistry.getMetricsForEventPoint(rpStart, 'clear');
                const rpStartClearMetricDefs = rpStartClearMetrics.map((metric) => metric.definition);
                const rpStopClearMetrics = metricRegistry.getMetricsForEventPoint(rpStop, 'clear');
                const rpStopClearMetricDefs = rpStopClearMetrics.map((metric) => metric.definition);
                const cp1ClearMetrics = metricRegistry.getMetricsForEventPoint(cp1, 'clear');
                const cp1ClearMetricDefs = cp1ClearMetrics.map((metric) => metric.definition);
                const cp2ClearMetrics = metricRegistry.getMetricsForEventPoint(cp2, 'clear');
                const cp2ClearMetricDefs = cp2ClearMetrics.map((metric) => metric.definition);

                expect(rp1RecordMetricDefs).toEqual([metricDefinition1, metricDefinition2, metricDefinition3]);
                expect(rp2RecordMetricDefs).toEqual([metricDefinition2, metricDefinition3]);
                expect(rpStartRecordMetricDefs).toEqual([metricDefinition4]);
                expect(rpStopRecordMetricDefs).toEqual([metricDefinition4]);
                expect(cp1RecordMetricDefs).toEqual([]);
                expect(cp2RecordMetricDefs).toEqual([]);

                expect(rp1ClearMetricDefs).toEqual([metricDefinition3]);
                expect(rp2ClearMetricDefs).toEqual([]);
                expect(rpStartClearMetricDefs).toEqual([]);
                expect(rpStopClearMetricDefs).toEqual([]);
                expect(cp1ClearMetricDefs).toEqual([metricDefinition1, metricDefinition4]);
                expect(cp2ClearMetricDefs).toEqual([metricDefinition4]);
            });
            it('should return [] if no metrics are registered for that recordPoint', function() {
                let metricDefinition1: NumberMetricDefinition = getIntMetricDef();
                metricRegistry.register(metricDefinition1);
                expect(metricRegistry.getMetricsForEventPoint('notFoundRecordPoint', 'record')).toEqual([]);
            });
            it('should not allow modification of metric definition after registration', function() {
                const originalDef = getIntMetricDef();
                let def = getIntMetricDef();
                metricRegistry.register(def);
                const name = def.name;
                expect(metricRegistry.getMetric(name).definition).toEqual(def);

                def.constValue = 1234;
                def.assignment = ["task"];
                let registryDef = metricRegistry.getMetric(name).definition;
                expect(registryDef).toEqual(getIntMetricDef());

                def.name += '2';
                expect(metricRegistry.getMetric(name).definition.name).toEqual(name);
            });
            it('getPublicMetricNames should return public metric names only', function() {
                const def1 = getIntMetricDef();
                const def2 = getFloatMetricDef();
                const def3 = getIntMetricDef();
                def3.name += "2";
                def3.private = true;
                const def4 = getFloatMetricDef();
                def4.name += "++";
                def4.private = true;
                const def5 = getDurationMetricDef();
                const def6 = getDurationMetricDef();
                def6.name += "_second";
                def6.private = true;
                metricRegistry.register(def1);
                metricRegistry.register(def2);
                metricRegistry.register(def3);
                metricRegistry.register(def4);
                metricRegistry.register(def5);
                metricRegistry.register(def6);
                expect(metricRegistry.getPublicMetricNames()).toEqual([def1.name, def2.name, def5.name]);
            });
        });
    });
}

