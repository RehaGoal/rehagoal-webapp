module rehagoal.gamification {

    const moduleName = 'rehagoal.gamification';

    export class NavbarGamificationStatusController implements angular.IComponentController {
        static $inject = [
            '$scope',
            '$log',
            'gamificationSettingsService'
        ];

        //only public for testing
        initPromise: Promise<void> | null = null;
        //could be private but is used for easier testing
        public pointsDisplay?: boolean;
        public loaded: boolean = false;

        constructor(private $scope: angular.IScope,
                    private $log: angular.ILogService,
                    private gamificationSettingsService: IGamificationSettingsService) {
        }

        $onInit(): void {
            this.initPromise = this.init();
        }

        private async init(): Promise<void> {
            this.pointsDisplay = await this.gamificationSettingsService.isPointsDisplayEnabled();
            this.subscribeToGamificationEvents();
            this.loaded = true;
            this.$scope.$applyAsync();
        }

        private subscribeToGamificationEvents(): void {
            this.$scope.$on(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, this.updateSettingsFromGamificationSettingsEvent);
        }

        private updateSettingsFromGamificationSettingsEvent: (event: any, setting: GamificationSettingsEntry<GamificationSettingsKey>) => void = (event: any, setting: GamificationSettingsEntry<GamificationSettingsKey>) => {
            switch (setting.settingsKey) {
                case "pointsShowEnabled":
                    this.pointsDisplay = setting.value;
                    this.$scope.$applyAsync();
                    break;
                default:
                    break;
            }
        }

        public assertPointsDisplayWhenLoaded(): boolean {
            return !!(this.loaded && this.pointsDisplay);
        }
    }

    angular.module(moduleName)
        .controller('navbarGamificationStatusController', NavbarGamificationStatusController);
}
