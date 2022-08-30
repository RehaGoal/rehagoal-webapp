#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

if(fs.existsSync(path.resolve(__dirname, '../../platforms/android'))) {
    fs.createReadStream(path.resolve(__dirname, '../../build-extras.gradle'))
        .pipe(
            fs.createWriteStream(
                path.resolve(__dirname, '../../platforms/android/build-extras.gradle')
            )
        );
}