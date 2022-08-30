module rehagoal.utilities {
    const moduleName = 'rehagoal.utilities';


    /**
     * all possible animation events and phases based on angular ngAnimate events and phases
     * https://docs.angularjs.org/api/ng/service/$animate
     */
    const allAnimateEventsList = ['addClass', 'removeClass', 'setClass', 'enter', 'leave', 'move', 'animate'] as const;
    const allAnimatePhasesList = ['start', 'close'] as const;
    type AnimateCallback = Parameters<angular.animate.IAnimateService['on']>[2];
    type AnimateEventHandler = (eventName: AnimateEvent, ...animateCallback: Parameters<AnimateCallback>) => any;
    type AnimateEvent = typeof allAnimateEventsList[number];
    type AnimatePhase = typeof allAnimatePhasesList[number];
    const allAnimateEvents: ReadonlySet<AnimateEvent> = new Set(allAnimateEventsList);
    const allAnimatePhases: ReadonlySet<AnimatePhase> = new Set(allAnimatePhasesList);

    enum NativeAnimationState {
        NONE,
        STARTED,
        CANCELLED,
        FINISHED
    }

    /**
     * simple function that checks if "set" is superset of "subset"
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
     * @param set
     * @param subset
     */
    function isSuperset<S>(set: ReadonlySet<S>, subset: ReadonlySet<S>): boolean {
        for (let elem of subset) {
            if (!set.has(elem)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns true, if the given element is defined and visible, else false.
     * @param element JQuery (JQLite) element to check for visibility
     */
    function isElementVisible(element?: JQuery): boolean {
        return element?.[0]?.getClientRects().length !== 0;
    }

    function assertAllEventsKnown(events: ReadonlySet<string>): asserts events is ReadonlySet<AnimateEvent> {
        if (events.size > 0 && !isSuperset(allAnimateEvents, events)) {
            throw new Error(`Events not known by $animate! [${[...events]}] is not subset of [${[...allAnimateEvents]}]`);
        }
    }

    function assertAllPhasesKnown(phases: ReadonlySet<string>): asserts phases is ReadonlySet<AnimatePhase> {
        if (phases.size > 0 && !isSuperset(allAnimatePhases, phases)) {
            throw new Error(`Phases not known by $animate! [${[...phases]}] is not subset of [${[...allAnimatePhases]}]`);
        }
    }

    /**
     * directive used to register callbacks triggered by specific onAnimate Events and Phases on the element the directive is assigned to
     * the callback is given as value of this attribute directive (e.g. <... on-animate="$ctrl.callback">)
     * the phases and events can be specified in on-animate-events an -phases respectively (e.g. <... on-animate-phases="addClass removeClass">)
     * Note: if no phase or event is specified, it will instead react to ALL onAnimate events or phases
     */
    class onAnimateDirective implements angular.IDirective {
        restrict = 'A';

        link: angular.IDirectiveLinkFn = (scope: angular.IScope, element: JQLite, attrs: angular.IAttributes) => {

            const callback = this.$parse(attrs.onAnimate);
            const animationRestartCallback = this.$parse(attrs.onAnimateRestart);

            /**
             * removing duplicates by converting to Set and then to Array again
             * also use all phases/events when no phases/events given
             */
            const phases: ReadonlySet<string> = attrs.onAnimatePhases && attrs.onAnimatePhases.length > 0 ?
                new Set<string>(attrs.onAnimatePhases.split(' ')) : allAnimatePhases;
            const events: ReadonlySet<string> = attrs.onAnimateEvents && attrs.onAnimateEvents.length > 0 ?
                new Set<string>(attrs.onAnimateEvents.split(' ')) : allAnimateEvents;

            const eventHandlersMap = new Map<string, AnimateCallback>();

            /**
             * function meant to be triggered by animationEvent "EventName"
             * when given animation phase corresponds to phases the directive was configured with,
             * the Angular callback (compiled expression) is called with locals {eventName, phase, visible}
             * @param eventName
             * @param element
             * @param phase
             */
            const handleAnimateEvent: AnimateEventHandler = (eventName: AnimateEvent, element?: JQuery, phase?: string): void => {
                scope.$applyAsync(function() {
                    if (phase && phases.has(phase)) {
                        const visible = isElementVisible(element);
                        callback(scope, {eventName, phase, visible});
                    }
                });
            }

            /**
             * throws when onAnimate directive is configured with incorrect events or phases
             */
            assertAllEventsKnown(events);
            assertAllPhasesKnown(phases);

            /**
             * registration of event handlers for each animation event.
             * also remembrance of those handlers to be able to unregister them on destruction
             */
            for (let eventName of events) {
                const handler: AnimateCallback = (element?: JQuery, phase?: string) => handleAnimateEvent(eventName, element, phase);
                eventHandlersMap.set(eventName, handler);
                this.$animate.on(eventName, element, handler);
            }

            /*
            * animationState state machine:
            * NONE -> STARTED
            * STARTED -> FINISHED | CANCELLED
            * CANCELLED -> STARTED
            * FINISHED -> STARTED
            */
            let animationState = NativeAnimationState.NONE;

            const nativeAnimationStartHandler = () => {
                if (animationState === NativeAnimationState.CANCELLED) {
                    animationRestartCallback(scope, {});
                }
                animationState = NativeAnimationState.STARTED;
            };
            const nativeAnimationCancelledHandler = () => {
                animationState = NativeAnimationState.CANCELLED;
            };
            const nativeAnimationEndHandler = () => {
                animationState = NativeAnimationState.FINISHED;
            }

            element.on('animationstart', nativeAnimationStartHandler);
            element.on('animationcancel', nativeAnimationCancelledHandler);
            element.on('animationend', nativeAnimationEndHandler);

            /**
             * unregistration of event handlers for each animation event on destruction of this element
             */
            scope.$on('$destroy', () => {
                for (const [eventName, handler] of eventHandlersMap.entries()) {
                    this.$animate.off(eventName, element, handler);
                }
                eventHandlersMap.clear();
                element.off('animationstart', nativeAnimationStartHandler);
                element.off('animationcancel', nativeAnimationCancelledHandler);
                element.off('animationend', nativeAnimationEndHandler);
            });

        }

        constructor(private $parse: angular.IParseService, private $animate: angular.animate.IAnimateService) {
        }

        static factory() {
            const directive = ($parse: ng.IParseService, $animate: ng.animate.IAnimateService) => new onAnimateDirective($parse, $animate);
            directive.$inject = ['$parse', '$animate'];
            return directive;
        }
    }

    angular.module(moduleName)
        .directive('onAnimate', onAnimateDirective.factory());
}
