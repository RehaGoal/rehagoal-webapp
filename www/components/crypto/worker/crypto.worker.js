var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function pbkdf2Handler(args) {
    return __awaiter(this, void 0, void 0, function* () {
        return rehagoal.crypto.pbkdf2Compute(args);
    });
}
const operationHandlers = {
    'pbkdf2': pbkdf2Handler
};
onmessage = function (event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            importScripts('../cryptoFunctions.js', '../../../bower_components/sjcl/sjcl.js');
            const handler = operationHandlers[event.data.operation];
            if (!handler) {
                throw new Error(`No crypto handler for operation {event.data.operation}!`);
            }
            const result = yield handler(event.data.args);
            const response = {
                query: event.data,
                result
            };
            postMessage(response);
        }
        catch (error) {
            setTimeout(function () { throw error; });
        }
    });
};
//# sourceMappingURL=crypto.worker.js.map