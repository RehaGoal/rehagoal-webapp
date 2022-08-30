module rehagoal.gamification {

    const moduleName = 'rehagoal.gamification';

    export class GamificationSettingsView implements angular.IComponentController {

        static $inject = [
            '$scope',
            '$log',
            'gamificationSettingsService'
        ];

        public pointsRecordingSetterInProgress: boolean = false;
        public pointsDisplaySetterInProgress: boolean = false;
        public iconStyleSetterInProgress: boolean = false;

        initPromise: Promise<void> | null = null;

        public pointsDisplay?: boolean;
        public pointsRecording?: boolean;
        public selectedIconStyle?: GamificationIconStyle;

        public iconStyleArray: GamificationIconStyle[] = GamificationIconStyle.getAllAsArray();

        constructor(private $scope: angular.IScope,
                    private $log: angular.ILogService,
                    private gamificationSettingsService: IGamificationSettingsService) {
        }

        $onInit(): void {
            this.initPromise = this.init();
        }

        private async init(): Promise<void> {
            this.selectedIconStyle = await this.gamificationSettingsService.getIconStyle();
            this.pointsRecording = await this.gamificationSettingsService.isPointsRecordingEnabled();
            this.pointsDisplay = await this.gamificationSettingsService.isPointsDisplayEnabled();
            this.registerWatches();
            this.$scope.$applyAsync();
        }

        private registerWatches(): void {
            const vm = this;
            vm.$scope.$watch(() => vm.pointsRecording!, (newValue: boolean) => vm.setPointsRecording(newValue));
            vm.$scope.$watch(() => vm.pointsDisplay!, (newValue: boolean) => vm.setPointsDisplay(newValue));
        }

        public async setPointsRecording(value: boolean): Promise<void> {
            this.pointsRecordingSetterInProgress = true;
            await this.gamificationSettingsService.setPointsRecordingEnabled(value);
            this.pointsRecording = value;
            this.pointsRecordingSetterInProgress = false;
            this.$scope.$applyAsync();
        }

        public async setPointsDisplay(value: boolean): Promise<void> {
            this.pointsDisplaySetterInProgress = true;
            await this.gamificationSettingsService.setPointsDisplayEnabled(value);
            this.pointsDisplay = value;
            this.pointsDisplaySetterInProgress = false;
            this.$scope.$applyAsync();
        }

        public async setIconStyle(): Promise<void> {
            if (this.iconStyleSetterInProgress) {
                return;
            }

            this.iconStyleSetterInProgress = true;

            try {
                if (this.selectedIconStyle !== await this.gamificationSettingsService.getIconStyle()) {
                    const currentStyle: GamificationIconStyle = GamificationIconStyle.getStyleByName(this.selectedIconStyle!.name);
                    await this.gamificationSettingsService.setIconStyle(currentStyle);
                }
            } catch (err) {
                this.$log.error(`Error while setting new iconStyle. Either couldn't find iconStyle by name (${this.selectedIconStyle?.name}) or while getting old / setting new style.`);
            } finally {
                this.iconStyleSetterInProgress = false;
                this.$scope.$applyAsync();
            }
        }
    }

    angular.module(moduleName)
        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/gamification-settings', {
                template: '<gamification-settings-view></gamification-settings-view>'
            });
        }])
        .component('gamificationSettingsView', {
            templateUrl: 'views/gamification/gamificationSettingsView.html',
            controller: GamificationSettingsView
        });
}
