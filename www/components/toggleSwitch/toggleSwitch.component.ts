module rehagoal.toggleSwitch {
    const moduleName = 'rehagoal.toggleSwitch';

    export class ToggleSwitchComponentController implements angular.IComponentController {
        static $inject = [
        ];

        model: boolean | undefined;
        idCheckbox: string | undefined;
        ngDisabled: boolean | undefined;

        constructor() {
        }
    }

    angular.module(moduleName, [])
        .component('toggleSwitch', {
            templateUrl: 'components/toggleSwitch/toggleSwitch.html',
            controller: ToggleSwitchComponentController,
            bindings: {
                model: '=',
                idCheckbox: '@',
                ngDisabled: '<?'
            }
        });
}
