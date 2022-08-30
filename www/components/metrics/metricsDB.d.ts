declare module rehagoal.metrics {
    export type MetricSnapshotDBEntry = MetricSnapshotWithAssignment & {
        metricName: string
    }

    export interface MetricsDB {
        getLastSnapshot(metricName: string, assignment: RecordPointAssignment): Promise<MetricSnapshotWithAssignment | null>

        storeNewSnapshot(metricName: string,
                         assignment: RecordPointAssignment,
                         snapshot: MetricSnapshot): Promise<void>;

        removeOldestSnapshot(metricName: string,
                             assignment: RecordPointAssignment): Promise<void>;

        deleteSnapshots(metricName: string): Promise<void>;

        overwriteSnapshot(metricName: string, assignment: RecordPointAssignment, mergedSnapshot: MetricSnapshot): Promise<void>;

        getStartTime(metricName: string, assignment: RecordPointAssignment): Promise<number | null>;

        storeStartTime(name: string, assignment: RecordPointAssignment, startTime: number): Promise<void>;

        clearStartTime(name: string, assignment: RecordPointAssignment): Promise<void>;

        getSnapshots(metricName: string, assignment: RecordPointAssignment): Promise<MetricSnapshotWithAssignment[]>;

        getSnapshotsWithinTimeFrame(metricName: string, assignment: RecordPointAssignment, startOfPeriod: Date, endOfPeriod: Date): Promise<MetricSnapshotWithAssignment[]>;

        getSnapshotCount(metricName: string, assignment: RecordPointAssignment): Promise<number>;

        getNewExecutionId(workflowId: string): Promise<number>;

        getNewScheduleId(): Promise<number>;

        /**
         * Returns all currently stored snapshot entries for the metrics with the given names.
         * @param metricNames names of the metrics to query snapshots for
         * @returns array of snapshots for the given metrics
         */
        exportMetricSnapshots(metricNames: string[]): Promise<MetricSnapshotDBEntry[]>;
    }
}