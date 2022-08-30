module rehagoal.workflow {
    import IWakeupTimer = ngCordova.IWakeupTimer;
    const moduleName = 'rehagoal.workflow';
    export type WakeupCallback = () => void;
    export type WakeupRegisteredCallback = (ref: WakeupReference) => void;

    export interface WakeupReference {
        alarmId: number;
        registerId: number;
    }

    export class CordovaWakeupPlugin {
        static $inject = [
            '$log',
            '$window',
            '$document'
        ];

        private registerId: number = 0;
        private wakeupPlugin: IWakeupTimer | undefined;
        private alarmIdToWakeupReference: Map<number, WakeupReference> = new Map<number, WakeupReference>();
        private registerIdToWakeupCallback: Map<number, WakeupCallback> = new Map<number, WakeupCallback>();
        private registerIdToRegisteredCallback: Map<number, WakeupRegisteredCallback> = new Map<number, WakeupRegisteredCallback>();

        constructor(private $log: angular.ILogService,
                    private $window: angular.IWindowService,
                    private $document: angular.IDocumentService) {
            let vm = this;

            (vm.$document[0] as Document).addEventListener('deviceready', function () {
                if ($window.wakeuptimer) {
                    vm.wakeupPlugin = $window.wakeuptimer;
                }
            });

            vm.$log.debug('wakeuptimer: plugin loaded');
        }

        private getNextRegisterId(): number {
            return this.registerId++;
        }

        private lowlevel_cancel(success: ngCordova.successCallback, error: ngCordova.errorCallback, ids: number[]): void {
            if (!this.wakeupPlugin) {
                throw new Error("WakeUpPlugin not yet initialized!");
            }
            this.wakeupPlugin.cancel(success,error,ids);
        }

        private lowlevel_schedule(success: ngCordova.successCallback, error: ngCordova.errorCallback, options: ngCordova.WakeupOptions): void {
            if (!this.wakeupPlugin) {
                throw new Error("WakeUpPlugin not yet initialized!");
            }
            this.wakeupPlugin.schedule(success,error,options);
        }

        private cordovaSuccessCallback = (result: ngCordova.WakeupResult): void => {
            this.$log.debug("CordovaWakeupPlugin::cordovaSuccessCallback", this);

            if (typeof result !== "string") {
                switch (result.type) {
                    case 'set':
                        this.$log.debug("CordovaWakeupPlugin::cordovaSuccessCallback -> 'set'", this);
                        this.handleAlarmRegistered(result);
                        break;
                    case 'wakeup':
                        this.$log.debug("CordovaWakeupPlugin::cordovaSuccessCallback -> 'wakeup'", this);
                        this.handleWakeup(result.id);
                        break;
                    default:
                        this.$log.debug('wakeup unhandled type (' + result.type + ')');
                }
            }
        };

        private handleAlarmRegistered(result: Exclude<ngCordova.WakeupResult, string>) {
            const alarmId = result.id;
            if (result.extra) {
                const extra = JSON.parse(result.extra);
                const registerId = extra.registerId;
                const wakeupReference = Object.freeze({
                    alarmId,
                    registerId
                });

                const registeredCallback = this.registerIdToRegisteredCallback.get(registerId);
                if (registeredCallback) {
                    registeredCallback(wakeupReference);
                    this.registerIdToRegisteredCallback.delete(registerId);
                }

                this.alarmIdToWakeupReference.set(alarmId, wakeupReference);
            }
        }

        private handleWakeup(alarmId: number) {
            const wakeupReference = this.alarmIdToWakeupReference.get(alarmId);
            if (!wakeupReference) {
                return;
            }
            const wakeupCallback = this.registerIdToWakeupCallback.get(wakeupReference.registerId);
            if (!wakeupCallback) {
                return;
            }
            wakeupCallback();
        }

        private cordovaErrorCallback = (result?: string): void => {
            if (result) {
                this.$log.debug('WakeupPlugin: error received: ' + result);
            } else {
                this.$log.debug('WakeupPlugin: unknown error received');
            }
        };

        public get supported() {
            return !!this.$window.cordova;
        }

        public scheduleAfterElapsedSeconds(seconds: number, wakeupCallback: WakeupCallback): Promise<WakeupReference> {
            return new Promise((resolve, reject) =>  {
                this.$log.debug("CordovaWakeupPlugin::schedule", seconds, this);
                let registerId: number = this.getNextRegisterId();
                this.$log.debug("CordovaWakeupPlugin::scheduleTimer -> registerId", registerId, this);

                let options: ngCordova.WakeupOptions = {
                    alarms: [{
                        type: 'relative',
                        time: {seconds: seconds},
                        extra: {registerId}
                    }]
                };
                this.$log.debug("CordovaWakeupPlugin::scheduleTimer -> schedule wakeup", options, this);

                this.registerIdToWakeupCallback.set(registerId, wakeupCallback);
                this.registerIdToRegisteredCallback.set(registerId, resolve);

                try {
                    this.lowlevel_schedule(this.cordovaSuccessCallback, this.cordovaErrorCallback, options);
                } catch (error) {
                    this.registerIdToWakeupCallback.delete(registerId);
                    this.registerIdToRegisteredCallback.delete(registerId);
                    reject(error);
                }
            });
        }

        public cancel(reference: WakeupReference) {
            this.$log.debug("CordovaWakeupPlugin::cancelTimer", reference, this);
            if (this.registerIdToWakeupCallback.has(reference.registerId)) {
                this.lowlevel_cancel(this.cordovaSuccessCallback, this.cordovaErrorCallback, [reference.alarmId]);
                this.registerIdToWakeupCallback.delete(reference.registerId);
                this.alarmIdToWakeupReference.delete(reference.alarmId);
            }
        }

    }

    angular.module(moduleName)
        .service('cordovaWakeupPlugin', CordovaWakeupPlugin)
}
