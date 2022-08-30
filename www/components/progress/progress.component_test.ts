module rehagoal.overviewView {
    import progressController = rehagoal.overviewView.progressController;
    import IProgressBar = rehagoal.overviewView.IProgressBar;

    describe('progressBar tests', function () {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;
        let $interval: angular.IIntervalService;

        beforeEach(() => angular.mock.module('rehagoal.overviewView'));
        beforeEach(() => angular.mock.module('rehagoal.templates'));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService,
                                    _$interval_: angular.IIntervalService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $interval = _$interval_;
            $compile = _$compile_;
        }));

        function getNewUnfinishedBar(): IProgressBar {
            return {
                type: "",
                text: "",
                eventsCount: 0,
                eventsTotal: 1,
                finished: false
            };
        }

        function getNewUnfinishedIndeterminateBar(): IProgressBar {
            return {
                type: "",
                text: "",
                eventsCount: 1,
                eventsTotal: 1,
                finished: false
            };
        }

        function getNewFinishedBar(): IProgressBar {
            let finishedBar = getNewUnfinishedBar();
            finishedBar.eventsCount = finishedBar.eventsTotal;
            finishedBar.finished = true;
            return finishedBar;
        }

        function getNewDangerBar(): IProgressBar {
            let dangerBar = getNewUnfinishedBar();
            dangerBar.type = "danger";
            return dangerBar;
        }

        describe('progressBar controller', function () {

            describe('properties and methods', function () {
                let bindings: any, $scope: angular.IScope, progressBarCtrl: progressController;

                beforeEach(function () {
                    bindings = {};
                    $scope = $rootScope.$new();
                    progressBarCtrl = $componentController('progressBar', {$interval: $interval, $scope: $scope}, bindings);
                });

                it('should have a method "getBars"', function() {
                    expect(progressBarCtrl.getBars).toBeDefined();
                });
            });

            describe('behaviour', function() {
                let bindings: any, $scope: angular.IScope, progressBarCtrl: progressController;
                const updateEvent: string = 'updateEvent';
                const getProgressSpy = jasmine.createSpy('getProgress').and.returnValue([]);

                beforeEach(function () {
                    bindings = {getProgress: getProgressSpy, updateEvent: updateEvent, barWidth: 100};
                    $scope = $rootScope.$new();
                    progressBarCtrl = $componentController('progressBar', {$interval: $interval, $scope: $scope}, bindings);
                    progressBarCtrl.$onInit();

                });

                it('should call getProgress() if update Event is broadcasted', function() {
                    $scope.$broadcast(updateEvent);
                    expect(getProgressSpy).toHaveBeenCalled();
                });

                it('should set its "bars" property equal to the bars returned from getProgress, except for type', function() {
                    const unchangedBar = getNewUnfinishedBar();
                    getProgressSpy.and.returnValue([getNewUnfinishedBar()]);
                    $scope.$broadcast(updateEvent);

                    expect(progressBarCtrl.getBars().length).toEqual(1);
                    const bar = progressBarCtrl.getBars()[0];
                    expect(bar.text).toEqual(unchangedBar.text);
                    expect(bar.eventsCount).toEqual(unchangedBar.eventsCount);
                    expect(bar.eventsTotal).toEqual(unchangedBar.eventsTotal);
                });

                it('should set the "type" property to alternate between "success" and "null"', function() {
                    getProgressSpy.and.returnValue([getNewUnfinishedBar(), getNewUnfinishedBar(), getNewUnfinishedIndeterminateBar(), getNewUnfinishedBar()]);
                    $scope.$broadcast(updateEvent);

                    expect(progressBarCtrl.getBars()[0].type).toEqual('success');
                    expect(progressBarCtrl.getBars()[1].type).toEqual('null');
                    expect(progressBarCtrl.getBars()[2].type).toEqual('success');
                    expect(progressBarCtrl.getBars()[3].type).toEqual('null');

                });
                it('should not change a type of "danger"', function() {
                    const dangerBar = getNewUnfinishedBar();
                    dangerBar.type = "danger";

                    getProgressSpy.and.returnValue([
                        getNewDangerBar(),
                        getNewUnfinishedBar(),
                        getNewDangerBar()
                    ]);
                    $scope.$broadcast(updateEvent);

                    expect(progressBarCtrl.getBars()[0].type).toEqual('danger');
                    expect(progressBarCtrl.getBars()[1].type).toEqual('null');
                    expect(progressBarCtrl.getBars()[2].type).toEqual('danger');
                });

                describe('clearing progress bars on finish', function() {
                    function testClearingIfFinished() {
                        getProgressSpy.and.returnValue([getNewFinishedBar()]);
                        $scope.$broadcast(updateEvent);
                        expect(progressBarCtrl.getBars().length).toEqual(1);
                        $interval.flush(2500);
                        expect(progressBarCtrl.getBars().length).toEqual(0);
                    }
                    function testNotClearingIfNotFinished() {
                        getProgressSpy.and.returnValue([getNewFinishedBar(), getNewUnfinishedBar()]);
                        $scope.$broadcast(updateEvent);
                        expect(progressBarCtrl.getBars().length).toEqual(2);
                        $interval.flush(2500);
                        expect(progressBarCtrl.getBars().length).toEqual(2);
                    }
                    function testNotClearingIfNotFinishedIndeterminate() {
                        getProgressSpy.and.returnValue([getNewUnfinishedIndeterminateBar(), getNewFinishedBar()]);
                        $scope.$broadcast(updateEvent);
                        expect(progressBarCtrl.getBars().length).toEqual(2);
                        $interval.flush(2500);
                        expect(progressBarCtrl.getBars().length).toEqual(2);
                    }
                    it('should clear progressbars when all are finished after 2000ms', function() {
                        testClearingIfFinished();
                    });

                    it('should not clear progressbars when not all are finished', function() {
                        testNotClearingIfNotFinished();
                    });

                    it('should not clear progressbars when not all are finished (indeterminate)', function() {
                        testNotClearingIfNotFinishedIndeterminate();
                    });

                    it('should not be depended on earlier getProgress calls', function() {
                        testNotClearingIfNotFinished();
                        testClearingIfFinished();
                        testNotClearingIfNotFinishedIndeterminate();
                    });


                    it('should clear progressBars only after an delay', function() {
                        getProgressSpy.and.returnValue([getNewFinishedBar(), getNewFinishedBar()]);
                        $scope.$broadcast(updateEvent);

                        expect(progressBarCtrl.getBars().length).not.toEqual(0);
                        $interval.flush(2500);
                        expect(progressBarCtrl.getBars().length).toEqual(0);
                    });
                });

            });
        });

        describe('progressBar element', function () {
            let $scope: angular.IScope;
            let element: HTMLElement;
            let jqElement: JQLite;
            let progressBarCtrl: progressController;

            const updateEvent: string = 'updateEvent';
            let getProgressSpy = jasmine.createSpy('getProgress');
            let barWidth: number = 100;

            beforeEach(function () {
                $scope = angular.extend($rootScope.$new(), {
                    barWidth,
                    getProgressSpy,
                    updateEvent
                });
                jqElement = $compile(`<progress-bar 
                    bar-width="barWidth"
                    get-progress="getProgressSpy"
                    update-event="updateEvent"></progress-bar>`)($scope);
                element = jqElement[0];
                $scope.$apply();
                progressBarCtrl = jqElement.controller('progressBar');

                getProgressSpy.and.returnValue(false);
            });

            function getAllBars() {
                return [...element.querySelectorAll('.progress-bar')];
            }

            function getCssWidthOfElement(div: Element | null): string {
                if (div === null) {
                    fail('element should not be null');
                    return '';
                }
                let returnedStyle: string | null = div.getAttribute('style');
                let style: string = returnedStyle !== null ? returnedStyle : '';
                let cssAttributes: string[] = style.split(';');
                for (let attribute of cssAttributes) {
                    if (attribute.startsWith('width: ')) {
                        return attribute.split(': ')[1];
                    }
                }
                fail('given element should have had a style attribute with set "width"');
                return '';
            }

            function getTypeOfBar(bar: Element | null): string {
                if (bar === null) {
                    fail('bar should not be null');
                    return '';
                }

                let type = bar.getAttribute('type');
                if (type === null) {
                    fail('bar should have "type" attribute');
                    return '';
                }
                return type;
            }

            it('should have the width given as parameter', function() {
                let progressBarDiv = element.querySelector('#progress-bars');
                expect(getCssWidthOfElement(progressBarDiv)).toEqual(barWidth.toString() + '%')
            });

            it('should create a progress bar element for each bar returned by getProgress',  function() {
                getProgressSpy.and.returnValue([
                        getNewUnfinishedBar(),
                        getNewUnfinishedIndeterminateBar(),
                        getNewUnfinishedBar()
                ]);

                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                expect(getAllBars().length).toEqual(3);
            });

            it('should show bars of alternating colour when no type is specified',  function() {
                getProgressSpy.and.returnValue([
                    getNewUnfinishedBar(),
                    getNewUnfinishedBar(),
                    getNewUnfinishedIndeterminateBar()
                ]);

                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                const bars = getAllBars();

                expect(getTypeOfBar(bars[0])).toEqual('success');
                expect(getTypeOfBar(bars[1])).toEqual('null');
                expect(getTypeOfBar(bars[2])).toEqual('success');
            });

            it('should always show a type of "danger"', function() {
                getProgressSpy.and.returnValue([
                    getNewDangerBar(),
                    getNewUnfinishedBar(),
                    getNewDangerBar()
                ]);

                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                const bars = getAllBars();

                expect(getTypeOfBar(bars[0])).toEqual('danger');
                expect(getTypeOfBar(bars[1])).toEqual('null');
                expect(getTypeOfBar(bars[2])).toEqual('danger');
            });

            it('should always retain given types', function() {
                function getNullBar() {
                    let bar = getNewUnfinishedBar();
                    bar.type = "null";
                    return bar;
                }

                getProgressSpy.and.returnValue([
                    getNullBar(),
                    getNullBar(),
                    getNullBar()
                ]);

                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                const bars = getAllBars();

                expect(getTypeOfBar(bars[0])).toEqual('null');
                expect(getTypeOfBar(bars[1])).toEqual('null');
                expect(getTypeOfBar(bars[2])).toEqual('null');
            });

            it('should disappear after a delay if the given progress bar is finished',  function() {
                getProgressSpy.and.returnValue([getNewFinishedBar()]);
                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                expect(getAllBars().length).toEqual(1);
                $interval.flush(2500);
                expect(getAllBars().length).toEqual(0);
            });

            it('should not disappear after a delay if any of the given progress bars is not finished', function() {
                getProgressSpy.and.returnValue([getNewFinishedBar(), getNewUnfinishedBar()]);
                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                expect(getAllBars().length).toEqual(2);
                $interval.flush(2500);
                expect(getAllBars().length).toEqual(2);
            });

            it('should not disappear after a delay if any of the given progress bars is not finished (indeterminate)', function() {
                getProgressSpy.and.returnValue([getNewUnfinishedIndeterminateBar(), getNewFinishedBar()]);
                $scope.$broadcast(updateEvent);
                $rootScope.$apply();

                expect(getAllBars().length).toEqual(2);
                $interval.flush(2500);
                expect(getAllBars().length).toEqual(2);
            });
        });
    });

}
