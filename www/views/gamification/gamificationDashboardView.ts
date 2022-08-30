module rehagoal.gamification {

    const moduleName = 'rehagoal.gamification';

    export class GamificationDashboardView implements angular.IComponentController {
        static $inject = [
            '$scope',
            '$rootScope',
            'gamificationService',
            'gamificationSettingsService'
        ];

        initPromise: Promise<void> | null = null;
        public points?: number;
        public level?: number;
        private minPoints?: number;
        private maxPoints?: number;
        public pointsDisplay?: boolean;
        public pointsRecording?: boolean;

        loaded: boolean = false;

        constructor(private $scope: angular.IScope,
                    private $rootScope: angular.IRootScopeService,
                    private gamificationService: IGamificationService,
                    private gamificationSettingsService: IGamificationSettingsService) {
        }

        $onInit(): void {
            this.initPromise = this.init();
        }

        private async init(): Promise<void> {
            this.pointsDisplay = await this.gamificationSettingsService.isPointsDisplayEnabled();
            if (this.pointsDisplay) {
                this.pointsRecording = await this.gamificationSettingsService.isPointsRecordingEnabled();
                await this.updateValuesFromGamificationService();
            }
            this.subscribeToGamificationEvents();
            this.loaded = true;
            this.$scope.$applyAsync();
        }

        private subscribeToGamificationEvents(): void {
            this.$rootScope.$on(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, (event, stats: GamificationStatsPoints) => {
                this.updatePointsFromGamificationEvent(stats);
                this.$scope.$applyAsync();
            });
            this.$rootScope.$on(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, (event, stats: GamificationStatsLevelWithBorder) => {
                this.updateLevelFromGamificationEvent(stats);
                this.$scope.$applyAsync();
            });
            this.$rootScope.$on(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, this.gamificationSettingsChangedEventListener);
        }

        private gamificationSettingsChangedEventListener: (event: any, setting: GamificationSettingsEntry<GamificationSettingsKey>) => void = (event, setting) => {
            switch (setting.settingsKey) {
                case "pointsShowEnabled":
                    this.pointsDisplay = setting.value;
                    this.updateValuesFromGamificationService().then(() => {
                        this.$scope.$applyAsync();
                    });
                    break;
                case "pointsRecordEnabled":
                    this.pointsRecording = setting.value;
                    this.$scope.$applyAsync();
                    break;
                default:
                    break;
            }
        }

        private async updateValuesFromGamificationService(): Promise<void> {
            const stats = await this.gamificationService.getStats();
            this.updatePointsFromGamificationEvent(stats);
            this.updateLevelFromGamificationEvent(stats);
            this.$scope.$applyAsync();
        }

        private updatePointsFromGamificationEvent(stats: GamificationStatsPoints): void {
            this.points = stats.points;
        }

        private updateLevelFromGamificationEvent(stats: GamificationStatsLevelWithBorder): void {
            this.level = stats.level;
            this.minPoints = stats.levelBorder.minPoints;
            this.maxPoints = stats.levelBorder.maxPoints;
        }

        public getCurrentProgress(): number {
            return (this.points! - this.minPoints!) / (this.maxPoints! - this.minPoints!);
        }
    }

    angular.module(moduleName)
        .config(['$routeProvider', function ($routeProvider: ng.route.IRouteProvider) {
            $routeProvider.when('/gamification', {
                template: '<gamification-dashboard-view></gamification-dashboard-view>'
            });
        }])
        .component('gamificationDashboardView', {
            templateUrl: 'views/gamification/gamificationDashboardView.html',
            controller: GamificationDashboardView
        });
}
