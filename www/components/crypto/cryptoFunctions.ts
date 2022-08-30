module rehagoal.crypto {
    export async function pbkdf2Compute(args: rehagoal.crypto.pbkdf2Args): Promise<string> {
        let {input, salt, iterations, keySize} = args;
        const derivedKey = sjcl.misc.pbkdf2(input, salt, iterations, keySize);
        return sjcl.codec.hex.fromBits(derivedKey);
    }

    /**
     *  Generate 8 random words (1 word = 32 bits / 4 byte), and return them as a hex encoded string.
     */
    export function generateRandom256BitHexString(): string {
      const wordCount = 8;
      const randWords = sjcl.random.randomWords(wordCount);
      return sjcl.codec.hex.fromBits(randWords);
  }
}
