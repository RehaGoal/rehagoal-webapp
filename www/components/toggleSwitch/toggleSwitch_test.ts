"use strict";
module rehagoal.toggleSwitch {
    import getComputedStyleProperty = rehagoal.testUtilities.getComputedStyleProperty;
    describe('toggleSwitch tests', function () {
        let $componentController: angular.IComponentControllerService, $rootScope: angular.IRootScopeService;

        beforeEach(() => angular.mock.module('rehagoal.toggleSwitch'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
        }));

        interface IScopeWithToggleSwitchProperties extends angular.IScope {
            testModel: boolean
            disabled: boolean
        }

        describe('toggleSwitch element', function () {
            let $scope: IScopeWithToggleSwitchProperties;
            let toggleSwitchChild: HTMLElement;
            let labelChild: HTMLElement;
            let jqElement: JQLite;
            let $compile: angular.ICompileService;
            let $window: angular.IWindowService;
            let toggleSwitchCtrl: ToggleSwitchComponentController;

            beforeEach(() => inject(function (_$compile_: angular.ICompileService, _$window_: angular.IWindowService) {
                $compile = _$compile_;
                $window = _$window_;
            }));

            const testIdString = "testId";
            const testModelInitValue: boolean = false;
            const ENABLED_BACKGROUND_COLOR = "rgb(92, 184, 92)";
            const DISABLED_BACKGROUND_COLOR = "rgb(204, 204, 204)";
            const SLIDER_TRANSFORM_RIGHT_POSITION = "matrix(1, 0, 0, 1, 26, 0)";
            const SLIDER_TRANSFORM_LEFT_POSITION = "none";

            beforeEach(function () {
                $scope = angular.extend($rootScope.$new(), {
                    testModel: testModelInitValue,
                    disabled: false,
                });

                jqElement = $compile(`
                    <div>
                        <toggle-switch id-checkbox="testId" model="testModel" ng-disabled="disabled"></toggle-switch>
                        <label for="testId">testLabel</label>
                    </div>`)($scope);
                toggleSwitchChild = jqElement.find("toggle-switch")[0];
                labelChild = jqElement.find("label")[0];
                $scope.$apply();
                toggleSwitchCtrl = jqElement.find("toggle-switch").controller('toggleSwitch');
                document.body.appendChild(jqElement[0]);
            });

            afterEach(() => {
                document.body.removeChild(jqElement[0]);
            });

            function getMainDiv() {
                return jqElement[0];
            }

            function getInputElement() {
                return toggleSwitchChild.getElementsByTagName("input")[0];
            }

            function getToggleSpan() {
                return toggleSwitchChild.getElementsByTagName("span")[0];
            }

            function parsePixelSizeStringToNumber(pixelStr: string): number | null {
                const regExp = new RegExp("(\\d+)px");
                const match = regExp.exec(pixelStr);
                if (match) {
                    return parseInt(match[1]);
                } else {
                    return null;
                }
            }

            interface ElementWithCSSProperty {
                element: HTMLElement
                property: string
                pseudoElement?: string
            }

            function getComputedPixelSizes(namedElementsAndProperties: {[name: string]: ElementWithCSSProperty}): Map<string, number> {
                let resultMap: Map<string, number> = new Map<string, number>();
                Object.keys(namedElementsAndProperties).forEach(key => {
                    const elemWithCSSProp: ElementWithCSSProperty = namedElementsAndProperties[key];
                    const value = parsePixelSizeStringToNumber(getComputedStyleProperty($window, elemWithCSSProp.element, elemWithCSSProp.property, elemWithCSSProp.pseudoElement));
                    since(`Could not estimate ${key} in \"getComputedPixelSizes\" method.`)
                        .expect(value).not.toBeNull();
                    resultMap.set(key, value!);
                });
                return resultMap;
            }

            it('should have correct transition time by default', function () {
                const transitionTime = getComputedStyleProperty($window, getToggleSpan(), 'transition-duration')
                expect(transitionTime).toBe('0.4s');
            });

            describe('disabled transition', function () {
                beforeEach(function () {
                    //set transition time to 0s otherwise setProperty(toggle-distance) or resizing would take transition time
                    getToggleSpan().style.setProperty('--transition-time', '0s');
                });

                it('should have correct bindings and expect toggleSwitch input elem to have correct id', function () {
                    expect(toggleSwitchCtrl.idCheckbox).toBe(testIdString);
                    expect(toggleSwitchCtrl.model).toBe(testModelInitValue);
                    const inputElement = document.getElementById(testIdString);
                    expect(inputElement instanceof HTMLInputElement).toBe(true);
                    expect(inputElement!.getAttribute("type")).toBe("checkbox");
                });
                it('should have correct two way bindings', function () {
                    toggleSwitchCtrl.model = false;
                    $scope.$apply();
                    expect($scope.testModel).toBe(false);

                    $scope.testModel = true;
                    $scope.$apply();
                   expect(toggleSwitchCtrl.model).toBe(true);
                });
                it('should have correct visuals if turned off', function () {
                    toggleSwitchCtrl.model = false;
                    $scope.$apply();

                    expect(getComputedStyleProperty($window, getToggleSpan(), 'background-color')).toBe(DISABLED_BACKGROUND_COLOR);
                    expect(getComputedStyleProperty($window, getToggleSpan(), 'transform', ':before')).toBe(SLIDER_TRANSFORM_LEFT_POSITION);
                });
                it('should have correct visuals if turned on', function () {
                    toggleSwitchCtrl.model = true;
                    $scope.$apply();

                    expect(getComputedStyleProperty($window, getToggleSpan(), 'background-color')).toBe(ENABLED_BACKGROUND_COLOR);
                    expect(getComputedStyleProperty($window, getToggleSpan(), 'transform', ':before')).toBe(SLIDER_TRANSFORM_RIGHT_POSITION);
                });
                it('should have correct translation matrix', function () {
                    const changedToggleWith = "-1em"
                    const changedTranslationMatrix = "matrix(1, 0, 0, 1, -50, 0)";

                    toggleSwitchCtrl.model = true;
                    $scope.$apply();

                    expect(getComputedStyleProperty($window, getToggleSpan(), 'transform', ':before')).toBe(SLIDER_TRANSFORM_RIGHT_POSITION);

                    getToggleSpan().style.setProperty('--switch-width', changedToggleWith);

                    const currentTransformMatrix = getComputedStyleProperty($window, getToggleSpan(), 'transform', ':before');
                    expect(currentTransformMatrix).toBe(changedTranslationMatrix);
                });
                it('should scale toggle-switch correctly if fontSize is altered', function () {
                    const smallFontSizeNumber = 1;
                    const bigFontSizeNumber = 3;
                    const toggleSwitchInnerDiv = toggleSwitchChild.getElementsByTagName("div")[0];
                    const testedElements: {[name: string]: ElementWithCSSProperty} = {
                        "font-size": {element: toggleSwitchChild, property: "font-size"},
                        "switch-width": {element: toggleSwitchInnerDiv, property: "width"},
                        "switch-height": {element: toggleSwitchInnerDiv, property: "height"},
                        "slider-width": {element: getToggleSpan(), property: "width", pseudoElement: ":before"},
                        "slider-height": {element: getToggleSpan(), property: "height", pseudoElement: ":before"},
                    };

                    getMainDiv().style.fontSize = `${smallFontSizeNumber}em`;
                    const smallFontItems: Map<string, number> = getComputedPixelSizes(testedElements);

                    getMainDiv().style.fontSize = `${bigFontSizeNumber}em`;
                    const bigFontItems: Map<string, number> = getComputedPixelSizes(testedElements);

                    since("Checked Items should have same size")
                        .expect(Object.keys(smallFontItems).length).toBe(Object.keys(bigFontItems).length);

                    const ratio = bigFontSizeNumber / smallFontSizeNumber;
                    Object.keys(smallFontItems).forEach(key => {
                        since(`resized element (${key}) should be exactly ${ratio} times of original size.`+
                            `Expected ${smallFontItems[key]! * ratio} (orig: ${smallFontItems[key]}) to be ${bigFontItems[key]}`).
                        expect(smallFontItems[key]! * ratio).toBe(bigFontItems[key]!);
                    });
                });
                it('should redirect clicks to underlying input via pointer events from parent div', function () {
                    const parentDiv = toggleSwitchChild.getElementsByTagName("div")[0];
                    expect(getComputedStyleProperty($window, parentDiv, "pointer-events")).toBe("none");
                    expect(getComputedStyleProperty($window, getInputElement(), "pointer-events")).toBe("all");
                });
                it('should toggle (off to on) when switch is clicked', function () {
                    toggleSwitchCtrl.model = false;
                    $scope.$apply();
                    expect($scope.testModel).toBe(false);

                    getInputElement().click();
                    expect(toggleSwitchCtrl.model).toBe(true);
                    expect($scope.testModel).toBe(true);
                });
                it('should toggle (on to off) when switch is clicked', function ()  {
                    toggleSwitchCtrl.model = true;
                    $scope.$apply();
                    expect($scope.testModel).toBe(true);

                    getInputElement().click();
                    expect(toggleSwitchCtrl.model).toBe(false);
                    expect($scope.testModel).toBe(false);
                });
                it('should toggle (on to off) when label is clicked', function () {
                    toggleSwitchCtrl.model = true;
                    $scope.$apply();

                    labelChild.click();
                    expect(toggleSwitchCtrl.model).toBe(false);
                });
                it('should toggle (off to on) when label is clicked', function () {
                    toggleSwitchCtrl.model = false;
                    $scope.$apply();

                    labelChild.click();
                    expect(toggleSwitchCtrl.model).toBe(true);
                });
                describe("disabled property", function () {
                    beforeEach(() => {
                        $scope.disabled = true;
                        $scope.$apply();
                    });

                    const DISABLED_SPAN_COLOR = "rgb(211, 211, 211)";

                    it('should have correct visuals if disabled (turned off state)', function () {
                        toggleSwitchCtrl.model = false;
                        $scope.$apply();

                        expect(getComputedStyleProperty($window,getToggleSpan(), 'background-color', ':before')).toBe(DISABLED_SPAN_COLOR);
                        expect(getComputedStyleProperty($window,getToggleSpan(), 'background-color')).toBe(DISABLED_BACKGROUND_COLOR);
                        expect(getComputedStyleProperty($window,getToggleSpan(), 'transform', ':before')).toBe(SLIDER_TRANSFORM_LEFT_POSITION);
                    });
                    it('should have correct visuals if disabled (turned on state)', function () {
                        toggleSwitchCtrl.model = true;
                        $scope.$apply();

                        expect(getComputedStyleProperty($window,getToggleSpan(), 'background-color', ':before')).toBe(DISABLED_SPAN_COLOR);
                        expect(getComputedStyleProperty($window,getToggleSpan(), 'background-color')).toBe(ENABLED_BACKGROUND_COLOR);
                        expect(getComputedStyleProperty($window,getToggleSpan(), 'transform', ':before')).toBe(SLIDER_TRANSFORM_RIGHT_POSITION);
                    });
                    it('should not toggle if disabled and switch is clicked (off to on)', function () {
                        toggleSwitchCtrl.model = false;
                        $scope.$apply();

                        getInputElement().click();
                        expect($scope.testModel).toBe(false);
                        expect(toggleSwitchCtrl.model).toBe(false);
                    });
                    it('should not toggle if disabled and switch is clicked (on to off)', function () {
                        toggleSwitchCtrl.model = true;
                        $scope.$apply();

                        getInputElement().click();
                        expect(toggleSwitchCtrl.model).toBe(true);
                        expect($scope.testModel).toBe(true);
                    });
                    it('should not toggle if disabled and label is clicked (off to on)', function () {
                        toggleSwitchCtrl.model = false;
                        $scope.$apply();

                        labelChild.click();
                        expect($scope.testModel).toBe(false);
                        expect(toggleSwitchCtrl.model).toBe(false);
                    });
                    it('should not toggle if disabled and label is clicked (on to off)', function () {
                        toggleSwitchCtrl.model = true;
                        $scope.$apply();

                        labelChild.click();
                        expect($scope.testModel).toBe(true);
                        expect(toggleSwitchCtrl.model).toBe(true);
                    });
                    it('should toggle only if not disabled', function () {
                        toggleSwitchCtrl.ngDisabled = false;
                        toggleSwitchCtrl.model = true;
                        $scope.$apply();

                        getInputElement().click();
                        expect($scope.testModel).toBe(false);
                        expect(toggleSwitchCtrl.model).toBe(false);

                        labelChild.click();
                        expect($scope.testModel).toBe(true);
                        expect(toggleSwitchCtrl.model).toBe(true);
                    });
                });
            });
        });
    });
}

