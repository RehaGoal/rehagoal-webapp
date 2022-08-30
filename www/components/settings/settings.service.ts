///<reference path="../../bower_components/reflect-metadata/index.d.ts"/>
module rehagoal.settings {
    import SettingsChangeListener = rehagoal.smartCompanion.SettingsChangeListener;
    import MINUTE_IN_MILLISECONDS = rehagoal.utilities.MINUTE_IN_MILLISECONDS;
    const moduleName = 'rehagoal.settings';

    const settingsWebstorageKey = "rehagoalSettings";
    const settingMetadataKey = "setting";

    const IMAGE_RESIZE_MAX_WIDTH = 1280;
    const IMAGE_RESIZE_MAX_HEIGHT = 720;
    const IMAGE_RESIZE_MAX_FILESIZE = 2 * rehagoal.utilities.MEGABYTE;

    type StudyReferenceEntry = {
        studyName: string,
        referenceOptions: {
            salt: string,
            iterations: number,
            keySize: number
        },
        startDate: Date,
        endDate: Date
    }

    type StudyReferencesMap = {
        [referenceKey: string]: StudyReferenceEntry
    }

    export type FlexContentAlignment = 'left' | 'right';
    export type ExecutionViewLayout = 'default' | 'flex';

    function setting(target: Object, propertyKey: string) {
        Reflect.defineMetadata(settingMetadataKey, true, target, propertyKey);
    }

