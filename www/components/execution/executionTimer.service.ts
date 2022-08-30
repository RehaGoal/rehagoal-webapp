import ILogService = angular.ILogService;
import IIntervalService = angular.IIntervalService;

module rehagoal.workflow {
    const moduleName = 'rehagoal.workflow';

    import SECONDS_PER_MINUTE = rehagoal.utilities.SECONDS_PER_MINUTE;
    import SECONDS_PER_HOUR = rehagoal.utilities.SECONDS_PER_HOUR;
    import MILLISECONDS_PER_SECOND = rehagoal.utilities.MILLISECONDS_PER_SECOND;

    const minTimerIntervalTime: number = 4;

    type TimerData = {
        description: string;
        time: number;
        time_base: string
    }
    type TimerCallback = () => boolean;
    type TimerFactory = (data: TimerData, callback: TimerCallback) => ExecutionTimer;

    export abstract class ExecutionTimer {
        protected description: string;
        protected time: number;
        protected time_base: 's' | 'm' | 'h';
        protected timerServiceCallback: TimerCallback;

        protected constructor(data: TimerData, callback: TimerCallback, protected $log: angular.ILogService) {
            this.description = data.description;
            this.timerServiceCallback = callback;

            this.time_base = 's';

            this.time = this.checkTimerInput(data.time);
            this.evalTimeBase(data.time_base);
            this.evalMinTimer(this.time, this.time_base);
        }

        trigger(): boolean {
            this.$log.debug("ExecutionTimer::trigger", this);
            return this.timerServiceCallback();
        };

        getTimeInSeconds(): number {
            return this.time;
        }

        getDescription(): string {
            return this.description;
        }

        checkTimerInput(time: number): number {
            //not setting to minimalvalue here, since time base is checked afterwards
            //and therefore time is recalculated and minimum checked (wouldn't change time to 4s but to 4(s/m/h)
            const defaultTimer = 0;
            if (!isFinite(time)) {
                this.$log.warn("Bad Time in execution timer: not finite (%d), changing to defaultTimer: %d", time, defaultTimer);
                return defaultTimer;
            } else if (time < 0) {
                this.$log.warn("Bad Time in execution timer: negative (%d), changing to defaultTimer: %d", time, defaultTimer);
                return defaultTimer;
            }
            return time;
        }

        evalTimeBase(time_base: string): void {
            if (time_base == 's') {
                //do nothing
            } else if (time_base == 'm') {
                this.time *= SECONDS_PER_MINUTE;
            } else if (time_base == 'h') {
                this.time *= SECONDS_PER_HOUR;
            } else {
                this.$log.warn("Unknown time_base in Execution Timer for: %s - Using default time_base (%s) instead", time_base, this.time_base);
            }
        }

        evalMinTimer(time: number, time_base:string): void {
            if (time < minTimerIntervalTime) {
                this.$log.warn("Timer is below minTimerIntervalTime (actual: %d), changing to defaultTimer: %d", time, minTimerIntervalTime);
                this.time = minTimerIntervalTime;
            }
        }

        abstract startTimer(): void;
        abstract stopTimer(): void;
    }

    export type IBrowserExecutionTimer = BrowserExecutionTimer;

    class BrowserExecutionTimer extends ExecutionTimer {
        private timerTime: number = 0;
        private stopHandle: angular.IPromise<any> | null = null;
        private readonly intervalTime: number = MILLISECONDS_PER_SECOND;

        constructor(protected $log: angular.ILogService,
                    private $interval: angular.IIntervalService,
                    private data: TimerData,
                    private callback: TimerCallback){
            super(data, callback, $log);
        }

        startTimer(): void {
            this.$log.debug("BrowserExecutionTimer::startTimer", this);
            let my = this;
            my.timerTime = my.getTimeInSeconds();

            if (my.stopHandle) {
                this.$log.debug("BrowserExecutionTimer::startTimer -> stopHandle present", this);
                return;
            }

            my.$log.debug('BrowserExecutionTimer -> start');
            my.stopHandle = my.$interval( () => {
                my.timerTime = my.timerTime - 1;
                my.$log.debug('BrowserExecutionTimer: ' + my.timerTime);
                if (my.timerTime <= 0) {
                    my.trigger();
                    my.timerTime = my.getTimeInSeconds();
                }
            }, my.intervalTime);
        }

