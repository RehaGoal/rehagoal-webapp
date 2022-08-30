module rehagoal.metrics {
    import SettingsService = rehagoal.settings.SettingsService;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    const moduleName = 'rehagoal.metrics';

    export class MetricService implements MetricRegistry, MetricRecorder {
        static $inject = [
            'metricRegistryFactory',
            '$log',
            '$Date',
            'settingsService'
        ];

        private metricRegistry: MetricRegistryImpl;
        private metricRecorderPromise: Promise<void>;
        private promisesPending: number = 0;
        private promiseDelays: number[] = [];
        public debugPromiseDelays: boolean = true;

        constructor(metricRegistryFactory: () => MetricRegistryImpl,
                    private $log: angular.ILogService,
                    private $Date: DateConstructor,
                    private settingsService: SettingsService) {
            this.metricRegistry = metricRegistryFactory();
            this.metricRecorderPromise = Promise.resolve();
        }

        /**
         * Whether the metric recording is enabled (only in study mode) or not.
         */
        get recordingEnabled(): boolean {
            return this.settingsService.studyModeEnabled;
        }

        private get recordingState() {
            return this.recordingEnabled ? 'enabled' : 'disabled';
        }

        register(metric: MetricDefinition): void {
            this.metricRegistry.register(metric);
        }

        getPublicMetricNames(): string[] {
            return this.metricRegistry.getPublicMetricNames();
        }

        record(recordPoint: RecordPoint, assignment: RecordPointAssignment) {
            this.$log.debug(`[recording: ${this.recordingState}] MetricService::record`,recordPoint, assignment);
            this.doForAffectedMetricsIfRecordingEnabled('clear', recordPoint, (metric) => metric.clearSnapshots(recordPoint));
            this.doForAffectedMetricsIfRecordingEnabled('record', recordPoint, (metric) => metric.record(recordPoint, assignment));
        }

        recordValue(recordPoint: RecordPoint, assignment: RecordPointAssignment, value: RecordValue) {
            this.$log.debug(`[recording: ${this.recordingState}] MetricService::recordValue`, recordPoint, assignment, value);
            this.doForAffectedMetricsIfRecordingEnabled('record', recordPoint, (metric) => metric.recordValue(recordPoint, assignment, value));
        }

        get recorderPromise() {
            return this.metricRecorderPromise;
        }

        private updatePromiseDelays(scheduleTime: Date) {
            if (this.debugPromiseDelays) {
                const now = new this.$Date();
                this.promiseDelays.push(now.getTime() - scheduleTime.getTime());
                if (this.promisesPending > 0) {
                    this.$log.debug('MetricService: Promise delays:', this.promiseDelays.slice(0));
                }
            }
        }

        private getAffectedMetrics(eventType: MetricEventType, event: RecordPoint): Metric[] {
            return this.metricRegistry.getMetricsForEventPoint(event, eventType);
        }

        private doForAffectedMetricsIfRecordingEnabled(eventType: MetricEventType, event: RecordPoint, fn: (metric: Metric) => Promise<void>) {
            if (!angular.isString(event) || event.trim().length === 0) {
                throw new Error(`eventPoint should be non-empty string.`);
            }
            this.$log.debug(`[${eventType}Point] ${event}`);
            let affectedMetrics = this.getAffectedMetrics(eventType, event);
            if (affectedMetrics.length === 0 && eventType !== 'clear') {
                this.$log.warn(`No metrics are affected by the ${eventType}Point '${event}'.`);
            }
            if (!this.recordingEnabled) {
                return;
            }
            this.doForAffectedMetrics(affectedMetrics, fn);
        }

        private doForAffectedMetrics(affectedMetrics: Metric[], fn: (metric: rehagoal.metrics.Metric) => Promise<void>) {
            const vm = this;
            for (let affectedMetric of affectedMetrics) {
                const scheduledTime = new vm.$Date();
                if (vm.promisesPending > 0) {
                    vm.$log.warn('There are still ', vm.promisesPending, ' pending metric recorder promises!');
                    // TODO: How to handle still pending promises?
                    //       This is especially critical for timestamps and durations, as promises may be delayed.
                    //       We -could- capture the current timestamp in the synchronous part of the record function and
                    //       somehow pass it to the Metric (e.g. via additional parameter?, e.g. via service which keeps
                    //       track of not yet consumed timestamps).
                }
                vm.promisesPending++;
                vm.$log.debug('MetricService: Promises pending: ', vm.promisesPending);
                vm.metricRecorderPromise = vm.metricRecorderPromise.then(() => {
                    vm.updatePromiseDelays(scheduledTime);
                }).then(() => fn(affectedMetric)
                ).catch((err) => {
                    vm.handleMetricError(affectedMetric, err);
                }).then(() => {
                    vm.promisesPending--;
                    vm.$log.debug('MetricService: Promises pending: ', vm.promisesPending);
                    if (vm.promisesPending === 0) {
                        vm.promiseDelays = [];
                    }
                });
            }
        }

        private handleMetricError(affectedMetric: Metric, err: any) {
            const err_prefix = 'Error while processing metric "' + affectedMetric.definition.name + '": ';
            const msg = err.message || err || "";
            const full_message = err_prefix + msg;
            // TODO: How to handle failed metrics? Write error log somewhere?
            let error;
            if (!err.message) {
                error = new Error(full_message);
            } else {
                error = err;
                error.message = full_message;
            }
            this.$log.error(error);
        }
    }

    angular.module(moduleName)
        .service('metricService', MetricService);
}