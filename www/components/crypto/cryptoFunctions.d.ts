declare module rehagoal.crypto {
    function pbkdf2Compute(args: rehagoal.crypto.pbkdf2Args): Promise<string>;
}