        stopTimer(): void {
            this.$log.debug("BrowserExecutionTimer::stopTimer", this);
            let my = this;
            if (my.stopHandle) {
                my.$log.debug('BrowserExecutionTimer stop');
                my.$interval.cancel(my.stopHandle);
                my.stopHandle = null;
            }
        }
    }

    export type ICordovaExecutionTimer = CordovaExecutionTimer;

    class CordovaExecutionTimer extends ExecutionTimer {
        private timerReference: WakeupReference | null = null;
        private timerIdPromise: angular.IPromise<WakeupReference> | null = null;

        constructor(protected $log: angular.ILogService,
                    private $cordovaLocalNotification: ngCordova.ILocalNotification,
                    private cordovaExecutionTimerService: CordovaExecutionTimerService,
                    private data: TimerData,
                    private callback: TimerCallback){
            super(data, callback, $log);
        }

        startTimer(): void {
            this.$log.debug("CordovaExecutionTimer::startTimer", this);
            let my = this;
            if (this.timerIdPromise !== null) {
                this.$log.warn("CordovaExecutionTimer::startTimer: timerIdPromise is already set!");
            }
            my.timerReference = null;
            this.timerIdPromise = my.cordovaExecutionTimerService.scheduleTimer(my).then( (reference) => {
                this.$log.debug("CordovaExecutionTimer::startTimer -> timerReference = ", reference);
                my.timerReference = reference;
                return reference;
            });
        }

        stopTimer(): void {
            this.$log.debug("CordovaExecutionTimer::stopTimer", this);
            let my = this;

            if (my.timerReference !== null) {
                my.cancelCordovaTimer(my.timerReference);
            }
            if (my.timerIdPromise !== null) {
                // timerIdPromise may not yet have been resolved, therefore we chain a cancellation of the corresponding
                // timer. In case a timerId has not yet been resolved, it will then immediately be cancelled afterwards.
                console.debug("CordovaExecutionTimer::stopTimer", "Preemptively cancelling cordovaTimer in promise.");
                my.timerIdPromise.then((timerId) => my.cancelCordovaTimer(timerId));
            }
            my.timerReference = null;
            my.timerIdPromise = null;
        }

        private cancelCordovaTimer(timerId: WakeupReference) {
            this.$log.debug("CordovaExecutionTimer::cancelCordovaTimer -> cancelTimer", this, timerId);
            this.cordovaExecutionTimerService.cancelTimer(timerId);
            // cancel ongoing cordova notification
            this.$cordovaLocalNotification.cancel([0]);
        }

        trigger(): boolean {
            this.$log.debug("CordovaExecutionTimer::trigger", this);
            let my = this;
            let result: boolean = false;
            if (my.timerReference !== null && super.trigger()) {
                my.$cordovaLocalNotification.schedule({
                    id: 0,
                    title: 'RehaGoal Erinnerung',
                    text: my.description
                });
                result = true;
            }
            // restart interval schedule
            my.startTimer();
            return result;
        }
    }

    export type ICordovaExecutionTimerService = CordovaExecutionTimerService;

    class CordovaExecutionTimerService {
        static $inject = [
            '$log',
            '$q',
            'cordovaWakeupPlugin'
        ];

        constructor(private $log: angular.ILogService,
                    private $q: angular.IQService,
                    private cordovaWakeupPlugin: CordovaWakeupPlugin){
            this.$log.debug('CordovaExecutionTimerService loaded');
        };

        scheduleTimer(timer: ExecutionTimer): angular.IPromise<WakeupReference> {
            this.$log.debug("CordovaExecutionTimerService::scheduleTimer", timer, this);
            const wakeupInSeconds = timer.getTimeInSeconds();
            this.$log.debug("CordovaExecutionTimerService::scheduleTimer -> schedule wakeup", wakeupInSeconds, this);
            return this.cordovaWakeupPlugin.scheduleAfterElapsedSeconds(wakeupInSeconds, () => {
                timer.trigger();
            });
        }

        cancelTimer(reference: WakeupReference) {
            this.$log.debug("CordovaExecutionTimerService::cancelTimer", reference, this);
            this.cordovaWakeupPlugin.cancel(reference);
        }

    }

