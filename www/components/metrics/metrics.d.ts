declare module rehagoal.metrics {
    import XOR = rehagoal.utilities.XOR;

    /** Accuracy unit of a duration measurement */
    type DurationAccuracy = "s" | "m" | "h" | "d"
    /** Accuracy granularity of a timestamp */
    type TimeAccuracy = "week" | "day" | "1/4day" | "hour"
    /** Function names for aggregation operations */
    type AggregateFunction = "min" | "max" | "sum" | "average" | "median" | "variance"
    /** Fields to which a metric result could be assigned to (scope for which it is valid) */
    type AssignmentOption = "schedule" | "workflow" | "workflowVersion" | "execution" | "task"
    // Generation of AssignmentOptions with python2 and sre_yield:
    /*
    import sre_yield

    INCLUDE_EMPTY_ASSIGNMENT = True
    ASSIGNMENT_OPTION_LIST = ["schedule", "workflow", "workflowVersion", "execution", "task"]

    print(("never[] | " if INCLUDE_EMPTY_ASSIGNMENT else "") + " | ".join(
        [str(x) for x in filter(lambda y: y != [],
            sorted(
                [filter(lambda z: z != "", x.replace(",,", ",").strip(",").split(","))
                for x in sre_yield.AllStrings(','.join('(%s)?' % o for o in ASSIGNMENT_OPTION_LIST))
                ], key=lambda x: len(x))
            )
        ]
    ))
	*/
    /** Combination of fields to which a metric result could be assigned to (scope for which it is valid) */
    type AssignmentOptions = never[] |
        ['schedule'] | ['workflow'] | ['workflowVersion'] | ['execution'] | ['task'] |
        ['schedule', 'workflow'] | ['schedule', 'workflowVersion'] | ['workflow', 'workflowVersion'] | ['schedule', 'execution'] | ['workflow', 'execution'] | ['workflowVersion', 'execution'] | ['schedule', 'task'] | ['workflow', 'task'] | ['workflowVersion', 'task'] | ['execution', 'task'] |
        ['schedule', 'workflow', 'workflowVersion'] | ['schedule', 'workflow', 'execution'] | ['schedule', 'workflowVersion', 'execution'] | ['workflow', 'workflowVersion', 'execution'] | ['schedule', 'workflow', 'task'] | ['schedule', 'workflowVersion', 'task'] | ['workflow', 'workflowVersion', 'task'] | ['schedule', 'execution', 'task'] | ['workflow', 'execution', 'task'] | ['workflowVersion', 'execution', 'task'] |
        ['schedule', 'workflow', 'workflowVersion', 'execution'] | ['schedule', 'workflow', 'workflowVersion', 'task'] | ['schedule', 'workflow', 'execution', 'task'] | ['schedule', 'workflowVersion', 'execution', 'task'] | ['workflow', 'workflowVersion', 'execution', 'task'] |
        ['schedule', 'workflow', 'workflowVersion', 'execution', 'task']
    /** Name of strategy how to handle incomplete duration measurements
     * (a new measurement was started before the previous was stopped) */
    type HandleIncompleteOption = "ignore" | "truncate"
    /** Value and unit of the value for the accuracy of a duration measurement */
    type DurationAccuracyValue = [number, DurationAccuracy]
    /** Name of the type of a metric */
    type MetricType = typeof __dummy_metric_def.type
    /** Measurement point/Event name which could be recorded in a metric */
    type RecordPoint = string

    /** Mixin for MetricDefinition to include definitions regarding aggregation */
    type BasicAgg =  {
        /** Time over which the value of a single snapshot is aggregated */
        time: "all" | TimeAccuracy,
        /** Name of the function which is used to aggregate */
        operation: AggregateFunction,
    }

    /** Mixin for MetricDefinition to include duration-type metrics */
    interface DurationMetricDefinitionMixin {
        type: "duration",
        /** RecordPoint / event name when to start the duration measurement */
        recordStart: RecordPoint,
        /** RecordPoint / event name when to stop & store the duration measurement */
        recordStop: RecordPoint,
        /** RecordPoints / event names when to clear begun but non-finished duration measurements */
        clearIncompleteEvents?: RecordPoint[],
        /** Accuracy of the duration measurement */
        durationAccuracy?: DurationAccuracyValue,
        /** Strategy how to handle time measurements which have not been completed (interrupted by another start event) */
        handleIncomplete: HandleIncompleteOption,
        /** Definitions regarding aggregation, if the metric should calculate an aggregate value */
        agg?: {
            /** Accuracy of the duration aggregate value */
            durationAccuracy?: DurationAccuracyValue
        } & BasicAgg
    }

    /** Mixin for MetricDefinition to include number-type metrics */
    type NumberMetricDefinitionMixin = {
        type: "int" | "float",
        /** RecordPoints / event names when to record this metric */
        recordPoints: RecordPoint[],
        /** Accuracy of the value being recorded */
        accuracy?: number
        /** Definitions regarding aggregation, if the metric should calculate an aggregate value */
        agg?: {
            /** Accuracy of the aggregate value */
            accuracy?: number
        } & BasicAgg
    } & ConstValueMixin

    type ConstValueMixin = XOR<ConstValueNumberMixin, ConstValueMapMixin>
    type ConstValueNumberMixin = {
        /** Constant value which, if set, should always be recorded instead of a provided value */
        constValue?: number
    }
    type ConstValueMapMixin = {
        /** Mapping of constant values which, if set, should always be recorded on a given record point
         *  instead of a provided value */
        constValueMap?: {[recordPoint: string]: number}
    }

    /** Mixin for MetricDefinition to include meta-type metrics */
    interface MetaMetricDefinitionMixin {
        type: "meta",
        /** Name of the metric for which the calculation of this meta metric is based on */
        metaReference: string,
        /** RecordPoints / event names when to record this metric */
        recordPoints: RecordPoint[],
        /** Definitions regarding aggregation, if the metric should calculate an aggregate value */
        agg?: {
            /** Accuracy of the aggregate value */
            accuracy?: number
        } & BasicAgg
    }

    /** Base of all MetricDefinitions */
    interface AbstractMetricDefinition {
        /** Name of the metric */
        name: string,
        /** Whether or not this metric is private, i.e. should not be exported to datasets */
        private?: boolean,
        /** RecordPoints / event names when to delete ALL previously recorded snapshots for this metric (useful for private metrics)*/
        deleteSnapshotsEvents?: RecordPoint[],
        /** Combination of fields to which a metric result is assigned to (scope for which it is valid) */
        assignment: AssignmentOptions,
        /** Number of snapshots which are kept at maximum without replacing the oldest one */
        snapshots: number | "inf"
        /** Accuracy of the timestamp to be recorded if this field is set */
        timestamp?: TimeAccuracy,
        /** Whether the order of the snapshots is relevant and should be exported to datasets */
        exportOrder?: boolean,
        /** Definitions regarding aggregation, if the metric should calculate an aggregate value */
        agg?: BasicAgg
    }

    /** Definition of a Metric */
    type MetricDefinition = AbstractMetricDefinition & (DurationMetricDefinitionMixin | NumberMetricDefinitionMixin | MetaMetricDefinitionMixin)
    /** Definition of a DurationMetric (measures durations)*/
    type DurationMetricDefinition = AbstractMetricDefinition & DurationMetricDefinitionMixin
    /** Definition of a NumberMetric (measures integers or floats)*/
    type NumberMetricDefinition = AbstractMetricDefinition & NumberMetricDefinitionMixin
    /** Definition of a MetaMetric (computes a value based on another metric)*/
    type MetaMetricDefinition = AbstractMetricDefinition & MetaMetricDefinitionMixin

    /** Internal dummy metric definition used for Typescript concrete type expansion.
     *  Do not use outside of metrics.d.ts. */
    let __dummy_metric_def: MetricDefinition;

    /** Type of a recorded value */
    type RecordValue = number;
    /** Concrete assignment (scope) of a metric recording/snapshot */
    type RecordPointAssignment = {
        /** Unique ID of the current schedule (scheduleView) */
        scheduleId?: number, // Alternative: schedule id = random UUID. (to ignore the order)
        /** Unique ID of the current workflow */
        workflowId?: string,
        /** Unique ID of the current workflow version */
        workflowVersionId?: string,
        /** Unique ID of the current execution (workflowExecution) */
        executionId?: number, // Alternative: execution id = random UUID. (to ignore the order)
        /** ID of a task in the active workflow */
        taskId?: number,
        /** TS 2.4: Allow weak type **/
        [propName: string]: any,
    } & object

    type MetricEventType = 'record' | 'clear'

    /**
     * Keeps track of registered metrics, their dependencies and their record points.
     * MetricRegistry interface implementation of `MetricService` should be used for registering metrics
     * before they can be used.
     */
    export interface MetricRegistry {
        /**
         * Registers a new metric with the given definition, so that values can be recorded for it.
         * The name of the metric should be unique for the registry.
         * The metric should not have unmet dependencies, therefore all required metrics should be registered beforehand.
         * @param metric Definition of the metric (cannot be changed afterwards)
         * @throws Throws an Error if the definition is invalid or has missing dependencies.
         */
        register(metric: MetricDefinition): void

        /**
         * Returns the names of all public metrics currently registered.
         * This means that metrics having the `private` field set to true, are excluded.
         * This is useful for exports, since we do not want to export private metrics.
         * @returns array of metric names which are registered and public
         */
        getPublicMetricNames(): string[]
    }

    /** Metrics should be recorded using this interface */
    export interface MetricRecorder {
        /** Record metrics without providing an explicit value.
         *  The value must be known/provided by the Metric instead.
         *  @param recordPoint: RecordPoint/event name for which metrics should be recorded
         *  @param assignment: concrete assignment for which the recording is valid
         */
        record(recordPoint: string, assignment: RecordPointAssignment): void
        /** Record metrics with a provided value.
         * The metric has to support a provided value.
         * @param recordPoint: RecordPoint/event name for which metrics should be recorded
         * @param assignment: concrete assignment for which the recording is valid
         * @param value: value to be recorded
         */
        recordValue(recordPoint: string, assignment: RecordPointAssignment, value: RecordValue): void
    }
}