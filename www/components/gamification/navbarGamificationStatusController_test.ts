module rehagoal.gamification {

    describe('navbar status controller tests', () => {
        let $controller: angular.IControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;

        let navbarStatusCtrl: NavbarGamificationStatusController;
        let $scope: angular.IScope;

        const SETTINGS_CHANGED_EVENT = 'gamificationSettings.settingChanged';

        let mockGamificationSettingsService: jasmine.SpyObj<GamificationSettingsService>;

        beforeEach(() => angular.mock.module('rehagoal.templates'));
        beforeEach(() => angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
            mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                'isPointsDisplayEnabled'
            ]);
            $provide.value('gamificationSettingsService', mockGamificationSettingsService);
        }));

        beforeEach(inject(function (_$controller_: angular.IControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService) {
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $compile = _$compile_;
        }));

        beforeEach(() => {
            mockGamificationSettingsService.isPointsDisplayEnabled.and.returnValue(Promise.resolve(true));
        });


        async function executeNavbarGamificationComponentInit(): Promise<void> {
            navbarStatusCtrl.$onInit();
            await navbarStatusCtrl.initPromise;
            $scope.$apply();
        }

        describe('Gamification NavbarStatus controller', () => {
            beforeEach(() => {
                $scope = $rootScope.$new();
                navbarStatusCtrl = $controller('navbarGamificationStatusController', {$scope: $scope}, {});
            });

            describe('onInit behaviour', () => {
                it('should set `loaded` to `true` if stats have been resolved from gamificationService after onInit', async (done: DoneFn) => {
                    expect(navbarStatusCtrl.loaded).toBe(false);
                    await executeNavbarGamificationComponentInit();
                    expect(navbarStatusCtrl.loaded).toBe(true);
                    done();
                });
                it('should pull values from services and store them as properties', async (done: DoneFn) => {
                    expect(navbarStatusCtrl.pointsDisplay).toBeUndefined();
                    await executeNavbarGamificationComponentInit();
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                    done();
                });
                it('should subscribe to gamificationSettingsChangedEvents for property updates', async (done: DoneFn) => {
                    const rootScopeSpy = spyOn($rootScope, '$on').and.callThrough();
                    await executeNavbarGamificationComponentInit();
                    expect(rootScopeSpy).toHaveBeenCalledWith(GAMIFICATION_SETTINGS_CHANGED_EVENT_NAME, jasmine.any(Function));
                    done();
                });
            });
            describe('broadcasts should update properties', () => {

                beforeEach(async () => {
                    await executeNavbarGamificationComponentInit();
                });

                function broadcastSettingChangedPointShowEnabled(value: boolean) {
                    $scope.$broadcast(SETTINGS_CHANGED_EVENT, {settingsKey: 'pointsShowEnabled', value: value});
                }

                it('should change showPoints if settingsChanged event is broadcasted with correct settingsKey', () => {
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                    broadcastSettingChangedPointShowEnabled(false);
                    expect(navbarStatusCtrl.pointsDisplay).toBe(false);
                    broadcastSettingChangedPointShowEnabled(true);
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                });
                it('should not just toggle between states on correct settingsChanged event', () => {
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                    broadcastSettingChangedPointShowEnabled(true);
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                    broadcastSettingChangedPointShowEnabled(false);
                    expect(navbarStatusCtrl.pointsDisplay).toBe(false);
                    broadcastSettingChangedPointShowEnabled(false);
                    expect(navbarStatusCtrl.pointsDisplay).toBe(false);
                });
                it('should not change showPoints if settingsChanged event is broadcasted with different settingsKey', () => {
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                    $scope.$broadcast(SETTINGS_CHANGED_EVENT, {settingsKey: 'pointsRecordEnabled', value: false});
                    expect(navbarStatusCtrl.pointsDisplay).toBe(true);
                });
            });
            describe('assert points displayed when loaded', () => {
                it('should return true if loaded is true and showPoints is true', () => {
                    navbarStatusCtrl.loaded = true;
                    navbarStatusCtrl.pointsDisplay = true;
                    $scope.$apply();
                    expect(navbarStatusCtrl.assertPointsDisplayWhenLoaded()).toBe(true);
                });
                it('should return false if loaded is false and showPoints is true', () => {
                    navbarStatusCtrl.loaded = false;
                    navbarStatusCtrl.pointsDisplay = true;
                    $scope.$apply();
                    expect(navbarStatusCtrl.assertPointsDisplayWhenLoaded()).toBe(false);
                });
                it('should return false if loaded is true and showPoints is false', () => {
                    navbarStatusCtrl.loaded = true;
                    navbarStatusCtrl.pointsDisplay = false;
                    $scope.$apply();
                    expect(navbarStatusCtrl.assertPointsDisplayWhenLoaded()).toBe(false);
                });
                it('should return false if loaded is false and showPoints is false', () => {
                    navbarStatusCtrl.pointsDisplay = false;
                    navbarStatusCtrl.loaded = false;
                    $scope.$apply();
                    expect(navbarStatusCtrl.assertPointsDisplayWhenLoaded()).toBe(false);
                });
            });
        });
    });
}