    function allowedValues<V>(allowedValues: V[]) {
        return function <T extends Record<K, V>,
            K extends string>(target: T, propertyKey: K): any {
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

    /**
     * Type union of the names of all mutable (non-readonly) properties of type T.
     */
    type MutablePropertyNames<T> = {-readonly [K in keyof T]: T[K] extends T[K] ? K : never}[keyof T]
    /**
     * Type union of the names of all non-function properties of type T.
     */
    type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
    /**
     * Type union of the names of all mutable & non-function properties of the `SettingsService`
     */
    type MutableSettingsProperties = NonFunctionPropertyNames<SettingsService> & MutablePropertyNames<SettingsService>
    /**
     * Type which has the same properties as type T, but all optional.
     */
    type AllOptional<T> = {[K in keyof T]+?: T[K]}
    /**
     * Type of object for of that all properties have names in `MutableSettingsProperties` and types of the corresponding SettingsService property
     */
    type ExportedSettings = {[K in MutableSettingsProperties]: SettingsService[K]}
    /**
     * Type of object which *may* include the SettingsService properties only with correct type, but also other properties
     */
    type MayIncludeExportedSettings = AllOptional<ExportedSettings> & {[K: string]: any}

    export class SettingsService {
        static $inject = [
            '$rootScope',
            '$log',
            'webStorage',
            'pbkdf2',
            'availableStudyReferences'
        ];

        private settingsChangeListener: SettingsChangeListener[];
        private studyNameToReferenceKey: Map<string, string> = new Map<string, string>();

        @setting public studyModeEnabled: boolean = false;
        @setting public studyReferenceKey: string = "";

        @setting public ttsEnabled: boolean = false;
        @setting public ttsSpeed: number = 3;

        @setting public wearCompanionEnabled: boolean = false;
        @setting public bluetoothCompanionEnabled: boolean = false;

        @setting public imageResizeEnabled: boolean = true;

        @setting public calendarStaticPostponeDelay: number = MINUTE_IN_MILLISECONDS;

        @allowedValues<ExecutionViewLayout>(['default', 'flex'])
        @setting public executionViewLayout: ExecutionViewLayout = 'default';
        @allowedValues<FlexContentAlignment>(['left', 'right'])
        @setting public executionViewFlexContentAlignment: FlexContentAlignment = 'left';

        @setting public pgpUserPublicKey: string | null = null;
        @setting public pgpUserPrivateKey: string | null = null;
        @setting public userPseudonym: string | null = null;

        @setting public gamificationEnabled: boolean = false;

        constructor(private $rootScope: angular.IRootScopeService,
                    private $log: angular.ILogService,
                    private webStorage: IAngularWebStorageService,
                    private pbkdf2: rehagoal.crypto.pbkdf2Type,
                    private readonly availableStudyReferences: StudyReferencesMap) {
            Object.defineProperty(this, 'availableStudyReferences', {
                configurable: false,
                writable: false,
                value: availableStudyReferences
            });
            this.settingsChangeListener = [];
            this.studyModeEnabled = false;
            this.initializeStudyNameToReferenceMap();
            this.loadSettings();
        }

        private initializeStudyNameToReferenceMap() {
            for (let referenceKey in this.availableStudyReferences) {
                const studyName = this.availableStudyReferences[referenceKey].studyName;
                if (!studyName) {
                    throw new Error(`Invalid study name for referenceKey ${referenceKey}: ${studyName}`);
                }
                if (this.studyNameToReferenceKey.has(studyName)) {
                    throw new Error(`Study with name '${studyName}' already registered!`);
                }
                this.studyNameToReferenceKey.set(studyName, referenceKey);
            }
        }

        public loadSettings(): void {
            if (!this.webStorage.has(settingsWebstorageKey)) {
                return;
            }
            let settings = this.webStorage.get(settingsWebstorageKey);
            this.importSettingsObject(settings);
            this.validateStudyModeEnabled();
            this.$log.info('Settings loaded.');
        }

        private importSettingsObject(settings: MayIncludeExportedSettings) {
            for (let property in settings) {
                if (settings.hasOwnProperty(property)
                    && Reflect.getMetadata(settingMetadataKey, this, property)) {
                    this[property] = settings[property];
                }
            }
        }

        public isStudyInitialized(): boolean {
            return this.userPseudonym !== null && this.pgpUserPrivateKey !== null && this.pgpUserPublicKey !== null;
        }

        public changeSpeechSpeeds(val: number) {
            this.ttsSpeed = val;
        }

        public saveSettings(): void {
            this.validateStudyModeEnabled();
            let settings = this.exportSettingsObject();
            this.webStorage.set(settingsWebstorageKey, settings);
            this.$log.info('Settings saved.');
            this.notifyOnSettingsChanged();
        }

        private exportSettingsObject(): ExportedSettings {
            let settings: any = {};
            for (let property in this) {
                if (Reflect.getMetadata(settingMetadataKey, this, property)) {
                    settings[property] = this[property];
                }
            }
            return settings;
        }

        public addSettingsChangeListener(listener: SettingsChangeListener): void {
            this.settingsChangeListener.push(listener);
        }

        private notifyOnSettingsChanged(): void {
            this.settingsChangeListener.forEach(function (listener) {
                listener();
            });
        }

        public validateStudyModeEnabled(): void {
            if (!this.studyModeEnabled) {
                return;
            }

            this.studyModeEnabled = false;

            if (!this.studyReferenceKey || !this.availableStudyReferences.hasOwnProperty(this.studyReferenceKey)) {
                this.$log.warn(`Disabling study mode. Reason: Study reference not found: ${this.studyReferenceKey}`);
                return;
            }

            const studyReference = this.availableStudyReferences[this.studyReferenceKey];
            const currentTimestamp: number = new Date().getTime();
            const studyStartTimestamp: number = studyReference.startDate.getTime();
            const studyEndTimestamp: number = studyReference.endDate.getTime();

            if (currentTimestamp > studyEndTimestamp || currentTimestamp < studyStartTimestamp) {
                this.$log.warn(`Disabling study mode. Reason: Referenced study ${studyReference.studyName} is not available at the current date!`);
                return;
            }

            this.studyModeEnabled = true;
            this.$rootScope.$broadcast('views.studyEntered');

        }

        public async enableStudyModeForReference(studyName: string, referenceText: string) {
            const expectedReferenceKey = this.studyNameToReferenceKey.get(studyName);
            if (!expectedReferenceKey) {
                throw new Error(`Study with the name ${studyName} does not exist`);
            }
            const study = this.availableStudyReferences[expectedReferenceKey];
            const referenceOptions = study.referenceOptions;
            const actualReferenceKey = await this.pbkdf2(referenceText, referenceOptions.salt, referenceOptions.iterations, referenceOptions.keySize);

            if (expectedReferenceKey !== actualReferenceKey) {
                throw new Error('Entered key is not valid!');
            }

            this.studyReferenceKey = actualReferenceKey;
            this.studyModeEnabled = true;
            this.saveSettings();

            if (!this.studyModeEnabled) {
                throw new Error('Study Mode could not be enabled! Maybe the study is already expired or not yet started?');
            }
        }

        public getStudyNames(): string[] {
            return [...this.studyNameToReferenceKey.keys()];
        }

        public getSelectedStudyName(): string {
            const referenceKey = this.studyReferenceKey;
            if (!this.availableStudyReferences.hasOwnProperty(referenceKey)) {
                return "";
            }
            return this.availableStudyReferences[referenceKey].studyName;
        }

        get currentTTSSpeedIndex(): number {
            return this.ttsSpeed -1;
        }

        get imageResizeMaxWidth(): number {
            return IMAGE_RESIZE_MAX_WIDTH;
        }

        get imageResizeMaxHeight(): number {
            return IMAGE_RESIZE_MAX_HEIGHT;
        }

        get imageResizeMaxFileSize(): number {
            return IMAGE_RESIZE_MAX_FILESIZE;
        }
    }

    angular.module(moduleName)
        .service('settingsService', SettingsService)
        .value<StudyReferencesMap>("availableStudyReferences", {
        });
}
