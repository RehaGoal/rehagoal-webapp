module rehagoal.workflow {
    const moduleName = 'rehagoal.workflow';

    export class WorkflowVersionStudyPersistController implements angular.IComponentController {
        static $inject = [
            '$scope',
            'workflowService',
            'settingsService'
        ];

        constructor(private $scope: angular.IScope,
                    private workflowService: IWorkflowService,
                    private settingsService: rehagoal.settings.SettingsService) {
            $scope.$on('views.studyEntered', this.onStudyModeEnabled);

            if (this.settingsService.studyModeEnabled) {
                this.onStudyModeEnabled();
            };
        }

        private onStudyModeEnabled = async (): Promise<void> => {
            return this.workflowService.persistAllWorkflowsInWorkflowsDB();
        }

    }

    angular.module(moduleName).component('workflowVersionStudyPersist', {
        controller: WorkflowVersionStudyPersistController
    });
}
