declare module ngCordova {

    interface WakeupOptions {
        alarms: WakeupAlarm[];
    }

    interface WakeupAlarm {
        type: string;
        time: { seconds: number };
        extra: { registerId: number };
        id?: number;
    }

    export type WakeupResult = string | {
        type: string;
        id: number;
        extra?: string;
    }

    type successCallback = (result: WakeupResult) => void;
    type errorCallback = (result?: string) => void;

    /**
     * cordova-plugin-wakeuptimer
     */
    export interface IWakeupTimer {

        /**
         * Set an wakeup alarm
         **/
        schedule(success: successCallback, error: errorCallback, options: WakeupOptions): void;

        /**
         * Cancel wakeup alarm[s] with their corresponding ids
         */
        cancel(success: successCallback, error: errorCallback, ids: number[]): void;
    }
}
