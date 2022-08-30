module rehagoal.utilities {
    import numberCloseTo = jasmine.numberCloseTo;
    const moduleName = 'rehagoal.utilities';

    export const HASH_LENGTH: number = 64;

    export const MILLISECONDS_PER_SECOND = 1000;
    export const SECONDS_PER_MINUTE = 60;
    export const MINUTES_PER_HOUR = 60;
    export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
    export const HOURS_PER_DAY = 24;
    export const DAYS_PER_WEEK = 7;

    export const MINUTE_IN_MILLISECONDS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
    export const HOUR_IN_MILLISECONDS = MINUTES_PER_HOUR * MINUTE_IN_MILLISECONDS;
    export const DAY_IN_MILLISECONDS = HOURS_PER_DAY * HOUR_IN_MILLISECONDS;
    export const WEEK_IN_MILLISECONDS = DAYS_PER_WEEK * DAY_IN_MILLISECONDS;

    export type TimeBase = 's' | 'm' | 'h';

    export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
    export type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

    export const KILOBYTE = 1000;
    export const MEGABYTE = KILOBYTE * 1000;
    export const GIGABYTE = MEGABYTE * 1000;

    /**
     * Wrapper function to create a new Date object to
     * be able to mock date value in test scenarios
     * @returns {Date}  Date object from lib.d.ts
     */
    export function date(): DateConstructor {
        return Date;
    }

    /**
     * Quick and dirty shallow extend
     * Helper function
     */
    export function extend<A>(a: A): A;
    export function extend<A, B>(a: A, b: B): A & B;
    export function extend<A, B, C>(a: A, b: B, c: C): A & B & C;
    export function extend<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
    export function extend(...args: any[]): any {
        const newObj = {};
        for (const obj of args) {
            for (const key in obj) {
                //copy all the fields
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }

    /**
     * Polyfill for Object.fromEntries
     * @param entries iterable of key-value pairs
     * @returns object of key-value pairs
     * @private
     */
    export function objectFromEntries<K extends string | number | symbol, V>(entries: Iterable<[K, V]>): Record<K, V> {
        const object: Record<K, V> = Object.create(null);
        for (const [k, v] of entries) {
            object[k] = v;
        }
        return object;
    }


    /**
     * Chains functions returning Promises in sequential order and returns the Promise chain.
     * @param functions array of functions returning promises to be chained.
     */
    export function chainPromiseFunctions(functions: (() => Promise<any>)[]): Promise<any> {
        let chain: Promise<any> = Promise.resolve();
        for (let func of functions) {
            chain = chain.then(func);
        }
        return chain;
    }

    export type hashStringFunc = typeof hashString;

    /**
     * Helper function to generate a sha256 hash for a given string
     * @param input         simple string containing text
     * @returns {string}    a generated, hex-encoded hash for given string
     * @throws TypeError    containing an error message
     */
    function hashString(input: string): string {
        if (!angular.isString(input)) {
            throw new TypeError(`Expected string parameter but got type ${typeof input}`);
        }
        const finalizedBitArray = sjcl.hash.sha256.hash(input);
        return sjcl.codec.hex.fromBits(finalizedBitArray);
    }

    export type hashFileFunc = typeof hashFile;

    /**
     * Helper function to generate a sha256 hash for a given file
     * @param blob          blob of which the contents should be hashed
     * @returns {string}    generated hash for given file or empty string ""
     */
    function hashFile(blob: Blob): Promise<string> {
        if (!blob) {
            return Promise.reject<string>("EmptyFileHash");
        }

        let reader: FileReader = new FileReader();
        let pos: number = 0;
        let hashObj = new sjcl.hash.sha256();
        let fileReaderPromise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                if (reader.result === null || angular.isString(reader.result)) {
                    reject(new Error('Onloadend with invalid arguments'));
                    return;
                }
                loadChunk(reader.result.byteLength);
                resolve(sjcl.codec.hex.fromBits(hashObj.finalize()));
            };
            reader.onerror = () => {
                reject(reader.error);
            }
        });

        let loadChunk = (endPos: number) => {
            if (reader.result === null || angular.isString(reader.result)) {
                return;
            }
            let chunk = new Uint8Array(reader.result).subarray(pos, endPos);
            if (chunk.length > 0) {
                hashObj.update(sjcl.codec.bytes.toBits(Array.from(chunk)));
            }
            pos = endPos;
        };

        reader.readAsArrayBuffer(blob);

        return fileReaderPromise.then((fileHash) => {
            return fileHash;
        }, (err) => {
            return Promise.reject<string>(err);
        });
    }

    /**
     * reads a file as text and returns a promise containing the file content as string
     * @param input, file that should be read
     * @returns {Promise<string>} promise containing the string
     */
    function readFileAsText(input: Blob): Promise<string> {
        if (!input) {
            return Promise.reject<string>("EmptyFileToText");
        }

        let reader: FileReader = new FileReader();
        let fileReaderPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                if (!angular.isString(reader.result)) {
                    reject(new Error('Onload with invalid arguments'));
                    return;
                }
                resolve(reader.result);
            };
            reader.onerror = () => {
                reject(reader.error);
            }
        });

        reader.readAsText(input);

        return fileReaderPromise.then((inputAsString) => {
            return inputAsString;
        }, (err) => {
            return Promise.reject<string>(err);
        });
    }
    export type readFileAsTextFunc = typeof readFileAsText;

    /**
     * Reads the given Blob into an Uint8Array using a FileReader and readAsArrayBuffer.
     * @param blob Blob to read into an Uint8Array
     * @return Promise of an Uint8Array created from the Blob
     */
    function readBlobAsUint8Array(blob: Blob): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.addEventListener('loadend', function (event: ProgressEvent) {
                if (typeof fileReader.result === 'string') {
                    reject(new Error('Invalid fileReader result!'));
                    return;
                }
                resolve(new Uint8Array(fileReader.result!));
            });
            fileReader.readAsArrayBuffer(blob);
        });
    }

    function formatBytes(bytes: number | string, unitDivisor: number, units: string[]): string {
        const precision = 2;
        if (typeof bytes === 'string') bytes = parseFloat(bytes) || NaN;
        if (isNaN(bytes) || !isFinite(bytes)) return '-';
        let sgn = Math.sign(bytes);
        bytes = Math.abs(bytes);
        let unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(unitDivisor)) | 0);
        let unitValue = +((bytes / Math.pow(1024, Math.floor(unitIndex))).toFixed(precision));
        // if the value in fixed format is larger than the current unit, go to the next unit
        if (unitValue >= unitDivisor && unitIndex < units.length - 1) {
            unitValue = (unitValue / unitDivisor);
            unitIndex++;
        }
        return sgn * unitValue + ' ' + units[unitIndex];
    }

    function formatBytesBase2(bytes: number): string {
        const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
        return formatBytes(bytes, 1024, units);
    }

    export type generateWorkflowVersionHashFunc = typeof generateWorkflowVersionHash;

    /**
     * Both parameters are concatenated (xml with name at the end) to generate the hash
     * The version hash should be calculated like this:
     * versionHash = SHA256(workflowName || SHA256(xml))
     *      where || denotes the string concatenation operator and
     *      SHA256 denotes the function which computes the hex encoded SHA256 digest of the string argument
     * @param workflow_name         name of the workflow
     * @param workspaceXmlHash      hash value of the workflow xml
     * @returns {string}            contains the computed version hash value for the
     *                              specified workflow
     * @throws Error                contains an error message
     */
    function generateWorkflowVersionHash(workflow_name: string, workspaceXmlHash: string): string {
        return hashString(workspaceXmlHash.concat(workflow_name));
    }

    export type findNewNameFunc = typeof findNewName;

    /**
     * Finds a name based on currentName, which is not yet in usedNames.
     * If currentName is not in usedNames, it will be returned as is.
     * If currentName is in usedNames, a new name will be derived by adding numbers in parenthesis after the name.
     * Examples:
     * - "My Name" => "My Name (2)"
     * - "My Name (1)" => "My Name (2)"
     * - "My Name (2)" => "My Name (3)"
     * @param usedNames set of already used names, which should not be used
     * @param currentName current name from which the new name should be derived.
     */
    function findNewName(usedNames: Set<string>, currentName: string): string {
        const match = currentName.match(/(.*) \((\d+)\)$/);
        let version = 1;
        let name = currentName;
        let newName = currentName;
        if (match !== null) {
            name = match[1];
            version = parseInt(match[2]);
        }
        while (usedNames.has(newName)) {
            version++;
            newName = name + " (" + version + ")";
        }
        return newName;
    }


    /**
     * Generates a random Universally Unique Identifier (UUID) version 4 ((pseudo-)randomly generated).
     * In total there are 2^122 possible UUIDs, which leads to a very small probability of the generation of
     * duplicate UUIDs. Random numbers are drawn from the cryptographically secure random number generator
     * `crypto.getRandomValues`.
     */
    function generateRandomUUID(): string {
        const emptyUuid: string = '10000000-1000-4000-8000-100000000000';
        return (emptyUuid).replace(/[018]/g, (c: string) => {
            const digit = Number.parseInt(c);
            return (digit ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> digit / 4).toString(16);
        });
    }

    export type generateRandomUUIDFunc = typeof generateRandomUUID;

    function getWebNotificationPermissionState($window: angular.IWindowService): NotificationPermission | "unsupported" {
        return $window.Notification?.permission ?? "unsupported";
    }
    export type getWebNotificationPermissionStateFunc = () => NotificationPermission | "unsupported";

    function equalsDirective() {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope: angular.IScope, elem: ng.IAugmentedJQuery, attrs: ng.IAttributes, ngModel: angular.INgModelController | undefined) {
                if (!ngModel) return;

                scope.$watch(attrs.ngModel, function () {
                    validate();
                });

                attrs.$observe('equals', function (val) {
                    validate();
                });

                var validate = function () {
                    var val1 = ngModel.$viewValue;
                    var val2 = attrs.equals;
                    ngModel.$setValidity('equals', !val1 || !val2 || val1 === val2);
                };
            }
        };
    }

    /**
     * Generates the power set of the given array (interpreted as set (unordered)).
     * For example:
     * [] => [[]]
     * [1] => [[],[1]]
     * [1,2] => [[],[1],[2],[1,2]]
     * [1,2,3] => [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
     * @param array array of which to generate the power set.
     * @returns power set of `array` (i.e. all possible combinations of elements without order, without repetition)
     */
    export function powerset<T>(array: T[]) {
        const results: T[][] = [[]];
        for (const value of array) {
            const copy = [...results];
            for (const prefix of copy) {
                results.push(prefix.concat(value));
            }
        }
        return results;
    }

    /**
     * Yields nodes in a tree in preorder depth-first order (Depth-first search algorithm).
     * Does not perform cycle checking!
     *
     * @param root Node from which to start (first node being visited)
     * @param getChildren function to expand a node and return its children
     * @return Generator of nodes being visited by the DFS algorithm
     */
    export function* depthFirstSearchGenerator<T>(root: T, getChildren: (node: T) => T[]): Generator<T> {
        const stack = [root];
        // Depth first search
        while (stack.length > 0) {
            const parent = stack.shift()!;
            yield parent;
            const children = getChildren(parent);
            stack.unshift(...children)
        }
    }

    export function assertUnreachable(x: never): never {
        throw new Error("This line of code should never execute" + x);
    }

    export interface NavigatorWithStorage extends Navigator {
        readonly storage: StorageManager;
    }


    angular.module(moduleName, ['webStorageModule', 'rehagoal.restClientConfig'])
        .factory('$Date', date)
        .factory('storageManager', ['navigatorService', (navigatorService: NavigatorWithStorage) => navigatorService.storage || null])
        .service('navigatorService', ["$window", function ($window: angular.IWindowService) {
            return $window.navigator;
        }])
        .factory('webWorkerFactory', ["$window", function ($window: angular.IWindowService): typeof Worker {
            return $window.Worker;
        }])
        .factory('isCordova', ['$window', function ($window: angular.IWindowService) {
            return function() {
                return !!$window['cordova'];
            }
        }])
        .factory('getWebNotificationPermissionState', ['$window', function ($window: angular.IWindowService) {
            return function() {
                return getWebNotificationPermissionState($window);
            }
        }])
        .value('baseUrl', '')
        .filter('bytes2', () => {
            return formatBytesBase2
        })
        .value('hashString', hashString)
        .value('hashFile', hashFile)
        .value('readFileAsText', readFileAsText)
        .value('readBlobAsUint8Array', readBlobAsUint8Array)
        .value('generateRandomUUID', generateRandomUUID)
        .value('findNewName', findNewName)
        .directive('equals', equalsDirective)
        .value('generateWorkflowVersionHash', generateWorkflowVersionHash);
}
