"use strict";
module rehagoal.overviewView {
    describe('rehagoal.overviewView', function () {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $scope: angular.IScope;
        let ctrl: OverviewToolbarController;
        let $window: angular.IWindowService;
        let $compile: angular.ICompileService;

        beforeEach(() => angular.mock.module('rehagoal.overviewView'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        describe('overviewToolbar', function () {
            beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                        _$rootScope_: angular.IRootScopeService,
                                        _$window_: angular.IWindowService,
                                        _$compile_: angular.ICompileService) {
                $componentController = _$componentController_;
                $rootScope = _$rootScope_;
                $window = _$window_;
                $compile = _$compile_;
            }));
            beforeEach(function () {
                $scope = $rootScope.$new();
            });
            describe('properties and methods', function () {
                beforeEach(function () {
                    ctrl = $componentController('overviewToolbar', {$scope: $scope}, {});
                });
                it('should have a property "acceptedJSONTypes"', function () {
                    expect(ctrl.acceptedJSONTypes).toBeDefined();
                });
            });
            describe('functional behaviour', function () {
                it('should return "application/json" if cordova is not defined', function () {
                    $window.cordova = undefined as any;
                    ctrl = $componentController('overviewToolbar', {$scope: $scope}, {});
                    expect(ctrl.acceptedJSONTypes).toBe("application/json");
                });
                it('should return "application/octet-stream, application/json" if cordova is defined', function () {
                    $window.cordova = {} as any;
                    ctrl = $componentController('overviewToolbar', {$scope: $scope}, {});
                    expect(ctrl.acceptedJSONTypes).toBe("application/octet-stream, application/json");
                });
            });

            describe('toolbar buttons', function () {
                let $scope: angular.IScope;
                let element: HTMLElement;
                let jqElement: JQLite;

                let overviewToolbarCtrl: OverviewToolbarController;

                const mockOverviewCtrl = jasmine.createSpyObj('overviewViewController', [
                    'newWorkflow',
                    'importWorkflows',
                    'requestServerImportModal',
                    'exportSelectedWorkflows'
                ]);

                beforeEach(function () {
                    $scope = angular.extend($rootScope.$new(), {});
                    const overviewViewElement = angular.element('<mock-overview-view><overview-toolbar></overview-toolbar></mock-overview-view>');
                    overviewViewElement.data('$overviewViewController', mockOverviewCtrl);
                    const parentJqElement = $compile(overviewViewElement)($scope);
                    jqElement = parentJqElement.find('overview-toolbar');
                    $scope.$apply();
                    overviewToolbarCtrl = jqElement.controller('overviewToolbar');
                    element = jqElement[0];
                });

                it('should call newWorkflow() from overview controller when "Neuer Workflow" is clicked', function () {
                    const button = element.querySelector('button[title="Neuen Workflow erstellen"]');

                    button!.dispatchEvent(new Event('click'));
                    expect(mockOverviewCtrl.newWorkflow).toHaveBeenCalled();
                });
                it('"Datei Import" button should have ngf-select attribute which references "importWorkflows"', function () {
                    const button = element.querySelector('button[title="Workflows aus Datei importieren"]');
                    const ngfSelect = button!.getAttribute('ngf-select');
                    expect(ngfSelect).not.toBeNull();
                    expect(ngfSelect).toBe('$ctrl.overviewCtrl.importWorkflows($file)');
                });
                it('"Datei Import" button should have ngf-accept attribute correspond to $ctrl.acceptedJSONTypes', function () {
                    const button = element.querySelector('button[title="Workflows aus Datei importieren"]');
                    const ngfAccept = button!.getAttribute('ngf-accept');
                    expect(ngfAccept).not.toBeNull();
                    expect(ngfAccept).toBe('$ctrl.acceptedJSONTypes');
                });

                it('should trigger a click on associated file input element when "Datei Import" is clicked', function() {
                    let inputButtonClicked: boolean = false;

                    const button = element.querySelector('button[title="Workflows aus Datei importieren"]');
                    const input = document.querySelector('input[title="Workflows aus Datei importieren"]');

                    input!.addEventListener('click', function (event) {
                        event.preventDefault();
                        inputButtonClicked = true;
                    });
                    button!.dispatchEvent(new Event('click'));

                    expect(inputButtonClicked).toEqual(true, 'expected input button to have registered a click');
                });
                it('should call requestServerImportModal() from overview controller when "Server Import" is clicked', function () {
                    const button = element.querySelector('button[title="Import von Server"]');
                    button!.dispatchEvent(new Event('click'));
                    expect(mockOverviewCtrl.requestServerImportModal).toHaveBeenCalled();
                });
                it('should call exportSelectedWorkflows() from overview controller when "Datei Export" is clicked', function () {
                    const button = element.querySelector('a[title="Auswahl in Datei exportieren"]');
                    button!.dispatchEvent(new Event('click'));
                    expect(mockOverviewCtrl.exportSelectedWorkflows).toHaveBeenCalled();
                });
                it('should have a server-export-button html element', function () {
                    const button = element.getElementsByTagName('server-export-button')[0];
                    expect(button).not.toBeNull();
                });
            });
        });
    });
}
