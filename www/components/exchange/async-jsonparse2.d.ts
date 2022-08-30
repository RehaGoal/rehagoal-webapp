import {Tokenizer as AsyncTokenizer, Parser as AsyncParser, JsonParser as AsyncJsonParser, TokenType as JsonTokenType} from "../../bower_components/jsonparse2/dist/umd/index";
import { StackElement as JsonStackElement } from "../../bower_components/jsonparse2/dist/umd/parser";

declare global {
    export namespace jsonparse {
        export var JsonParser: typeof AsyncJsonParser;
        export var Tokenizer: typeof AsyncTokenizer;
        export var Parser: typeof AsyncParser;
        export var TokenType: typeof JsonTokenType;
        export type StackElement = JsonStackElement;
    }
}
