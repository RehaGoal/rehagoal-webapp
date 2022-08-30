module rehagoal.utilities {
    import TESTDATA_DATAURI_IMAGE_PNG_1BY1_WHITE = rehagoal.testUtilities.TESTDATA_DATAURI_IMAGE_PNG_1BY1_WHITE;
    describe('rehagoal.utilities', function() {
        let $compile: ng.ICompileService;
        let $rootScope: ng.IRootScopeService;
        beforeEach(() => angular.mock.module('rehagoal.utilities'));
        beforeEach(() => inject(function(_$compile_: ng.ICompileService, _$rootScope_: ng.IRootScopeService) {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
        }))

        describe('directive: ngLoad', function() {
            let $scope: CustomScope;
            const imageDataURI = TESTDATA_DATAURI_IMAGE_PNG_1BY1_WHITE;

            interface CustomScope extends ng.IScope {
                myLoadedImageCallback?: (event: WindowEventMap["load"]) => void;
            }

            beforeEach(function() {
                $scope = $rootScope.$new();
            });

            async function waitForImageLoaded(jqElement: JQLite): Promise<void> {
                return new Promise((resolve, reject) => {
                    jqElement.one('load', function() {
                        resolve();
                    })
                });
            }

            it('should call callback when image is loaded', async function(done) {
                $scope.myLoadedImageCallback = jasmine.createSpy('myLoadedImageCallback');
                const jqElement = $compile('<img ng-load="myLoadedImageCallback($event)" />')($scope);
                document.body.appendChild(jqElement[0]);
                $rootScope.$apply();
                expect($scope.myLoadedImageCallback).not.toHaveBeenCalled();

                let imgLoadedPromise = waitForImageLoaded(jqElement);
                jqElement.attr('src', imageDataURI);
                await imgLoadedPromise;
                $rootScope.$apply();
                expect($scope.myLoadedImageCallback).toHaveBeenCalledTimes(1);
                expect($scope.myLoadedImageCallback).toHaveBeenCalledWith(jasmine.any(Event));

                $scope.$destroy();
                jqElement.attr('src', '');
                $rootScope.$apply();
                imgLoadedPromise = waitForImageLoaded(jqElement);
                jqElement.attr('src', imageDataURI);
                await imgLoadedPromise;
                $rootScope.$apply();
                // should not trigger ng-load callback again after $destroy
                expect($scope.myLoadedImageCallback).toHaveBeenCalledTimes(1);

                document.body.removeChild(jqElement[0]);
                done();
            });
        });
    })
}
