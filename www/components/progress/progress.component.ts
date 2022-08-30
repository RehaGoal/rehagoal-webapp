module rehagoal.overviewView {

    const moduleName = 'rehagoal.overviewView';
    const FADE_OUT_TIME = 2000;

    /**
     * Contains all information regarding a single progress bar
     */
    export interface IProgressBar {
        type: string,
        text: string,
        eventsCount: number,
        eventsTotal: number,
        finished: boolean, // Streamed progress may not know total events in advance.
    }

    export class progressController implements angular.IComponentController {
        private bars: IProgressBar[] = [];

        /**
         * progressBarTypes determines colours of the progress bars. E.g. success is a lightish green, null is default app colour
         * @type {string[]}
         */
        private progressBarTypes: string[] = ["success", "null"];

        private $interval: angular.IIntervalService;
        private $scope: angular.IScope;

        private getProgress: () => IProgressBar[] = () => [];
        private updateEvent: string = '';

        static $inject = [
            '$interval',
            '$scope'
        ];

        constructor($interval: angular.IIntervalService, $scope: angular.IScope) {
            this.$interval = $interval;
            this.$scope = $scope;
        }

        $onInit(): void {
            let vm = this;
            vm.$scope.$on(vm.updateEvent, function () {
                vm.update(vm.getProgress());
            });
        }

        public getBars(): IProgressBar[] {
            return this.bars;
        }

        private update(bars: IProgressBar[])  {
            let vm = this;

            vm.bars = bars;
            for (let i = 0; i < vm.bars.length; i++) {
                if (vm.bars[i].type === "") {
                    vm.bars[i].type = vm.progressBarTypes[i % vm.progressBarTypes.length];
                }
            }
            vm.$scope.$applyAsync();

            vm.checkForProgressFinishAndHideBars();
        }

        private checkForProgressFinishAndHideBars(): void {
            if (this.checkForProgressFinish()) {
                this.$interval(() => {
                    if (this.checkForProgressFinish()) {
                        this.bars = [];
                    }
                }, FADE_OUT_TIME, 1);
            }

        }

        private checkForProgressFinish(): boolean {
            for (let bar of this.bars) {
                if (!bar.finished || bar.eventsCount !== bar.eventsTotal) {
                    return false;
                }
            }
            return true;
        }
    }

    angular.module(moduleName).component('progressBar', {
        templateUrl: 'components/progress/progressBar.html',
        controller: progressController,
        bindings: {
            getProgress: '<',
            updateEvent: '<',
            barWidth: '<'
        }
    });
}
