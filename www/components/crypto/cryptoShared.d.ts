declare module rehagoal.crypto {
    export type pbkdf2Args = {input: string, salt: string, iterations: number, keySize: number};
    export type pbkdf2Type = (input: string, salt: string, iterations?: number, keySize?: number) => Promise<string>;
    export type generateRandom256BitHexStringType = typeof generateRandom256BitHexString;

    interface CryptoQueryPbkdf2 {
        operation: 'pbkdf2',
        args: pbkdf2Args,
    }
    interface CryptoResponsePbkdf2 {
        query: CryptoQueryPbkdf2,
        result: string
    }
    type CryptoWorkerQuery = CryptoQueryPbkdf2;
    type CryptoWorkerResponse = CryptoResponsePbkdf2;
}
