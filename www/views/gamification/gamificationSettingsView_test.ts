"use strict";
module rehagoal.gamification {

    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('gamificationSettingsView tests', () => {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $route: angular.route.IRouteService;
        let mockGamificationSettingsService: jasmine.SpyObj<IGamificationSettingsService>;

        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(() => angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
            mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                'isPointsRecordingEnabled',
                'isPointsDisplayEnabled',
                'getIconStyle',
                'getDifficulty',
                'setPointsRecordingEnabled',
                'setPointsDisplayEnabled',
                'setIconStyle',
                'setDifficulty'
            ]);
            $provide.value('gamificationSettingsService', mockGamificationSettingsService);
        }));

        beforeEach(inject((_$componentController_: angular.IComponentControllerService,
                           _$rootScope_: angular.IRootScopeService,
                           _$route_: angular.route.IRouteService) => {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $route = _$route_;
        }));

        it('should register route /gamification-settings', () => {
            expect($route.routes['/gamification-settings'].template).toEqual('<gamification-settings-view></gamification-settings-view>');
        });

        describe('gamificationSettingsView controller', () => {
            let gamificationSettingsViewCtrl: GamificationSettingsView;
            let $scope: angular.IScope;

            beforeEach(() => {
                $scope = $rootScope.$new();
                gamificationSettingsViewCtrl = $componentController('gamificationSettingsView', {$scope: $scope}, {});
                mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(Promise.resolve(false));
                mockGamificationSettingsService.isPointsDisplayEnabled.and.returnValue(Promise.resolve(true));
                mockGamificationSettingsService.getIconStyle.and.returnValue(Promise.resolve(GamificationIconStyle.BI_STAR));
            });

            /**
             * Wrapper function to call & wait for init promise within GamificationSettingsView
             */
            async function executeSettingsViewInit(): Promise<void> {
                gamificationSettingsViewCtrl.$onInit();
                await gamificationSettingsViewCtrl.initPromise;
                $scope.$apply();
            }

            describe('onInit behaviour', () => {
                it('initialization should be resolved if gamificationSettingsService returned values', async (done: DoneFn) => {
                    expect(gamificationSettingsViewCtrl.initPromise).toBeNull();
                    await executeSettingsViewInit();
                    expect(gamificationSettingsViewCtrl.initPromise).not.toBeNull();
                    expect(gamificationSettingsViewCtrl.iconStyleArray).toEqual(GamificationIconStyle.getAllAsArray());
                    done();
                });
                it('attributes should be defined after onInit', async (done: DoneFn) => {
                    await executeSettingsViewInit();
                    expect(gamificationSettingsViewCtrl.pointsRecordingSetterInProgress).toBe(false);
                    expect(gamificationSettingsViewCtrl.pointsDisplaySetterInProgress).toBe(false);
                    expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(false);
                    expect(gamificationSettingsViewCtrl.selectedIconStyle).toEqual(GamificationIconStyle.BI_STAR);
                    expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                    expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                    done();
                });
                it('should register watch-listeners for boolean properties', async (done: DoneFn) => {
                    spyOn(gamificationSettingsViewCtrl, 'setPointsRecording');
                    spyOn(gamificationSettingsViewCtrl, 'setPointsDisplay');
                    await executeSettingsViewInit();

                    // property: pointsRecording
                    expect(gamificationSettingsViewCtrl.setPointsRecording).toHaveBeenCalledTimes(1)
                    gamificationSettingsViewCtrl.pointsRecording = !gamificationSettingsViewCtrl.pointsRecording;
                    $scope.$apply();
                    expect(gamificationSettingsViewCtrl.setPointsRecording).toHaveBeenCalledTimes(2)

                    // property: pointsDisplay
                    expect(gamificationSettingsViewCtrl.setPointsDisplay).toHaveBeenCalledTimes(1);
                    gamificationSettingsViewCtrl.pointsDisplay = !gamificationSettingsViewCtrl.pointsDisplay;
                    $scope.$apply();
                    expect(gamificationSettingsViewCtrl.setPointsDisplay).toHaveBeenCalledTimes(2);
                    done();
                });
            });

            describe('behaviour for', () => {

                beforeEach(async (done: DoneFn) => {
                    await executeSettingsViewInit();
                    done();
                })

                describe('pointsRecording', () => {
                    it('should set the property pointsRecording to value after setter finishes', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                        await gamificationSettingsViewCtrl.setPointsRecording(true);
                        expect(mockGamificationSettingsService.setPointsRecordingEnabled).toHaveBeenCalledWith(true);
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(true);
                        done();
                    });
                    it('should toggle the pointsRecordingSetterInProgress during function call', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                        expect(gamificationSettingsViewCtrl.pointsRecordingSetterInProgress).toBe(false);
                        const setterPromise = gamificationSettingsViewCtrl.setPointsRecording(true);
                        expect(gamificationSettingsViewCtrl.pointsRecordingSetterInProgress).toBe(true);
                        await setterPromise;
                        expect(gamificationSettingsViewCtrl.pointsRecordingSetterInProgress).toBe(false);
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(true);
                        done();
                    });
                    it('should not store the value if storage in database failed', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                        mockGamificationSettingsService.setPointsRecordingEnabled.and.returnValue(Promise.reject(new Error('gamificationSettingsService failure test')));
                        const setterPromise = gamificationSettingsViewCtrl.setPointsRecording(true);
                        await expectThrowsAsync(async () => {
                            await setterPromise;
                        });
                        expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                        done();
                    });
                });

                describe('pointsDisplay', () => {
                    it('should set the property pointsDisplay to value after setter finishes', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                        await gamificationSettingsViewCtrl.setPointsDisplay(false);
                        expect(mockGamificationSettingsService.setPointsDisplayEnabled).toHaveBeenCalledWith(false);
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(false);
                        done();
                    });
                    it('should toggle the pointsDisplaySetterInProgress during function call', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                        expect(gamificationSettingsViewCtrl.pointsDisplaySetterInProgress).toBe(false);
                        const setterPromise = gamificationSettingsViewCtrl.setPointsDisplay(false);
                        expect(gamificationSettingsViewCtrl.pointsDisplaySetterInProgress).toBe(true);
                        await setterPromise;
                        expect(gamificationSettingsViewCtrl.pointsDisplaySetterInProgress).toBe(false);
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(false);
                        done();
                    });
                    it('should not store the value if storage in database failed', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                        mockGamificationSettingsService.setPointsDisplayEnabled.and.returnValue(Promise.reject(new Error('gamificationSettingsService failure test')));
                        const setterPromise = gamificationSettingsViewCtrl.setPointsDisplay(false);
                        await expectThrowsAsync(async () => {
                            await setterPromise;
                        });
                        expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                        done();
                    });
                });

                describe('setIconStyle', () => {
                    it('should skip setting if style matches already selected', async (done: DoneFn) => {
                        gamificationSettingsViewCtrl.selectedIconStyle = GamificationIconStyle.BI_STAR;
                        await gamificationSettingsViewCtrl.setIconStyle();
                        expect(mockGamificationSettingsService.setIconStyle).not.toHaveBeenCalled();
                        done();
                    });
                    it('should skip setting if iconStyleSetterInProgress is true', async (done: DoneFn) => {
                        gamificationSettingsViewCtrl.iconStyleSetterInProgress = true;
                        await gamificationSettingsViewCtrl.setIconStyle();
                        expect(mockGamificationSettingsService.setIconStyle).not.toHaveBeenCalled();
                        done();
                    });
                    it('should set a new (valid) style if it differs to the stored iconStyle', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.selectedIconStyle).toBe(GamificationIconStyle.BI_STAR);
                        gamificationSettingsViewCtrl.selectedIconStyle = GamificationIconStyle.DIAMOND;
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(false);
                        const setterPromise = gamificationSettingsViewCtrl.setIconStyle();
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(true);
                        await setterPromise;
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(false);
                        expect(mockGamificationSettingsService.setIconStyle).toHaveBeenCalledWith(GamificationIconStyle.DIAMOND);
                        done();
                    });
                    it('should reset the iconStyleSetterInProgress to false if new style is invalid', async (done: DoneFn) => {
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(false);
                        gamificationSettingsViewCtrl.selectedIconStyle = {
                            name: "invalid",
                            imagePath: 'none'
                        } as unknown as GamificationIconStyle;
                        const setterPromise = gamificationSettingsViewCtrl.setIconStyle();
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(true);
                        await setterPromise;
                        expect(mockGamificationSettingsService.setIconStyle).not.toHaveBeenCalled();
                        expect(gamificationSettingsViewCtrl.iconStyleSetterInProgress).toBe(false);
                        done();
                    });
                });
            });
        });

        describe('gamificationSettingsView element', () => {
            let $scope: angular.IScope;
            let $rootScope: angular.IRootScopeService;
            let settingsViewChild: HTMLElement;
            let jqElement: JQLite;
            let $compile: angular.ICompileService;
            let $window: angular.IWindowService;
            let gamificationSettingsViewCtrl: GamificationSettingsView;

            beforeEach(() => inject((_$compile_: angular.ICompileService,
                                     _$window_: angular.IWindowService,
                                     _$rootScope_: angular.IRootScopeService) => {
                $compile = _$compile_;
                $window = _$window_;
                $rootScope = _$rootScope_;
            }));

            beforeEach(() => {
                $scope = $rootScope.$new();
                jqElement = $compile('<gamification-settings-view></gamification-settings-view>')($scope);
                settingsViewChild = jqElement[0];
                $scope.$apply();
                gamificationSettingsViewCtrl = jqElement.controller('gamificationSettingsView');
                document.body.appendChild(settingsViewChild);
            });

            afterEach(() => {
                document.body.removeChild(settingsViewChild);
            });

            describe(' HTML Unit tests', () => {

                function getToggleSwitchInputForTag(name: string): HTMLElement | null {
                    const toggleSwitches: HTMLCollection = settingsViewChild.getElementsByTagName('toggle-switch');
                    for (let ts of toggleSwitches) {
                        if (ts.getAttribute('id-checkbox') === name) {
                            return ts.getElementsByTagName("input")[0] as HTMLElement;
                        }
                    }
                    return null;
                }

                function checkToggleSwitchDisabled(input: HTMLElement): boolean {
                    return input.getAttribute('disabled') === 'disabled';
                }

                function getImageThumbnailChooser(): HTMLElement {
                    const chooser = settingsViewChild.getElementsByTagName('image-thumbnail-chooser')[0];
                    expect(chooser).not.toBeNull();
                    return chooser as HTMLElement;
                }

                function getNavbarStylePreviewElement(): HTMLElement {
                    const preview = document.getElementById('style-preview')!.getElementsByTagName('navbar-gamification')[0];
                    return preview as HTMLElement;
                }

                it('should display a slider for recording matching the property pointsRecording', () => {
                    gamificationSettingsViewCtrl.pointsRecording = false;
                    $scope.$apply();
                    const toggleInput = getToggleSwitchInputForTag("pointsRecording");
                    expect(toggleInput).not.toBeNull();
                    toggleInput!.click();
                    expect(gamificationSettingsViewCtrl.pointsRecording).toBe(true);
                });
                it('should display a slider for display matching the property pointsDisplay', () => {
                    gamificationSettingsViewCtrl.pointsDisplay = false;
                    $scope.$apply();
                    const toggleInput = getToggleSwitchInputForTag("pointsDisplay");
                    expect(toggleInput).not.toBeNull();
                    toggleInput!.click();
                    expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                });
                it('should toggle enable/disable the pointsRecording-slider if SetterInProgress is toggled', () => {
                    gamificationSettingsViewCtrl.pointsRecording = false;
                    gamificationSettingsViewCtrl.pointsRecordingSetterInProgress = false;
                    $scope.$apply();
                    const toggleInput = getToggleSwitchInputForTag("pointsRecording");
                    expect(toggleInput).not.toBeNull();
                    expect(checkToggleSwitchDisabled(toggleInput!)).toBe(false);
                    gamificationSettingsViewCtrl.pointsRecordingSetterInProgress = true;
                    $scope.$apply();
                    expect(checkToggleSwitchDisabled(toggleInput!)).toBe(true);
                    toggleInput!.click();
                    expect(gamificationSettingsViewCtrl.pointsRecording).toBe(false);
                });
                it('should toggle enable/disable the pointsDisplay-slider if SetterInProgress is toggled', () => {
                    gamificationSettingsViewCtrl.pointsDisplay = true;
                    gamificationSettingsViewCtrl.pointsDisplaySetterInProgress = false;
                    $scope.$apply();
                    const toggleInput = getToggleSwitchInputForTag("pointsDisplay");
                    expect(toggleInput).not.toBeNull();
                    expect(checkToggleSwitchDisabled(toggleInput!)).toBe(false);
                    gamificationSettingsViewCtrl.pointsDisplaySetterInProgress = true;
                    $scope.$apply();
                    expect(checkToggleSwitchDisabled(toggleInput!)).toBe(true);
                    toggleInput!.click();
                    expect(gamificationSettingsViewCtrl.pointsDisplay).toBe(true);
                });
                it('should display the image-thumbnail-chooser with matching properties and bindings', () => {
                    expect(getImageThumbnailChooser()).not.toBeNull();
                    expect(getImageThumbnailChooser().getAttribute("model")).toBe("$ctrl.selectedIconStyle");
                    expect(getImageThumbnailChooser().getAttribute("named-images")).toBe("$ctrl.iconStyleArray");
                    expect(gamificationSettingsViewCtrl.iconStyleArray.length).toBe(GamificationIconStyle.getAllAsArray().length);
                    expect(getImageThumbnailChooser().getAttribute("disabled")).toBe("$ctrl.iconStyleSetterInProgress");
                    expect(getImageThumbnailChooser().getAttribute("ng-click")).toBe("$ctrl.setIconStyle()");
                });
                it('should display the gamification-navbar within the preview box persistently', () => {
                    const loadingContentRegex = RegExp(/^\s*\.\.\.\s*$/);
                    gamificationSettingsViewCtrl.pointsDisplay = true;
                    $scope.$apply();
                    expect(getNavbarStylePreviewElement().innerHTML).not.toBeNull();
                    expect(getNavbarStylePreviewElement().textContent).toMatch(loadingContentRegex);

                    gamificationSettingsViewCtrl.pointsDisplay = false;
                    $scope.$apply();
                    expect(getNavbarStylePreviewElement()).not.toBeNull();
                    expect(getNavbarStylePreviewElement().textContent).toMatch(loadingContentRegex);
                });
                it('should display the correct description for the preview box', () => {
                    const expectedHeadline = "Beschreibung:";
                    const expectedText = "Durch das Beenden von Aufgaben und Workflows sammelst du Punkte.\\s+"+
                        "Bei ausreichend Punkten steigst du ein Level auf.\\s+" +
                        "Gespeichert wird nur deine aktuelle Punktzahl und dein Level.";
                    const pointSettingsDiv = document.getElementById("points-settings");
                    const actualText = pointSettingsDiv!.getElementsByTagName("div")[0].textContent;
                    const expectedMatchCombined = new RegExp(`\\s+${expectedHeadline}\\s+${expectedText}\\s+`, '');
                    expect(actualText).toMatch(expectedMatchCombined);
                });
            });
        });
    });
}
