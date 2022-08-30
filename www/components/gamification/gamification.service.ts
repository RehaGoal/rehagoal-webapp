module rehagoal.gamification {
    import GamificationStatsEntry = rehagoal.database.GamificationStatsEntry;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    import GamificationDB = rehagoal.database.GamificationDB;

    const moduleName = 'rehagoal.gamification';

    /**
     * Event name which is used for $scope.$broadcast
     * to notify if gamification changes occurred
     */
    export const GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT = 'gamificationUpdatePointsIncreased';
    export const GAMIFICATION_UPDATE_LEVEL_UP_EVENT = 'gamificationUpdateLevelUp';

    /**
     * Definition of the different types that a PointEvent
     * might have / can occur. Each entry will have an
     * internal mapping to show how many points will be gained.
     */
    export enum GamificationEventType {
        TASK_DONE = 'task_done',
        WORKFLOW_START = 'workflow_start',
        WORKFLOW_FINISH = 'workflow_finish'
    }

    /**
     * Struct for the level progress, which can be used for e.g. a progressBar
     * to define the borders. These borders are in relation to the current level
     * which can be pulled with getStats()
     */
    interface LevelProgressBorders {
        minPoints: number,
        maxPoints: number
    }

    /**
     * Struct for gamification statistics, only
     * containing the points property
     */
    export interface GamificationStatsPoints {
        points: number
    }

    /**
     * Struct for gamification statistics, only
     * containing the level and levelBorder properties
     */
    export interface GamificationStatsLevelWithBorder {
        level: number,
        levelBorder: LevelProgressBorders
    }

    /**
     * Struct for gamification statistics, containing
     * points, level and the border for the given level
     */
    export interface GamificationStats extends GamificationStatsPoints, GamificationStatsLevelWithBorder {
    }

    /**
     * Mapping of GamificationPointsEvent to a number (points),
     * which represents the points that can be gained by such event
     */
    export type GamificationPointsEventMappingType = {[k in GamificationEventType]: number};

    /**
     * Interface description of the GamificationService,
     * which provides the ability pull statistics and handle events
     */
    export interface IGamificationService {
        /**
         * Provides the GamificationStats which consists of points and levels
         * and the LevelProgressBorders (minimum and maximum points) for the current
         * level.
         */
        getStats(): Promise<GamificationStats>;

        /**
         * Handler functions to add points to the current stats if the event type is
         * based on GamificationPointsEvent with a valid entry
         * (see type GamificationPointsEvent).
         * @returns Promise, which can be either
         *  - fulfilled:    handling was successfully if event was processed and
         *                  values have been persisted
         *  - rejected:     something went wrong, e.g. db-failure
         */
        handleGamificationEvent(event: GamificationEventType): Promise<void>;
    }

    class GamificationService implements IGamificationService {
        static $inject = [
            '$log',
            '$rootScope',
            'gamificationDBService',
            'gamificationSettingsService',
            'gamificationPointsEventMapping'
        ];

        private readonly gamificationPointsBaseMultiplier: number = 25;
        private gamificationStats: GamificationStats | undefined;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private gamificationDBService: GamificationDB,
                    private gamificationSettingsService: GamificationSettingsService,
                    private readonly gamificationPointsEventMapping: Readonly<GamificationPointsEventMappingType>) {
        };

        public async handleGamificationEvent(event: GamificationEventType): Promise<void> {
            switch (event) {
                case (GamificationEventType.TASK_DONE):
                case (GamificationEventType.WORKFLOW_START):
                case (GamificationEventType.WORKFLOW_FINISH):
                    if (!await this.gamificationSettingsService.isPointsRecordingEnabled()) {
                        return;
                    }
                    return this.addPoints(this.getPointsForPointsEvent(event));
                default:
                    // event unknown or missing;
                    return assertUnreachable(event);
            }
        };

        public async getStats(): Promise<GamificationStats> {
            return this.gamificationStats ?? await this.getStatsWithBorders();
        };

        /**
         * Helper function for gamificationStats cache, which pulls the latest values from the database
         * and enriches the result with the corresponding level borders.
         * @private
         */
        private async getStatsWithBorders(): Promise<GamificationStats> {
            const stats: GamificationStatsEntry = await this.gamificationDBService.getStats();
            const levelBorder: LevelProgressBorders = this.calculateLevelProgressBorders(stats.level);
            this.gamificationStats = ({...stats, levelBorder});
            return this.gamificationStats;
        }

        /**
         * Increase the current points by the provided points value (integer).
         * Points will be rounded prior to processing to ensure values are not floating numbers.
         * Rejects in case points is zero or a negative number or an unsafe integer value. Will handle the
         * increase within a database transaction and broadcast individual event(s) in case
         * the points have been increased or the level changed.
         * @param points    positive number to increase `gamificationStats.points`
         * @private
         */
        private async addPoints(points: number): Promise<void> {
            const checkedPoints = Number.isInteger(points) ? points : Math.round(points);
            if (checkedPoints <= 0) {
                return Promise.reject(new Error('Points must be greater than zero'));
            } else if (Number.isNaN(checkedPoints) || !Number.isSafeInteger(checkedPoints)) {
                return Promise.reject(new Error('Points has to be a valid number'));
            }

            let levelUp: boolean = false;
            const stats: GamificationStatsEntry = await this.gamificationDBService.updateStats((oldStats: GamificationStatsEntry) => {
                // this code is running within the database transaction
                const newPoints: number = oldStats.points + checkedPoints;
                const newLevel: number = this.getLevelForPoints(newPoints, oldStats.level);
                levelUp = oldStats.level < newLevel;
                return {
                    points: newPoints,
                    level: newLevel
                };
            });
            this.gamificationStats = {...stats, levelBorder: this.calculateLevelProgressBorders(stats.level)};
            this.broadcastGamificationUpdateEvents(levelUp);
        };

        /**
         * Sends broadcast event(s) to the rootScope of the application.
         * Sends a `GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT` event by
         * default & a `GAMIFICATION_UPDATE_LEVEL_UP_EVENT` event in case
         * the provided attribute is true, otherwise not
         * @param levelUp   based on this value, an update event for
         *                  `GAMIFICATION_UPDATE_LEVEL_UP_EVENT` will be
         *                  broadcast as well (if true), otherwise it will
         *                  only send `GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT`
         * @private
         */
        private broadcastGamificationUpdateEvents(levelUp: boolean) {
            const updatePointsEntry: GamificationStatsPoints = {points: this.gamificationStats!.points};
            this.$rootScope.$broadcast(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, updatePointsEntry);
            if (levelUp) {
                const updateLevelEntry: GamificationStatsLevelWithBorder = {
                    level: this.gamificationStats!.level,
                    levelBorder: this.gamificationStats!.levelBorder
                };
                this.$rootScope.$broadcast(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, updateLevelEntry);
            }
        }

        /**
         * Map an event to the corresponding point value
         * @param pointsEvent   GamificationEvent for which points should be determined
         * @returns points: number that can be added to `gamificationStats.points`
         */
        private getPointsForPointsEvent(pointsEvent: GamificationEventType): number {
            const points = this.gamificationPointsEventMapping[pointsEvent];
            if (points === undefined) {
                throw new Error(`Could not get points for event: ${pointsEvent}`);
            }
            return points;
        }

        /**
         * Calculate the level, based on the current level. In case the
         * level will be lower than previousLevel, it will return the previousLevel.
         * This prevents a level decrease.
         * @param points    number of points for which a level should be calculated
         * @param previousLevel number of previous level, to prevent a level decrease
         * @private
         */
        private getLevelForPoints(points: number, previousLevel: number): number {
            const levelForPoints: number = Math.ceil(points / this.gamificationPointsBaseMultiplier);
            // this check prevents the decrease of a level
            return Math.max(previousLevel, levelForPoints);
        };

        /**
         * Calculation of the borders for a given level.
         * Formula to generate level borders (both min & max) for a given
         * points value. This generates a lookup table. Calculation is based
         * on a base multiplier in the form of { cap = baseMultiplier * level }
         * minValue     level 1:
         *                  minValue = 0
         *              level > 1:
         *                  (baseMultiplier * previousLevel) + 1 (to increase previous maxValue as minValue)
         * maxValue
         *              (baseMultiplier * level)
         * Example:
         *
         *              min     max
         *  level: 1	0	    25
         *  level: 2	26	    50
         *  level: 3	51	    75
         *  level: 4	76	    100
         *  level: 5	101	    125
         *  level: 6	126	    150
         *  level: 7	151	    175
         *  level: 8	176	    200
         *  level: 9	201	    225
         *  level: 10	226	    250
         * @param level number of the intended level to calculate the min/max border values
         * @private
         */
        private calculateLevelProgressBorders(level: number): LevelProgressBorders {
            const minPoints = level > 1 ? ((this.gamificationPointsBaseMultiplier * (level - 1)) + 1) : 0;
            const maxPoints = this.gamificationPointsBaseMultiplier * level;
            return {minPoints, maxPoints};
        };

        // implement difficulty handling, which could be
        // - based on increase / decrease of level borders for faster level ups
        // - based on the amount of points someone could acquire for each event
        // - other variants
        // nonetheless, it should be referenced both within addPoints and the getter functions
        // private async getGamificationPointsMultiplier(): Promise<number> {
        //     const difficulty = await this.gamificationSettingsService.getDifficulty();
        //     switch(difficulty) {
        //         case "easy":
        //             break;
        //         case "normal":
        //             break;
        //         case "hard":
        //             break;
        //         default:
        //             assertUnreachable(difficulty);
        //             break;
        //     }
        //     return 1;
        // }

    }

    angular.module(moduleName)
        .service('gamificationService', GamificationService)
        .value<Readonly<GamificationPointsEventMappingType>>('gamificationPointsEventMapping', Object.freeze({
            [GamificationEventType.TASK_DONE]: 1,
            [GamificationEventType.WORKFLOW_START]: 5,
            [GamificationEventType.WORKFLOW_FINISH]: 10
        } as const));
}
