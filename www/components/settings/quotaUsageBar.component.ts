module rehagoal.settings {
    const moduleName = 'rehagoal.settings';

    class QuotaUsageBarController {
        private _usage: number = -1;
        private _quota: number = -1;
        private _supported: boolean = true;

        static $inject = [
            '$scope',
            'storageManager'
        ];

        constructor(private $scope: angular.IScope,
                    private storageManager: StorageManager) {
            this.updateQuotaEstimate();
        }

        get usage(): number {
            return this._usage;
        }

        get quota(): number {
            return this._quota;
        }

        get supported(): boolean {
            return this._supported;
        }

        public updateQuotaEstimate(): Promise<void> {
            let vm = this;
            if (!vm.storageManager) {
                vm._usage = -1;
                vm._quota = -1;
                vm._supported = false;
                return Promise.resolve();
            }
            return vm.storageManager.estimate().then(function(estimate) {
                vm.$scope.$evalAsync(() => {
                    vm._usage = estimate.usage ?? -1;
                    vm._quota = estimate.quota ?? -1;
                });
            });
        }
    }

    angular.module(moduleName)
        .component('quotaUsageBar', {
            templateUrl: 'components/settings/quotaUsageBar.html',
            controller: QuotaUsageBarController
        })
}
