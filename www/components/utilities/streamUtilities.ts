module rehagoal.utilities {
    const moduleName = 'rehagoal.utilities';
    export type streamToBlobType = typeof streamToBlob;

    /**
     * Converts a ReadableStream into a single Blob, by reading each chunk and creating a new Blob each time from the
     * previous Blob and the last read chunk. This tries to ensure that there is always enough memory, as Blobs may be
     * swapped to disk, if they get too large.
     * @param stream stream to convert to a Blob
     * @return Promise of a Blob created from the stream
     */
    async function streamToBlob(stream: ReadableStream<BlobPart>): Promise<Blob> {
        const reader = stream.getReader();

        let blob: Blob = new Blob();
        while (true) {
            const {done, value} = await reader.read();
            if (done || value === undefined) {
                break;
            }
            blob = new Blob([blob, value]);
        }
        return blob;
    }

    /**
     * Converts a given string to an Uint8Array using a TextEncoder.
     * @param str string to convert
     * @return Uint8Array generated from TextEncoder.encode
     */
    function stringToUint8Array(str: string): Uint8Array {
        return new TextEncoder().encode(str);
    }

    /**
     * Internal function used by jsonStringifyStreamed, which converts a given value into a JSON document in chunks by
     * using an async generator. Blobs are automatically converted to data URLs and nested objects/arrays are recursed
     * into. Values such as string, number are stringified using JSON.stringify, therefore these should be small enough
     * to fit in memory.
     * @param value value to convert to a JSON document
     * @param progressCallback function used for reporting progress (range 0..1)
     * @param seenObjects: optional weak set of objects which were already seen during property expansion (for checking
     * for cyclic references)
     * @return async generator of strings (AsyncGenerator<String>) containing chunks of the JSON document
     */
    async function* jsonStringifyStreamedInternalGenerator(value: any,
                                                           progressCallback: (progress: number) => void,
                                                           seenObjects?: WeakSet<any>)
        : AsyncGenerator<string> {
        if (!seenObjects) {
            seenObjects = new WeakSet<any>();
        }
        const totalLength = estimateJSONSize(value);
        let bytesLength = 0;
        progressCallback(0);

        function returnWithProgressUpdate(str: string) {
            bytesLength += str.length;
            if (bytesLength > totalLength) {
                console.error("Incorrect bytesLength", bytesLength, totalLength);
            }
            progressCallback(bytesLength / totalLength);
            return str;
        }

        if (typeof value === "object") {
            if (value instanceof Blob) {
                // FIXME: Assumes that single blob fits in memory
                yield returnWithProgressUpdate(`"${await readDataURLFromBlob(value)}"`);
            } else if (value === null) {
                yield returnWithProgressUpdate("null");
            } else if (value instanceof Array) {
                const array = value;
                yield returnWithProgressUpdate("[");
                for (let [i, element] of array.entries()) {
                    if (i > 0) {
                        yield returnWithProgressUpdate(",");
                    }
                    const innerGenerator = jsonStringifyStreamedInternalGenerator(element, () => {}, seenObjects);
                    for await (const innerChunk of innerGenerator) {
                        yield returnWithProgressUpdate(innerChunk);
                    }
                }
                yield returnWithProgressUpdate("]");
            } else {
                const object = value;
                yield returnWithProgressUpdate("{");
                const properties = Object.getOwnPropertyNames(object);
                for (const [i, key] of properties.entries()) {
                    if (i > 0) {
                        yield returnWithProgressUpdate(',');
                    }
                    const propertyValue = object[key];
                    yield returnWithProgressUpdate(`"${key}":`);
                    const innerGenerator = jsonStringifyStreamedInternalGenerator(propertyValue, () => {}, seenObjects);
                    for await (const innerChunk of innerGenerator) {
                        yield returnWithProgressUpdate(innerChunk);
                    }
                }
                yield returnWithProgressUpdate("}");
            }
        } else if (value === undefined) {
            // TODO: Maybe null is not correct, if value is undefined (different behaviour than JSON.stringify)?
            yield returnWithProgressUpdate("null");
        } else {
            yield JSON.stringify(value);
        }
    }

    /**
     * Estimates the length of the JSON representation of the given value.
     * @param value value whose JSON representation is of interest
     * @param seenObjects optional weak set of objects which were already seen during property expansion (for checking
     * for cyclic references)
     */
    export function estimateJSONSize(value: any, seenObjects?: WeakSet<any>): number {
        if (!seenObjects) {
            seenObjects = new WeakSet<any>();
        }
        if (typeof value === "string") {
            // may include escape characters, e.g. \"
            return JSON.stringify(value).length;
        } else if (typeof value === "undefined") {
            return 4; // null
        } else if (typeof value === "number") {
            return JSON.stringify(value).length;
        } else if (typeof value === "object") {
            if (value === null) {
                return 4; // null
            } else if (value instanceof Blob) {
                return 2 + calculateDataURLSize(value); // "" + dataUrlLength
            } else {
                // object with possible references
                if (seenObjects.has(value)) {
                    throw new TypeError('cyclic object value');
                }
                seenObjects.add(value);
                if (value instanceof Array) {
                    // Array
                    let size = 2; // []
                    for (const [i, entry] of value.entries()) {
                        if (i > 0) {
                            size += 1; // ,
                        }
                        size += estimateJSONSize(entry, seenObjects);
                    }
                    return size;
                } else {
                    // object
                    const obj = value;
                    let size = 2; // {}
                    const properties = Object.getOwnPropertyNames(obj);
                    for (const [i, key] of properties.entries()) {
                        if (i > 0) {
                            size += 1; // ,
                        }
                        size += 2 + key.length; // "" key.length
                        size += 1; // :
                        size += estimateJSONSize(obj[key], seenObjects);
                    }
                    return size;
                }
            }
        } else if (typeof value === "boolean") {
            return value ? 4 : 5; // true / false
        } else {
            throw new Error(`Encountered unsupported type: ${typeof value}.`);
        }
    }

    /**
     * Calculates the size of a data URL of a Blob in bytes. This is done without actually reading the while blob.
     * @param blob blob for which the data URL size should be calculated.
     * @return length of dataURL for the given blob in bytes
     */
    export function calculateDataURLSize(blob: Blob): number {
        let size = `data:${blob.type || 'application/octet-stream'};base64,`.length;
        size += calculateBase64Size(blob.size);
        return size;
    }

    /**
     * Calculates the length of a string when encoded in base64.
     * @param byteLength length of the original string in bytes
     * @return length of a base64 encoded representation of a bytes of length byteLength
     */
    export function calculateBase64Size(byteLength: number): number {
        return ((4 * byteLength / 3) + 3) & ~3;
    }

    export type jsonStringifyStreamedType = typeof jsonStringifyStreamed;

    /**
     * Converts the given value to a JSON stream. The stream can be either based on a push or pull source. Pull source
     * (default) is recommended, if supported, as it is more memory-efficient. The return value is a ReadableStream,
     * which contains a single JSON document based on the provided value. Blobs are automatically converted to data
     * URLs.
     * @param value value to convert to JSON
     * @param progressCallback optional callback for reporting progress (range 0..1)
     * @param pushSource whether the stream should be based on a push source (true) or a pull source (false, default)
     * @param minChunkSize minimum size of a chunk in the stream, which should be tried to provide. The chunk may be
     * larger, and the last chunk may also be smaller.
     * @return stream (with push source if pushSource is true, else pull source) containing a single JSON document
     */
    function jsonStringifyStreamed(value: any,
                                   progressCallback: (progress: number) => void = () => {
                                   },
                                   pushSource = false,
                                   minChunkSize = 4096): ReadableStream {
        let generator: AsyncGenerator<string>;
        if (minChunkSize <= 0) {
            throw new Error('minChunkSize should be > 0');
        }

        async function pump(controller: ReadableStreamDefaultController, continuePush = false): Promise<void> {
            // TODO: Remove logging
            let chunk = "";
            let generatorFinished = false;
            while (chunk.length < minChunkSize) {
                try {
                    const {value, done} = await generator.next();
                    if (done) {
                        generatorFinished = true;
                        break;
                    } else {
                        chunk += value;
                    }
                } catch (err) {
                    controller.error(err);
                    return;
                }
            }
            if (chunk.length > 0) {
                controller.enqueue(stringToUint8Array(chunk));
                if (continuePush && !generatorFinished) {
                    console.log("Push source requested. Continue pumping");
                    return await pump(controller, true);
                }
            }
            if (generatorFinished) {
                console.info("Closing JSON stream, as generator is done")
                controller.close();
            }
        }

        const dataSource: UnderlyingSource = {
            async start(controller: ReadableStreamDefaultController) {
                generator = jsonStringifyStreamedInternalGenerator(value, progressCallback);
                if (pushSource) {
                    await pump(controller, true);
                }
            },
            async pull(controller: ReadableStreamDefaultController) {
                console.log("Incoming pull: Pump once");
                return await pump(controller, false);
            },
        };
        if (pushSource) {
            delete dataSource.pull;
        }
        return new ReadableStream(dataSource);
    }

    export type readDataURLFromBlobType = typeof readDataURLFromBlob;
    /**
     * Converts a Blob to a data URL by reading the content using a FileReader.
     * @param blob Blob to read from
     * @return Promise of a data URL string
     */
    function readDataURLFromBlob(blob: Blob): Promise<string> {
        if (!blob) {
            return Promise.reject<string>("Empty Blob provided");
        }

        let reader: FileReader = new FileReader();
        let fileReaderPromise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                if (!angular.isString(reader.result)) {
                    return;
                }
                resolve(reader.result);
            };
            reader.onerror = (err) => {
                reject(reader.error);
            }
        });
        reader.readAsDataURL(blob);
        return fileReaderPromise.then((dataUri) => {
            return dataUri;
        }, (err) => {
            return Promise.reject<string>(err);
        });
    }

    angular.module(moduleName)
        .value('streamToBlob', streamToBlob)
        .value('jsonStringifyStreamed', jsonStringifyStreamed)
        .value('readDataURLFromBlob', readDataURLFromBlob)
}
