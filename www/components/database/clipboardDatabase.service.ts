module rehagoal.database {
    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    import HOUR_IN_MILLISECONDS = rehagoal.utilities.HOUR_IN_MILLISECONDS;
    const moduleName = 'rehagoal.database';

    export interface BlocklyClipboardData {
        blocklyXml: string
        images?: {
            references: IFileReference[],
            data: IFileWithHash[]
        }
        previewImage?: Blob
    }

    export const CLIPBOARD_DATA_EXPIRED_EVENT = 'clipboardDatabaseService.dataExpired';
    export const ALLOWED_CLIPBOARD_TYPES = ['blockly'] as const;
    export type ClipboardEntryType = typeof ALLOWED_CLIPBOARD_TYPES[number];
    const ALLOWED_CLIPBOARD_TYPES_SET: Set<ClipboardEntryType> = new Set(ALLOWED_CLIPBOARD_TYPES);

    interface ClipboardEntryPrimaryKey {
        index: number
        type: ClipboardEntryType
    }

    export type ClipboardEntry = BlocklyClipboardEntry;

    export type ClipboardEntryWithoutIndex = Omit<ClipboardEntry, 'index'>

    type ClipboardEntryOfType = {
        'blockly': BlocklyClipboardEntry
    }

    export interface BlocklyClipboardEntry extends ClipboardEntryPrimaryKey {
        data: BlocklyClipboardData
    }

    export type ClipboardLastOperationPrimaryKey = ClipboardEntryType;

    export interface ClipboardLastOperationEntry {
        type: ClipboardEntryType,
        last: Date
    }

    export interface ClipboardDexie extends dexie.Dexie {
        clipboardEntries: dexie.Dexie.Table<ClipboardEntry, ClipboardEntryPrimaryKey>
        lastOperation: dexie.Dexie.Table<ClipboardLastOperationEntry, ClipboardLastOperationPrimaryKey>
    }

    export interface ClipboardDB {
        setEntry(entry: ClipboardEntryWithoutIndex): Promise<ClipboardEntryPrimaryKey>;
        getEntry(type: ClipboardEntryType): Promise<ClipboardEntryOfType[typeof type] | null>;
    }

    class ClipboardDatabaseService implements ClipboardDB {
        static $inject = [
            '$log',
            'dexieFactory',
        ];

        protected dexie: ClipboardDexie;

        constructor(protected $log: angular.ILogService, private dexieFactory: DexieFactory) {
            this.dexie = dexieFactory<ClipboardDexie>('clipboardDB');
            this.dexie.version(1).stores({
                clipboardEntries: '[index+type],type',
            });
            this.dexie.version(2).stores({
                clipboardEntries: '[index+type],type',
                lastOperation: '&type'
            });
        }

        /**
         * Returns whether the given type is a valid clipboard type.
         * @param type identifier of clipboard type
         * @returns true, if clipboard type is valid, otherwise false
         * @protected
         */
        protected isValidClipboardType(type: string) {
            return ALLOWED_CLIPBOARD_TYPES_SET.has(type as ClipboardEntryType);
        }

        /**
         * Checks that the given type is a valid clipboard type, otherwise throws an Error.
         * @param type identifier of a clipboard type
         * @protected
         */
        protected assertValidClipboardType(type: ClipboardEntryType) {
            if (!this.isValidClipboardType(type)) {
                throw new Error(`Unsupported clipboard type: ${type}`);
            }
        }

        /**
         * Sets the first entry of a clipboard to the given entry.
         * @param entry clipboard entry to store
         */
        async setEntry(entry: ClipboardEntryWithoutIndex): Promise<ClipboardEntryPrimaryKey> {
            this.assertValidClipboardType(entry.type);
            return this.dexie.transaction('rw', this.dexie.clipboardEntries, () => {
                const entryWithIndex = {
                    ...entry,
                    index: 0,
                };
                return this.dexie.clipboardEntries.put(entryWithIndex);
            });
        }

        /**
         * Returns the first entry of the clipboard with the given type, or null (if there is no such entry) as a Promise.
         * @param type type of the clipboard
         */
        async getEntry(type: ClipboardEntryType): Promise<ClipboardEntryOfType[typeof type] | null> {
            this.assertValidClipboardType(type);
            return (await this.dexie.clipboardEntries.get({type, index: 0})) || null;
        }

        /**
         * Sets the (trimmed) Date of the last operation that occurred on a certain clipboard.
         * @param type type of the clipboard
         * @param date trimmed Date of the last operation to store
         */
        async setLastOperationDate(type: ClipboardEntryType, date: Date): Promise<void> {
            this.assertValidClipboardType(type);
            await this.dexie.lastOperation.put({type, last: date});
        }

        /**
         * Returns the Date of the last operation for the given clipboard, or `new Date(0)` if there is none.
         * @param type type of the clipboard
         */
        async getLastOperationDate(type: ClipboardEntryType): Promise<Date> {
            this.assertValidClipboardType(type);
            return (await this.dexie.lastOperation.get(type))?.last || new Date(0);
        }
    }

    /**
     * Clipboard database service with automatically expiring entries (checked when the clipboard is accessed)
     */
    class AutoExpiryClipboardDatabaseService extends ClipboardDatabaseService {
        static $inject = [
            '$log',
            'dexieFactory',
            '$rootScope'
        ];

        constructor($log: angular.ILogService, dexieFactory: DexieFactory, private $rootScope: angular.IRootScopeService) {
            super($log, dexieFactory);
        }

        /**
         * Returns the number of milliseconds after which a clipboard without activity is considered expired
         * @param type type of the clipboard
         * @return milliseconds after which a clipboard without operations occuring during that period is considered expired
         * @private
         */
        private getExpiryMilliseconds(type: ClipboardEntryType): number {
            switch (type) {
                case "blockly":
                    return 48 * HOUR_IN_MILLISECONDS;
                default:
                    /* istanbul ignore next: should never execute */
                    return assertUnreachable(type);
            }
        }

        /**
         * Trims the given date to the last day by setting UTC milliseconds, seconds, minutes and hours to zero.
         * @param date date to trim
         * @return trimmed date
         * @private
         */
        private trimDate(date: Date): Date {
            const trimmedDate = new Date(date);;
            trimmedDate.setUTCMilliseconds(0);
            trimmedDate.setUTCSeconds(0);
            trimmedDate.setUTCMinutes(0);
            trimmedDate.setUTCHours(0);
            return trimmedDate;
        }

        /**
         * Checks, whether a clipboard is expired due to inactivity (get/set), deletes all its entries if expired, and
         * stores the a new trimmed date of last access of the clipboard.
         * Broadcasts the `CLIPBOARD_DATA_EXPIRED_EVENT` with the clipboard type, if expired entries were deleted.
         * @param type type of the clipboard to check
         * @private
         */
        private async checkAndHandleExpiry(type: ClipboardEntryType): Promise<void> {
            const now = new Date();
            if (await this.shouldDeleteDueToExpiry(now, type)) {
                await this.dexie.clipboardEntries.where("type").equals(type).delete();
                this.$log.info(`Clipboard data (${type}) is deleted for privacy reasons!`);
                this.$rootScope.$broadcast(CLIPBOARD_DATA_EXPIRED_EVENT, type);
            }
            await this.setLastOperationDate(type, this.trimDate(now));
        }

        /**
         * Check if entries of the given type should be deleted due to being expired or having an invalid lastOperation Date.
         * An invalid lastOperation Date is one that lies in the future.
         * @param now current time as Date instance
         * @param type type of the clipboard for which expiry is checked
         * @return {Promise} resolves to true, if entry should be deleted, otherwise false
         * @private
         */
        private async shouldDeleteDueToExpiry(now: Date, type: ClipboardEntryType): Promise<boolean> {
            const lastOp = await this.getLastOperationDate(type);
            const lastOpIsInFuture = lastOp.getTime() > now.getTime();
            if ((await this.dexie.clipboardEntries.where("type").equals(type).count()) === 0) {
                // Already no entries present
                return false;
            }
            if (lastOpIsInFuture) {
                this.$log.warn(`Last clipboard data (${type}) access lies in future (inconsistent)!`);
                return true;
            }
            if (now.getTime() - this.getExpiryMilliseconds(type) >= lastOp.getTime()) {
                this.$log.info(`Clipboard data (${type}) expired!`);
                return true;
            }
            return false;
        }

        /**
         * Returns the first entry of the clipboard with the given type, or null (if there is no such entry) as a Promise.
         * Handles expiry before other operations.
         * @param type type of the clipboard
         */
        async getEntry(type: rehagoal.database.ClipboardEntryType): Promise<ClipboardEntryOfType[typeof type] | null> {
            this.assertValidClipboardType(type);
            return this.dexie.transaction('rw', this.dexie.lastOperation, this.dexie.clipboardEntries, async () => {
                await this.checkAndHandleExpiry(type);
                return super.getEntry(type);
            });
        }

        /**
         * Sets the first entry of a clipboard to the given entry.
         * Handles expiry before other operations.
         * @param entry clipboard entry to store
         */
        async setEntry(entry: rehagoal.database.ClipboardEntryWithoutIndex): Promise<ClipboardEntryPrimaryKey> {
            this.assertValidClipboardType(entry.type);
            return this.dexie.transaction('rw', this.dexie.lastOperation, this.dexie.clipboardEntries, async () => {
                await this.checkAndHandleExpiry(entry.type);
                return super.setEntry(entry);
            });
        }
    }


    angular.module(moduleName)
        .service('clipboardDatabaseService', AutoExpiryClipboardDatabaseService);
}
