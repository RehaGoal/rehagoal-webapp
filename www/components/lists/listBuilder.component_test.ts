module rehagoal.lists {

    describe('listBuilderComponent tests', function () {
        let $componentController: angular.IComponentControllerService;
        let $rootScope: angular.IRootScopeService;
        let $compile: angular.ICompileService;

        beforeEach(() => angular.mock.module('rehagoal.lists'));
        beforeEach(angular.mock.module('rehagoal.templates'));

        beforeEach(inject(function (_$componentController_: angular.IComponentControllerService,
                                    _$rootScope_: angular.IRootScopeService,
                                    _$compile_: angular.ICompileService) {
            $componentController = _$componentController_;
            $rootScope = _$rootScope_;
            $compile = _$compile_;
        }));

        describe('listBuilderComponent controller', function () {
            let bindings: any, $scope: angular.IScope, listBuilderCtrl: ListBuilderComponentController<any>;
            let allItems: any[];
            let selectedItems: any[];
            let onItemRemoveSpy: jasmine.Spy;
            let onItemAddSpy: jasmine.Spy;

            beforeEach(function () {
                allItems = [];
                selectedItems = [];
                onItemRemoveSpy = jasmine.createSpy('onItemRemove');
                onItemAddSpy = jasmine.createSpy('onItemRemove');
                bindings = {
                    selectedItemsTitle: 'testingSelectedItemsTitle',
                    allItemsTitle: 'testingAllItemsTitle',
                    noItemsSelectedWarning: 'testingNoItemsSelectedWarning',
                    allItems: allItems,
                    selectedItems: selectedItems,
                    allItemsOrderBy: '',
                    allItemsFirst: false,
                    onItemRemove: onItemRemoveSpy,
                    onItemAdd: onItemAddSpy,
                };
                $scope = $rootScope.$new();
                listBuilderCtrl = $componentController('listBuilder', {$scope: $scope}, bindings);
                onItemAddSpy.and.returnValue(true);
                onItemRemoveSpy.and.returnValue(true);
            });

            describe('properties and methods', function () {
                it('should have a method "removeItemAt"', function () {
                    expect(listBuilderCtrl.removeItemAt).toBeDefined();
                });
                it('should have a method "addItem"', function () {
                    expect(listBuilderCtrl.addItem).toBeDefined();
                });
            });

            describe('behaviour', function () {
                describe('addItem', function () {
                    it('should add an item (string), if onItemAdd returns true', function () {
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.addItem('item 1');
                        expect(listBuilderCtrl.selectedItems).toEqual(['item 1']);
                        expect(listBuilderCtrl.selectedItems).toBe(selectedItems);
                    });
                    it('should add an item (object), if onItemAdd returns true', function () {
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.addItem({item: 'item 1'});
                        expect(listBuilderCtrl.selectedItems).toEqual([{item: 'item 1'}]);
                        expect(listBuilderCtrl.selectedItems).toBe(selectedItems);
                    });
                    it('should not add an item, if onItemAdd returns false', function () {
                        onItemAddSpy.and.returnValue(false);
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.addItem({item: 'item 1'});
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.addItem('item 1');
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                    });
                    it('should add an item, if onItemAdd is undefined', function () {
                        onItemAddSpy.and.returnValue(false);
                        listBuilderCtrl.onItemAdd = undefined;
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.addItem({item: 'item 1'});
                        expect(listBuilderCtrl.selectedItems).toEqual([{item: 'item 1'}]);
                        expect(listBuilderCtrl.selectedItems).toBe(selectedItems);
                    });
                    it('should add multiple items', function () {
                        let items = [{item: 'item 1'}, {item: 'item 2'}, {item: 'third item'}];
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        for (let [i, item] of items.entries()) {
                            listBuilderCtrl.addItem(item);
                            expect(listBuilderCtrl.selectedItems).toEqual(items.slice(0, i + 1));
                        }
                        expect(listBuilderCtrl.selectedItems).toEqual(items);
                    });
                });
                describe('removeItemAt', function () {
                    function testRemoveItemSuccess() {
                        selectedItems.unshift(0, 1, 2, 'x');
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                        listBuilderCtrl.removeItemAt(1);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 2, 'x']);
                        listBuilderCtrl.removeItemAt(2);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 2]);
                        listBuilderCtrl.removeItemAt(0);
                        expect(listBuilderCtrl.selectedItems).toEqual([2]);
                        listBuilderCtrl.removeItemAt(0);
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.removeItemAt(0);
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                        listBuilderCtrl.removeItemAt(10);
                        expect(listBuilderCtrl.selectedItems).toEqual([]);
                    }

                    function testRemoveItemFail() {
                        selectedItems.unshift(0, 1, 2, 'x');
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                        listBuilderCtrl.removeItemAt(1);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                        listBuilderCtrl.removeItemAt(2);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                        listBuilderCtrl.removeItemAt(0);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                        listBuilderCtrl.removeItemAt(3);
                        expect(listBuilderCtrl.selectedItems).toEqual([0, 1, 2, 'x']);
                    }

                    it('it should remove item at index, if onItemRemove returns true', function () {
                        testRemoveItemSuccess();
                    });
                    it('it should remove item at index, if onItemRemove is undefined', function () {
                        onItemRemoveSpy.and.returnValue(false);
                        listBuilderCtrl.onItemRemove = undefined;
                        testRemoveItemSuccess();
                    });
                    it('it should not remove item, if onItemRemove returns false', function () {
                        onItemRemoveSpy.and.returnValue(false);
                        testRemoveItemFail();
                    });
                });
            });
        });

        describe('listBuilderComponent element', function () {
            type Item = {id: number, text: string, customOrder: number};
            let $scope: IExtendedScope;
            let element: HTMLElement;
            let jqElement: JQLite;
            let allItems: Item[];
            let allItemsFirst: boolean = false;
            let selectedItems: Item[];
            let expectedItemNames: string[];
            let listBuilderCtrl: ListBuilderComponentController<Item>;
            const allItemsPanelTitle = "All Items (Unit-Test)";
            const selectedItemsPanelTitle = "Selected Items (Unit-Test)";
            const expectedPanelTitles = [
                allItemsPanelTitle,
                selectedItemsPanelTitle
            ];
            interface IExtendedScope extends angular.IScope {
                allItems: typeof allItems,
                selectedItems: typeof selectedItems,
                allItemsFirst: boolean
            }

            beforeEach(function() {
                allItems = [
                    {id: 0, text: 'item 1', customOrder: 1},
                    {id: 1, text: 'item 2', customOrder: 0},
                    {id: 2, text: '3rd item', customOrder: 2},
                ];
                expectedItemNames = allItems.map((item) => "[Test]"+item.text);
                selectedItems = [];

                $scope = angular.extend($rootScope.$new(), {
                    allItems,
                    selectedItems,
                    allItemsFirst
                });
                jqElement = $compile(`
                <list-builder 
                    all-items="allItems"
                    selected-items="selectedItems"
                    all-items-title="${allItemsPanelTitle}"
                    selected-items-title="${selectedItemsPanelTitle}"
                    no-items-selected-warning="No item(s) selected!"
                    all-items-order-by="customOrder"
                    all-items-first="allItemsFirst">
                    <item-display>[Test]{{$parent.item.text}}</item-display>
                    <selected-items-footer>TestFooter</selected-items-footer>
                </list-builder>
                `)($scope);
                element = jqElement[0];
                $scope.$apply();
                listBuilderCtrl = jqElement.controller('listBuilder');
            });

            function getWarningElement() {
                return element.querySelector('.alert-warning');
            }

            function getPanels() {
                return [...element.querySelectorAll('.panel')];
            }

            /**
             * only available, if there are items
             */
            function getAllItemsPanel() {
                return getPanels().filter((panel) => panel.querySelector('.list-group[ng-repeat~="$ctrl.allItems"]'))[0]
            }

            /**
             * only available, if there are items
             */
            function getSelectedItemsPanel() {
                return getPanels().filter((panel) => panel.querySelector('.list-group[ng-repeat~="$ctrl.selectedItems"]'))[0];
            }

            function getSelectedItemsPanelBody() {
                return getSelectedItemsPanel().querySelector('.panel-body');
            }

            function getAllItemsPanelBody() {
                return getAllItemsPanel().querySelector('.panel-body');
            }

            function getAllItemsEntries() {
                return [...getAllItemsPanelBody()!.querySelectorAll('.list-group-item')].map((li) => li.textContent!.trim());
            }

            function getPanelTitle(panel: Element) {
                const panelTitleElement = panel.querySelector('.panel-title');
                if (panelTitleElement !== null) {
                    return panelTitleElement.textContent
                }
                return null;
            }

            function getSelectedItemsEntries() {
                return [...getSelectedItemsPanelBody()!.querySelectorAll('.list-group-item')].map((li) => li.textContent!.trim());
            }

            it('should have correct panel titles', function () {
                const panelTitles = getPanels().map((node) => getPanelTitle(node)!);
                expect(panelTitles).toEqual(<any>(jasmine.arrayWithExactContents(expectedPanelTitles)));
                listBuilderCtrl.addItem(allItems[0]);
                $scope.$apply();
                const allItemsPanel = getAllItemsPanel();
                const selectedItemsPanel = getSelectedItemsPanel();
                expect(allItemsPanel).not.toBeNull();
                expect(selectedItemsPanel).not.toBeNull();
                expect(getPanelTitle(allItemsPanel)).toEqual(expectedPanelTitles[0]);
                expect(getPanelTitle(selectedItemsPanel)).toEqual(expectedPanelTitles[1]);
            });

            describe('allItemsFirst', function() {
                it('should have panels ordered like [selected items, all items]', function () {
                    const panels = getPanels();
                    expect(panels.length).toBe(2);
                    expect(getPanelTitle(panels[0])).toBe(selectedItemsPanelTitle);
                    expect(getPanelTitle(panels[1])).toBe(allItemsPanelTitle);
                });
                it('should have panels ordered like [all items, selected items] with allItemsFirst set to true', function () {
                    $scope.allItemsFirst = true;
                    $scope.$apply();
                    const panels = getPanels();
                    expect(panels.length).toBe(2);
                    expect(getPanelTitle(panels[0])).toBe(allItemsPanelTitle);
                    expect(getPanelTitle(panels[1])).toBe(selectedItemsPanelTitle);
                });
                it('should have panels ordered like [selected items, all items] with allItemsFirst set to false', function () {
                    $scope.allItemsFirst = false;
                    $scope.$apply();
                    const panels = getPanels();
                    expect(panels.length).toBe(2);
                    expect(getPanelTitle(panels[0])).toBe(selectedItemsPanelTitle);
                    expect(getPanelTitle(panels[1])).toBe(allItemsPanelTitle);
                });
            });

            describe('allItems panel', function() {
                it('should have order by supplied allItemsOrderBy option', function() {
                    expect(getAllItemsEntries()).toEqual([
                        expectedItemNames[1],
                        expectedItemNames[0],
                        expectedItemNames[2],
                    ]);
                });
            });

            describe('selectedItemsFooter', function() {
                it('should have footer content from transcluded element', function () {
                    listBuilderCtrl.addItem(allItems[0]);
                    $scope.$apply();
                    expect(getSelectedItemsPanel().querySelector('.panel-footer')!.textContent).toEqual('TestFooter');
                });
            });

            describe('selectedItems panel', function () {
                it('should have correct "no items selected"-warning, if selectedItems is empty', function() {
                    expect(selectedItems.length).toBe(0);
                    expect(listBuilderCtrl.selectedItems!.length).toBe(0);
                    const warningElement = getWarningElement();
                    expect(warningElement).not.toBeNull();
                    expect(warningElement!.textContent!.trim()).toEqual('No item(s) selected!');
                });

                it('should show "no items selected"-warning, only if selectedItems is empty', function () {
                    listBuilderCtrl.addItem(allItems[1]);
                    expect(selectedItems.length).toBe(1);
                    expect(listBuilderCtrl.selectedItems!.length).toBe(1);
                    $scope.$apply();
                    expect(getWarningElement()).toBeNull();
                    listBuilderCtrl.addItem(allItems[0]);
                    expect(listBuilderCtrl.selectedItems!.length).toBe(2);
                    $scope.$apply();
                    expect(getWarningElement()).toBeNull();
                    listBuilderCtrl.removeItemAt(0);
                    $scope.$apply();
                    expect(getWarningElement()).toBeNull();
                    listBuilderCtrl.removeItemAt(0);
                    $scope.$apply();
                    expect(getWarningElement()).not.toBeNull();
                });

                it('should have order by adding sequence', function() {
                    listBuilderCtrl.addItem(allItems[2]);
                    listBuilderCtrl.addItem(allItems[1]);
                    listBuilderCtrl.addItem(allItems[0]);
                    listBuilderCtrl.addItem(allItems[1]);
                    listBuilderCtrl.addItem(allItems[2]);
                    $scope.$apply();
                    expect(getSelectedItemsEntries()).toEqual([
                        '1. ' + expectedItemNames[2],
                        '2. ' + expectedItemNames[1],
                        '3. ' + expectedItemNames[0],
                        '4. ' + expectedItemNames[1],
                        '5. ' + expectedItemNames[2],
                    ]);
                });
            });
        });
    });
}
