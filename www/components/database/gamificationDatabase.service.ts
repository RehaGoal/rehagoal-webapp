
module rehagoal.database {
    const moduleName = 'rehagoal.database';

    type GamificationPointsPrimaryKey = 'points' | 'level';

    export interface GamificationDexie extends dexie.Dexie {
        statsEntries: dexie.Dexie.Table<number, GamificationPointsPrimaryKey>;
        settingsEntries: dexie.Dexie.Table<GamificationSettingsDBEntry, string>;
    }

    /**
     * Struct for gamification statistics, containing
     * both points: number and the level: number
     */
    export interface GamificationStatsEntry {
        points: number,
        level: number
    }

    /**
     * General struct for gamification settings, that
     * can be stored within the database
     */
    export interface GamificationSettingsDBEntry {
        settingsKey: string,
        value: unknown
    }

    export type GamificationSettingsDBMap = Map<string, unknown>;


    /**
     * Interface for a GamificationDatabase service, which provides
     * methods to retrieve and update GamificationStats
     */
    export interface GamificationDB extends GamificationStatsDB, GamificationSettingsDB {
    }

    export interface GamificationStatsDB {
        /**
         * Function to get the stored gamification stats from within the database.
         *  Can be used to calculate the borders for the current level
         *  @default if no points / level have been stored yet,
         *  it should return a default level of 1 and 0 points
         */
        getStats(): Promise<GamificationStatsEntry>;

        /**
         * Update function which will execute an update function within a dexie transaction.
         * This ensures that level and points are not modified or read from other transactions
         * while the update process is executed.
         * @param statUpdater   callback which will be executed after the GamificationStats have been
         * received from the database and passed back to the callback, to safely calculate the new values.
         * This function is based outside the gamificationDatabase service and return the new values.
         * After the statUpdater call, stores the new values within the database, before returning the values.
         */
        updateStats(statUpdater: (oldStats: GamificationStatsEntry) => GamificationStatsEntry): Promise<GamificationStatsEntry>
    }

    /**
     * Interface for a database service, which provides
     * methods to receive (to put) and provide (to get) GamificationSettings
     */
    export interface GamificationSettingsDB {
        /**
         * Provides GamificationSettingsEntries for given keys, if they have
         * been stored within the database
         * @param keys A set of entries of type GamificationSettingsKey
         */
        getSettings(keys: Set<string>): Promise<GamificationSettingsDBMap>;

        /**
         * Function to receive an entry and store them within the database
         * @param entry an object that contains a setting
         */
        putSetting(entry: GamificationSettingsDBEntry): Promise<void>;
        /**
         * Function to receive multiple entries and store them within the database
         * @param entries an object that contains multiple settings
         */
        putSettings(entries: GamificationSettingsDBEntry[]): Promise<void>;
    }

    class GamificationDatabaseService implements GamificationDB {

        static $inject = [
            '$log',
            'dexieFactory'
        ];

        private dexie: GamificationDexie;

        constructor(private $log: angular.ILogService,
                    private dexieFactory: DexieFactory) {
            this.dexie = dexieFactory<GamificationDexie>('gamificationDB');
            this.dexie.version(1).stores({
                // the index for statsEntries is based on their primitive (hidden) name,
                // while settingsEntries is based on the key, that is contained within the GamificationSettingsEntry object
                statsEntries: '',
                settingsEntries: 'settingsKey',
            });

        };

        async getStats(): Promise<GamificationStatsEntry> {
            return this.dexie.transaction('r', this.dexie.statsEntries, async () => {
                const {points, level} = GamificationDatabaseService.getDefaultStats();
                const storedPoints = await this.dexie.statsEntries.get('points');
                const storedLevel = await this.dexie.statsEntries.get('level');
                return {points: storedPoints ?? points, level: storedLevel ?? level};
            });
        };

        async updateStats(statUpdater: (oldStats: GamificationStatsEntry) => GamificationStatsEntry): Promise<GamificationStatsEntry> {
            return this.dexie.transaction('rw', this.dexie.statsEntries, async () => {
                const previousStats = await this.getStats();
                const newStats = statUpdater(previousStats);
                await this.dexie.statsEntries.put(newStats.points,'points');
                await this.dexie.statsEntries.put(newStats.level,'level');
                return newStats;
            });
        };

        async getSettings(keys: Set<string>): Promise<GamificationSettingsDBMap> {
            return new Map( (await this.dexie.settingsEntries.where(':id').anyOf([...keys]).toArray())
                .map(entry => [entry.settingsKey, entry.value])
            );
        }

        async putSetting(entry: GamificationSettingsDBEntry): Promise<void> {
            return this.dexie.transaction('rw', this.dexie.settingsEntries, async () => {
                await this.dexie.settingsEntries.put(entry);
            });
        }

        async putSettings(entries: GamificationSettingsDBEntry[]): Promise<void> {
            return this.dexie.transaction('rw', this.dexie.settingsEntries, async () => {
                await this.dexie.settingsEntries.bulkPut(entries);
            });
        }

        /**
         * Helper function to provide an initial value
         * for the gamification statistics
         */
        private static getDefaultStats(): GamificationStatsEntry {
            return { points: 0, level: 1 };
        };
    }

    angular.module(moduleName).service('gamificationDBService', GamificationDatabaseService);
}
