declare module CordovaWebIntent {
    export const ACTION_SEND: string;
    export const ACTION_VIEW: string;
    export const EXTRA_TEST: string;
    export const EXTRA_SUBJECT: string;
    export const EXTRA_STREAM: string;
    export const EXTRA_EMAIL: string;
    export const ACTION_CALL: string;
    export const ACTION_SENDTO: string;

    interface ActivityParams {
        action: string
        url: string
    }

    interface BroadcastParams {
        action: string
        extras: {[K: string]: any}
    }

    export class WebIntent {
        startActivity(params: ActivityParams, success?: () => void, fail?: () => void): void;
        hasExtra(params: any, success?: (has: boolean) => void, fail?: () => void): void;
        getUri(success?: (url: string) => void, fail?: () => void): void;
        getExtra(extra: string, success?: (url: string) => void, fail?: () => void): void;
        onNewIntent(callback: (url: string) => void): void;
        sendBroadcast(params: BroadcastParams, success?: () => void, fail?: () => void): void;
    }
}
