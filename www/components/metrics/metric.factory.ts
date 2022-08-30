module rehagoal.metrics {
    import RecordPointAssignment = rehagoal.metrics.RecordPointAssignment;
    import extend = rehagoal.utilities.extend;
    const moduleName = 'rehagoal.metrics';

    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    import HOUR_IN_MILLISECONDS = rehagoal.utilities.HOUR_IN_MILLISECONDS;
    import DAY_IN_MILLISECONDS = rehagoal.utilities.DAY_IN_MILLISECONDS;
    import DAYS_PER_WEEK = rehagoal.utilities.DAYS_PER_WEEK;

    export type MetricFactoryFunction = (def: MetricDefinition) => Metric

    export interface AggregateHelpers {
        // average, variance
        numberOfMeasurements?: number,
        /*
        For tracking variance and average in an incremental fashion, we need either
            - numberOfMeasurements, average (N, 1/N * Sum(X_i))
            or
            - numberOfMeasurements, sumOfMeasurements, sumOfMeasurementSquares (N, Sum(X_i), Sum(X_i ^ 2))
            or
            - VARIANCE: numberOfMeasurements, lastMean, M2 (welford's algorithm)
            - MEAN: numberOfMeasurements, sumOfMeasurements
         */
        sumOfMeasurements?: number,

        // variance
        welfordMean?: number,
        welfordM2?: number,

        // min
        lastMin?: number,
        // max
        lastMax?: number,
    }

    export type MetricSnapshot = {
        index: number,
        value: number,
        startOfMeasurement: number | null,
    } & AggregateHelpers

    export type MetricSnapshotWithAssignment = MetricSnapshot & {
        assignment: RecordPointAssignment
    }

    /**
     * Round function used by several metric-specific rounding behaviours.
     */
    const SHARED_ROUND_FUNCTION = Math.floor;

    function sum(values: number[]): number {
        return values.reduce((a, b) => a + b);
    }

    function mean(values: number[]): number {
        return sum(values) / values.length;
    }

    function median(values: number[]): number {
        values = [...values].sort();
        const middle = Math.floor((values.length - 1) / 2);
        if (values.length % 2 === 1) {
            return values[middle];
        } else {
            return (values[middle] + values[middle + 1]) / 2;
        }
    }

    function trimValue(value: number, accuracy: number, roundFunction: (value: number) => number) {
        return roundFunction(value / accuracy) * accuracy;
    }

    function durationAccuracyToUnitBase (durationAccuracyUnit: rehagoal.metrics.DurationAccuracy): number {
        switch (durationAccuracyUnit) {
            case "s":
                return MILLISECONDS_PER_SECOND;
            case "m":
                return MINUTE_IN_MILLISECONDS;
            case "h":
                return HOUR_IN_MILLISECONDS;
            case "d":
                return DAY_IN_MILLISECONDS;
            default:
                /* istanbul ignore next: should never execute */
                return assertUnreachable(durationAccuracyUnit);
        }
    }

    function trimDuration(duration: number, accuracy: DurationAccuracyValue | undefined, roundFunc: (value: number) => number): number {
        if (!accuracy) {
            return duration;
        }
        const durationAccuracyUnit: DurationAccuracy = accuracy[1];
        const durationAccuracyValue: number = accuracy[0];
        let unitBase = durationAccuracyToUnitBase(durationAccuracyUnit);
        return trimValue(duration, durationAccuracyValue * unitBase, roundFunc);
    }

    function trimTimestamp(maybeDate: Date | null, def: MetricDefinition): number | null {
        let maybeTimestampTrimmed: number | null = null;
        if (maybeDate !== null) {
            let timeAcc: TimeAccuracy;
            if (def.agg && def.agg.time !== "all") {
                timeAcc = def.agg.time;
            } else if (def.timestamp) {
                timeAcc = def.timestamp;
            }
            // should be UTC timestamp
            maybeTimestampTrimmed = roundDate(maybeDate, timeAcc!).getTime();
        }
        //console.log('rehagoal.metrics.trimTimestamp: maybeTimestampTrimmed = ' + maybeTimestampTrimmed);
        return maybeTimestampTrimmed;
    }

    function isMetricRecordingTimestamps(def: MetricDefinition) {
        return def.timestamp || (def.agg && def.agg.time !== 'all');
    }

    function roundAggregateAccuracy(value: RecordValue, def: NumberMetricDefinitionMixin | MetaMetricDefinitionMixin,
                                    aggRoundFunc: (value: RecordValue) => RecordValue) {
        if (!def.agg || !def.agg.accuracy) {
            return value;
        }
        return trimValue(value, def.agg.accuracy, aggRoundFunc);
    }

    function getUTCMonday(date: Date) {
        const d = new Date(date);
        //console.log(`rehagoal.metrics.getUTCMonday(${date})`);
        const day = d.getUTCDay();
        const dayDiff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setUTCDate(dayDiff));
    }

    function roundDate(date: Date, timeAccuracy: TimeAccuracy): Date {
        const roundFunction = SHARED_ROUND_FUNCTION;
        let roundedDate = new Date(date);
        roundedDate.setUTCMilliseconds(0);
        roundedDate.setUTCSeconds(0);
        roundedDate.setUTCMinutes(0);
        switch (timeAccuracy) {
            case 'hour':
                break;
            case '1/4day':
                const hourAccuracy = 24 / 4;
                roundedDate.setUTCHours(trimValue(roundedDate.getUTCHours(), hourAccuracy, roundFunction));
                break;
            case 'day':
                roundedDate.setUTCHours(0);
                break;
            case 'week':
                roundedDate.setUTCHours(0);
                roundedDate = getUTCMonday(roundedDate);
                break;
            default:
                /* istanbul ignore next: should never execute */
                assertUnreachable(timeAccuracy);
        }
        return roundedDate;
    }

    function getTimeAccuracyBucketSize(time: TimeAccuracy) {
        const QUARTER_DAY = DAY_IN_MILLISECONDS / 4;
        switch (time) {
            case 'hour':
                return HOUR_IN_MILLISECONDS;
            case '1/4day':
                return QUARTER_DAY;
            case 'day':
                return DAY_IN_MILLISECONDS;
            case 'week':
                return DAYS_PER_WEEK;
            default:
                /* istanbul ignore next: should never execute */
                return assertUnreachable(time);
        }
    }

    type WelfordParams = {
        welfordMean: number
        welfordM2: number,
        numberOfMeasurements: number,
    };

    function updateWelford(lastWelford: WelfordParams, value: RecordValue): WelfordParams {
        // Welford's Online algorithm for computing the variance
        // See https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_Online_algorithm
        let mean = lastWelford.welfordMean;
        let count = lastWelford.numberOfMeasurements + 1;
        const delta = value - lastWelford.welfordMean;
        mean += delta / count;
        const delta2 = value - mean;
        return {
            welfordMean: mean,
            welfordM2: lastWelford.welfordM2 + delta * delta2,
            numberOfMeasurements: count
        };
    }

    export abstract class Metric {
        protected roundFunc: (value: RecordValue) => RecordValue = SHARED_ROUND_FUNCTION;
        protected aggRoundFunc: (value: RecordValue) => RecordValue = SHARED_ROUND_FUNCTION;

        protected constructor(protected _definition: MetricDefinition, protected _db: MetricsDB,
                              protected $Date: DateConstructor) {
            this.verifyBasicConstraints();
            this.verifyMixinConstraints();
        }

        private getBasicConstraintError(): string | undefined {
            let def: MetricDefinition = this.definition;
            if (def.name.trim().length === 0) {
                return 'Metric name should not be empty!';
            }
            if (def.name.trim() !== def.name) {
                return 'Metric name should not be padded with whitespaces.';
            }
            if (this.getRecordPoints().length === 0) {
                return 'No record points.';
            }
            let recordPointSet = new Set();
            for (let i = 0; i < this.getRecordPoints().length; ++i) {
                const recordPoint = this.getRecordPoints()[i];
                let err_prefix = 'RecordPoint with name "' + recordPoint + '" at index ' + i + ' ';
                if (recordPoint.trim() !== recordPoint) {
                    return err_prefix + 'should not be padded with whitespaces.';
                }
                if (recordPoint.length === 0) {
                    return err_prefix + 'should have length > 0.';
                }
                if (recordPointSet.has(recordPoint)) {
                    return err_prefix + 'has already been specified as RecordPoint.';
                }
                recordPointSet.add(recordPoint);
            }
            if (!(def.snapshots === "inf" || (angular.isNumber(def.snapshots) && Number.isInteger(def.snapshots) && def.snapshots > 0))) {
                return 'Number of snapshots has to be integer > 0 or "inf".';
            }
            if (def.agg !== undefined && def.timestamp !== undefined) {
                return 'The attributes "agg" and "timestamp" are mutually exclusive and can not be used together.';
            }
        }

        protected abstract getMixinConstraintError(): string | undefined;

        private verifyMixinConstraints(): void {
            let def = this.definition;
            let err = this.getMixinConstraintError();
            if (err !== undefined) {
                throw Error("Validation failed for metric '" + def.name + "': " + err);
            }
        }

        private verifyBasicConstraints(): void {
            let def = this.definition;
            let err = this.getBasicConstraintError();
            if (err !== undefined) {
                throw Error("Validation failed for metric '" + def.name + "': " + err);
            }
        }

        protected assertValidRecordPoint(recordPoint: RecordPoint): void {
            if (this.getRecordPoints().indexOf(recordPoint) === -1) {
                throw new Error('RecordPoint "' + recordPoint + '" is not handled by this metric.');
            }
        }

        protected assertValidClearPoint(clearPoint: RecordPoint): void {
            if (this.getClearPoints().indexOf(clearPoint) === -1) {
                throw new Error('ClearPoint "' + clearPoint + '" is not handled by this metric.');
            }
        }

        get definition() {
            return this._definition;
        }

        public abstract getRecordPoints(): RecordPoint[]

        public getClearPoints(): RecordPoint[] {
            return this.definition.deleteSnapshotsEvents || [];
        }

        public getMetricDependencies(): string[] {
            return [];
        }

        public verifyDependencyDefinitions(definitions: MetricDefinition[]): void {
        }

        private async deleteAllMySnapshots(): Promise<void> {
            await this._db.deleteSnapshots(this.definition.name);
        }

        public abstract record(recordPoint: RecordPoint, assignment: RecordPointAssignment): Promise<void>

        public async recordValue(recordPoint: RecordPoint, assignment: RecordPointAssignment, value: RecordValue): Promise<void> {
            throw new Error('recordValue is not supported by Metric "' + this.definition.name + '".');
        };

        public async clearSnapshots(clearPoint: RecordPoint): Promise<void> {
            this.assertValidClearPoint(clearPoint);
            this.deleteAllMySnapshots();
        }

        protected verifyAndTrimAssignment(assignment: RecordPointAssignment): RecordPointAssignment {
            const def = this.definition;
            //Change this for new AssignmentOptions
            const allAssignmentOptions: AssignmentOptions = ["schedule", "workflow", "workflowVersion", "execution", "task"];
            const assigned = allAssignmentOptions.filter((option: AssignmentOption) => {
                const field = option + "Id";
                return assignment[field] !== undefined
            });
            const requiredAssignments = allAssignmentOptions
                .filter((option: string) => (<string[]>def.assignment).indexOf(option) !== -1);
            if (requiredAssignments.some((requiredAssingment) => assigned.indexOf(requiredAssingment) === -1)) {
                throw new Error('Not all assignments required by definition are supplied. Required: ' +
                    requiredAssignments + '; Supplied: ' + JSON.stringify(assignment));
            }
            let trimmedAssignment: Partial<RecordPointAssignment> = {};
            requiredAssignments.forEach((option: string) => {
                trimmedAssignment[option + "Id"] = assignment[option + "Id"];
            });
            return trimmedAssignment;
        }

        private isNewSnapshotRequired(lastSnapshot: MetricSnapshot | null, maybeTimestampTrimmed: number | null): boolean {
            const def = this.definition;
            if (lastSnapshot === null) {
                // No snapshot recorded yet => record a new one
                return true;
            }
            if (!def.agg) {
                // If we do not aggregate, we always want a new snapshot
                return true;
            }
            // TODO: If snapshots = 'inf' and agg.time = 'all', ...
            //      ... we could also compute the aggregate over all values (incremental using previous logic) ...
            //      ... but store snapshots of historic aggregates
            //      though this may need more complex logic in the aggregation to select the snapshots correctly for aggregation?
            if (def.agg.time === "all") {
                // We aggregate everything into one value, therefore use the existing snapshot
                return false;
            }
            if (maybeTimestampTrimmed === null) {
                throw new Error('No timestamp supplied, but it is required.');
            }
            return lastSnapshot.startOfMeasurement !== maybeTimestampTrimmed;
        }

        private async shouldDeleteOldestSnapshot(assignment: RecordPointAssignment): Promise<boolean> {
            const def = this.definition;
            if (def.snapshots === 'inf') {
                return false;
            }
            return await this._db.getSnapshotCount(def.name, assignment) >= def.snapshots;
        }

        private mergeSnapshot(lastSnapshot: MetricSnapshot, value: RecordValue, maybeTimestampTrimmed: number | null,
                              valueIsAggregate: boolean): MetricSnapshot {
            const def = this.definition;
            let roundedAggregate = value;

            let aggHelpers = this.computeNewAggregateHelpers(lastSnapshot, value);

            if (def.agg) {
                let aggregateValue = valueIsAggregate ?
                    value :
                    Metric.computeAggregateValueIncremental(def.agg.operation, value, lastSnapshot.value, aggHelpers);
                roundedAggregate = this.roundAggregate(aggregateValue);
            }

            let mergedSnapshot: MetricSnapshot = {
                index: lastSnapshot.index,
                value: roundedAggregate,
                startOfMeasurement: maybeTimestampTrimmed
            };
            this.assignAggregateHelpers(aggHelpers, mergedSnapshot);
            return mergedSnapshot;
        }

        private assignAggregateHelpers(aggHelpers: AggregateHelpers, mergedSnapshot: rehagoal.metrics.MetricSnapshot) {
            if (aggHelpers.numberOfMeasurements !== undefined) {
                mergedSnapshot.numberOfMeasurements = aggHelpers.numberOfMeasurements;
            }
            if (aggHelpers.sumOfMeasurements !== undefined) {
                mergedSnapshot.sumOfMeasurements = aggHelpers.sumOfMeasurements;
            }
            if (aggHelpers.welfordMean !== undefined && aggHelpers.welfordM2 !== undefined) {
                mergedSnapshot.welfordMean = aggHelpers.welfordMean;
                mergedSnapshot.welfordM2 = aggHelpers.welfordM2;
            }
            if (aggHelpers.lastMin !== undefined) {
                mergedSnapshot.lastMin = aggHelpers.lastMin;
            }
            if (aggHelpers.lastMax !== undefined) {
                mergedSnapshot.lastMax = aggHelpers.lastMax;
            }
        }

        private computeNewAggregateHelpers(lastSnapshot: rehagoal.metrics.MetricSnapshot, value: rehagoal.metrics.RecordValue) {
            let aggHelpers: AggregateHelpers = {};
            if (lastSnapshot.numberOfMeasurements !== undefined) {
                aggHelpers.numberOfMeasurements = lastSnapshot.numberOfMeasurements + 1;
            }
            if (lastSnapshot.sumOfMeasurements !== undefined) {
                aggHelpers.sumOfMeasurements = lastSnapshot.sumOfMeasurements + value;
            }
            if (lastSnapshot.welfordMean !== undefined && lastSnapshot.welfordM2 !== undefined && lastSnapshot.numberOfMeasurements  !== undefined) {
                let updatedWelford = updateWelford({
                    numberOfMeasurements: lastSnapshot.numberOfMeasurements,
                    welfordMean: lastSnapshot.welfordMean,
                    welfordM2: lastSnapshot.welfordM2
                }, value);
                aggHelpers.welfordMean = updatedWelford.welfordMean;
                aggHelpers.welfordM2 = updatedWelford.welfordM2;
            }
            if (lastSnapshot.lastMin !== undefined) {
                aggHelpers.lastMin = Math.min(value, lastSnapshot.lastMin);
            }
            if (lastSnapshot.lastMax !== undefined) {
                aggHelpers.lastMax = Math.max(value, lastSnapshot.lastMax);
            }
            return aggHelpers;
        }

        protected static computeAggregateValueIncremental(aggregateOperation: AggregateFunction,
                                                          value: RecordValue,
                                                          previousValue: RecordValue | null,
                                                          aggHelpers: AggregateHelpers): RecordValue {
            switch (aggregateOperation) {
                case "average":
                    if (aggHelpers.numberOfMeasurements === undefined
                        || aggHelpers.sumOfMeasurements === undefined) {
                        throw new Error('missing aggregate helpers for average function');
                    }
                    return aggHelpers.sumOfMeasurements / aggHelpers.numberOfMeasurements;
                case "max":
                    if (aggHelpers.lastMax === undefined) {
                        throw new Error('missing aggregate helpers for max function')
                    }
                    return aggHelpers.lastMax;
                case "min":
                    if (aggHelpers.lastMin === undefined) {
                        throw new Error('missing aggregate helpers for min function')
                    }
                    return aggHelpers.lastMin;
                case "median":
                    // not computable using incremental method
                    //      - maybe estimate from a histogram (with specifiable bin-sizes/-ranges)?
                    //      - alternatively use a meta metric on a private raw metric.
                    throw new Error('not implemented yet');
                case "sum":
                    // alternative does not lead expected value,
                    // since previousValue is previous trimmed aggregate, instead of previous trimmed value
                    // alternative:
                    // return previousValue + value;
                    if (aggHelpers.sumOfMeasurements === undefined) {
                        throw new Error('missing aggregate helpers for sum function');
                    }
                    return aggHelpers.sumOfMeasurements;
                case "variance":
                    if (aggHelpers.numberOfMeasurements === undefined
                        || aggHelpers.welfordMean === undefined
                        || aggHelpers.welfordM2 === undefined) {
                        throw new Error('missing aggregate helpers for variance function');
                    }
                    //population variance (may be corrected afterwards using Bessel's correction)
                    return aggHelpers.welfordM2 / aggHelpers.numberOfMeasurements;
                default:
                    /* istanbul ignore next: should never execute */
                    return assertUnreachable(aggregateOperation);
            }
        }

        protected static computeAggregateValueComplete(aggregateOperation: AggregateFunction,
                                                       values: RecordValue[]): RecordValue {
            if (values.length === 0) {
                return Number.NaN;
            }
            switch (aggregateOperation) {
                case "average":
                    return mean(values);
                case "max":
                    return Math.max(...values);
                case "min":
                    return Math.min(...values);
                case "median":
                    return median(values);
                case "sum":
                    return values.reduce((a, b) => a + b);
                case "variance":
                    // population variance (may be corrected afterwards using Bessel's correction)
                    let x_mean = mean(values);
                    return 1 / values.length * values.reduce((sum, x) => sum + Math.pow(x - x_mean, 2));
                default:
                    /* istanbul ignore next: should never execute */
                    return assertUnreachable(aggregateOperation);
            }
        }

        private isSumOfMeasurementsRequired(aggFunc: AggregateFunction): boolean {
            return ['average', 'variance', 'sum'].some((func) => func === aggFunc);
        }

        private isWelfordRequired(aggFunc: AggregateFunction): boolean {
            return ['variance'].some((func) => func === aggFunc);
        }

        private isLastMinRequired(aggFunc: AggregateFunction): boolean {
            return ['min'].some((func) => func === aggFunc);
        }

        private isLastMaxRequired(aggFunc: AggregateFunction): boolean {
            return ['max'].some((func) => func === aggFunc);
        }

        private isNumberOfMeasurementsRequired(aggFunc: AggregateFunction): boolean {
            // For every aggregate, we also want to at least track and export the number of measurements
            return true;
        }

        private makeNewSnapshot(snapshotIdx: number, maybeTimestampTrimmed: number | null, value: number,
                                valueIsAggregate: boolean): MetricSnapshot {
            const def = this.definition;

            let snapshotValue: RecordValue;
            let aggHelpers: AggregateHelpers | null = null;

            if (def.agg) {
                aggHelpers = this.initializeAggregateHelpers(valueIsAggregate, value);
                const aggregateValue = valueIsAggregate ?
                    value
                    : Metric.computeAggregateValueIncremental(def.agg.operation, value, null, aggHelpers);
                snapshotValue = this.roundAggregate(aggregateValue);
            } else {
                snapshotValue = value;
            }

            const newSnapshot: MetricSnapshot = {
                index: snapshotIdx,
                startOfMeasurement: maybeTimestampTrimmed,
                value: snapshotValue
            };

            if (aggHelpers !== null) {
                this.assignAggregateHelpers(aggHelpers, newSnapshot);
            }

            return newSnapshot;
        }

        private initializeAggregateHelpers(valueIsAggregate: boolean, value: number): AggregateHelpers {
            const def = this.definition;
            if (!def.agg) {
                throw new Error('Metric is not an aggregate metric.');
            }
            let aggHelpers: AggregateHelpers = {};
            if (this.isNumberOfMeasurementsRequired(def.agg.operation)) {
                aggHelpers.numberOfMeasurements = 1;
            }
            if (!valueIsAggregate) {
                if (this.isLastMinRequired(def.agg.operation)) {
                    aggHelpers.lastMin = value;
                }
                if (this.isLastMaxRequired(def.agg.operation)) {
                    aggHelpers.lastMax = value;
                }
                if (this.isSumOfMeasurementsRequired(def.agg.operation)) {
                    aggHelpers.sumOfMeasurements = value;
                }
                if (this.isWelfordRequired(def.agg.operation)) {
                    aggHelpers.welfordMean = value;
                    aggHelpers.welfordM2 = 0;
                }
            }
            return aggHelpers;
        }

        protected async updateSnapshots(assignment: RecordPointAssignment, value: RecordValue, valuesIsAggregate = false,
                                        now = new this.$Date()): Promise<void> {
            const def = this.definition;
            // console.log(`[${def.name}] Metric::updateSnapshots(${JSON.stringify(assignment)}, ${value}, ${valuesIsAggregate})`);
            assignment = this.verifyAndTrimAssignment(assignment);
            const timestampRequired = isMetricRecordingTimestamps(def);
            const maybeDate = timestampRequired ? now : null;

            const maybeTimestampTrimmed = trimTimestamp(maybeDate, def);

            let lastSnapshot = await this._db.getLastSnapshot(def.name, assignment);
            if (this.isNewSnapshotRequired(lastSnapshot, maybeTimestampTrimmed)) {
                //console.log(`New snapshot is required`);
                // create new snapshot
                let snapshotIndex = lastSnapshot !== null ? lastSnapshot.index + 1 : 0;
                if (lastSnapshot !== null && await this.shouldDeleteOldestSnapshot(assignment)) {
                    //console.log(`delete old snapshot`);
                    await this._db.removeOldestSnapshot(def.name, assignment);
                }
                let newSnapshot = this.makeNewSnapshot(snapshotIndex, maybeTimestampTrimmed, value, valuesIsAggregate);
                await this._db.storeNewSnapshot(def.name, assignment, newSnapshot);
            } else {
                if (lastSnapshot === null) {
                    throw new Error('Trying to merge lastSnapshot = null!');
                }
                let updatedSnapshot = this.mergeSnapshot(lastSnapshot, value, maybeTimestampTrimmed, valuesIsAggregate);
                await this._db.overwriteSnapshot(def.name, assignment, updatedSnapshot);
            }
        }

        protected abstract roundAggregate(value: RecordValue): RecordValue;
    }

    class NumberMetric extends Metric {

        constructor(protected _definition: NumberMetricDefinition, protected _db: MetricsDB,
                    protected $Date: DateConstructor) {
            super(_definition, _db, $Date);
        }

        protected getMixinConstraintError(): string | undefined {
            let mixinDef: NumberMetricDefinitionMixin = this.definition;
            if (mixinDef.accuracy !== undefined && mixinDef.accuracy < 0) {
                return "accuracy should not be negative.";
            }
            if (mixinDef.constValue !== undefined && mixinDef.constValueMap !== undefined) {
                return "constValue and constValueMap are mutually exclusive.";
            }
            if (mixinDef.constValue !== undefined && mixinDef.type === 'int' && !Number.isInteger(mixinDef.constValue)) {
                return "constValue should not be float for int metrics.";
            }
            else if (mixinDef.constValueMap !== undefined) {
                const constValueMap = mixinDef.constValueMap;
                const sortedMapKeys = Object.getOwnPropertyNames(constValueMap).sort();
                const sortedRecordPoints = [...mixinDef.recordPoints].sort();
                if (!angular.equals(sortedMapKeys, sortedRecordPoints)) {
                    return "every record point should have a matching entry in constValueMap. Expected arrays to equal: " +
                        `!angular.equals(${JSON.stringify(sortedMapKeys)}, ${JSON.stringify(sortedRecordPoints)})`;
                }
                if (mixinDef.type === 'int' && sortedMapKeys.some((key) => !Number.isInteger(constValueMap[key]))) {
                    return "every value in constValueMap should be int for int metrics";
                }
                if (sortedMapKeys.some((key) => !angular.isNumber(constValueMap[key]))) {
                    return "every value in constValueMap should be a number";
                }
            }
            if (mixinDef.agg !== undefined) {
                if (mixinDef.agg.accuracy !== undefined && mixinDef.agg.accuracy < 0) {
                    return '"agg.accuracy" should not be negative.';
                }
            }
        }

        get definition(): NumberMetricDefinition {
            return this._definition;
        }

        getRecordPoints(): RecordPoint[] {
            return this.definition.recordPoints;
        }

        private trimToAccuracy(value: RecordValue): RecordValue {
            const def = this.definition;
            if (def.accuracy !== undefined) {
                value = trimValue(value, def.accuracy, this.roundFunc);
            }
            return value;
        }

        async record(recordPoint: RecordPoint, assignment: RecordPointAssignment): Promise<void> {
            const def = this.definition;
            this.assertValidRecordPoint(recordPoint);
            if (def.constValue !== undefined) {
                return this.recordValue(recordPoint, assignment, def.constValue);
            } else if (def.constValueMap !== undefined) {
                return this.recordValue(recordPoint, assignment, def.constValueMap[recordPoint]);
            } else {
                throw new Error('Value is needed for NumberMetric without constValue/constValueMap.');
            }
        }

        async recordValue(recordPoint: RecordPoint, assignment: RecordPointAssignment, value: RecordValue): Promise<void> {
            const def = this.definition;
            this.assertValidRecordPoint(recordPoint);
            //console.log(`NumberMetric::recordValue(${recordPoint}, ${JSON.stringify(assignment)}, ${value})`);
            if (def.constValue !== undefined && value !== def.constValue) {
                throw new Error('Value is already provided by constValue definition.');
            }
            if (def.constValueMap !== undefined && value !== def.constValueMap[recordPoint]) {
                throw new Error('Value is already provided by constValueMap definition.');
            }
            if (!angular.isNumber(value)) {
                throw new Error('recordValue needs value to be a number!');
            }
            value = this.trimToAccuracy(value);
            if (def.type === 'int' && !Number.isInteger(value)) {
                throw new Error('Trimmed value does not fit into metric type "' + def.type + '"');
            }
            return this.updateSnapshots(assignment, value);
        }

        protected roundAggregate(value: RecordValue): RecordValue {
            return roundAggregateAccuracy(value, this.definition, this.aggRoundFunc);
        }
    }

    class DurationMetric extends Metric {
        constructor(protected _definition: DurationMetricDefinition, protected _db: MetricsDB,
                    protected $Date: DateConstructor) {
            super(_definition, _db, $Date);
        }

        protected getMixinConstraintError(): string | undefined {
            const def = this.definition;
            if (def.durationAccuracy !== undefined && def.durationAccuracy[0] < 0) {
                return "durationAccuracy should not be negative.";
            }
            let durationMixinDef: DurationMetricDefinitionMixin = def;
            if (durationMixinDef.agg !== undefined
                && durationMixinDef.agg.durationAccuracy !== undefined
                && durationMixinDef.agg.durationAccuracy[0] < 0) {
                return "agg.durationAccuracy should not be negative.";
            }
        }

        get definition(): DurationMetricDefinition {
            return this._definition;
        }

        getRecordPoints(): RecordPoint[] {
            const def = this.definition;
            // TODO: Maybe this is a bit ugly, a clear event is considered a recordPoint?
            return Array.from(new Set([def.recordStart, def.recordStop].concat(def.clearIncompleteEvents || [])));
        }

        async record(recordPoint: RecordPoint, assignment: RecordPointAssignment): Promise<void> {
            const def = this.definition;
            const now = new this.$Date().getTime();
            this.assertValidRecordPoint(recordPoint);
            assignment = this.verifyAndTrimAssignment(assignment);
            // TODO: Maybe this is a bit ugly, since clear is done inside a recordPoint?
            if (def.clearIncompleteEvents !== undefined && def.clearIncompleteEvents.indexOf(recordPoint) !== -1) {
                await this.clearIncomplete();
            }
            if (recordPoint === def.recordStart || recordPoint === def.recordStop) {
                await this.recordStartStop(assignment, recordPoint, now);
            }
        }

        private async clearIncomplete(): Promise<void> {
            const def = this.definition;
            console.log(`DurationMetric::clearIncomplete() ${def.name}`);
            return this._db.clearStartTime(def.name, {});
        }

        private async recordStartStop(assignment: RecordPointAssignment, recordPoint: RecordPoint, now: number) {
            let def = this.definition;
            let startTime = await this._db.getStartTime(def.name, assignment);
            if (recordPoint === def.recordStart) {
                if (startTime !== null) {
                    await this.handleIncomplete(startTime, assignment, now);
                }
                await this.recordStart(now, assignment);
            } else if (recordPoint === def.recordStop) {
                await this.recordStop(startTime, assignment, now);
            }
        }

        private async handleIncomplete(startTime: number | null, assignment: RecordPointAssignment, now: number): Promise<void> {
            const def = this.definition;
            switch (def.handleIncomplete) {
                case "ignore":
                    await this._db.clearStartTime(def.name, assignment);
                    break;
                case "truncate":
                    await this.recordStop(startTime, assignment, now);
                    break;
                default:
                    /* istanbul ignore next: should never execute */
                    return assertUnreachable(def.handleIncomplete);
            }
        }

        private async recordStart(startTime: number, assignment: rehagoal.metrics.RecordPointAssignment) {
            const def = this.definition;
            await this._db.storeStartTime(def.name, assignment, startTime);
        }

        private async recordStop(startTime: number | null, assignment: rehagoal.metrics.RecordPointAssignment, now: number) {
            const def = this.definition;
            if (startTime === null) {
                throw new Error('startTime is null!');
            }
            await this._db.clearStartTime(def.name, assignment);
            const duration = now - startTime;
            //console.log(`now = ${now}; startTime = ${startTime}`);
            //console.log(`non-trimmed duration: ${duration}`);
            const durationTrimmed = trimDuration(duration, def.durationAccuracy, this.roundFunc);
            await this.updateSnapshots(assignment, durationTrimmed);
        }

        protected roundAggregate(value: RecordValue): RecordValue {
            let durationMixinDef: DurationMetricDefinitionMixin = this.definition;
            if (!durationMixinDef.agg || !durationMixinDef.agg.durationAccuracy) {
                return value;
            }
            return trimDuration(value, durationMixinDef.agg.durationAccuracy, this.aggRoundFunc);
        }
    }

    class MetaMetric extends Metric {
        constructor(protected _definition: MetaMetricDefinition, protected _db: MetricsDB,
                    protected $Date: DateConstructor) {
            super(_definition, _db, $Date);
        }

        protected getMixinConstraintError(): string | undefined {
            const mixinDef: MetaMetricDefinitionMixin = this.definition;
            if (mixinDef.agg !== undefined) {
                if (mixinDef.agg.accuracy !== undefined && mixinDef.agg.accuracy < 0) {
                    return '"agg.accuracy" should not be negative.';
                }
            }
        }

        public verifyDependencyDefinitions(definitions: MetricDefinition[]): void {
            const def = this.definition;
            if (definitions.length !== 1) {
                throw new Error('Expected metric definitions array of length 1.');
            }
            const referencedDef = definitions[0];
            if (referencedDef.name !== def.metaReference) {
                throw new Error(`Expected metric definition for '${def.metaReference}', but got definition for ${referencedDef.name}`);
            }
            if (def.agg && def.agg.time !== 'all') {
                if (!isMetricRecordingTimestamps(referencedDef)) {
                    throw new Error(`Meta metric requires timestamps of referenced metric ${def.metaReference}, however they are not required by the referenced metric.`);
                }
                //TODO: Do we need to check whether the timestamp accuracy is not worse than the meta timestamp accuracy?
            }
        }

        get definition(): MetaMetricDefinition {
            return this._definition;
        }

        getRecordPoints(): RecordPoint[] {
            return this.definition.recordPoints;
        }

        getMetricDependencies(): string[] {
            return [this.definition.metaReference];
        }

        protected async updateSnapshots(assignment: RecordPointAssignment): Promise<void> {
            const def = this.definition;
            assignment = this.verifyAndTrimAssignment(assignment);
            const now = new this.$Date();

            if (!def.agg) {
                let lastSnapshot = await this._db.getLastSnapshot(def.metaReference, assignment);
                if (lastSnapshot === null) {
                    // No snapshots of referenced metric exist.
                    // console.log(`[${def.name}] Referenced metric "${def.metaReference}" has not recorded any snapshots yet.`);
                    return;
                }
                return super.updateSnapshots(assignment, lastSnapshot.value, false, now);
            } else {
                let snapshots = await this.getSelectedSnapshots(assignment, now);
                let values = snapshots.map(snapshot => snapshot.value);
                let metaAggregateValue: RecordValue = Metric.computeAggregateValueComplete(def.agg.operation, values);
                return super.updateSnapshots(assignment, metaAggregateValue, true, now);
            }
        }

        private async getSelectedSnapshots(assignment: rehagoal.metrics.RecordPointAssignment, now: Date) {
            const def = this.definition;
            if (!def.agg) {
                throw new Error('not implemented for agg = undefined');
            }
            let snapshots: MetricSnapshotWithAssignment[];
            if (def.agg.time === "all") {
                snapshots = await this._db.getSnapshots(def.metaReference, assignment);
            } else {
                const startOfPeriod = roundDate(now, def.agg.time);
                const endOfPeriod = new this.$Date(startOfPeriod.getTime() + getTimeAccuracyBucketSize(def.agg.time));
                snapshots = await this._db.getSnapshotsWithinTimeFrame(def.metaReference, assignment, startOfPeriod, endOfPeriod);
            }
            return snapshots;
        }

        async record(recordPoint: RecordPoint, assignment: RecordPointAssignment): Promise<void> {
            this.assertValidRecordPoint(recordPoint);
            return this.updateSnapshots(assignment);
        }

        protected roundAggregate(value: RecordValue): RecordValue {
            return roundAggregateAccuracy(value, this.definition, this.aggRoundFunc);
        }
    }

    // TODO: Maybe refactor actual factories and Metric classes into separate files?

    angular.module(moduleName)
        .factory('numberMetricFactory', ['metricsDBService', '$Date',
            (metricsDBService: MetricsDB, $Date: DateConstructor) => {
                return (metricDefinition: NumberMetricDefinition): NumberMetric => {
                    return new NumberMetric(metricDefinition, metricsDBService, $Date);
                }
            }
        ])
        .factory('durationMetricFactory', ['metricsDBService', '$Date',
            (metricsDBService: MetricsDB, $Date: DateConstructor) => {
                return (metricDefinition: DurationMetricDefinition): DurationMetric => {
                    return new DurationMetric(metricDefinition, metricsDBService, $Date);
                }
            }
        ])
        .factory('metaMetricFactory', ['metricsDBService', '$Date',
            (metricsDBService: MetricsDB, $Date: DateConstructor) => {
                return (metricDefinition: MetaMetricDefinition): MetaMetric => {
                    return new MetaMetric(metricDefinition, metricsDBService, $Date);
                };
            }
        ])
        .factory('metricFactory', ['numberMetricFactory', 'durationMetricFactory', 'metaMetricFactory',
            (numberMetricFactory: MetricFactoryFunction,
             durationMetricFactory: MetricFactoryFunction,
             metaMetricFactory: MetricFactoryFunction) => {
                const METRIC_TYPE_FACTORY_PAIRS: [MetricType, MetricFactoryFunction][] = [
                    ['int', numberMetricFactory],
                    ['float', numberMetricFactory],
                    ['duration', durationMetricFactory],
                    ['meta', metaMetricFactory],
                ];
                const METRIC_TYPE_TO_FACTORY_FUNC = new Map<MetricType, MetricFactoryFunction>(METRIC_TYPE_FACTORY_PAIRS);
                return (metricDefinition: MetricDefinition): Metric => {
                    let factory = METRIC_TYPE_TO_FACTORY_FUNC.get(metricDefinition.type);
                    if (!factory) {
                        throw new Error('MetricType ' + metricDefinition.type + ' is not registered.');
                    }
                    return factory(metricDefinition);
                }
            }
        ]);
}