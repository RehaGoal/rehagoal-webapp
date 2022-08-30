module rehagoal.gamification {

    describe('gamificationDashboardView tests', () => {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $route: angular.route.IRouteService;
        let mockGamificationService: jasmine.SpyObj<IGamificationService>;
        let mockGamificationSettingsService: jasmine.SpyObj<IGamificationSettingsService>;
        const exampleGamificationStats: GamificationStats = {
            level: 1,
            points: 5,
            levelBorder: {
                minPoints: 0,
                maxPoints: 10
            }
        };

        beforeEach(() => angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
            mockGamificationService = jasmine.createSpyObj('gamificationService', [
                'getStats'
            ]);
            mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                'isPointsRecordingEnabled',
                'isPointsDisplayEnabled'
            ]);
            $provide.value('gamificationService', mockGamificationService);
            $provide.value('gamificationSettingsService', mockGamificationSettingsService);
        }));

        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(inject((_$componentController_,
                           _$rootScope_: angular.IRootScopeService,
                           _$route_: angular.route.IRouteService) => {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $route = _$route_;
        }));

        it('should register route /gamification', () => {
            expect($route.routes['/gamification'].template).toEqual('<gamification-dashboard-view></gamification-dashboard-view>');
        });

        describe('gamificationDashboardView controller', () => {
            let gamificationDashboardViewCtrl: GamificationDashboardView;
            let bindings: any;
            let $scope: angular.IScope;

            beforeEach(() => {
                bindings = {};
                $scope = $rootScope.$new();
                gamificationDashboardViewCtrl = $componentController('gamificationDashboardView', {$scope: $scope}, bindings);
            });

            function calcNormalizedProgressFromGamificationStats(stats: GamificationStats): number {
                const pointsInLevel = stats.levelBorder.maxPoints - stats.levelBorder.minPoints;
                const currentProgressInPoints = stats.points - stats.levelBorder.minPoints;
                return currentProgressInPoints / pointsInLevel;
            }

            describe('onInit behaviour', () => {

                beforeEach(() => {
                    mockGamificationService.getStats.and.returnValue(Promise.resolve(exampleGamificationStats));
                    mockGamificationSettingsService.isPointsDisplayEnabled.and.returnValue(Promise.resolve(true));
                    mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(Promise.resolve(false));
                });

                /**
                 * Helper function to check that properties equal the expected GamificationStats
                 * @param stats compares against these stats
                 */
                function expectStatsAttributesToEqualGamificationStats(stats: GamificationStats): void {
                    expect(gamificationDashboardViewCtrl.points).toBe(stats.points);
                    expect(gamificationDashboardViewCtrl.level).toBe(stats.level);
                    expect(gamificationDashboardViewCtrl.getCurrentProgress()).toBe(calcNormalizedProgressFromGamificationStats(stats));
                }

                /**
                 * Wrapper function to call & wait for init promise within GamificationDashboardView
                 */
                async function executeDashboardInit(): Promise<void> {
                    gamificationDashboardViewCtrl.$onInit();
                    await gamificationDashboardViewCtrl.initPromise;
                    $scope.$apply();
                }

                it('should set `loaded` to `true` if stats have been resolved from gamificationService after onInit', async (done: DoneFn) => {
                    expect(gamificationDashboardViewCtrl.loaded).toBe(false);
                    await executeDashboardInit();
                    expect(gamificationDashboardViewCtrl.loaded).toBe(true);
                    done();
                });
                it('should pull values from services and store them as properties', async (done: DoneFn) => {
                    await executeDashboardInit();
                    expect(mockGamificationSettingsService.isPointsDisplayEnabled).toHaveBeenCalled();
                    expect(mockGamificationSettingsService.isPointsRecordingEnabled).toHaveBeenCalled();
                    expect(mockGamificationService.getStats).toHaveBeenCalled();
                    expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(true);
                    expect(gamificationDashboardViewCtrl.pointsRecording).toBe(false);
                    expect(gamificationDashboardViewCtrl.loaded).toBe(true);
                    expectStatsAttributesToEqualGamificationStats(exampleGamificationStats);
                    done();
                });
                it('should NOT pull boolean for recordPoints if showPoints is disabled', async (done: DoneFn) => {
                    mockGamificationSettingsService.isPointsDisplayEnabled.and.returnValue(Promise.resolve(false));
                    await gamificationDashboardViewCtrl.$onInit();
                    expect(gamificationDashboardViewCtrl.loaded).toBe(true);
                    expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(false);
                    expect(mockGamificationSettingsService.isPointsRecordingEnabled).not.toHaveBeenCalled();
                    done();
                });
                it('should subscribe to gamificationUpdateEvents & gamificationSettingsChangedEvents for property updates', async (done: DoneFn) => {
                    const rootScopeSpy = spyOn($rootScope, '$on').and.callThrough();
                    await executeDashboardInit();
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, jasmine.any(Function));
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, jasmine.any(Function));
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, jasmine.any(Function));
                    done();
                });

                describe('gamificationService broadcasts should update stats properties', () => {
                    const pointsIncreasedStats: GamificationStats = { ...exampleGamificationStats, ...{ points: 6 } };
                    const levelUpStats: GamificationStats = { ...pointsIncreasedStats, ...{ level: 2, levelBorder: { minPoints: 10, maxPoints: 25 } } };
                    const levelUpStatsWithValidPoints: GamificationStats = { ...levelUpStats, ...{ points: 12 } };

                    beforeEach(async () => {
                        await executeDashboardInit();
                    });

                    it('for (POINTS_INCREASED) event', () => {
                        expectStatsAttributesToEqualGamificationStats(exampleGamificationStats);
                        $rootScope.$broadcast(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, { points: pointsIncreasedStats.points });
                        expect(gamificationDashboardViewCtrl.points).toBe(pointsIncreasedStats.points);
                        expect(gamificationDashboardViewCtrl.getCurrentProgress()).toBe(calcNormalizedProgressFromGamificationStats(pointsIncreasedStats));
                    });
                    it('for (LEVEL_UP) event', () => {
                        expectStatsAttributesToEqualGamificationStats(exampleGamificationStats);
                        $rootScope.$broadcast(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, { level: levelUpStats.level, levelBorder: levelUpStats.levelBorder });
                        expect(gamificationDashboardViewCtrl.level).toBe(levelUpStats.level);
                        //Note: progress can not be validated due to out of bound update (points have not been increased yet)
                    });
                    it('for both events simultaneously', () => {
                        expectStatsAttributesToEqualGamificationStats(exampleGamificationStats);
                        $rootScope.$broadcast(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, { points: pointsIncreasedStats.points });
                        expect(gamificationDashboardViewCtrl.getCurrentProgress()).toBe(calcNormalizedProgressFromGamificationStats(pointsIncreasedStats));
                        $rootScope.$broadcast(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, { level: levelUpStats.level, levelBorder: levelUpStats.levelBorder });
                        expectStatsAttributesToEqualGamificationStats(levelUpStats);
                        $rootScope.$broadcast(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, { points: levelUpStatsWithValidPoints.points });
                        expect(gamificationDashboardViewCtrl.getCurrentProgress()).toBe(calcNormalizedProgressFromGamificationStats(levelUpStatsWithValidPoints));
                    });
                });

                describe('gamificationSettingsService broadcasts should update properties', () => {

                    beforeEach(async () => {
                        await executeDashboardInit();
                    });

                    it('for settingsKey: pointsShowEnabled', () => {
                        expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(true);
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'pointsShowEnabled', value: false });
                        expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(false);
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'pointsShowEnabled', value: true });
                        expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(true);
                    });
                    it('for settingsKey: pointsRecordEnabled', () => {
                        expect(gamificationDashboardViewCtrl.pointsRecording).toBe(false);
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'pointsRecordEnabled', value: true });
                        expect(gamificationDashboardViewCtrl.pointsRecording).toBe(true);
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'pointsRecordEnabled', value: false });
                        expect(gamificationDashboardViewCtrl.pointsRecording).toBe(false);
                    });
                    it('for random settingsKeys', () => {
                        expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(true);
                        expect(gamificationDashboardViewCtrl.pointsRecording).toBe(false);
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'random', value: true });
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { settingsKey: 'difficulty', value: 'easy' });
                        $rootScope.$broadcast(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, { noSettingsKey: '', value: '' });
                        expect(gamificationDashboardViewCtrl.pointsDisplay).toBe(true);
                        expect(gamificationDashboardViewCtrl.pointsRecording).toBe(false);
                    });

                });
            });
        });

        describe('gamificationDashboardView element', () => {
            let $scope: angular.IScope;
            let dashboardViewChild: HTMLElement;
            let jqElement: JQLite;
            let $compile: angular.ICompileService;
            let $window: angular.IWindowService;
            let gamificationDashboardViewCtrl: GamificationDashboardView;

            beforeEach(() => inject((_$compile_: angular.ICompileService,
                                     _$window_: angular.IWindowService) => {
                $compile = _$compile_;
                $window = _$window_;
            }));

            beforeEach(() => {
                $scope = $rootScope.$new();
                jqElement = $compile('<gamification-dashboard-view></gamification-dashboard-view>')($scope);
                dashboardViewChild = jqElement[0];
                $scope.$apply();
                gamificationDashboardViewCtrl = jqElement.controller('gamificationDashboardView');
                document.body.appendChild(dashboardViewChild);
            });

            afterEach(() => {
                document.body.removeChild(dashboardViewChild);
            });

            function getDashboardContainer(): HTMLElement | null {
                return document.getElementById("dashboard-stats");
            }

            function getDashboardStatsContent(): HTMLElement | null {
                return document.getElementById("dashboard-stats-content");
            }

            it('should not show Points, Level and Progress if showPoints is false', () => {
                gamificationDashboardViewCtrl.pointsDisplay = false;
                $scope.$apply();
                expect(getDashboardContainer()).not.toBeNull();
                expect(getDashboardContainer()?.textContent).toContain('Hier würden die Punkte und das Level angezeigt werden, aber diese sind ausgeblendet.');
                expect(getDashboardStatsContent()).toBeNull();
            });
            it('should show labels Points, Level and Progress and placeholder if showPoints is true and loaded is false', () => {
                gamificationDashboardViewCtrl.pointsDisplay = true;
                gamificationDashboardViewCtrl.loaded = false;
                $scope.$apply();
                const gridContainer = getDashboardStatsContent();
                expect(gridContainer).not.toBeNull();
                expect(getDashboardContainer()?.textContent).not.toContain('Hier würden die Punkte und das Level angezeigt werden, aber diese sind ausgeblendet.');
                expect(gridContainer!.textContent).toContain('Punkte:');
                expect(document.getElementById("dashboard-points")!.textContent).toEqual("...");
                expect(gridContainer!.textContent).toContain('Level:');
                expect(document.getElementById("dashboard-level")!.textContent).toEqual("...");
                expect(gridContainer!.textContent).toContain('Fortschritt:');
                expect(document.getElementById("dashboard-progress")!.textContent).toEqual("...");
            });
            it('should show labels Points, Level and Progress and content if showPoints is true and loaded is true', () => {
                gamificationDashboardViewCtrl.pointsDisplay = true;
                gamificationDashboardViewCtrl.loaded = true;
                gamificationDashboardViewCtrl.points = 1;
                gamificationDashboardViewCtrl.level = 2;
                $scope.$apply();
                const gridContainer = getDashboardStatsContent();
                expect(gridContainer).not.toBeNull();
                expect(getDashboardContainer()?.textContent).not.toContain('Hier würden die Punkte und das Level angezeigt werden, aber diese sind ausgeblendet.');
                expect(gridContainer!.textContent).toContain('Punkte:');
                expect(document.getElementById("dashboard-points")!.textContent).toEqual("1");
                expect(gridContainer!.textContent).toContain('Level:');
                expect(document.getElementById("dashboard-level")!.textContent).toEqual("2");
                expect(gridContainer!.textContent).toContain('Fortschritt:');
                expect(document.getElementById("dashboard-progress")!.getAttribute("value")).toEqual('$ctrl.getCurrentProgress()');
            });
            it('should show hint if recordPoints is false and showPoints is true', () => {
                gamificationDashboardViewCtrl.pointsRecording = false;
                gamificationDashboardViewCtrl.pointsDisplay = true;
                $scope.$apply();
                const dashboardContainer = getDashboardContainer();
                expect(dashboardContainer).not.toBeNull();
                const hintDiv = dashboardContainer!.getElementsByTagName("div")[1];
                expect(hintDiv!.textContent).toMatch(/Hinweis:\s* Es werden aktuell keine neuen Punkte aufgezeichnet./);
            });
            it('should not show hint for other states (recordPoints true and showPoints true or false)', () => {
                gamificationDashboardViewCtrl.pointsRecording = true;
                gamificationDashboardViewCtrl.pointsDisplay = true;
                $scope.$apply();
                expect(document.getElementById("dashboard-points-recording-disabled-hint")).toBeNull();

                gamificationDashboardViewCtrl.pointsDisplay = false;
                $scope.$apply();
                expect(document.getElementById("dashboard-points-recording-disabled-hint")).toBeNull();
            });
            it('should have correct route to gamification settings for glyphicon', () => {
                const locationTarget = document.getElementById("gamification-settings-link")!.getElementsByTagName("a")[0].getAttribute("href");
                expect(locationTarget).toEqual("#!/gamification-settings");
            });
        });
    });
}
