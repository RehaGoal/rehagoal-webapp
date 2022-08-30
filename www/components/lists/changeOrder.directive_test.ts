module rehagoal.lists {

    describe('changeOrder directive tests', function () {
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;

        beforeEach(() => angular.mock.module('rehagoal.lists'));
        beforeEach(angular.mock.module('rehagoal.templates'));

        beforeEach(inject(function (_$rootScope_: angular.IRootScopeService,
                                        _$compile_: angular.ICompileService) {
            $rootScope = _$rootScope_;
            $compile = _$compile_;
        }));

        describe('changeOrder element', function () {
            let $scope: angular.IScope;

            beforeEach(function() {
                $scope = $rootScope.$new();
            });

            function getOrderedElements(changeOrderElement: JQLite) {
                return [...changeOrderElement[0].querySelectorAll('element1, element2')];
            }

            it('should display both elements in default order (1, then 2)', function() {
                const changeOrderElement = $compile(`
                <div><change-order>
                    <element1><b>Test Element A</b></element1>
                    <element2><i>Test Element B</i></element2>
                </change-order></div>
                `)($scope);
                $scope.$apply();

                const elements = getOrderedElements(changeOrderElement);
                expect(elements[0].innerHTML).toEqual('<b>Test Element A</b>');
                expect(elements[1].innerHTML).toEqual('<i>Test Element B</i>');
            });

            it('should display both elements in order (1, then 2), if swapOrder is false', function() {
                const changeOrderElement = $compile(`
                <div><change-order swap-order="false">
                    <element1><b>Test Element A</b></element1>
                    <element2><i>Test Element B</i></element2>
                </change-order></div>
                `)($scope);
                $scope.$apply();

                const elements = getOrderedElements(changeOrderElement);
                expect(elements[0].innerHTML).toEqual('<b>Test Element A</b>');
                expect(elements[1].innerHTML).toEqual('<i>Test Element B</i>');
            });

            it('should display both elements in order (2, then 1), if swapOrder is true', function() {
                const changeOrderElement = $compile(`
                <div><change-order swap-order="true">
                    <element1><b>Test Element A</b></element1>
                    <element2><i>Test Element B</i></element2>
                </change-order></div>
                `)($scope);
                $scope.$apply();

                const elements = getOrderedElements(changeOrderElement);
                expect(elements[0].innerHTML).toEqual('<i>Test Element B</i>');
                expect(elements[1].innerHTML).toEqual('<b>Test Element A</b>');
            });
        });
    });
}
