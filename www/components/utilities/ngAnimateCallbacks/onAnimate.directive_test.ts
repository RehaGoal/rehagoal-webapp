module rehagoal.utilities {
    describe('rehagoal.utilities', function() {
        let $compile: ng.ICompileService;
        let $rootScope: ng.IRootScopeService;
        let $animateOnSpy: jasmine.Spy;
        let $animateOffSpy: jasmine.Spy;
        let $animate: ng.animate.IAnimateService;
        beforeEach(() => angular.mock.module('rehagoal.utilities'));
        beforeEach(() => angular.mock.module('ngAnimate', function ($provide: ng.auto.IProvideService) {
            $provide.decorator('$animate', function($delegate: ng.animate.IAnimateService) {
                $animateOnSpy = spyOn($delegate, 'on');
                $animateOffSpy = spyOn($delegate, 'off');
                return $delegate;
            });
        }));
        beforeEach(() => inject(function(_$compile_: ng.ICompileService,
                                         _$rootScope_: ng.IRootScopeService,
                                         _$animate_: ng.animate.IAnimateService) {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
            $animate = _$animate_;
        }))

        describe('directive: onAnimate', function() {
            let $scope: CustomScope;

            const allAnimateEvents = ['addClass', 'removeClass', 'setClass', 'enter', 'leave', 'move', 'animate'];
            const allAnimatePhases = ['start', 'close'];

            interface CustomScope extends angular.IScope {
                myAnimateCallback?: ((eventName: string, element?: HTMLDivElement, phase?: string) => void) & jasmine.Spy;
                myAnimateRestartCallback?: ((scope: angular.IScope, locals: object) => void) & jasmine.Spy;
            }

            beforeEach(function() {
                $scope = $rootScope.$new();
            });

            function testOnAnimate(events: string[], phases: string[]) {

                if (phases.length > 2 || phases.length > 0 && !(phases.includes('start') || phases.includes('close'))) {
                    fail('test function "testOnAnimate" used incorrectly. parameter "phases" can only be [], ["start"], ["close"], ["start", "close"]!');
                }

                $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                // testing that $animate.on is set with callback function for correct events
                const onAnimateEvents: string = events.join(' ');
                const onAnimatePhases: string = phases.join(' ');

                //if no events/phases given, then it should use all.
                events = events.length > 0 ? events : allAnimateEvents;
                phases = phases.length > 0 ? phases : allAnimatePhases;

                const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" 
                                                         on-animate-events="${onAnimateEvents}" 
                                                         on-animate-phases="${onAnimatePhases}"
                                                     ></div>`)($scope);
                document.body.appendChild(jqElement[0]);
                $rootScope.$apply();
                expect($animateOnSpy).toHaveBeenCalledTimes(events.length);
                let animateHandlers = []
                for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
                    $scope.myAnimateCallback.calls.reset() // TODO: is this bad practice?
                    expect($animateOnSpy).toHaveBeenCalledWith(events[eventIndex], jqElement, jasmine.any(Function));
                    animateHandlers[eventIndex] = $animateOnSpy.calls.argsFor(eventIndex)[2];
                    expect($scope.myAnimateCallback).not.toHaveBeenCalled();

                    animateHandlers[eventIndex](jqElement, 'start');
                    $rootScope.$apply();
                    animateHandlers[eventIndex](jqElement, 'close');
                    $rootScope.$apply();

                    expect($scope.myAnimateCallback).toHaveBeenCalledTimes(phases.length);
                    for (let phase of phases) {
                        expect($scope.myAnimateCallback).toHaveBeenCalledWith(events[eventIndex], undefined, phase);
                    }
                }
                $scope.$destroy();
                document.body.removeChild(jqElement[0]);
                expect($animateOffSpy).toHaveBeenCalledTimes(events.length);
                for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
                    expect($animateOffSpy).toHaveBeenCalledWith(events[eventIndex], jqElement, animateHandlers[eventIndex]);
                }

                // TODO: is this bad practice?
                $scope = $rootScope.$new();
                $animateOnSpy.calls.reset();
                $animateOffSpy.calls.reset();
            }

            describe('callback registering, firing and unregistering', function() {
                it('should call callback correctly with single event and single phase for all events', function() {
                    for (let eventName of allAnimateEvents) {
                        for (let phaseName of allAnimatePhases) {
                            testOnAnimate([eventName], [phaseName])
                        }
                    }
                });
                it('should call callback correctly with single event and both phases for all events', function() {
                    for (let eventName of allAnimateEvents) {
                        testOnAnimate([eventName], allAnimatePhases)
                    }
                });
                it('should call callback correctly with any two events and single or both phases', function() {
                    for (let phaseName of allAnimatePhases) {
                        testOnAnimate([allAnimateEvents[0], allAnimateEvents[1]], [phaseName])
                    }
                    testOnAnimate([allAnimateEvents[2], allAnimateEvents[3]], allAnimatePhases)
                });
                it('should call callback correctly with any three events and single or both phases', function() {
                    for (let phaseName of allAnimatePhases) {
                        testOnAnimate([allAnimateEvents[0], allAnimateEvents[1], allAnimateEvents[2]], [phaseName])
                    }
                    testOnAnimate([allAnimateEvents[3], allAnimateEvents[4],  allAnimateEvents[5]], allAnimatePhases)
                });
                it('should call callback correctly with all events and single or both phases', function() {
                    for (let phaseName of allAnimatePhases) {
                        testOnAnimate(allAnimateEvents, [phaseName])
                    }
                    testOnAnimate(allAnimateEvents, allAnimatePhases)
                });

                it('should call restart callback when animation is cancelled and then started again', function(done: DoneFn) {
                    /* test flow:
                     *  - compile and append a div with animation to DOM, animation starts immediately
                     *  - on animation start event (first time), add "display: none" to div to cancel that animation
                     *  - on animation cancel event, remove "display: none" to restart animation
                     *  - on animation start event (second time), expect restart callback to have been called
                     */

                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    $scope.myAnimateRestartCallback = jasmine.createSpy('myAnimateRestartCallback');

                    const styleElement = $compile(`<style>
                                                            @keyframes test-animation {
                                                                0% {background-color:red;}
                                                                100% {background-color:blue;}
                                                            };
                                                           </style>`)($scope);
                    document.head.appendChild(styleElement[0]);
                    $rootScope.$apply();

                    const onAnimateElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)"
                                                             on-animate-events="enter"
                                                             on-animate-phases="start"
                                                             on-animate-restart="myAnimateRestartCallback(event)"
                                                             style="animation-name: test-animation; 
                                                                    animation-duration: 30s;"
                                                        </div>`)($scope);

                    let animationstartCounter = 0;
                    onAnimateElement.on('animationstart', () => {
                        if (animationstartCounter == 0) { // first time animation is started
                            onAnimateElement.css('display', 'none');
                        } else { // second time animation is started, should call restart callback
                            expect($scope.myAnimateRestartCallback).toHaveBeenCalledTimes(1);
                            done();
                        }
                        animationstartCounter++;
                    });

                    onAnimateElement.on('animationcancel', () => {
                        expect($scope.myAnimateRestartCallback).not.toHaveBeenCalled();
                        onAnimateElement.css('display', 'block');
                    });

                    document.body.appendChild(onAnimateElement[0]);
                    $rootScope.$apply();

                    expect($animateOnSpy).toHaveBeenCalledTimes(1);
                    expect($animateOnSpy).toHaveBeenCalledWith('enter', onAnimateElement, jasmine.any(Function));
                });
            });
            describe('edge cases', function() {
                it('should call callback correctly for all phases if phase attribute is empty', function () {
                    for (let eventName of allAnimateEvents) {
                        testOnAnimate([eventName], [])
                    }
                    testOnAnimate([allAnimateEvents[0], allAnimateEvents[1]], [])
                    testOnAnimate([allAnimateEvents[2], allAnimateEvents[3], allAnimateEvents[4]], [])
                });
                it('should call callback correctly for all events if events attribute is empty', function () {
                    for (let phaseName of allAnimatePhases) {
                        testOnAnimate([], [phaseName])
                    }
                    testOnAnimate([], allAnimatePhases)
                });
                it('should call callback correctly for all events and phases if both are empty', function () {
                    testOnAnimate([], [])
                });
                it('should work correctly for all phases if no phases attribute was given', function () {
                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-events="enter"></div>`)($scope);
                    document.body.appendChild(jqElement[0]);
                    $rootScope.$apply();

                    expect($animate.on).toHaveBeenCalledTimes(1);
                    expect($animate.on).toHaveBeenCalledWith('enter', jqElement, jasmine.any(Function));

                    const animateHandler = $animateOnSpy.calls.mostRecent().args[2];
                    animateHandler(jqElement, 'start');
                    $rootScope.$apply();
                    animateHandler(jqElement, 'close');
                    $rootScope.$apply();
                    expect($scope.myAnimateCallback).toHaveBeenCalledTimes(2);
                    expect($scope.myAnimateCallback).toHaveBeenCalledWith('enter', undefined, 'start');
                    expect($scope.myAnimateCallback).toHaveBeenCalledWith('enter', undefined, 'close');

                    $scope.$destroy();
                    document.body.removeChild(jqElement[0]);
                    expect($animate.off).toHaveBeenCalledTimes(1);
                    expect($animate.off).toHaveBeenCalledWith('enter', jqElement, animateHandler);
                });

                it('should work correctly for all events when no events were given', function () {
                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-phases="start"></div>`)($scope);
                    document.body.appendChild(jqElement[0]);
                    $rootScope.$apply();

                    expect($animate.on).toHaveBeenCalledTimes(allAnimateEvents.length);
                    for (let event of allAnimateEvents) {
                        expect($animate.on).toHaveBeenCalledWith(event, jqElement, jasmine.any(Function));
                    }

                    let animateHandlers = []
                    for (let i = 0; i < allAnimateEvents.length; i++) {
                        $scope.myAnimateCallback.calls.reset();
                        animateHandlers[i] = $animateOnSpy.calls.argsFor(i)[2];
                        animateHandlers[i](jqElement, 'start');
                        $rootScope.$apply();
                        animateHandlers[i](jqElement, 'close');
                        $rootScope.$apply();
                        expect($scope.myAnimateCallback).toHaveBeenCalledTimes(1);
                        expect($scope.myAnimateCallback).toHaveBeenCalledWith(allAnimateEvents[i], undefined, 'start');
                    }

                    $scope.$destroy();
                    document.body.removeChild(jqElement[0]);
                    expect($animate.off).toHaveBeenCalledTimes(allAnimateEvents.length);
                    for (let i = 0; i < allAnimateEvents.length; i++) {
                        expect($animate.off).toHaveBeenCalledWith(allAnimateEvents[i], jqElement, animateHandlers[i]);
                    }
                });

                it('should work correctly for all events and all phases when neither were given', function () {
                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)"></div>`)($scope);
                    document.body.appendChild(jqElement[0]);
                    $rootScope.$apply();

                    expect($animate.on).toHaveBeenCalledTimes(allAnimateEvents.length);
                    for (let event of allAnimateEvents) {
                        expect($animate.on).toHaveBeenCalledWith(event, jqElement, jasmine.any(Function));
                    }

                    let animateHandlers = []
                    for (let i = 0; i < allAnimateEvents.length; i++) {
                        $scope.myAnimateCallback.calls.reset();
                        // internally called for each class and phase, thus just indexing by event index not enough
                        // also needs to use the *later* call when called with two phases
                        animateHandlers[i] = $animateOnSpy.calls.argsFor(i)[2];
                        animateHandlers[i](jqElement, 'start');
                        $rootScope.$apply();
                        animateHandlers[i](jqElement, 'close');
                        $rootScope.$apply();
                        expect($scope.myAnimateCallback).toHaveBeenCalledTimes(2);
                        expect($scope.myAnimateCallback).toHaveBeenCalledWith(allAnimateEvents[i], undefined, 'start');
                        expect($scope.myAnimateCallback).toHaveBeenCalledWith(allAnimateEvents[i], undefined, 'close');
                    }

                    $scope.$destroy();
                    document.body.removeChild(jqElement[0]);
                    expect($animate.off).toHaveBeenCalledTimes(allAnimateEvents.length);
                    for (let i = 0; i < allAnimateEvents.length; i++) {
                        expect($animate.off).toHaveBeenCalledWith(allAnimateEvents[i], jqElement, animateHandlers[i]);
                    }
                });

                it('should ignore any duplicate events', function () {
                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-events="enter enter" on-animate-phases="close"></div>`)($scope);
                    document.body.appendChild(jqElement[0]);
                    $rootScope.$apply();

                    expect($animate.on).toHaveBeenCalledTimes(1);
                    expect($animate.on).toHaveBeenCalledWith('enter', jqElement, jasmine.any(Function));

                    const animateHandler = $animateOnSpy.calls.mostRecent().args[2];
                    animateHandler(jqElement, 'start');
                    $rootScope.$apply();
                    animateHandler(jqElement, 'close');
                    $rootScope.$apply();
                    expect($scope.myAnimateCallback).toHaveBeenCalledTimes(1);
                    expect($scope.myAnimateCallback).toHaveBeenCalledWith('enter', undefined, 'close');

                    $scope.$destroy();
                    document.body.removeChild(jqElement[0]);
                    expect($animate.off).toHaveBeenCalledTimes(1);
                    expect($animate.off).toHaveBeenCalledWith('enter', jqElement, animateHandler);
                });
                it('should ignore any duplicate phases', function () {
                    $scope.myAnimateCallback = jasmine.createSpy('myAnimateCallback');
                    const jqElement = $compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-events="enter" on-animate-phases="start close close"></div>`)($scope);
                    document.body.appendChild(jqElement[0]);
                    $rootScope.$apply();

                    expect($animate.on).toHaveBeenCalledTimes(1);
                    expect($animate.on).toHaveBeenCalledWith('enter', jqElement, jasmine.any(Function));

                    const animateHandler = $animateOnSpy.calls.mostRecent().args[2];
                    animateHandler(jqElement, 'start');
                    $rootScope.$apply();
                    animateHandler(jqElement, 'close');
                    $rootScope.$apply();
                    expect($scope.myAnimateCallback).toHaveBeenCalledTimes(2);
                    expect($scope.myAnimateCallback).toHaveBeenCalledWith('enter', undefined, 'start');
                    expect($scope.myAnimateCallback).toHaveBeenCalledWith('enter', undefined, 'close');

                    $scope.$destroy();
                    document.body.removeChild(jqElement[0]);
                    expect($animate.off).toHaveBeenCalledTimes(1);
                    expect($animate.off).toHaveBeenCalledWith('enter', jqElement, animateHandler);
                });
            });
            describe('error handling', function() {
                it('should throw error if event is given that is not an $animate event', function() {
                    const incorrectElementFunction = function() {$compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-events="unknown"></div>`)($scope);}
                    const expectedError = new Error("Events not known by $animate! [unknown] is not subset of [addClass,removeClass,setClass,enter,leave,move,animate]");
                    expect(incorrectElementFunction).toThrow(expectedError);
                });
                it('should throw error if phase is given that is not an $animate phase', function() {
                    const incorrectElementFunction = function() {$compile(`<div on-animate="myAnimateCallback(eventName, element, phase)" on-animate-phases="unknown"></div>`)($scope);}
                    const expectedError = new Error("Phases not known by $animate! [unknown] is not subset of [start,close]");
                    expect(incorrectElementFunction).toThrow(expectedError);
                })
            });
        });
    });
}
