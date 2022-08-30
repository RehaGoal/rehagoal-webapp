module rehagoal.utilities {
    const moduleName = 'rehagoal.utilities';

    /**
     * Scrolls the associated element to the view, when a specified event is received.
     *
     * @attr scroll-into-view-event: event to listen to (when to scroll the element into view)
     * @attr scroll-into-view-disabled: whether the event should be ignored or not
     * @attr scroll-into-view-offset: offset in y-direction to add to the scroll position (e.g. to account for navbar)
     */
    class ScrollIntoViewEventDirective implements ng.IDirective {
        restrict = 'A';
        constructor(private $window: angular.IWindowService) {
        }

        link = (scope: ng.IScope, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
            scope.$on(attrs.scrollIntoViewEvent, () => {
                const scrollOffset = scope.$eval(attrs.scrollIntoViewOffset) || 0
                if (!scope.$eval(attrs.scrollIntoViewDisabled)) {
                    const elementTop = element[0].getBoundingClientRect().top;
                    const offsetY = elementTop + this.$window.pageYOffset + scrollOffset
                    this.$window.scrollTo({
                        top: offsetY
                    });
                }
            });
        }

        static factory(): ng.IDirectiveFactory {
            const directiveFactory = ($window: angular.IWindowService) => new ScrollIntoViewEventDirective($window);
            directiveFactory.$inject = ['$window'];
            return directiveFactory;
        }
    }

    angular.module(moduleName).directive('scrollIntoViewEvent', ScrollIntoViewEventDirective.factory());
}

