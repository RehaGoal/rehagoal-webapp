module rehagoal.utilities {
    const moduleName = 'rehagoal.utilities';

    angular.module(moduleName)
        .directive('ngLoad', ['$parse', function ($parse) {
            return {
                restrict: 'A',
                link: function (scope, elem, attrs) {
                    const onLoad = $parse(attrs.ngLoad);
                    elem.on('load', function (event) {
                        scope.$applyAsync(function () {
                            onLoad(scope, {$event: event});
                        });
                    });
                }
            };
        }]);
}
