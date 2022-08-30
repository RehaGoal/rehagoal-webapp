module rehagoal.gamification {

    const moduleName = 'rehagoal.gamification';

    export enum Color {
        BLUE = "blue",
        LIGHTBLUE = "lightblue",
        GREEN = "green",
        ORANGE = "orange",
        RED = "red",
        PURPLE = "purple"
    }

    export class NavbarGamificationComponentController implements angular.IComponentController {
        static $inject = [
            '$scope',
            'gamificationSettingsService',
            'gamificationService'
        ];

        // only public due to testing
        public initPromise: Promise<void> | null = null;
        public loaded: boolean = false;

        private points?: number;
        private minPoints?: number;
        private maxPoints?: number;

        private allColors: Color[] = Object.keys(Color).map(key => Color[key]);

        public shownLevel?: number;
        public icon?: GamificationIconStyle;

        /**
         * when true, animated-level-up CSS class is added to the level icon.
         * gets set to false on animation end by directive, removing the animated-level-up class
         */
        public animatingLevelUp: boolean = false;
        /**
         * when true, animate-confetti CSS class is added to the confetti container.
         * gets set to false on animation end by directive, removing the animate-confetti class
         */
        public animatingConfetti: boolean = false;

        /**
         * map object that maps the key to its representative addedPoints string
         * used to track the pointsAnimation objects and to remove them accordingly
         * the index key is just all pointAdd events counted to identify the addedPoints uniquely
         * the value represents the addedPoints object, i.e. it is the shown number of points in that animation element
         */
        public addedPoints: {[key: number]: string} = {};
        private addPointsIndex = 0;

        constructor(private $scope: angular.IScope,
                    private gamificationSettingsService: GamificationSettingsService,
                    private gamificationService: IGamificationService) {

        }

        $onInit(): void {
            this.initPromise = this.init();
        }

        /** initializing progress values
         *  initializing icon value
         *  subscribe to Event Broadcasts */
        private async init(): Promise<void> {
            await this.updateValuesFromGamificationService();
            await this.updateValuesFromGamificationSettingsService();
            this.subscribeToGamificationEvents();
            this.loaded = true;
            this.$scope.$applyAsync();
        }

        private subscribeToGamificationEvents(): void {
            this.$scope.$on(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, this.updatePointsFromGamificationEvent);
            this.$scope.$on(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, this.updateLevelFromGamificationEvent);
            this.$scope.$on(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, this.updateSettingsFromGamificationSettingsEvent);
        }

        private async updateValuesFromGamificationService(): Promise<void> {
            const stats = await this.gamificationService.getStats();
            this.setPointsFromStats(stats);
            this.setLevelAndMinMaxPointsFromStats(stats);
            this.$scope.$applyAsync();
        }

        private async updateValuesFromGamificationSettingsService(): Promise<void> {
            this.icon = await this.gamificationSettingsService.getIconStyle();
            this.$scope.$applyAsync();
        }

        /**
         * applies points from given GamificationStatsPoints object
         * adds the difference to previous points to addedPoints Object,
         * based on addedPoints Object, pointsAdded animation elements are added to DOM by an ng-repeat directive
         * NOTE: ignores 'level' from stats object
         * @param stats - GamificationStatsPoints to be applied
         * @private
         */
        private updatePointsFromGamificationEvent: (event: any, stats: GamificationStatsPoints) => void = (event, stats: GamificationStatsPoints) => {
            const difference = stats.points - this.points!;
            const sign: string = difference >= 0 ? '+' : ''
            this.addedPoints[this.addPointsIndex++] = sign + difference;
            this.setPointsFromStats(stats);
            this.$scope.$applyAsync();
        }

        /**
         * applies level from given GamificationStatsLevelWithBorder object
         * starts the levelUp animation
         * NOTE: ignores 'points' from stats object
         * @param stats - GamificationStatsLevelWithBorder to be applied
         * @private
         */
        private updateLevelFromGamificationEvent: (event: any, stats: GamificationStatsLevelWithBorder) => void = (event, stats: GamificationStatsLevelWithBorder) => {
            this.setLevelAndMinMaxPointsFromStats(stats);
            this.animateLevelUp();
        }

        private updateSettingsFromGamificationSettingsEvent: (event: any, setting: GamificationSettingsEntry<GamificationSettingsKey>) => void = (event: any, setting: GamificationSettingsEntry<GamificationSettingsKey>) => {
            switch (setting.settingsKey) {
                case "iconStyleName":
                    this.icon = GamificationIconStyle.getStyleByName(setting.value);
                    this.$scope.$applyAsync();
                    break;
                default:
                    break;
            }
        }

        private setPointsFromStats(stats: GamificationStatsPoints): void {
            this.points = stats.points;
        }

        private setLevelAndMinMaxPointsFromStats(stats: GamificationStatsLevelWithBorder): void {
            this.shownLevel = stats.level;
            this.minPoints = stats.levelBorder.minPoints;
            this.maxPoints = stats.levelBorder.maxPoints;
        }

        /**
         * returns the appropriate css icon color class name from given color name
         * @param color
         * @private
         */
        private iconClassStringFromColor(color: Color): string {
            return "icon-" + color;
        }

        /**
         * opacity of progress bar
         * configured to be pale when empty and getting more opaque when getting points
         */
        public getProgressOpacity(): number {
            const opacity = (this.getProgressBarValue() / this.getProgressBarMax()) + 0.2;
            return Math.min(opacity, 1);
        }

        /**
         * calculates and returns max attribute for level progress uib bar
         */
        public getProgressBarMax(): number {
            return this.maxPoints! - this.minPoints!;
        }

        /**
         * calculates and returns value attribute for level progress uib bar
         */
        public getProgressBarValue(): number {
            return this.points! - this.minPoints!;
        }

        /**
         * calculates and returns current color based on level
         */
        public getCurrentColor(): Color {
            return this.allColors[this.shownLevel! % this.allColors.length];
        }

        /**
         * calculates and returns current icon class string based on level
         */
        public getIconClass(): string {
            return this.iconClassStringFromColor(this.getCurrentColor());
        }

        /**
         * sets animatingLevelUp boolean to "true",
         * based on that boolean, the animation css class is added to respective html element by ngClass
         */
        private animateLevelUp(): void {
            this.animatingLevelUp = true;
            this.animatingConfetti = true;
            this.$scope.$applyAsync();
        }

        /**
         * sets animatingLevelUp boolean to "false",
         * based on that boolean, the animation css class is removed from respective html element by ngClass
         * used as OnAnimate directive callback
         */
        public levelUpAnimationEnded: () => void = () => {
            this.animatingLevelUp = false;
            this.animatingConfetti = false;
            this.$scope.$applyAsync();
        }

        /**
         * removes an attribute from addedPoints object
         * by doing this, an pointsAdded animation element from DOM is removed, as they are based on ng-repeat directive
         * used as OnAnimateDirective callback
         * @param key - the key to be removed from addedPoints
         */
        private pointsAnimationEnded: (key: number) => void = (key: number) => {
            return this.deleteAnimatedPointsElement(key);
        }

        /**
         * Deletes the animated points element with the given identifier.
         * @param key key in this.addedPoints.
         * @private
         */
        private deleteAnimatedPointsElement(key: number): void {
            delete this.addedPoints[key];
            this.$scope.$applyAsync();
        }

        /**
         *
         * @param key key in this.addedPoints.
         * @private
         */
        private clearAnimatedPointsElement(key: number): void {
            /* Angular does not delete the element until the animation is finished.
             * Therefore we set the string to the empty string, to "hide" the element, until it is finally removed by
             * the fallback behaviour of the $animate service.
             * See also: https://github.com/angular/angular.js/issues/13436
             */
            this.addedPoints[key] = "";
            this.$scope.$applyAsync();
        }

        /**
         * Called by on-animate directive, when an animation has been restarted (start->cancel->start).
         * The animated points element is deleted, in order to prevent running the animation again,
         * after it has been cancelled (e.g. due to change in the display property of the container
         * due to responsive layout changes).
         * @param key key in this.addedPoints.
         */
        public onPointsAnimationRestart: (key: number) => void = (key: number) => {
            return this.deleteAnimatedPointsElement(key);
        };

        /**
         * Triggered by on-animate callback, in start/close phase (defined in the template).
         * - Clears the animated points element in order to prevent running the animation again when an (initially) hidden
         * element gets visible (start phase, element not visible).
         * - Calls pointsAnimationEnded, when the animation has ended (close phase).
         * @param key key in this.addedPoints.
         * @param phase phase of the animation, as specified by angular-animate (either "start" or "close")
         * @param visible whether the element was visible, when the event was received.
         */
        public onPointsAnimation: (key: number, phase: "start" | "close",  visible: boolean) => void = (key, phase,  visible) => {
            if (phase === "start" && !visible) {
                /* In case the element is not displayed (display: none), there are no native animation events, but only the
                 * ones from the $animate service. The "close" phase, however happens delayed in such case by
                 * a factor (CLOSING_TIME_BUFFER = 1.5) of the expected animation duration in angular-animate.
                 * To prevent points from being shown "again" if the view size is changed and another navbarGamification
                 * component gets visible, we try to prevent the points element from being visible in the first place in
                 * initially invisible navbarGamification elements.
                 */
                this.clearAnimatedPointsElement(key);
            } else if (phase === "close") {
                this.pointsAnimationEnded(key);
            }
        };
    }

    angular.module(moduleName)
        .component('navbarGamification', {
            templateUrl: 'components/gamification/navbarGamification.html',
            controller: NavbarGamificationComponentController,
            bindings: {
            }
        });
}
