// Ref: https://github.com/ksachdeva/ngCordova-typescript-demo/blob/master/local_typings/ng-cordova/toast.d.ts

declare module ngCordova {

    interface NotificationAction {
        id: string
        type?: 'input' | 'button'
        title?: string
        emptyText?: string
        launch?: boolean
        icon?: string
        editable?: boolean
        choices?: string[];
    }

    interface FixedDateNotificationTrigger {
        at: Date
    }

    interface TimespanRelativeNotificationTrigger {
        in: number
        unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
    }

    interface NotificationDateMatcher {
        year?: number;
        month?: number;
        weekOfMonth?: number;
        weekday?: number;
        day?: number;
        hour?: number;
        minute?: number;
    }

    interface RepeatingNotificationTrigger {
        every: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' | NotificationDateMatcher
        count?: number
        before?: Date
        after?: Date
    }

    export type NotificationTrigger = FixedDateNotificationTrigger | TimespanRelativeNotificationTrigger | RepeatingNotificationTrigger;

    interface NotificationConversationMessage {
        message: string;
        person?: string;
        date?: number;
    }

    // Bitflags for INotification::defaults
    export const NOTIFICATION_DEFAULT_SOUND = 1;
    export const NOTIFICATION_DEFAULT_VIBRATE = 2;
    export const NOTIFICATION_DEFAULT_LIGHTS = 4;
    /**
     * Notification skeleton interface
     * Details see: https://github.com/katzer/cordova-plugin-local-notifications
     */
    interface INotification {
        actions?: string | NotificationAction[]; //[]
        attachments?: string[]; //[]
        autoClear?: boolean; //true
        badge?: number; //null
        channel?: string; //null
        clock?: boolean | "chronometer"; //true
        color?: string; //null
        data?: any; //null
        defaults?: number; //0
        group?: string; //null
        groupSummary?: boolean; //false
        icon?: string; //null
        iconType?: string; //null
        id?: number; //0
        launch?: boolean; //true
        led?: string | {on: number, off: number, color: string} | [string, number, number]; //true
        lockscreen?: boolean; //true
        mediaSession?: string; //null
        number?: number; //0
        priority?: number; //0
        progressBar?: { enabled?: boolean, indeterminate?: boolean, value?: number, maxValue?: number }; //false
        silent?: boolean; //false
        smallIcon?: string; //'res://icon'
        sound?: string; // true
        sticky?: boolean; //false
        summary?: string; //null
        text?: string | NotificationConversationMessage[]; //''
        timeoutAfter?: number; //false
        title?: string; //''
        trigger?: NotificationTrigger; // { type: 'calendar' }
        vibrate?: boolean; // false
        wakeup?: boolean; // true
    }

    interface NotificationEvent {
        event: string,
        foreground: boolean,
        queued: boolean,
        notification: number
    }

    type PermissionCallback = (granted: boolean) => any
    type NotificationOptions = INotification | INotification[]

    /**
     * cordova-plugin-local-notifications
     * contains even more methods which are not implemented here. depending
     * on the used versions multiple others can be defined here. See:
     * https://github.com/katzer/cordova-plugin-local-notifications#methods
     */
    interface ILocalNotification {

        /**
         *  Schedule the local notification.
         *  @options: Set of notification options.
         *  @scope: (optional) Receiver to handle the trigger event.
         **/
        schedule(options: NotificationOptions, scope?: ThisType<any>): angular.IPromise<any>;

        /**
         * Cancel the specified notifications.
         *
         * @param {number[]} ids
         *      The IDs of the notifications
         * @param {Function} callback
         *      A function to be called after the notifications has been canceled
         * @param {Object?} scope
         *      The scope for the callback function
         */
        cancel(ids: number[], scope?: ThisType<any>): angular.IPromise<any>;

        cancelAll(scope?: ThisType<any>): angular.IPromise<any>;
        update(options: NotificationOptions, scope?: ThisType<any>): angular.IPromise<any>;
        clear(ids: number[], scope?: ThisType<any>): angular.IPromise<any>;
        clearAll(scope?: ThisType<any>): angular.IPromise<any>;
        isPresent(id: number, scope?: ThisType<any>): angular.IPromise<boolean>;
        isScheduled(id: number, scope?: ThisType<any>): angular.IPromise<boolean>;
        isTriggered(id: number, scope?: ThisType<any>): angular.IPromise<boolean>;
        getIds(scope?: ThisType<any>): angular.IPromise<number[]>;
        getScheduledIds(scope?: ThisType<any>): angular.IPromise<number[]>;
        getTriggeredIds(scope?: ThisType<any>): angular.IPromise<number[]>;
        get(ids: number[], scope?: ThisType<any>): angular.IPromise<INotification[]>;
        getAll(scope?: ThisType<any>): angular.IPromise<INotification[]>;
        //infinite wait? getScheduled(ids: number[], scope?: ThisType<any>): angular.IPromise<any>;
        //undefined getAllScheduled(scope?: ThisType<any>): angular.IPromise<any>;
        //infinite wait? getTriggered(ids: number[], scope?: ThisType<any>): angular.IPromise<any>;
        //undefined getAllTriggered(scope?: ThisType<any>): angular.IPromise<any>;
        getDefaults(): INotification;
        setDefaults(defaultSettings: INotification): void;


        //hasPermission(callback: PermissionCallback): void;
        //requestPermission(callback: PermissionCallback): void;
    }
}
