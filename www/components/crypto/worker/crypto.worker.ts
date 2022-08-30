import pbkdf2Args = rehagoal.crypto.pbkdf2Args;
import CryptoWorkerResponse = rehagoal.crypto.CryptoWorkerResponse;

async function pbkdf2Handler(args: pbkdf2Args) {
    return rehagoal.crypto.pbkdf2Compute(args);
}

const operationHandlers = {
    'pbkdf2': pbkdf2Handler
};


onmessage = async function(event: MessageEvent) {
    try {
        importScripts(
            '../cryptoFunctions.js',
            '../../../bower_components/sjcl/sjcl.js'
        );

        const handler = operationHandlers[event.data.operation];
        if (!handler) {
            throw new Error(`No crypto handler for operation {event.data.operation}!`);
        }
        const result = await handler(event.data.args);
        const response: CryptoWorkerResponse = {
            query: event.data,
            result
        };
        postMessage(response);
    } catch (error) {
        setTimeout(function() { throw error; });
    }
};