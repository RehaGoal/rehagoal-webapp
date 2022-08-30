module rehagoal.utilities {
    describe('rehagoal.utilities', function() {
        let $compile: ng.ICompileService;
        let $rootScope: ng.IRootScopeService;
        beforeEach(() => angular.mock.module('rehagoal.utilities'));
        beforeEach(() => inject(function(_$compile_: ng.ICompileService, _$rootScope_: ng.IRootScopeService) {
            $compile = _$compile_;
            $rootScope = _$rootScope_;
        }))

        describe('directive: scrollIntoViewEvent', function() {
            let $scope: CustomScope;
            const eventName = 'customScrollEvent';
            const scrollToMeId = 'scrollToMe';

            interface CustomScope extends ng.IScope {
            }

            beforeEach(function() {
                $scope = $rootScope.$new();
                window.scrollTo(0, 0);
            });

            function isScrolledIntoView(el: Element, offset: number = 0) {
                const rect = el.getBoundingClientRect();
                return (rect.top + offset) < window.innerHeight && (rect.bottom + offset) >= 0;
            }

            function buildScrollableElement(eventName: string, disabled?: boolean, offset?: number): Element {
                let disabled_attr = "";
                let offset_attr = "";
                if (disabled !== undefined) {
                    disabled_attr = `scroll-into-view-disabled="${disabled}"`;
                }
                if (offset !== undefined) {
                    offset_attr = `scroll-into-view-offset="${offset}"`;
                }
                return $compile(
                    `<div>
                                <div style="background: grey; height: 5000px">Previous element</div>
                                <div id="${scrollToMeId}" style="background: green; height: 200px" scroll-into-view-event="${eventName}" ${disabled_attr} ${offset_attr}>
                                    Element to scroll into view
                                </div>
                                <div style="background: grey; height: 5000px">Next element</div>
                             </div>"`
                )($scope)[0];
            }

            function testElementScrolledIntoView(element: Element, eventName: string, shouldScrollIntoView: boolean, offset: number = 0) {
                document.body.appendChild(element);
                $rootScope.$apply();

                const scrollElement = element.querySelector(`#${scrollToMeId}`)!;
                expect(isScrolledIntoView(scrollElement, offset)).toBe(false);
                $scope.$broadcast(eventName);
                expect(isScrolledIntoView(scrollElement, offset)).toBe(shouldScrollIntoView);

                document.body.removeChild(element);
            }

            it('should scroll the element into view, if correct event is received and not disabled',  function() {
                const element = buildScrollableElement(eventName);
                testElementScrolledIntoView(element, eventName, true);
            });

            it('should not scroll the element into view, if invalid event is received and not disabled',  function() {
                const element = buildScrollableElement(eventName);
                testElementScrolledIntoView(element, eventName+"Invalid", false);
            });

            it('should not scroll the element into view, if correct event is received, but disabled',  function() {
                const element = buildScrollableElement(eventName, true);
                testElementScrolledIntoView(element, eventName, false);
            });

            it('should scroll the element into view, if correct event is received, disabled is false',  function() {
                const element = buildScrollableElement(eventName, false);
                testElementScrolledIntoView(element, eventName, true);
            });

            it('should scroll the element into view with given offset, if correct event is received and not disabled', function() {
                const offset = 500;
                const element = buildScrollableElement(eventName, false,  offset);
                testElementScrolledIntoView(element, eventName, true, offset);
            })
        });
    })
}
