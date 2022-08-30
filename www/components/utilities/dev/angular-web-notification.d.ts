declare module angularWebNotification {
    type AngularShowNotificationCallback = (error?: Error, hide?: () => void) => void;

    interface IAngularWebNotificationOptions extends NotificationOptions {
        icon?: string
        autoClose?: number
        onClick?: (event: Event) => void
    }

    export interface IAngularWebNotification {
        showNotification(
            title?: string,
            options?: IAngularWebNotificationOptions,
            callback?: AngularShowNotificationCallback
        ): void
    }
}


