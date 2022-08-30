declare module mespeak {

    export interface MeSpeakOptions {
        /**
         * How loud the voice will be (default: 100)
         */
        amplitude?: number,
        /**
         * The voice pitch (default: 50)
         */
        pitch?: number,
        /**
         * The speed at which to talk (words per minute) (default: 175)
         */
        speed?: number,
        /**
         * Which voice to use (default: last voice loaded or defaultVoice, see below)
         */
        voice?: MeSpeakVoice,
        /**
         * Additional gap between words in 10 ms units (default: 0)
         */
        wordgap?: number,
        /**
         * One of the variants to be found in the eSpeak-directory "~/espeak-data/voices/!v"
         * Variants add some effects to the normally plain voice, e.g. notably a female tone.
         * Valid values are: "f1", "f2", "f3", "f4", "f5" for female voices
         *                   "m1", "m2", "m3", "m4", "m5", "m6, "m7" for male voices
         *                   "croak", "klatt", "klatt2", "klatt3", "whisper", "whisperf" for other effects.
         *                   (Using eSpeak, these would be appended to the "-v" option by "+" and the value.)
         * Note: Try "f2" or "f5" for a female voice.
         */
        variant?: MeSpeakVariant,
        /**
         * Line-break length, default value: 0.
         */
        linebreak?: number,
        /**
         * Indicate words which begin with capital letters.
         * 1: Use a click sound to indicate when a word starts with a capital letter, or double click if word is all capitals.
         * 2: Speak the word "capital" before a word which begins with a capital letter.
         * Other values: Increases the pitch for words which begin with a capital letter. The greater the value, the greater the increase in pitch. (eg.: 20)
         */
        capitals?: 1 | 2 | number,
        /**
         * Speaks the names of punctuation characters when they are encountered in the text.
         * If a string of characters is supplied, then only those listed punctuation characters are spoken, eg. { "punct": ".,;?" }.
         */
        punct?: boolean | string,
        /**
         * Removes the end-of-sentence pause which normally occurs at the end of the text.
         */
        nostop?: boolean,
        /**
         * Indicates that the input is UTF-16, default: UTF-8.
         */
        utf16?: boolean,
        /**
         * Indicates that the text contains SSML (Speech Synthesis Markup Language) tags or other XML tags.
         * (A small set of HTML is supported too.)
         */
        ssml?: boolean,
        /**
         * Volume relative to the global volume (number, 0..1, default: 1) Note: the relative volume has no effect on the export using option 'rawdata'.
         */
        volume?: MeSpeakVolume,
        /**
         * Do not play, return data only.
         * The type of the returned data is derived from the value (case-insensitive) of 'rawdata':
         *      - 'base64': returns a base64-encoded string.
         *      - 'mime': returns a base64-encoded data-url (including the MIME-header). (synonyms: 'data-url', 'data-uri', 'dataurl', 'datauri')
         *      - 'array': returns a plain Array object with uint 8 bit data.
         *      - default (any other value): returns the generated wav-file as an ArrayBuffer (8-bit unsigned).
         *      Note: The value of 'rawdata' must evaluate to boolean 'true' in order to be recognized.
         */
        rawdata?: 'base64' | MeSpeakRawDataSpecifierMIME | 'array' | MeSpeakRawDataSpecifierArrayBuffer,
        /**
         * Logs the compiled eSpeak-command to the JS-console.
         */
        log?: boolean
    }

    interface IMeSpeakPart {
        text: string,
        options?: MeSpeakOptions
    }

    type MeSpeakRawDataSpecifierArrayBuffer = string
    type MeSpeakRawDataSpecifierMIME = 'mime' | 'data-url' | 'data-uri' | 'dataurl' | 'datauri';

    type MeSpeakVoice = "ca" | "cs" | "de" | "el" | "en/en" | "en/en-n" | "en/en-rp" | "en/en-sc" | "en/en-us" | "en/en-wm" | "eo" | "es" | "es-la" | "fi" | "fr" | "hu" | "it" | "kn" | "la" | "lv" | "nl" | "pl" | "pt" | "pt-pt" | "ro" | "sk" | "sv" | "tr" | "zh" | "zh-yue"
    type MeSpeakVariant = "f1" | "f2" | "f3" | "f4" | "f5" | "m1" | "m2" | "m3" | "m4" | "m5" | "m7" | "croak" | "klatt" | "klatt2" | "klatt3" | "whisper" | "whisperf"

    /**
     * base64-encoded string
     */
    type Base64String = string;
    /**
     * base64-encoded data-url (including the MIME-header)
     */
    type DataURL = string;
    /**
     * a 32bit integer ID greater than 0
     */
    type MeSpeakId = number;
    /**
     * a MeSpeakId or 0 on failure
     */
    type MeSpeakStatus = MeSpeakId | 0;
    /**
     * number in range 0..1
     */
    type MeSpeakVolume = number;
    type MeSpeakLoadVoiceErrorCode = 'network error' | 'data error' | 'file error'

    type MeSpeakSpeakCallback = (status: boolean) => any;
    type MeSpeakLoadVoiceCallback = (status: boolean, code: MeSpeakVoice | MeSpeakLoadVoiceErrorCode) => any;

    type MeSpeakRawData = Base64String | DataURL | Array<number> | ArrayBuffer;

    export interface IMeSpeak {
        loadConfig(path: string): void
        /**
         * Loads the specified voice file
         * @param filename: file to load e.g. 'fr.json'
         * @param userCallback: an optional callback-handler. The callback will receive two arguments:
         *        * a boolean flag for success
         *        * either the id of the voice, or a reason for errors ('network error', 'data error', 'file error')
         */
        loadVoice(filename: string, userCallback?: MeSpeakLoadVoiceCallback): void
        /**
         @param text: The string of text to be spoken. The text may contain line-breaks ("\n") and special characters.
                      Default text-encoding is UTF-8 (see the option "utf16" for other).
         @param options: (eSpeak command-options)
         @param callback: An optional callback function to be called after the sound output ended.
                          The callback will be called with a single boolean argument indicating success.
                          If the resulting sound is stopped by meSpeak.stop(), the success-flag will be set to false.
         @returns if called with option rawdata: a stream in the requested format (or null, if the required resources have not loaded yet).
                  default: a 32bit integer ID greater than 0 (or 0 on failure). The ID may be used to stop this sound by calling meSpeak.stop(<id>).
         */
        speak(text: string, options?: MeSpeakOptions, callback?: MeSpeakSpeakCallback): MeSpeakStatus | (MeSpeakRawData | null)
        /**
         * Returns whether the specified voice is loaded.
         * note: the default voice is always the the last voice loaded
         * @param voice: voice identifier
         * @returns true, if the voice is loaded else false
         */
        isVoiceLoaded(voice: MeSpeakVoice): boolean
        /**
         * Sets the default voice to the given voice.
         * note: the default voice is always the the last voice loaded
         * @param voice voice identifier
         */
        setDefaultVoice(voice: MeSpeakVoice): void
        /**
         * Returns the default voice.
         * note: the default voice is always the the last voice loaded
         * @returns voice identifier
         */
        getDefaultVoice(): MeSpeakVoice
        /**
         * Returns whether the config is loaded.
         * note: any calls to speak() will be deferred, if no valid config-data has been loaded yet.
         * @returns true, if the config is loaded else false
         */
        isConfigLoaded(): boolean
        /**
         * Sets a volume level (0 <= v <= 1).
         * * if called with a single argument, the method sets the global playback-volume, any sounds currently playing will be updated immediately with respect to their relative volume (if specified).
         * * if called with more than a single argument, the method will set and adjust the relative volume of the sound(s) with corresponding ID(s).
         * @param volume volume level (0 <= v <= 1)
         * @param idList list of sound ids to set the volume for
         */
        setVolume(volume: MeSpeakVolume, ...idList: MeSpeakId[]): MeSpeakVolume
        /**
         * Returns a volume level (0 <= v <= 1).
         * * if called without an argument, the method returns the global playback-volume.
         * * if called with an argument, the method will return the relative volume of the sound with the ID corresponding to the first argument.
         * if no sound with a corresponding ID is found, the method will return 'undefined'.
         * @param id sound id for which to return the relative volume
         */
        getVolume(id?: MeSpeakId): MeSpeakVolume | undefined
        /**
         * Returns whether the current browser can play wav files
         */
        canPlay(): boolean
        /**
         * Plays cached streams (any of the export formats)
         * @param stream: A stream in any of the formats returned by meSpeak.play() with the "rawdata"-option.
         * @param relativeVolume: (optional) Volume relative to the global volume (number, 0..1, default: 1)
         * @param callback: (optional) A callback function to be called after the sound output ended.
         *                             The callback will be called with a single boolean argument indicating success.
         *                             If the sound is stopped by meSpeak.stop(), the success-flag will be set to false.
         *                             (See also: meSpeak.speak().)
         * @returns A 32bit integer ID greater than 0 (or 0 on failure).
         *          The ID may be used to stop this sound by calling meSpeak.stop(<id>).
         */
        play(stream: MeSpeakRawData, relativeVolume?: MeSpeakVolume, callback?: MeSpeakSpeakCallback): MeSpeakStatus
        /**
         * Stops the sound(s) specified by the id-list.
         * If called without an argument, all sounds currently playing, processed, or queued are stopped.
         * Any callback(s) associated to the sound(s) will return false as the success-flag.
         * @param idList: Any number of IDs returned by a call to meSpeak.speak() or meSpeak.play().
         * @returns The number (integer) of sounds actually stopped.
         */
        stop(...idList: MeSpeakId[]): number;
        /**
         * Using meSpeak.speakMultipart() you may mix multiple parts into a single utterance.
         * he general form of meSpeak.speakMultipart() is analogous to meSpeak.speak(),
         * but with an array of objects (the parts to be spoken) as the first argument (rather than a single text).
         * @param parts: Parts of the speech. Must contain a single element (of type object) at least.
                         For any other options refer to meSpeak.speak().
         * @param options: Any options supplied as the second argument will be used as defaults for the individual parts.
         *                 (Same options provided with the individual parts will override these defaults.)
         * @param callback: Callback on success or failure
         * @returns like meSpeak.speak() — either an ID, or,
         *          if called with the "rawdata" option (in the general options / second argument),
         *          a stream-buffer representing the generated wav-file.
         */
        speakMultipart(parts: IMeSpeakPart[], options?: MeSpeakOptions, callback?: MeSpeakSpeakCallback): MeSpeakStatus | MeSpeakRawData
    }
}
