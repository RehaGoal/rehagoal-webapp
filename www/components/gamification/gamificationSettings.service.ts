module rehagoal.gamification {
    import GamificationSettingsDB = rehagoal.database.GamificationSettingsDB;
    import GamificationSettingsDBMap = rehagoal.database.GamificationSettingsDBMap;
    import SettingsService = rehagoal.settings.SettingsService;
    import GamificationSettingsDBEntry = rehagoal.database.GamificationSettingsDBEntry;
    import INamedImage = rehagoal.imageThumbnailChooser.INamedImage;

    const moduleName = 'rehagoal.gamification';

    /**
     * Event name which is used for `scope.broadcast`
     * to notify if gamification settings have been changed
     */
    export const GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME = 'gamificationSettings.settingChanged';

    export type GamificationDifficulty = 'easy' | 'normal' | 'hard';
    export type GamificationIconStyleName = 'star' | 'diamond' | 'heart' | 'bi-award' | 'bi-diamond' | 'bi-gem' |
        'bi-star' | 'bi-heart' | 'bi-suit-club' | 'bi-suit-diamond' | 'bi-suit-heart' | 'bi-suit-spade' |
        'bi-x-diamond' | 'bi-triangle' | 'bi-heptagon' | 'bi-hexagon' | 'bi-octagon' | 'bi-pentagon' | 'bi-pig' |
        'bi-cpu' | 'bi-incognito' | 'bi-robot';

    export interface GamificationSettings {
        pointsRecordEnabled: boolean
        pointsShowEnabled: boolean
        difficulty: GamificationDifficulty
        iconStyleName: GamificationIconStyleName
    }

    /**
     * Contains all validly defined keys that can be used as a GamificationSetting
     */
    export type GamificationSettingsKey = keyof GamificationSettings;

    /**
     * This type uses the GamificationSettingsKey to generate a GamificationSettingsEntry
     */
    export type GamificationSettingsEntry<K> = K extends GamificationSettingsKey ? {
        settingsKey: K,
        value: GamificationSettings[K]
    } : never;

    /**
     * Extracts the value and correct type for a given E [GamificationSettingsEntry]
     * based on the K [Key], which is inferred by a GamificationSettingsKey
     */
    type ExtractSettingsValue<E> = E extends GamificationSettingsEntry<infer K> ?
        ([K] extends [GamificationSettingsKey] ? GamificationSettings[K] : never)
        : never;

    const settingMetadataKey = "setting";
    function setting(target: Object, propertyKey: GamificationSettingsKey) {
        Reflect.defineMetadata(settingMetadataKey, true, target, propertyKey);
    }

    function allowedValues<V>(allowedValues: V[]) {
        return function (target: any, propertyKey: string): any {
            let value_store: V;
            return {
                set: function (value: V): void {
                    if (!isAllowedValue(value, allowedValues)) {
                        throw new Error('Value is not allowed for property ' + propertyKey);
                    }
                    value_store = value;
                },
                get: function (): V {
                    return value_store;
                },
                enumerable: true,
                configurable: true
            };
        }
    }

    function isAllowedValue<T>(value: T, allowedValues: T[]): value is T {
        return allowedValues.some(x => x === value);
    }

    export class GamificationIconStyle implements INamedImage {
        private static iconStylesCollection: Map<GamificationIconStyleName, GamificationIconStyle> = new Map();
        public static readonly DIAMOND = new GamificationIconStyle('diamond');
        //Bootstrap Icons
        public static readonly BI_AWARD = new GamificationIconStyle('bi-award');
        public static readonly BI_DIAMOND = new GamificationIconStyle('bi-diamond');
        public static readonly BI_STAR = new GamificationIconStyle('bi-star');
        public static readonly BI_HEART = new GamificationIconStyle('bi-heart');
        public static readonly BI_SUIT_CLUB = new GamificationIconStyle('bi-suit-club');
        public static readonly BI_SUIT_DIAMOND = new GamificationIconStyle('bi-suit-diamond');
        public static readonly BI_SUIT_HEART = new GamificationIconStyle('bi-suit-heart');
        public static readonly BI_SUIT_SPADE = new GamificationIconStyle('bi-suit-spade');
        public static readonly BI_X_DIAMOND = new GamificationIconStyle('bi-x-diamond');
        public static readonly BI_TRIANGLE = new GamificationIconStyle('bi-triangle');
        public static readonly BI_HEPTAGON = new GamificationIconStyle('bi-heptagon');
        public static readonly BI_HEXAGON = new GamificationIconStyle('bi-hexagon');
        public static readonly BI_OCTAGON = new GamificationIconStyle('bi-octagon');
        public static readonly BI_PENTAGON = new GamificationIconStyle('bi-pentagon');
        public static readonly BI_PIG = new GamificationIconStyle('bi-pig');
        public static readonly BI_CPU = new GamificationIconStyle('bi-cpu');
        public static readonly BI_INCOGNITO = new GamificationIconStyle('bi-incognito');
        public static readonly BI_ROBOT = new GamificationIconStyle('bi-robot');

        public readonly name: GamificationIconStyleName;
        public readonly imageSrc: string;

        private constructor(name: GamificationIconStyleName) {
            this.name = name;
            this.imageSrc = this.computeSVGPath();
            GamificationIconStyle.iconStylesCollection.set(this.name, this);
        }

        private computeSVGPath(): string {
            const pathPrefix = "components/gamification/assets/gamificationIcons.svg#";
            return pathPrefix + this.name;
        }

        public static getAllNamesAsArray(): GamificationIconStyleName[] {
            return Array.from(GamificationIconStyle.iconStylesCollection.keys());
        }

        public static getAllAsArray(): GamificationIconStyle[] {
            return Array.from(GamificationIconStyle.iconStylesCollection.values());
        }

        public static getAllImagePathsAsArray(): string[] {
            const svgPaths: string[] = [];
            for (const style of this.iconStylesCollection.values()) {
                svgPaths.push(style.imageSrc);
            }
            return svgPaths;
        }

        public static getStyleByName(name: GamificationIconStyleName): GamificationIconStyle {
            const iconStyle = this.iconStylesCollection.get(name);
            if (iconStyle === undefined) {
                throw new Error(`Unknown icon style: ${name}`);
            }
            return iconStyle;
        }
    }

    export interface IGamificationSettingsService {
        isPointsRecordingEnabled(): Promise<boolean>,
        isPointsDisplayEnabled(): Promise<boolean>,
        getIconStyle(): Promise<GamificationIconStyle>,
        getDifficulty(): Promise<GamificationDifficulty>,
        setPointsRecordingEnabled(value: boolean): Promise<void>,
        setPointsDisplayEnabled(value: boolean): Promise<void>,
        setIconStyle(value: GamificationIconStyle): Promise<void>,
        setDifficulty(difficulty: GamificationDifficulty): Promise<void>
    }

    export class GamificationSettingsService implements IGamificationSettingsService {
        static $inject = [
            '$log',
            '$rootScope',
            'gamificationDBService',
            'settingsService'
        ];

        private settingsLoaded: boolean = false;
        private globalGamificationEnabled: boolean;
        @allowedValues([true, false])
        @setting private pointsRecordEnabled: boolean = true;
        @allowedValues([true, false])
        @setting private pointsShowEnabled: boolean = true;
        @allowedValues(GamificationIconStyle.getAllNamesAsArray())
        @setting private iconStyleName: GamificationIconStyleName = GamificationIconStyle.BI_STAR.name;
        @allowedValues(['easy', 'normal', 'hard'])
        @setting private difficulty: GamificationDifficulty = 'normal';
        private readonly gamificationSettingsKeys: Set<GamificationSettingsKey>;

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private gamificationDB: GamificationSettingsDB,
                    private settingsService: SettingsService) {
            this.gamificationSettingsKeys = new Set(this.collectGamificationSettingsKeys());
            this.globalGamificationEnabled = this.gamificationEnabled;
            this.settingsService.addSettingsChangeListener(this.onSettingsServiceSettingChanged);
        }

        /**
         * Provides all declared settingsKeys that this service may have
         * @returns GamificationSettingsKey[]:  array containing all defined settingsKeys
         *                                      declared within this service
         */
        private collectGamificationSettingsKeys(): GamificationSettingsKey[] {
            const settingsKeys = [];
            for (const property in this) {
                if (Reflect.getMetadata(settingMetadataKey, this, property)) {
                    settingsKeys.push(property);
                }
            }
            return settingsKeys as GamificationSettingsKey[];
        };

        private async loadSettings(): Promise<void> {
            const knownStoredSettings = await this.loadKnownSettingsAndStoreMissingDefaults();
            this.importSettings(knownStoredSettings);
            this.settingsLoaded = true;
        }

        private importSettings(knownStoredSettings: GamificationSettingsDBMap): void {
            knownStoredSettings.forEach((value: unknown , settingsKey: string) => {
                const setting = { settingsKey: settingsKey, value: value };
                try {
                    this.assertValidSetting(setting);
                    this.assignSetting(setting);
                } catch (error) {
                    this.$log.error("Tried to load gamificationSettings that were not allowed. Using default instead.", error);
                }
            });
        }

        private assignSetting<K extends GamificationSettingsKey>(setting: GamificationSettingsEntry<K>): void {
            this[setting.settingsKey] = setting.value as ExtractSettingsValue<typeof setting>;
        }

        private isValidSettingsKey(key: string): key is GamificationSettingsKey {
            return this.gamificationSettingsKeys.has(key as GamificationSettingsKey);
        }

        private assertValidSettingsValue<K extends GamificationSettingsKey>(key: GamificationSettingsKey, value: unknown): asserts value is GamificationSettings[K] {
            if (!this.isValidSettingsKey(key)) {
                throw new Error('Encountered invalid settingsKey while importing settings!');
            }
            // check and validate value of settingsKey
            const oldSettingValue = this[key];

            try {
                this[key] = value as ExtractSettingsValue<GamificationSettingsEntry<K>>;
            } finally {
                this[key as string] = oldSettingValue;
            }
        }

        private assertValidSetting<K extends GamificationSettingsKey>(setting: GamificationSettingsDBEntry): asserts setting is GamificationSettingsEntry<K> {
            const settingKey: string = setting.settingsKey;
            if (!this.isValidSettingsKey(settingKey)) {
                throw new Error('Encountered invalid settingsKey while importing settings!');
            }
            this.assertValidSettingsValue(settingKey, setting.value);
        }

        private async loadKnownSettingsAndStoreMissingDefaults(): Promise<GamificationSettingsDBMap> {
            // cached known settings or default values
            const oldSettings = new Map([...this.gamificationSettingsKeys.keys()].map(k => [k, this[k]]));

            // load settings stored in DB based on the gamificationSettingsKeys defined by this service
            const knownStoredSettings = await this.gamificationDB.getSettings(this.gamificationSettingsKeys);

            if (oldSettings.size !== knownStoredSettings.size) {
                // merge & store
                const missingSettings = [...oldSettings.entries()].filter(entry => !knownStoredSettings.has(entry[0]));
                await this.gamificationDB.putSettings(missingSettings.map(entry => {
                    const [settingsKey, value] = entry;
                    return {settingsKey, value};
                }));
            }
            return knownStoredSettings;
        }

        private async loadSettingsIfNotLoaded(): Promise<void> {
            if (!this.settingsLoaded) {
                await this.loadSettings();
            }
        }

        private async persistSetting<T extends GamificationSettingsKey>(entry: GamificationSettingsEntry<T>): Promise<void> {
            await this.gamificationDB.putSetting(entry);
        }

        private get gamificationEnabled(): boolean {
            return this.settingsService.gamificationEnabled;
        }

        private onSettingsServiceSettingChanged = async () => {
            const _gamificationEnabled: boolean = this.gamificationEnabled;

            if (this.globalGamificationEnabled === _gamificationEnabled) {
                return;
            }

            this.globalGamificationEnabled = _gamificationEnabled;

            if (this.pointsShowEnabled) {
                this.notifyOnSettingChanged({ settingsKey: "pointsShowEnabled", value: await this.isPointsDisplayEnabled() });
            }

            if (this.pointsRecordEnabled) {
                this.notifyOnSettingChanged({ settingsKey: "pointsRecordEnabled", value: await this.isPointsRecordingEnabled() });
            }
        };

        private notifyOnSettingChanged<T extends GamificationSettingsKey>(setting: GamificationSettingsEntry<T>): void {
            this.$rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, setting);
        }

        private async setSetting<T extends GamificationSettingsKey>(setting: GamificationSettingsEntry<T>): Promise<void> {
            this.assertValidSetting(setting);
            await this.persistSetting(setting);
            this.assignSetting(setting);
            this.notifyOnSettingChanged(setting);
        }

        async isPointsRecordingEnabled(): Promise<boolean> {
            if (!this.gamificationEnabled) {
                return false;
            }
            await this.loadSettingsIfNotLoaded();
            return this.pointsRecordEnabled;
        }

        async setPointsRecordingEnabled(value: boolean): Promise<void> {
            await this.setSetting({ settingsKey: 'pointsRecordEnabled', value: value });
        }

        async isPointsDisplayEnabled(): Promise<boolean> {
            if (!this.gamificationEnabled) {
                return false;
            }
            await this.loadSettingsIfNotLoaded();
            return this.pointsShowEnabled;
        }

        async setPointsDisplayEnabled(value: boolean): Promise<void> {
            await this.setSetting({ settingsKey: 'pointsShowEnabled', value: value });
        }

        async getIconStyle(): Promise<GamificationIconStyle> {
            await this.loadSettingsIfNotLoaded();
            return GamificationIconStyle.getStyleByName(this.iconStyleName);
        }

        async setIconStyle(value: GamificationIconStyle): Promise<void> {
            await this.setSetting({ settingsKey: 'iconStyleName', value: value.name });
        }

        async getDifficulty(): Promise<GamificationDifficulty> {
            await this.loadSettingsIfNotLoaded();
            return this.difficulty;
        }

        async setDifficulty(difficulty: GamificationDifficulty): Promise<void> {
            await this.setSetting({ settingsKey: 'difficulty', value: difficulty });
        }

    }

    angular.module(moduleName)
        .service('gamificationSettingsService', GamificationSettingsService);
}
