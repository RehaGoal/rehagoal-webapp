module rehagoal.gamification {

    describe('navbar gamification tests', () => {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;

        let navbarCtrl: NavbarGamificationComponentController;
        let $scope: angular.IScope;

        const SETTINGS_CHANGED_EVENT = 'gamificationSettings.settingChanged';
        const initGamificationStats: GamificationStats = {
            level: 1,
            points: 0,
            levelBorder: {
                minPoints: 0,
                maxPoints: 100
            }
        }
        const exampleGamificationStats: GamificationStats = {
            level: 5,
            points: 108,
            levelBorder: {
                minPoints: 105,
                maxPoints: 200
            }
        };

        let mockGamificationSettingsService: jasmine.SpyObj<GamificationSettingsService>;
        let mockGamificationService: jasmine.SpyObj<IGamificationService>;

        beforeEach(() => angular.mock.module('rehagoal.templates'));
        beforeEach(() => angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
            mockGamificationService = jasmine.createSpyObj('gamificationService', [
                'getStats'
            ]);
            mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                'getIconStyle'
            ]);
            $provide.value('gamificationService', mockGamificationService);
            $provide.value('gamificationSettingsService', mockGamificationSettingsService);
        }));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $compile = _$compile_;
        }));

        beforeEach(() => {
            mockGamificationService.getStats.and.returnValue(Promise.resolve(initGamificationStats));
            mockGamificationSettingsService.getIconStyle.and.returnValue(Promise.resolve(GamificationIconStyle.BI_STAR));
        });

        function broadcastPointsIncreasedEvent(points: number) {
            $scope.$broadcast(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: points});
        }

        function broadcastLevelUpEvent(level: number, minPoints: number, maxPoints: number) {
            $scope.$broadcast(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, {
                level: level,
                levelBorder: {minPoints: minPoints, maxPoints: maxPoints}
            });
        }

        async function executeNavbarGamificationComponentInit(): Promise<void> {
            navbarCtrl.$onInit();
            await navbarCtrl.initPromise;
            $scope.$apply();
        }

        describe('Gamification navbar controller', () => {
            beforeEach(() => {
                $scope = $rootScope.$new();
                navbarCtrl = $componentController('navbarGamification', {$scope: $scope}, {});
            });

            /**
             * Helper function to check that properties equal the expected GamificationStats
             * @param stats compares against these stats
             */
            function expectStatsAttributesToEqualGamificationStats(stats: GamificationStats): void {
                expect(navbarCtrl.shownLevel).toEqual(stats.level);
                expect(navbarCtrl.getProgressBarMax()).toEqual(stats.levelBorder.maxPoints - stats.levelBorder.minPoints);
                expect(navbarCtrl.getProgressBarValue()).toEqual(stats.points - stats.levelBorder.minPoints);
            }

            describe('onInit behaviour', () => {
                it('should set `loaded` to `true` if stats have been resolved from gamificationService after onInit', async (done: DoneFn) => {
                    expect(navbarCtrl.loaded).toBe(false);
                    await executeNavbarGamificationComponentInit();
                    expect(navbarCtrl.loaded).toBe(true);
                    done();
                });
                it('should pull values from services and store them as properties', async (done: DoneFn) => {
                    expect(navbarCtrl.shownLevel).toBeUndefined();
                    expect(navbarCtrl.icon).toBeUndefined();
                    expect(navbarCtrl.animatingLevelUp).toBe(false);
                    expect(navbarCtrl.animatingConfetti).toBe(false);

                    mockGamificationService.getStats.and.returnValue(Promise.resolve(exampleGamificationStats));
                    await executeNavbarGamificationComponentInit();
                    expect(mockGamificationService.getStats).toHaveBeenCalled();
                    expect(mockGamificationSettingsService.getIconStyle).toHaveBeenCalled();

                    expect(navbarCtrl.icon).toEqual(GamificationIconStyle.BI_STAR);
                    expectStatsAttributesToEqualGamificationStats(exampleGamificationStats);
                    done();
                });
                it('should subscribe to gamificationUpdateEvents & gamificationSettingsChangedEvents for property updates', async (done: DoneFn) => {
                    const rootScopeSpy = spyOn($rootScope, '$on').and.callThrough();
                    await executeNavbarGamificationComponentInit();
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, jasmine.any(Function));
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, jasmine.any(Function));
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, jasmine.any(Function));
                    done();
                });


            });
            describe('broadcasts should update properties', () => {

                beforeEach(async () => {
                    await executeNavbarGamificationComponentInit();
                });

                it('should change "shownLevel" and set level up animations to true when update event is broadcasted of type "LEVEL_UP"', () => {
                    expect(navbarCtrl.shownLevel).toEqual(1);
                    expect(navbarCtrl.animatingLevelUp).toBe(false)
                    expect(navbarCtrl.animatingConfetti).toBe(false);
                    const newLevel = 5;
                    broadcastLevelUpEvent(newLevel, 0, 100);
                    expect(navbarCtrl.shownLevel).toEqual(newLevel);
                    expect(navbarCtrl.animatingLevelUp).toBe(true);
                    expect(navbarCtrl.animatingConfetti).toBe(true);

                });
                it('should not change "shownLevel" and not set level up animations if update event is not of type "LEVEL_UP"', () => {
                    expect(navbarCtrl.shownLevel).toEqual(1);
                    expect(navbarCtrl.animatingLevelUp).toBe(false);
                    broadcastPointsIncreasedEvent(250)
                    expect(navbarCtrl.shownLevel).toEqual(1);
                    expect(navbarCtrl.animatingLevelUp).toBe(false);
                });
                it('should change colors after "LEVEL_UP" broadcast', () => {
                    const oldGamificationColor = navbarCtrl.getCurrentColor();
                    broadcastLevelUpEvent(2, 100, 200);
                    expect(oldGamificationColor).not.toEqual(navbarCtrl.getCurrentColor());
                });
                it('should not change colors after "POINTS_INCREASED" broadcast', () => {
                    const oldGamificationColor = navbarCtrl.getCurrentColor();
                    broadcastPointsIncreasedEvent(25);
                    expect(oldGamificationColor).toEqual(navbarCtrl.getCurrentColor());
                });
                it('should update progress value if update event is of type "POINTS_INCREASED"', () => {
                    expect(navbarCtrl.getProgressBarValue()).toEqual(0);
                    const newPoints = 50;
                    broadcastPointsIncreasedEvent(newPoints);
                    expect(navbarCtrl.getProgressBarValue()).toEqual(newPoints);
                });
                it('should not change progress value if update event is not of type "POINTS_INCREASED" and left boarder is not changed', () => {
                    expect(navbarCtrl.getProgressBarValue()).toEqual(0);
                    broadcastLevelUpEvent(1, 0, 100);
                    expect(navbarCtrl.getProgressBarValue()).toEqual(0);
                });
                it('should set progress value to given, not add onto old value"', () => {
                    expect(navbarCtrl.getProgressBarValue()).toEqual(0);
                    const newPoints1 = 50, newPoints2 = 10;
                    broadcastPointsIncreasedEvent(newPoints1);
                    expect(navbarCtrl.getProgressBarValue()).toEqual(newPoints1);
                    broadcastPointsIncreasedEvent(newPoints2);
                    expect(navbarCtrl.getProgressBarValue()).toEqual(newPoints2);
                });
                it('should return correct getProgressBarMax Value if values where updated by "LEVEL_UP" event', () => {
                    expect(navbarCtrl.getProgressBarMax()).toEqual(100);
                    const newMin = 100, newMax = 250;

                    broadcastLevelUpEvent(2, newMin, newMax)
                    expect(navbarCtrl.getProgressBarMax()).toEqual(newMax - newMin);
                });
                it('should not change getProgressBarMax Value if values where updated by "POINTS_INCREASED" event', () => {
                    const newMin = 100, newMax = 200, pointDiff = newMax - newMin;
                    expect(navbarCtrl.getProgressBarMax()).toEqual(pointDiff);

                    broadcastPointsIncreasedEvent(70);
                    expect(navbarCtrl.getProgressBarMax()).toEqual(pointDiff);
                });
                it('should calc progress max as maxPoints offset by minPoints', () => {
                    const newMin = 100, newMax = 250;
                    expect(navbarCtrl.getProgressBarMax()).toEqual(100);

                    broadcastLevelUpEvent(2, newMin, newMax)
                    since(`progress max should be offset by value of newMin. Expected #{actual} to equal ${newMax - newMin} (${newMax} - ${newMin} or \'newMax\' - \'newMin\')`)
                        .expect(navbarCtrl.getProgressBarMax()).toEqual(newMax - newMin);
                });
                it('should calc progress value as points offset by minPoints', () => {
                    expect(navbarCtrl.getProgressBarMax()).toEqual(100);
                    const newMin = 100, newMax = 250, newPoints = 125;

                    broadcastLevelUpEvent(2, newMin, newMax);
                    expect(navbarCtrl.getProgressBarMax()).toEqual(newMax - newMin);

                    broadcastPointsIncreasedEvent(newPoints);
                    since(`progress bar value should be offset by value of newMin. Expected #{actual} to equal ${newPoints - newMin} (${newPoints} - ${newMin} or \'newPoints\' - \'newMin\')`)
                        .expect(navbarCtrl.getProgressBarValue()).toEqual(newPoints - newMin);
                });
                it('should change icon property if settingsChanged event is broadcasted with iconStyleName settingsKey', () => {
                    expect(navbarCtrl.icon).toEqual(GamificationIconStyle.BI_STAR);
                    $scope.$broadcast(SETTINGS_CHANGED_EVENT, {
                        settingsKey: 'iconStyleName',
                        value: GamificationIconStyle.BI_HEART.name
                    });
                    expect(navbarCtrl.icon).toEqual((GamificationIconStyle.BI_HEART));
                });
                it('should not change icon property if settingsChanged event is broadcasted without iconStyleName settingsKey', () => {
                    expect(navbarCtrl.icon).toEqual(GamificationIconStyle.BI_STAR);
                    $scope.$broadcast(SETTINGS_CHANGED_EVENT, {
                        settingsKey: 'difficulty',
                        value: GamificationIconStyle.BI_HEART
                    });
                    expect(navbarCtrl.icon).toEqual((GamificationIconStyle.BI_STAR));
                });
            });
            it('Color Enum should have correct values', () => {
                //checking size to make sure we are testing all elements and test have to
                // be adjusted if new colors are added
                expect(Object.keys(Color).length).toBe(6);
                expect(Color.BLUE).toBe("blue");
                expect(Color.LIGHTBLUE).toBe("lightblue");
                expect(Color.GREEN).toBe("green");
                expect(Color.ORANGE).toBe("orange");
                expect(Color.PURPLE).toBe("purple");
                expect(Color.RED).toBe("red");
            });

            it('should use different colors and have correct getIconClass() for levels', () => {
                const maxLevelToTest: number = 1000;
                const usedColors = new Set<Color>();
                let lastColor: Color | null = null;
                for (let levelToTest = 1; levelToTest < maxLevelToTest; levelToTest++) {
                    navbarCtrl.shownLevel = levelToTest;
                    const currentColor: Color = navbarCtrl.getCurrentColor();
                    since('Current color should not have been, but actually has been used before').expect(usedColors.has(currentColor)).toBe(false);
                    //should return correct icon class string for color
                    expect(navbarCtrl.getIconClass()).toBe("icon-"+ currentColor);
                    usedColors.add(currentColor);
                    expect(lastColor).not.toBe(currentColor);
                    //should use different colors for each n level where n is the number of Colors
                    if ( (levelToTest % Object.keys(Color).length) === 0 ) {
                        expect(usedColors.size).toBe(Object.keys(Color).length);
                        usedColors.clear();
                    }
                    lastColor = currentColor;
                }
            });
        });

        describe('Gamification navbar element', () => {
            let element: HTMLElement;
            let jqElement: JQLite;

            beforeEach(() => {
                $scope = $rootScope.$new();
                jqElement = $compile(`<navbar-gamification></navbar-gamification>`)($scope);
                element = jqElement[0];
                $scope.$apply();
                navbarCtrl = jqElement.controller('navbarGamification');
                document.body.appendChild(element);
            });

            beforeEach(async (done: DoneFn) => {
                await navbarCtrl.initPromise;
                $scope.$apply();
                done();
            });

            afterEach(() => {
                document.body.removeChild(element);
            });

            describe('Animation for added points', () => {

                function getAddedPointsAnimationElements(): Element[] {
                    return [...element.querySelectorAll('.points-animation-element')] as Element[];
                }

                it('should show a addedPoints animation for all POINTS_INCREASED events showing the difference to previous points', () => {
                    expect(getAddedPointsAnimationElements().length).toEqual(0);

                    broadcastPointsIncreasedEvent(-1);
                    broadcastPointsIncreasedEvent(0);
                    broadcastPointsIncreasedEvent(1);
                    broadcastPointsIncreasedEvent(5);
                    broadcastPointsIncreasedEvent(15);
                    broadcastPointsIncreasedEvent(30);
                    $scope.$apply();
                    const addedPointsElements = getAddedPointsAnimationElements();
                    expect(addedPointsElements.length).toEqual(6);
                    expect(addedPointsElements[0].innerHTML).toEqual('-1');
                    expect(addedPointsElements[1].innerHTML).toEqual('+1');
                    expect(addedPointsElements[2].innerHTML).toEqual('+1');
                    expect(addedPointsElements[3].innerHTML).toEqual('+4');
                    expect(addedPointsElements[4].innerHTML).toEqual('+10');
                    expect(addedPointsElements[5].innerHTML).toEqual('+15');
                });

                describe('onPointsAnimation tests', () => {
                    function setUpOnPointsAnimationTests() {
                        const value1 = 10, value2 = 15;
                        expect(getAddedPointsAnimationElements().length).toEqual(0);
                        broadcastPointsIncreasedEvent(value1);
                        broadcastPointsIncreasedEvent(value2);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(2);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('+10');
                        expect(getAddedPointsAnimationElements()[1].innerHTML).toEqual('+5');
                    }

                    function expectDeletionWithVisibility(visible: boolean) {
                        navbarCtrl.onPointsAnimation(0, "close", visible);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(1);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('+5');
                        navbarCtrl.onPointsAnimation(1, "close", visible);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(0);
                    }

                    beforeEach(setUpOnPointsAnimationTests);

                    // Case: phase = close, visible = true
                    it('function "onPointsAnimation" should delete addedPoints elements with given key when phase is close and visibility true', () => {
                        expectDeletionWithVisibility(true);
                    });
                    // Case: phase = close, visible = false
                    it('function "onPointsAnimation" should delete addedPoints elements with given key when phase is close and visibility false', () => {
                        expectDeletionWithVisibility(false);
                    });

                    // Case: phase = start, visible = false
                    it('function "onPointsAnimation" should set addedPoints elements with given key to empty strings when phase is start and visibility false', () => {
                        navbarCtrl.onPointsAnimation(0, "start", false);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(2);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('');
                        expect(getAddedPointsAnimationElements()[1].innerHTML).toEqual('+5');
                        navbarCtrl.onPointsAnimation(1, "start", false);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(2);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('');
                        expect(getAddedPointsAnimationElements()[1].innerHTML).toEqual('');
                    });

                    // Case: phase = start, visible = true
                    it('function "onPointsAnimation" should not change addedPoints elements when phase is start and visibility is true', () => {
                        navbarCtrl.onPointsAnimation(0, "start", true);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(2);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('+10');
                        expect(getAddedPointsAnimationElements()[1].innerHTML).toEqual('+5');
                        navbarCtrl.onPointsAnimation(1, "start", true);
                        $scope.$apply();
                        expect(getAddedPointsAnimationElements().length).toEqual(2);
                        expect(getAddedPointsAnimationElements()[0].innerHTML).toEqual('+10');
                        expect(getAddedPointsAnimationElements()[1].innerHTML).toEqual('+5');
                    });
                });
            });

            describe('Styling', () => {
                function getLevelElement(): Element | null {
                    return element.querySelector('.gamification-level');
                }

                function getLevelTextElement(): Element | null {
                    return getLevelElement()!.querySelector('text');
                }

                function getLevelSvgUseElement(): Element | null {
                    return getLevelElement()!.querySelector('use');
                }

                function getGamificationProgressElement(): Element | null {
                    return element.querySelector('.gamification-progress');
                }

                function getIconID(): string {
                    const iconId = getLevelSvgUseElement()!.getAttribute('href')!.split('#')[1];
                    return iconId!;
                }

                describe('loading', ()=> {
                    const loadingContentRegex = RegExp(/^\s*\.\.\.\s*$/);

                    it('should only show placeholder if component is not loaded', () => {
                        navbarCtrl.loaded = false;
                        $scope.$apply();
                        expect(element.textContent).toMatch(loadingContentRegex);
                    });

                    it('should only show navbar (and no placeholder) if component is loaded', () => {
                        navbarCtrl.loaded = true;
                        $scope.$apply();

                        expect(element.textContent).not.toMatch(loadingContentRegex);
                        expect(getLevelTextElement()?.textContent).toBe("1");
                        expect(getIconID()).toEqual((GamificationIconStyle.BI_STAR.name));
                    });
                });

                describe('color change tests', () => {
                    it('should change color of icon and progress bar when an update event of type "LEVEL_UP" is called', () => {
                        const oldIconColor = getLevelSvgUseElement()!.classList[0];
                        const oldProgressBarColor = getGamificationProgressElement()!.getAttribute('type');

                        broadcastLevelUpEvent(2, 0, 100);
                        $scope.$apply();

                        const newIconColor = getLevelSvgUseElement()!.classList[0];
                        const newProgressBarColor = getGamificationProgressElement()!.getAttribute('type');

                        expect(oldIconColor).not.toBeNull();
                        expect(oldIconColor).not.toEqual(newIconColor);
                        expect(oldProgressBarColor).not.toBeNull();
                        expect(oldProgressBarColor).not.toEqual(newProgressBarColor);
                    });

                    it('should NOT change color of icon and progress bar when an update event of type other than "LEVEL_UP" is called', () => {
                        const oldIconColor = getLevelSvgUseElement()!.classList[0];
                        const oldProgressBarColor = getGamificationProgressElement()!.getAttribute('type');

                        broadcastPointsIncreasedEvent(0);
                        $scope.$apply();

                        const newIconColor = getLevelSvgUseElement()!.classList[0];
                        const newProgressBarColor = getGamificationProgressElement()!.getAttribute('type');

                        expect(oldIconColor).not.toBeNull();
                        expect(oldIconColor).toEqual(newIconColor);
                        expect(oldProgressBarColor).not.toBeNull();
                        expect(oldProgressBarColor).toEqual(newProgressBarColor);
                    });
                });

                describe('icon tests', () => {

                    it('should show broadcasted level within icon when an update event of type "LEVEL_UP" is called', () => {
                        expect(getLevelTextElement()!.innerHTML).toEqual('1');
                        broadcastLevelUpEvent(20, 0, 100);
                        $scope.$apply();
                        expect(getLevelTextElement()!.innerHTML).toEqual('20');
                    });

                    it('should not show broadcasted level within icon when an update event of type other than "LEVEL_UP" is called', () => {
                        expect(getLevelTextElement()!.innerHTML).toEqual('1');
                        broadcastPointsIncreasedEvent(0);
                        $scope.$apply();
                        expect(getLevelTextElement()!.innerHTML).toEqual('1');
                    });

                    it('should change shown icon when updateSettings event with icon settingsKey is broadcasted', () => {
                        expect(getIconID()).toEqual(GamificationIconStyle.BI_STAR.name);
                        $scope.$broadcast(SETTINGS_CHANGED_EVENT, {
                            settingsKey: 'iconStyleName',
                            value: GamificationIconStyle.BI_HEART.name
                        });
                        $scope.$apply();
                        expect(getIconID()).toEqual((GamificationIconStyle.BI_HEART.name));
                    });

                    it('should not change shown icon when updateSettings event without icon settingsKey is broadcasted', () => {
                        expect(getIconID()).toEqual(GamificationIconStyle.BI_STAR.name);
                        $scope.$broadcast(SETTINGS_CHANGED_EVENT, {
                            settingsKey: 'iconStyleName',
                            value: GamificationIconStyle.BI_HEART.name
                        });
                        $scope.$apply();
                        expect(getIconID()).toEqual((GamificationIconStyle.BI_HEART.name));
                    });
                });

                describe('progress bar opacity tests', () => {
                    it('should have progress bar opacity of 0.2 when having no points', () => {
                        expect(navbarCtrl.getProgressBarValue()).toEqual(0);
                        expect(navbarCtrl.getProgressOpacity()).toEqual(0.2);
                        expect(getComputedStyle(getGamificationProgressElement()!).getPropertyValue('opacity')).toEqual('0.2');
                    });

                    it('should have progress bar opacity of 0.7 when being half full', () => {
                        broadcastPointsIncreasedEvent(50);
                        $scope.$apply();
                        expect(navbarCtrl.getProgressBarValue()).toEqual(50);
                        expect(navbarCtrl.getProgressOpacity()).toEqual(0.7);
                        expect(getComputedStyle(getGamificationProgressElement()!).getPropertyValue('opacity')).toEqual('0.7');
                    });

                    it('should have progress bar opacity of 0.7 when being half full, based on min/maxPoints range', () => {
                        broadcastLevelUpEvent(1, 1050, 2100)
                        broadcastPointsIncreasedEvent(1575);
                        $scope.$apply();
                        expect(navbarCtrl.getProgressBarValue()).toEqual(525);
                        expect(navbarCtrl.getProgressBarMax()).toEqual(1050);
                        expect(navbarCtrl.getProgressOpacity()).toEqual(0.7);
                        expect(getComputedStyle(getGamificationProgressElement()!).getPropertyValue('opacity')).toEqual('0.7');
                    });

                    it('should have progress bar opacity of 1 when being full', () => {
                        broadcastPointsIncreasedEvent(100);
                        $scope.$apply();
                        expect(navbarCtrl.getProgressBarValue()).toEqual(100);
                        expect(navbarCtrl.getProgressOpacity()).toEqual(1);
                        expect(getComputedStyle(getGamificationProgressElement()!).getPropertyValue('opacity')).toEqual('1');
                    });
                });
            });
        });
    });
}
