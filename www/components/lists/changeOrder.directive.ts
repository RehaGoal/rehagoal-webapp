module rehagoal.lists {
    const moduleName = 'rehagoal.lists';
    angular.module(moduleName)
    .directive('changeOrder', [function() {
        return {
            restrict: 'E',
            transclude: {
                'element1': 'element1',
                'element2': 'element2',
            },
            scope: {
                swapOrder: '<'
            },
            replace: true,
            templateUrl: 'components/lists/changeOrder.html'
        };
    }])
}
