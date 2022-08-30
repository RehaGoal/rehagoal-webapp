module rehagoal.lists {
    const moduleName = 'rehagoal.lists';

    export class ListBuilderComponentController<T> implements angular.IComponentController {
        selectedItemsTitle?: string;
        allItemsTitle?: string;
        noItemsSelectedWarning?: string;
        allItems?: T[];
        selectedItems?: T[];
        allItemsOrderBy?: string;
        allItemsFirst: boolean = false;
        onItemRemove?: (index: number) => boolean;
        onItemAdd?: (item: T) => boolean;

        constructor() {
        }

        public removeItemAt(index: number): boolean {
            if (!this.onItemRemove || this.onItemRemove(index)) {
                this.selectedItems && this.selectedItems.splice(index, 1);
                return true;
            }
            return false;
        }

        public addItem(item: T): boolean {
            if (!this.onItemAdd || this.onItemAdd(item)) {
                this.selectedItems && this.selectedItems.push(item);
                return true;
            }
            return false;
        }
    }

    angular.module(moduleName, []).component('listBuilder', {
        templateUrl: 'components/lists/listBuilder.html',
        controller: ListBuilderComponentController,
        bindings: {
            selectedItemsTitle: '@',
            allItemsTitle: '@',
            noItemsSelectedWarning: '@',
            allItems: '<',
            selectedItems: '=',
            allItemsOrderBy: '@',
            allItemsFirst: '<',
            onItemRemove: '<',
            onItemAdd: '<',
        },
        transclude: {
            'itemDisplay': 'itemDisplay',
            'selectedItemsFooter': '?selectedItemsFooter',
        }
    });
}
