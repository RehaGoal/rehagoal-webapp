module rehagoal.overviewView {
    const moduleName = 'rehagoal.overviewView';

    export class WorkflowMenuStripController {
    }

    angular.module(moduleName).component('workflowMenuStrip', {
        templateUrl: 'components/overview/workflowMenuStrip.html',
        controller: WorkflowMenuStripController,
        require: {
            overviewCtrl: '^^overviewView'
        },
        bindings: {
            workflow: '<',
            renameBtnForm: '<'
        },
    });
}
