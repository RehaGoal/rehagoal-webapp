module rehagoal.crypto {
    const moduleName = 'rehagoal.crypto';

    const PBKDF_MINIMUM_ITERATIONS = 10_000;
    const PBKDF_MINIMUM_KEYSIZE = 256;
    /**
     * Password-Based Key-Derivation Function, version 2.0 using SJCL library
     * @param input                 the password
     * @param salt                  entropy rich salt value for derived function
     * @param iterations            number of rounds the function should be applied (default: PBKDF_MINIMUM_ITERATIONS)
     * @param keySize               resulting length of the derived key (default: PBKDF_MINIMUM_KEYSIZE)
     * @param webWorkerFactory      optional WebWorker constructor, if supported
     * @param baseUrl               the baseUrl under which all scripts reside
     * @returns Promise<string>     the derived key
     * @throws Error                contains an error message on type mismatch
     */
    async function pbkdf2Internal(input: string, salt: string, iterations?: number, keySize?: number,
                                  webWorkerFactory?: typeof Worker, baseUrl?: string) : Promise<string> {
        if (!angular.isString(input)) {
            throw new TypeError(`Expected string parameter for input but got type ${typeof input}`);
        }
        if (!angular.isString(input)) {
            throw new TypeError(`Expected string parameter for salt but got type ${typeof salt}`);
        }
        if (!iterations || iterations < PBKDF_MINIMUM_ITERATIONS) {
            iterations = PBKDF_MINIMUM_ITERATIONS;
        }
        if (!keySize || keySize < PBKDF_MINIMUM_KEYSIZE) {
            keySize = PBKDF_MINIMUM_KEYSIZE;
        }
        let args = {input, salt, iterations, keySize};
        if (webWorkerFactory && baseUrl !== undefined) {
            return pbkdf2ComputeWebWorker(args, webWorkerFactory, baseUrl);
        } else {
            return pbkdf2Compute(args);
        }
    }

    async function pbkdf2ComputeWebWorker(args: pbkdf2Args, webWorker: typeof Worker, baseUrl: string) {
        let worker = new webWorker(baseUrl + 'components/crypto/worker/crypto.worker.js');
        return new Promise<string>((resolve, reject) => {
            worker.onmessage = function (event: MessageEvent) {
                let response: CryptoWorkerResponse = event.data;
                resolve(response.result);
                worker.terminate();
            };
            worker.onerror = function (event: ErrorEvent) {
                reject(new Error(`WebWorker failed: [${event.filename}:${event.lineno}]: ${event.message}`));
                worker.terminate();
            };
            const request: CryptoWorkerQuery = {
                operation: 'pbkdf2',
                args
            };
            worker.postMessage(request);
        });
    }

    angular.module(moduleName, ['rehagoal.utilities', 'rehagoal.settings'])
        .factory('pbkdf2', ['webWorkerFactory', 'baseUrl', function(webWorker: typeof Worker, baseUrl: string): pbkdf2Type {
            return async function(input: string, salt: string, iterations?: number, keySize?: number) {
                return pbkdf2Internal(input, salt, iterations, keySize, webWorker, baseUrl);
            };
        }])
        .value('generateRandom256BitHexString', generateRandom256BitHexString);
}
