module rehagoal.executionView {
    const moduleName = 'rehagoal.executionView';
    interface ExecutionBlock {
        getText(): string
    }

    interface TimerSleepBlock extends ExecutionBlock {
        getStartTimeText(): string
    }

    class ExecutionLogController implements angular.IComponentController {
        static $inject = ['$log', '$scope'];
        executionLog: string[] = [];
        constructor(private $log: angular.ILogService, private $scope: angular.IScope) {
            $scope.$on('subTaskDone', (event, task) => this.onTaskDone(event, task) );
            $scope.$on('taskDone', (event, task) => this.onTaskDone(event, task) );
            $scope.$on('conditionSelectYes', (event, task) => this.onConditionSelectYes(event, task));
            $scope.$on('conditionSelectNo', (event, task) => this.onConditionSelectNo(event, task));
            $scope.$on('sleepTimeOver', (event, task) => this.onSleepTimeOver(event, task));
            $scope.$on('workflowDone', (event, workflowName) => this.onWorkflowDone(event, workflowName));
        }
        $onInit(): void {
        }

        onTaskDone(event: angular.IAngularEvent, task: ExecutionBlock) {
            this.$log.debug("log:done: "+task.getText());
            this.executionLog.push(task.getText());
        }
        onSleepTimeOver(event: angular.IAngularEvent, task: TimerSleepBlock) {
            this.$log.debug("log:sleep: "+task.getText());
            this.executionLog.push("Warte: "+task.getText() + " (" + task.getStartTimeText() + ")");
        }
        onConditionSelectYes(event: angular.IAngularEvent, task: ExecutionBlock) {
            this.$log.debug("log:yes: "+task.getText());
            this.executionLog.push("Ja: "+task.getText());
        }
        onConditionSelectNo(event: angular.IAngularEvent, task: ExecutionBlock) {
            this.$log.debug("log:no: "+task.getText());
            this.executionLog.push("Nein: "+task.getText());
        }
        onWorkflowDone(event: angular.IAngularEvent, workflowName: string) {
            this.$log.debug("log:finish: "+workflowName);
            this.executionLog.push("--- "+workflowName+" beendet ---");
        }
    }

    angular.module(moduleName).component('executionLog', {
        templateUrl: 'components/execution/executionLog.html',
        controller: ExecutionLogController,
        bindings: {
        }
    });
}
