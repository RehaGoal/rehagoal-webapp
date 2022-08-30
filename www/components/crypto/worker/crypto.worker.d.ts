import pbkdf2Args = rehagoal.crypto.pbkdf2Args;
import CryptoWorkerResponse = rehagoal.crypto.CryptoWorkerResponse;
declare function pbkdf2Handler(args: pbkdf2Args): Promise<string>;
declare const operationHandlers: {
    pbkdf2: typeof pbkdf2Handler;
};
