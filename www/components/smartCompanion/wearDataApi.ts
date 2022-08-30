module wearDataApi {



    /**
     * for documentation on how these functions are intended to function see:
     * https://developers.google.com/android/reference/com/google/android/gms/wearable/DataApi.html
     */

    /**
     * Filter type for getDataItems(GoogleApiClient, Uri, int), deleteDataItems(GoogleApiClient, Uri, int),
     * addListener(GoogleApiClient, DataListener, Uri, int): if this filter is set, the given URI will be
     * taken as a literal path, and the operation will apply to the matching item only.
     *
     * Constant Value: 0
     */
    export const FILTER_LITERAL = 0;
    export type FILTER_LITERAL = typeof FILTER_LITERAL;

    /**
     * Filter type for getDataItems(GoogleApiClient, Uri, int), deleteDataItems(GoogleApiClient, Uri, int),
     * addListener(GoogleApiClient, DataListener, Uri, int): if this filter is set, the given URI will be
     * taken as a path prefix, and the operation will apply to all matching items.
     *
     * Constant Value: 1
     */
    export const FILTER_PREFIX = 1;
    export type FILTER_PREFIX = typeof FILTER_PREFIX;

    /**
     * Indicates that the enclosing IDataEvent was triggered by a data item being added or changed.
     *
     * Constant Value: 1
     */
    export const TYPE_CHANGED = 1;
    export type TYPE_CHANGED = typeof TYPE_CHANGED;

    /**
     * Indicates that the enclosing IDataEvent was triggered by a data item being deleted.
     *
     * Constant Value: 2
     */
    export const TYPE_DELETED = 2;
    export type TYPE_DELETED = typeof TYPE_DELETED;

    /**
     * List of constant values for filter type definition
     */
    type FilterTypes = FILTER_LITERAL | FILTER_PREFIX;

    /**
     * List of constant values for data type definition
     */
    type DataTypes = TYPE_CHANGED | TYPE_DELETED;

    export interface IDataEvent {
        Uri: string;
        Type: DataTypes;
        Data: any;
    }

    export interface IWearDataApi {
        /**
         * Registers a listener to receive data item changed and deleted events.
         *
         * @param handler   A javascript callback that is invoked when there is a data event.
         *                  The callback value is an array of data events.
         */
        addListener(handler: (events: IDataEvent[]) => void): void;

        /**
         * Adds a DataItem to the Android Wear network. The updated item is synchronized across all
         * devices. When you put data items you do not specify the full URI including the host (only
         * the path), because the host is provided by the Android DataApi for the device putting the data.
         *
         * Note: calling this method multiple times with the same data will cause change events only once.
         *
         * @param path  The path of the data item
         * @param data  A javascript object. The object properties that can be translated from the object are:
         *              - Strings
         *              - Numbers
         *              - Boolean values
         *              - Nested javascript objects (following the above rules)
         *              - Arrays:
         *                  - containing only integers, or
         *                  - containing only strings, or
         *                  - containing only javascript objects (following the above rules)
         * @param success   Success callback function that is invoked when the put is complete.
         * @param error Error callback function, invoked when error occurs. [optional]
         */
        putDataItem(path: string, data: any, success?: () => void, error?: (error: any) => void): void;

        /**
         * Retrieves all data items matching the provided URI, from the Android Wear network.
         *
         * @param uri   The URI must contain a path. If uri is fully specified, at most one data item will
         *              be returned. If uri contains a wildcard host, multiple data items may be returned,
         *              since different nodes may create data items with the same path. See DataApi for
         *              details of the URI format.
         * @param filterType    Either WearDataItem.FILTER_LITERAL (0) or WearDataApi.FILTER_PREFIX (1).
         *                      The filterType parameter changes the interpretation of uri. For example, if
         *                      uri represents a path prefix, all items matching that prefix will be returned.
         * @param success   Success callback function that is invoked when the get is complete, with the data returned.
         */
        getDataItems(uri: string, filterType: FilterTypes, success?: (data: any) => void): void;

        /**
         * Removes all specified data items from the Android Wear network.
         *
         * @param uri   If uri is fully specified, this method will delete at most one data item. If uri contains a
         *              wildcard host, multiple data items may be deleted, since different nodes may create data
         *              items with the same path
         * @param filterType    Either WearDataItem.FILTER_LITERAL (0) or WearDataApi.FILTER_PREFIX (1). The filterType
         *                      parameter changes the interpretation of uri. For example, if uri represents a path prefix,
         *                      all items matching that prefix will be returned.
         * @param success   Success callback function that is invoked when the delete is complete, with the number of items deleted.
         * @param error     Error callback function, invoked when error occurs. [optional]
         */
        deleteDataItems(uri: string, filterType: FilterTypes, success?: (result: any) => void, error?: (error: any) => void): void;
    }
}
