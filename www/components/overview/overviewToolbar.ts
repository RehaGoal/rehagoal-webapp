module rehagoal.overviewView {
    const moduleName = 'rehagoal.overviewView';

    export class OverviewToolbarController implements angular.IComponentController {
        public acceptedJSONTypes: string;

        static $inject = [
            '$window'
        ];

        constructor(private $window: angular.IWindowService) {
            this.acceptedJSONTypes = "application/json";
            if ($window.cordova) {
                this.acceptedJSONTypes = "application/octet-stream, application/json";
            }
        }

        $onInit(): void {
        }
    }

    angular.module(moduleName).component('overviewToolbar', {
        templateUrl: 'components/overview/overviewToolbar.html',
        controller: OverviewToolbarController,
        require: {
            overviewCtrl: '^^overviewView'
        },
        bindings: {
            textNewWorkflow: '@',
            textWorkflowImport: '@',
            textServerImport: '@',
            textExportSelection: '@',
            textServerExport: '@',
            textDeleteSelection: '@',
            textFilterWorkflows: '@',
            workflowFilter: '='
        },
    });
}
