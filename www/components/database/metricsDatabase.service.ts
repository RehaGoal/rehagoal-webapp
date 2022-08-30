module rehagoal.database {
    import MetricsDB = rehagoal.metrics.MetricsDB;
    import MetricSnapshotWithAssignment = rehagoal.metrics.MetricSnapshotWithAssignment;
    import MetricSnapshotDBEntry = rehagoal.metrics.MetricSnapshotDBEntry;
    import RecordPointAssignment = rehagoal.metrics.RecordPointAssignment;
    import IndexableType = dexie.IndexableType;
    import MetricSnapshot = rehagoal.metrics.MetricSnapshot;
    import powerset = rehagoal.utilities.powerset;
    import extend = rehagoal.utilities.extend;
    const moduleName = 'rehagoal.database';

    interface SnapshotPrimaryKey {
        metricName: string
        index: number
        assignment: RecordPointAssignment
    }

    interface TimeMeasurementsPrimaryKey {
        metricName: string
        assignment: RecordPointAssignment
    }

    interface TimeMeasurementsEntry {
        metricName: string
        assignment: RecordPointAssignment
        startTime: number
    }

    type LastIdType = 'workflowExecution' | 'schedule'

    interface LastIdEntry {
        name: string,
        type: LastIdType
        lastId: number
    }

    interface LastIdPrimaryKey {
        name: LastIdEntry['name'],
        type: LastIdEntry['type']
    }

    export interface MetricsDexie extends dexie.Dexie {
        snapshots: dexie.Dexie.Table<MetricSnapshotDBEntry, SnapshotPrimaryKey>
        timeMeasurements: dexie.Dexie.Table<TimeMeasurementsEntry, TimeMeasurementsPrimaryKey>
        lastIds: dexie.Dexie.Table<LastIdEntry, LastIdPrimaryKey>
    }

    const STRING_DEFAULT_KEY = '';
    const NUMBER_DEFAULT_KEY = -1;

    class MetricsDatabaseService implements MetricsDB {

        static $inject = ['dexieFactory'];

        private dexie: MetricsDexie;

        constructor(private dexieFactory: DexieFactory) {
            this.dexie = dexieFactory<MetricsDexie>('metricsDB');
            const assignmentAttributes = [
                'scheduleId',
                'workflowId',
                'workflowVersionId',
                'executionId',
                'taskId'
            ];
            // Convert assignmentAttributes to Dexie keypath: e.g. scheduleId => assignment.scheduleId
            const assignmentAttributesKeyPaths = assignmentAttributes
                .map((attribute) => `assignment.${attribute}`);
            // Join partial keypaths with '+'
            const assignmentAttributesPartialIndex = assignmentAttributesKeyPaths
                .join('+');
            // Compute all secondary compound indices (all combinations of assignment keypaths)
            const allSecondaryCompoundIndices = powerset(assignmentAttributesKeyPaths) // all combinations
                // return indices in the form of [metricName+...]
                .map((keyPaths) => `[${["metricName"].concat(keyPaths).join("+")}]`);
            // Only necessary compound indices, required by our metrics.
            const necessarySecondaryCompoundIndices: string[] = [
                '[metricName+assignment.workflowId]',
                '[metricName+assignment.workflowId+assignment.workflowVersionId]',
                '[metricName+assignment.workflowId+assignment.executionId]',
                '[metricName+assignment.workflowId+assignment.executionId+assignment.taskId]',
                '[metricName+assignment.scheduleId]',
                '[metricName+assignment.scheduleId+assignment.workflowId]',
            ];
            // Currently we keep only necessary indices to improve performance for our metrics. Other metrics may require different indices (db size vs. performance)
            const secondaryCompoundIndices = necessarySecondaryCompoundIndices;

            this.dexie.version(1).stores({
                snapshots: `[metricName+${assignmentAttributesPartialIndex}+index],metricName,${secondaryCompoundIndices.join(",")},index`,
                timeMeasurements: `[metricName+${assignmentAttributesPartialIndex}],metricName,${secondaryCompoundIndices.join(",")}`,
                lastIds: '[name+type]',
            });
        }

        async exportMetricSnapshots(metricNames: string[]): Promise<MetricSnapshotDBEntry[]> {
            const db = this.dexie;
            // TODO: Trim snapshots, while keeping metricName?
            // TODO: Differentiate between exportOrder: true/false metrics
            return db.transaction('r', db.snapshots, () => {
                return db.snapshots.where('metricName').anyOf(metricNames).toArray()
                    .then((snapshots) => {
                        return snapshots;
                    })
            });
        }

        async clearStartTime(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment): Promise<void> {
            //console.log(`MetricsDB::clearStartTime(${metricName}, ${JSON.stringify(assignment)})`);
            this.verifyAssignmentType(assignment);
            this.assertNoDefaultKeys(metricName, assignment);
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            await this.dexie.timeMeasurements.where(equalityCriteria).delete();
        }

        async getLastSnapshot(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment): Promise<rehagoal.metrics.MetricSnapshotWithAssignment | null> {
            //TODO: Maybe assert no default keys?
            //console.log(`[MetricsDB::getLastSnapshot(${metricName},${JSON.stringify(assignment)})`);
            this.verifyAssignmentType(assignment);
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            let snapshotsSorted = await this.dexie.snapshots.where(equalityCriteria).reverse().sortBy('index');
            if (snapshotsSorted.length === 0) {
                return null;
            }
            return this.trimSnapshot(snapshotsSorted[0]);
        }

        async getSnapshotCount(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment): Promise<number> {
            //TODO: Maybe assert no default keys?
            //console.log(`[MetricsDB::getSnapshotCount(${metricName},${JSON.stringify(assignment)})`);
            this.verifyAssignmentType(assignment);
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            return this.dexie.snapshots.where(equalityCriteria).count();
        }

        async getSnapshots(metricName: string, assignment: RecordPointAssignment): Promise<MetricSnapshotWithAssignment[]> {
            this.verifyAssignmentType(assignment);
            //TODO: Maybe assert no default keys?
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            let rawSnapshots = await this.dexie.snapshots.where(equalityCriteria).toArray();
            return rawSnapshots.map(this.trimSnapshot);
        }

        async getSnapshotsWithinTimeFrame(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment, startOfPeriod: Date, endOfPeriod: Date): Promise<rehagoal.metrics.MetricSnapshotWithAssignment[]> {
            this.verifyAssignmentType(assignment);
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            return this.dexie.snapshots.where(equalityCriteria).and((snap) => {
                if (snap.startOfMeasurement === null) {
                    throw new Error('Expected snapshot to have a timestamp, but is has not.');
                }
                return snap.startOfMeasurement >= startOfPeriod.getTime() && snap.startOfMeasurement < endOfPeriod.getTime();
            }).toArray();
        }

        async getStartTime(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment): Promise<number | null> {
            this.verifyAssignmentType(assignment);
            let equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            const entry = await this.dexie.timeMeasurements.where(equalityCriteria).first();
            if (entry === undefined) {
                return null;
            }
            return entry.startTime;
        }

        async overwriteSnapshot(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment, mergedSnapshot: rehagoal.metrics.MetricSnapshot): Promise<void> {
            //console.log(`[MetricsDB::overwriteSnapshot(${metricName},${JSON.stringify(assignment)},${JSON.stringify(mergedSnapshot)})`);
            this.verifyAssignmentType(assignment);
            this.assertNoDefaultKeys(metricName, assignment, mergedSnapshot);
            assignment = this.completeAssignmentWithDefaultValues(assignment);
            const entry: MetricSnapshotWithAssignment = extend(mergedSnapshot, {
                metricName,
                assignment
            });
            const primaryKey = {metricName, assignment, index: mergedSnapshot.index};
            await this.dexie.snapshots.update(primaryKey, entry);
        }

        async removeOldestSnapshot(metricName: string, assignment: RecordPointAssignment): Promise<void> {
            //console.log(`[MetricsDB::removeOldestSnapshot(${metricName},${JSON.stringify(assignment)})`);
            let db = this;
            this.verifyAssignmentType(assignment);
            this.assertNoDefaultKeys(metricName, assignment);
            assignment = this.completeAssignmentWithDefaultValues(assignment);
            const equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            // TODO: is this guaranteed to have always the correct order (ORDER BY index ASC)
            return this.dexie.transaction('rw', this.dexie.snapshots, async function() {
                const primaryKeysSorted = await db.dexie.snapshots.where(equalityCriteria).primaryKeys();
                if (primaryKeysSorted.length === 0) {
                    throw new Error('There are no snapshots stored for the given assignment!');
                }
                const oldestSnapshot = primaryKeysSorted[0];
                return db.dexie.snapshots.delete(oldestSnapshot);
            });
        }

        async deleteSnapshots(metricName: string): Promise<void> {
            console.log(`MetricsDB::deleteSnapshots(${metricName}`);
            const db = this;
            const assignment = {};
            this.assertNoDefaultKeys(metricName, assignment);
            const equalityCriteria = this.getKeyPathCriteria(metricName, assignment);
            db.dexie.transaction('rw', this.dexie.snapshots, async function() {
                return db.dexie.snapshots.where(equalityCriteria).delete();
            })
        }

        async storeNewSnapshot(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment, snapshot: rehagoal.metrics.MetricSnapshot): Promise<void> {
            this.verifyAssignmentType(assignment);
            this.assertNoDefaultKeys(metricName, assignment, snapshot);
            assignment = this.completeAssignmentWithDefaultValues(assignment);
            const entry: MetricSnapshotDBEntry = extend(snapshot, {
                metricName,
                assignment
            });
            await this.dexie.snapshots.add(entry);
        }

        async storeStartTime(metricName: string, assignment: RecordPointAssignment, startTime: number): Promise<void> {
            //console.log(`MetricsDB::storeStartTime(${metricName}, ${JSON.stringify(assignment)}, ${startTime})`);
            this.verifyAssignmentType(assignment);
            this.assertNoDefaultKeys(metricName, assignment);
            assignment = this.completeAssignmentWithDefaultValues(assignment);
            const entry: TimeMeasurementsEntry = {
                metricName,
                assignment,
                startTime
            };
            await this.dexie.timeMeasurements.add(entry);
        }

        async getNewExecutionId(workflowId: string): Promise<number> {
            const entryType = 'workflowExecution';
            return this.getNewId(workflowId, entryType);
        }

        async getNewScheduleId(): Promise<number> {
            const entryType = 'schedule';
            return this.getNewId(entryType, entryType);
        }

        private async getNewId(forName: string, type: LastIdType) {
            let db = this;
            return this.dexie.transaction('rw', this.dexie.lastIds, async function() {
                const lastIdEntry = await db.dexie.lastIds.get({name: forName, type});
                let newId;
                if (lastIdEntry === undefined) {
                    newId = 0;
                } else {
                    newId = lastIdEntry.lastId + 1;
                }
                await db.dexie.lastIds.put({name: forName, type, lastId: newId});
                return newId;
            });
        }

        private verifyAssignmentType(assignment: RecordPointAssignment): void {
            if (!angular.isObject(assignment)) {
                throw Error('Assignment should be of object type.');
            }
            if (angular.isArray(assignment)) {
                throw Error('Assignment should not be an array.');
            }
            const emptyAssignment = this.getEmptyAssignment();
            for (const key in assignment) {
                if (assignment.hasOwnProperty(key) && !emptyAssignment.hasOwnProperty(key)) {
                    throw Error(`Property ${key} is not allowed in assignment.`);
                }
            }
        }

        private completeAssignmentWithDefaultValues(assignment: RecordPointAssignment): RecordPointAssignment {
            const emptyAssignment = this.getEmptyAssignment();
            return extend(emptyAssignment, assignment);
        }

        private trimSnapshot = (rawSnapshot: MetricSnapshotWithAssignment): MetricSnapshotWithAssignment => {
            let snapshot = this.filterDefaultKeys(rawSnapshot);
            delete snapshot['metricName'];
            return snapshot;
        };

        private getKeyPathCriteria(metricName: string, assignment: rehagoal.metrics.RecordPointAssignment) {
            return extend({metricName}, this.getAssignmentAsKeyPathCriteria(assignment));
        };

        private getAssignmentAsKeyPathCriteria(assignment: RecordPointAssignment) {
            let criteria: { [key: string]: IndexableType } = {};
            for (const key in assignment) {
                if (assignment.hasOwnProperty(key)) {
                    let keyPath = `assignment.${key}`;
                    criteria[keyPath] = assignment[key];
                }
            }
            return criteria;
        }

        private getEmptyAssignment(): RecordPointAssignment {
            return {
                scheduleId: NUMBER_DEFAULT_KEY,
                workflowId: STRING_DEFAULT_KEY,
                workflowVersionId: STRING_DEFAULT_KEY,
                executionId: NUMBER_DEFAULT_KEY,
                taskId: NUMBER_DEFAULT_KEY,
            };
        }

        private assertNoDefaultKeys(metricName: string, assignment: RecordPointAssignment, snapshot?: MetricSnapshot) {
            const emptyAssignment = this.getEmptyAssignment();
            if (metricName === STRING_DEFAULT_KEY) {
                throw new Error('Metric name should not be empty!');
            }
            for (const key in emptyAssignment) {
                if (assignment.hasOwnProperty(key)) {
                    if (assignment[key] === emptyAssignment[key]) {
                        throw new Error(`Assignment of option ${key} should not be ${JSON.stringify(emptyAssignment[key])}`);
                    }
                }
            }
            if (snapshot !== undefined && snapshot.index === NUMBER_DEFAULT_KEY) {
                throw new Error(`Snapshot index should not be ${NUMBER_DEFAULT_KEY}`);
            }
        }

        private filterDefaultKeys = (snapshot: MetricSnapshotWithAssignment): MetricSnapshotWithAssignment => {
            const emptyAssignment = this.getEmptyAssignment();
            for (const key in emptyAssignment) {
                if (snapshot.assignment.hasOwnProperty(key)) {
                    if (snapshot.assignment[key] === emptyAssignment[key]) {
                        delete snapshot.assignment[key];
                    }
                }
            }
            return snapshot;
        };
    }

    angular.module(moduleName).service('metricsDBService', MetricsDatabaseService);

}
