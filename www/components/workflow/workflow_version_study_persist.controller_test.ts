module rehagoal.workflow {
    import SettingsService = rehagoal.settings.SettingsService;

    describe('workflowVersionStudyPersist tests', () => {
        let settingsService: SettingsService, workflowService: IWorkflowService;
        let $componentController: angular.IComponentControllerService, $rootScope: angular.IRootScopeService;

        beforeEach(() => angular.mock.module('rehagoal.workflow'));

        beforeEach(inject((_$componentController_: angular.IComponentControllerService,
                                    _settingsService_: SettingsService,
                                    _workflowService_: IWorkflowService,
                                    _$rootScope_: angular.IRootScopeService) => {
            $componentController = _$componentController_;
            settingsService =  _settingsService_;
            workflowService = _workflowService_;
            $rootScope = _$rootScope_;
        }));

        describe('settingsView controller', () => {
            let bindings: {}, $scope: angular.IScope, WorkflowVersionStudyPersistCtrl: WorkflowVersionStudyPersistController;

            beforeEach(() => {
                spyOn(workflowService, 'persistAllWorkflowsInWorkflowsDB').and.callThrough();
            });

            describe('studyMode enabled', () => {
                beforeEach(() => {
                    bindings = {};
                    $scope = $rootScope.$new();
                    settingsService.studyModeEnabled = true;
                    WorkflowVersionStudyPersistCtrl = $componentController('workflowVersionStudyPersist', {$scope: $scope}, bindings);
                });

                it('should call workflowService if "views.studyEntered" event occured', () => {
                    $rootScope.$broadcast('views.studyEntered');
                    expect(workflowService.persistAllWorkflowsInWorkflowsDB).toHaveBeenCalled();
                });

                it('should call workflowService if studyMode is enabled on startup', () => {
                    expect(workflowService.persistAllWorkflowsInWorkflowsDB).toHaveBeenCalled();
                });
            });

            describe('studyMode disabled', () => {
                beforeEach(() => {
                    bindings = {};
                    $scope = $rootScope.$new();
                    settingsService.studyModeEnabled = false;
                    WorkflowVersionStudyPersistCtrl = $componentController('workflowVersionStudyPersist', {$scope: $scope}, bindings);
                });

                it('should not call workflowService if studyMode is disabled on startup', () => {
                    expect(workflowService.persistAllWorkflowsInWorkflowsDB).not.toHaveBeenCalled();
                });
            })
        });
    });
}
