module rehagoal.database {
    const moduleName = 'rehagoal.database';

    export type DexieFactory = <T extends dexie.Dexie>(...args: ConstructorParameters<typeof dexie.Dexie>) => T;

    angular.module(moduleName, ['rehagoal.settings'])
        .factory('dexieFactory', ['$window', function ($window: angular.IWindowService): DexieFactory {
            return function <T extends dexie.Dexie> (...args: ConstructorParameters<typeof dexie.Dexie>): T {
                return new $window.Dexie(...args) as T;
            }
        }]);
}
