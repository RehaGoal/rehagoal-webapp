module rehagoal.metrics {
    const moduleName = 'rehagoal.metrics';


    export class MetricIdGenerator {
        static $inject = [
            'metricsDBService',
        ];

        constructor(private metricsDBService: MetricsDB) {}

        getNewExecutionId(workflowId: string): Promise<number> {
            return this.metricsDBService.getNewExecutionId(workflowId);
        }

        getNewScheduleId(): Promise<number> {
            return this.metricsDBService.getNewScheduleId();
        }
    }

    angular.module(moduleName)
        .service('metricIdGeneratorService', MetricIdGenerator);
}