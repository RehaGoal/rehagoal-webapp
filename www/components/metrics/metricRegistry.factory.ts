module rehagoal.metrics {
    const moduleName = 'rehagoal.metrics';

    /**
     * Keeps track of registered metrics, their dependencies and their record points.
     * Private implementation to be used by `MetricService`.
     * MetricRegistry interface implementation of `MetricService` should be used for registering metrics.
     */
    export class MetricRegistryImpl implements MetricRegistry {
        private metricNameToMetric: Map<string, Metric> = new Map<string, Metric>();
        private recordPointToMetrics: Map<RecordPoint, Metric[]> = new Map<RecordPoint, Metric[]>();
        private clearPointToMetrics: Map<RecordPoint, Metric[]> = new Map<RecordPoint, Metric[]>();

        /**
         * Creates a new `MetricRegistry` with a given metric factory function
         * for creating Metric instances from `MetricDefinition`s.
         * @param metricFactory factory function for instantiating metrics from a definition
         */
        constructor(private metricFactory: MetricFactoryFunction) {
        }

        /**
         * Registers a new metric with the given definition.
         * The name of the metric should be unique for the registry.
         * The metric should not have unmet dependencies, therefore all required metrics should be registered beforehand.
         * @param metricDefinition definition of the metric (cannot be changed afterwards)
         */
        public register(metricDefinition: MetricDefinition): void {
            //TODO: Store first metric registration and metricDefinition in DB
            //TODO: Compare metricDefinition with _definition in DB
            //Clone metric definition, such that references are lost and definition cannot be changed.
            metricDefinition = JSON.parse(JSON.stringify(metricDefinition));
            const metric = this.metricFactory(metricDefinition);
            if (this.isMetricRegistered(metricDefinition.name)) {
                throw Error('Metric "' + metricDefinition.name + '" has already been registered!');
            }
            const unfulfilledDependencies = metric.getMetricDependencies()
                .filter((metricName) => !this.isMetricRegistered(metricName));
            if (unfulfilledDependencies.length > 0) {
                throw Error('Metric "' + metricDefinition.name +
                    '" has unfulfilled dependencies (registration order matters): '
                    + unfulfilledDependencies);
            }
            const dependencyMetricDefinitions = metric.getMetricDependencies()
                .map((name) => this.getMetric(name).definition);
            metric.verifyDependencyDefinitions(dependencyMetricDefinitions);
            this.metricNameToMetric.set(metricDefinition.name, metric);
            this.registerEvents(this.recordPointToMetrics, metric, metric.getRecordPoints());
            this.registerEvents(this.clearPointToMetrics, metric, metric.getClearPoints());
        }

        private registerEvents(metricMap: Map<RecordPoint, Metric[]>, metric: Metric, events: RecordPoint[]) {
            for (let event of events) {
                let metrics = metricMap.get(event) || [];
                metrics.push(metric);
                metricMap.set(event, metrics);
            }
        }

        /**
         * Returns true, if a metric with this name has been registered, else false.
         * @param metricName
         */
        public isMetricRegistered(metricName: string) {
            return this.metricNameToMetric.has(metricName);
        }

        /**
         * Returns all metrics which have registered for this event of the given type.
         * @param eventName name of the event (e.g. record point)
         * @param eventType type of the event
         */
        public getMetricsForEventPoint(eventName: RecordPoint, eventType: MetricEventType) {
            switch (eventType) {
                case 'clear':
                    return this.clearPointToMetrics.get(eventName) || [];
                case 'record':
                    return this.recordPointToMetrics.get(eventName) || [];
                default:
                    return assertUnreachable(eventType);
            }
        }

        /**
         * Returns the registered metric instance with the given name.
         * Throws an error, if the metric is undefined or not registered.
         * @param metricName name of the metric to lookup (as specified at registration).
         */
        public getMetric(metricName: string): Metric {
            let metric = this.metricNameToMetric.get(metricName);
            if (metric === undefined) {
                throw new Error('Metric "' + metricName + '" is not registered!');
            }
            return metric;
        }

        public getPublicMetricNames(): string[] {
            return [...this.metricNameToMetric.entries()]
                .filter((entry) => {
                    const name: string = entry[0];
                    const metric: Metric = entry[1];
                    return !metric.definition.private;
                }).map((entry) => entry[0]);
        }
    }

    angular.module(moduleName)
        .factory('metricRegistryFactory',
            ['metricFactory', (metricFactory: MetricFactoryFunction) => () => new MetricRegistryImpl(metricFactory)]);
}