    export class ExecutionTimerService {

        static $inject = [
            '$log',
            '$rootScope',
            '$document',
            '$timeout',
            'BrowserExecutionTimerFactory',
            'CordovaExecutionTimerFactory'
        ];

        private timerList: ExecutionTimer[] = [];
        private timerFactory: TimerFactory;
        private _lastTimerNotification: number = 0;
        private _timerPaused: boolean = false;

        get _timerFactory() {
            return this.timerFactory;
        }

        get timerPaused() {
            return this._timerPaused;
        }

        get lastTimerNotification() {
            return this._lastTimerNotification;
        }

        constructor(private $log: angular.ILogService,
                    private $rootScope: angular.IRootScopeService,
                    private $document: angular.IDocumentService,
                    private $timeout: angular.ITimeoutService,
                    private BrowserExecutionTimerFactory: TimerFactory,
                    private CordovaExecutionTimerFactory: TimerFactory) {

            let srv = this;
            this.timerFactory = BrowserExecutionTimerFactory;
            (this.$document[0] as Document).addEventListener('deviceready', function () {
                srv.timerFactory = CordovaExecutionTimerFactory;
            });
            this.$log.debug("ExecutionTimerService loaded");
        }

        addTimer(description: string, time: number, time_base: string): ExecutionTimer {
            this.$log.debug("ExecutionTimerService::addTimer -> ", description, time, time_base, this);
            let srv = this;
            let timerData: TimerData = {
                description: description,
                time: time,
                time_base: time_base
            };
            let timer = srv.timerFactory (timerData, srv.handleTrigger);
            timer.startTimer();
            srv.timerList.push(timer);
            return timer;
        }

        removeAllTimers(): void {
            let srv = this;
            srv.$log.debug('Remove all timers');
            srv.timerList.forEach( (timer) => { timer.stopTimer(); });
            srv.timerList = [];
            srv.$log.debug('All timers removed');
        }

        removeTimer(timer: ExecutionTimer): void {
            let srv = this;
            srv.$log.debug('Remove timer');
            for (let i = 0; i < srv.timerList.length; i++) {
                if (srv.timerList[i] == timer) {
                    srv.timerList[i].stopTimer();
                    srv.timerList.splice(i, 1);
                    srv.$log.debug('Timer removed!');
                    return;
                }
            }
            srv.$log.debug('Timer not found!');
        }

        resetAllTimers(): void {
            let srv = this;
            srv.$log.debug('Reset all timers');
            srv.timerList.forEach( (timer) => {
                timer.stopTimer();
                timer.startTimer();
            });
            srv.$log.debug('All timers reset');
        }

        handleTrigger = (): boolean => {
            let srv = this;
            let currentTime: number = new Date().getTime();

            if (!srv._timerPaused && currentTime > (srv._lastTimerNotification + minTimerIntervalTime * MILLISECONDS_PER_SECOND)) {
                srv._lastTimerNotification = currentTime;
                srv.$timeout(function() {
                    srv.$rootScope.$broadcast('executionTimerEvent');
                    srv.$log.debug('Erinnerung: triggered');
                });
                return true;
            }
            return false;
        };

        setPaused(paused: boolean): void {
            let srv = this;
            srv._timerPaused = paused;
            if (!paused) {
                srv._lastTimerNotification = 0;
            }
        }

        getTimerCount(): number {
            return this.timerList.length;
        }

    }

    angular.module(moduleName)
        .service('timerService', ExecutionTimerService)
        .service('cordovaExecutionTimerService', CordovaExecutionTimerService)
        .factory('BrowserExecutionTimerFactory', ['$log', '$interval',
            ($log: ILogService, $interval: IIntervalService) =>
                (data: TimerData, callback: TimerCallback) => new BrowserExecutionTimer($log, $interval, data, callback) ])
        .factory('CordovaExecutionTimerFactory', ['$log', '$cordovaLocalNotification', 'cordovaExecutionTimerService',
            ($log: ILogService, $cordovaLocalNotification: ngCordova.ILocalNotification, cordovaExecutionTimerService: CordovaExecutionTimerService) =>
                (data: TimerData, callback: TimerCallback) => new CordovaExecutionTimer($log, $cordovaLocalNotification, cordovaExecutionTimerService, data, callback)]);
}
