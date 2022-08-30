///<reference path="executionCountdown.service.d.ts"/>
"use strict";
module rehagoal.workflow {
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;
    import TimeBase = rehagoal.utilities.TimeBase;
    type CountdownCallback = (remainingSeconds: number) => void;
    interface CountdownCallbacks {
        on_update?: CountdownCallback,
        on_finish?: () => void,
    }

    class Countdown {
        private countdown_time: number = 0;
        private stop_handle: angular.IPromise<any> | null = null;
        private wakeupReference: WakeupReference | null = null;
        private readonly update_callback: CountdownCallback | undefined;
        private readonly finish_callback: (() => void) | undefined;
        private start_time: number = 0;

        constructor(private $interval: angular.IIntervalService, private $Date: DateConstructor,
                    private cordovaWakeupPlugin: CordovaWakeupPlugin,
                    private duration_in_time_base: number, private time_base: TimeBase,
                    callbacks: CountdownCallbacks = {}) {
            this.update_callback = callbacks.on_update;
            this.finish_callback = callbacks.on_finish;
        }

        private timeBaseToUnitFactor(time_base: TimeBase): number {
            switch (time_base) {
                case 'h':
                    return rehagoal.utilities.SECONDS_PER_HOUR;
                case 'm':
                    return rehagoal.utilities.SECONDS_PER_MINUTE;
                case 's':
                    return 1;
                default:
                    /* istanbul ignore next: should never execute */
                    return rehagoal.utilities.assertUnreachable(time_base);
            }
        }

        private onWakeupScheduled = (reference: WakeupReference) => {
            this.wakeupReference = reference;
        };

        private onWakeup = () => {
            this.onInterval();
        };

        private onInterval = () => {
            const remainingSeconds = this.countdown_time - (this.getNow() - this.start_time) / MILLISECONDS_PER_SECOND;
            if(this.update_callback) {
                this.update_callback(remainingSeconds);
            }

            if (remainingSeconds <= 0) {
                this.finish();
            }
        };

        private finish() {
            this.stop();
            if (this.finish_callback) {
                this.finish_callback();
            }
        }

        start() {
            let unit_factor = this.timeBaseToUnitFactor(this.time_base);
            this.countdown_time = this.duration_in_time_base * unit_factor;
            this.start_time = this.getNow();
            if (this.cordovaWakeupPlugin.supported) {
                this.cordovaWakeupPlugin.scheduleAfterElapsedSeconds(this.countdown_time, this.onWakeup)
                    .then(this.onWakeupScheduled);
            }
            this.stop_handle = this.$interval(this.onInterval, 1000);
        }

        forceFinish(): void {
            if (this.update_callback) {
                this.update_callback(0);
            }
            this.finish();
        }

        stop() {
            if (this.stop_handle !== null) {
                this.$interval.cancel(this.stop_handle);
                this.stop_handle = null;
            }
            if (this.wakeupReference !== null) {
                this.cordovaWakeupPlugin.cancel(this.wakeupReference);
                this.wakeupReference = null;
            }
        }

        private getNow() {
            return new this.$Date().getTime();
        }
    }

    export class ExecutionCountdownService implements IExecutionCountdownService{
        static $inject = [
            '$log',
            '$interval',
            '$timeout',
            '$Date',
            '$rootScope',
            'cordovaWakeupPlugin',
        ];

        private countdown: Countdown | null = null;
        private countdownCallback: CountdownCallback | null = null;



        constructor(private $log: angular.ILogService, private $interval: angular.IIntervalService,
                    private $timeout: angular.ITimeoutService, private $Date: DateConstructor,
                    private $rootScope: angular.IRootScopeService, private cordovaWakeupPlugin: CordovaWakeupPlugin) {
        }

        private onCountdown = (remainingSeconds: number) => {
            this.$log.debug(`Countdown: ${remainingSeconds}`);
            if (this.countdownCallback) {
                this.countdownCallback(remainingSeconds);
            }
        };

        private onFinish = () => {
            this.$timeout(()  => {
                // TODO: $rootScope usage is probably problematic, when there are multiple executionViews in the scope
                this.$rootScope.$broadcast('executionCountdownEvent');
            });
        };

        public startCountdown(time: number, time_base: TimeBase): void {
            this.stopCountdown();
            this.countdown = new Countdown(this.$interval, this.$Date, this.cordovaWakeupPlugin, time, time_base, {
                    on_finish: this.onFinish,
                    on_update: this.onCountdown
                });
            this.$log.debug('Countdown start');
            this.countdown.start();
        }

        public forceCountdownFinish() {
            if(this.countdown != null) {
                this.countdown.forceFinish();
            }
        }

        public stopCountdown(): void {
            if(this.countdown != null) {
                this.$log.debug('Countdown stop');
                this.countdown.stop();
                this.countdown = null;
            }
        }
        public setCountdownCallback(callback: CountdownCallback): void {
            this.countdownCallback = callback;
        }
    }

    angular.module('rehagoal.workflow')
        .service('countdownService', ExecutionCountdownService);
}
