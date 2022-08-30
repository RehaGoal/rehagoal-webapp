interface IAngularWebStorageService {
    /** Boolean flag indicating that the client has support for some form of web storage or not. */
    isSupported: boolean,
    /**
     * Setter for the key/value web store.
     *
     * NOTE: This method will use local or session storage depending on the
     * client's support as well as the order set in the module constant
     * 'order'. If 'allEngines' is true (default is false) then the key/value
     * pair will be added to all available storage engines.
     *
     * @param {string} key Name to store the given value under.
     * @param {mixed} value The value to store.
     * @param {boolean} allEngines If true, add to all available engines, else
     *   only add to the first supported storage engine. Default is false.
     * @return {boolean} True on success, else false. If 'allEngines' is true
     *   then success is when the value was added to at least one storage engine.
     */
    set(key: string, value: any, allEngines?: boolean): boolean;
    /**
     * Getter for the key/value web store.
     *
     * NOTE: This method will use local or session storage depending on the
     * client's support as well as the order set in the module constant 'order'.
     * If 'allEngines' is false (default is true) then only the first supported
     * storage engine will be queried for the specified key/value, otherwise all
     * engines will be queried in turn until a non-null value is returned.
     *
     * @param {string} key Name of the value to retrieve.
     * @param {boolean} allEngines If false only the first supported storage
     *   engine will be queried for the given key/value pair, otherwise all
     *   engines will be queried in turn until a non-null value is found.
     *   Default is true.
     * @return {mixed} The value previously added under the specified key,
     *   else null.
     */
    get(key: string, allEngines?: boolean): any;
    /**
     * Check if a key exists.
     *
     * @param {string} key Name of the key to test.
     * @param {boolean} allEngines If false only the first supported storage
     *   engine will be queried for the given key, otherwise all engines will
     *   be queried in turn until a non-null value is found. Default is true.
     * @return {boolean} True if the key exists, else false.
     */
    has(key: string, allEngines?: boolean): boolean;
    /**
     * Return the name of the nth key in the key/value web store.
     *
     * @param {number} num An integer representing the number of the key to
     *   the return the name of.
     * @param {boolean} allEngines If false only the first supported storage
     *   engine will be queried for the given key, otherwise all engines will
     *   be queried in turn until a non-null value is found. Default is true.
     * @return {string|null} The name of the key if available or null otherwise.
     */
    key(index: number, allEngines?: boolean): string | null;

    /**
     * Returns an integer representing the number of items stored
     * in the key/value web store.
     *
     * @param {number} num An integer representing the number of the key to
     *   the return the name of.
     * @param {boolean} allEngines If false only the first supported storage
     *   engine will be queried for it’s length, otherwise all engines will
     *   be queried in turn until a non-zero value is found. Default is true.
     * @return {number} The number of items currently stored in
     *   the key/value web store.
     */
    length(num: number, allEngines?: boolean): number;
    /**
     * Remove a specified value from the key/value web store.
     *
     * NOTE: The method will use local or session storage depending on the
     * client's support as well as the order set in the module constant 'order'.
     * If 'allEngines' is true (the default) then the specified key/value pair
     * will be removed from all supported storage engines, otherwise only
     * the first supported storage engine will be used for the removal.
     *
     * @param {string} key Name of the value to remove.
     * @param {boolean} allEngines If true, remove from all available engines,
     *   else only remove from the first supported storage engine. Default is
     *   true.
     * @return {boolean} True on success, else false. If 'allEngines' is true
     *   then success is when the value was removed from at least one storage
     *   engine.
     */
    remove(key: string, allEngines?: boolean): boolean;
    /**
     * Remove all values in the key/value web store.
     *
     * If a prefix has been specified in the module constant 'prefix' then
     * only values with that specific prefix will be removed.
     *
     * NOTE: The method will use local or session storage depending on the
     * client's support as well as the order set in the module constant 'order'.
     * If 'allEngines' is true (the default) then the all key/value pairs
     * will be removed from all supported storage engines, otherwise only
     * the first supported storage engine will have its values removed.
     *
     * @param {boolean} allEngines If true, remove from all available engines,
     *   else only remove from the first supported storage engine. Default is
     *   true.
     * @return {boolean} True on success, else false. If 'allEngines' is true
     *   then success is when the all values was removed from at least one
     *   storage engine.
     */
    clear(allEngines?: boolean): boolean;
}
