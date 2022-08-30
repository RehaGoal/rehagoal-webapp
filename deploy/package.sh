#!/bin/bash

set -o errexit -o errtrace -o nounset

echo_error() {
	echo -e "\e[31m$@\e[0m"
}

echo_warning() {
    echo -e "\e[1;33m$@\e[0m"
}

convert_to_boolean() {
    local arg=${1,,}  # convert to lowercase
    if [[ $arg =~ ^[y1]|yes|true|enable$ ]]; then
        echo 1
    elif [[ $arg =~ ^[n0]|no|false|disable$ ]]; then
        echo 0
    else
        echo_error >&2 "Invalid value for boolean argument!"
        exit 1
    fi
}

function parse_arguments() {
    # -allow a command to fail with !’s side effect on errexit
    # -use return value from ${PIPESTATUS[0]}, because ! hosed $?
    ! getopt --test > /dev/null
    if [[ ${PIPESTATUS[0]} -ne 4 ]]; then
        echo_error >&2 '`getopt --test` did not return 4.'
        exit 1
    fi

    OPTIONS=
    LONGOPTS=cordova:,electron:,web:,only-cordova,only-electron,only-web,allow-dirty

    # -regarding ! and PIPESTATUS see above
    # -temporarily store output to be able to check for errors
    # -activate quoting/enhanced mode (e.g. by writing out “--options”)
    # -pass arguments only via   -- "$@"   to separate them correctly
    ! PARSED=$(getopt --options=$OPTIONS --longoptions=$LONGOPTS --name "$0" -- "$@")
    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
        # e.g. return value is 1
        #  then getopt has complained about wrong arguments to stdout
        exit 2
    fi
    # read getopt’s output this way to handle the quoting right:
    eval set -- "$PARSED"



    while true; do
        case "$1" in
            --cordova)
                BUILD_CORDOVA=$(convert_to_boolean "$2")
                shift 2
                ;;
            --electron)
                BUILD_ELECTRON=$(convert_to_boolean "$2")
                shift 2
                ;;
            --web)
                BUILD_WEB=$(convert_to_boolean "$2")
                shift 2
                ;;
            --only-cordova)
                BUILD_CORDOVA=1
                BUILD_ELECTRON=0
                BUILD_WEB=0
                shift
                ;;
            --only-electron)
                BUILD_CORDOVA=0
                BUILD_ELECTRON=1
                BUILD_WEB=0
                shift
                ;;
            --only-web)
                BUILD_CORDOVA=0
                BUILD_ELECTRON=0
                BUILD_WEB=1
                shift
                ;;
            --allow-dirty)
                ALLOW_DIRTY=1
                shift
                ;;
            --)
                shift
                break
                ;;
            *)
                echo "Programming error (options parsing)"
                exit 3
                ;;
        esac
    done
}


BUILD_ELECTRON=1
BUILD_CORDOVA=1
BUILD_WEB=1
ALLOW_DIRTY=0

parse_arguments "$@";

echo "Parsed options: BUILD_ELECTRON=$BUILD_ELECTRON BUILD_CORDOVA=$BUILD_CORDOVA BUILD_WEB=$BUILD_WEB ALLOW_DIRTY=$ALLOW_DIRTY"

set -o xtrace
if [ "$BUILD_ELECTRON" -eq "0" ] && [ "$BUILD_CORDOVA" -eq "0" ] &&  [ "$BUILD_WEB" -eq "0" ]; then
    echo_warning >&2 "No packages for building specified. Exiting."
    exit 0
fi

IS_DIRTY=0
ABS_BUILD_PATH=$(pwd)
WEB_APP_DIRNAME="rehagoal-webapp"
BUILD_PATH="build"
VERSION_FILE="www/version.ts"
WEB_BUILD_PATH="$BUILD_PATH/rehagoal-web"
ELECTRON_BUILD_PATH="$BUILD_PATH/electron"
ELECTRON_BUILD_TMP_PATH="$BUILD_PATH/electron-tmp"
CORDOVA_ANDROID_VERSION=9.0
VERSION=$(git rev-parse --short=8 HEAD)
ZIP_DIR=$PWD

if [ -z ${CI_PIPELINE_IID+x} ];
  then CORDOVA_VERSION_CODE=0;
  else CORDOVA_VERSION_CODE=$CI_PIPELINE_IID;
fi
if [ -z ${CI_BUILD_REF_NAME+x} ];
	then BRANCH=$(git rev-parse --abbrev-ref HEAD);
	else
	    BRANCH="$CI_BUILD_REF_NAME";
fi

if [ -n "$(git status --porcelain)" ]; then
  IS_DIRTY=1
  if [ "$ALLOW_DIRTY" -eq "1" ]; then
    echo_warning >&2 "WARNING: there are changes in the current git repository. Version will be marked as dirty.";
    VERSION="${VERSION}-dirty"
  else
    echo_error >&2 "ERROR: there are changes in the current git repository";
    git status --porcelain
    git diff
    exit 1
  fi
fi

WEB_DEST_ZIP="rehagoal-web-$BRANCH-$VERSION.zip"
ELECTRON_DEST_ZIP_POSTFIX="-electron-$BRANCH-$VERSION.zip"

compileVersionInfo(){
    sourceDir="$1"
    sed 's#www/\*\*/\*.ts#www/version.ts#' $ABS_BUILD_PATH/../tsconfig.json > "${sourceDir}/tsconfig_version.json"
    npm run -- tsc --project "${sourceDir}/tsconfig_version.json"
    rm "${sourceDir}/tsconfig_version.json"
}
# register reset call for version.ts if anything goes wrong / finishes
revertVersionInfo(){
    git checkout -- "$ABS_BUILD_PATH/../$VERSION_FILE"
    npm run tsc
}

trap revertVersionInfo SIGTERM SIGINT ERR EXIT

sed -i 's/gitCommit:\s*"[^"]*"/gitCommit: "'$VERSION'"/g' "$ABS_BUILD_PATH/../$VERSION_FILE"
sed -i 's/gitBranch:\s*"[^"]*"/gitBranch: "'$BRANCH'"/g' "$ABS_BUILD_PATH/../$VERSION_FILE"
compileVersionInfo $ABS_BUILD_PATH/../

echo "Preparing web..."
mkdir -p $WEB_BUILD_PATH/
cp -R -- ../www/* $WEB_BUILD_PATH/
# We don't need google-closure-library (also it is quite big)
rm -R -- $WEB_BUILD_PATH/bower_components/google-closure-library
# We don't need google-blockly sources (subdirectories; also it is quite big)
find -- $WEB_BUILD_PATH/bower_components/google-blockly/*/ -maxdepth 0 -type d | egrep -v 'msg|media' | xargs rm -R

if [ "$BUILD_ELECTRON" -eq "1" ]; then
    echo "Building electron..."
    mkdir -p $ELECTRON_BUILD_PATH
    mkdir -p $ELECTRON_BUILD_TMP_PATH/www/
    cp -R -- $WEB_BUILD_PATH/* $ELECTRON_BUILD_TMP_PATH/www/
    cp -R -- ../electron_main.js ../package.json ../node_modules $ELECTRON_BUILD_TMP_PATH/
    sed -i 's/platform:\s*"[^"]*"/platform: "ELECTRON"/g' $ELECTRON_BUILD_TMP_PATH/$VERSION_FILE
    compileVersionInfo $ABS_BUILD_PATH/$ELECTRON_BUILD_TMP_PATH
    pushd $ELECTRON_BUILD_TMP_PATH
    npm run electron-packager -- . --platform=linux,win32 --arch=x64 --overwrite=true --out ../electron --ignore=electron-packager
    popd
fi

if [ "$BUILD_CORDOVA" -eq "1" ]; then
    echo "Removing old APKs..."
    rm *.apk 2> /dev/null || true
    echo "Building Android Debug APK..."
    CORDOVA_PLATFORM="Cordova $(cordova --version); cordova-android ${CORDOVA_ANDROID_VERSION}"
    sed -i "s/platform:\s*\"[^\"]*\"/platform: \"${CORDOVA_PLATFORM}\"/g" "$ABS_BUILD_PATH/../$VERSION_FILE"
    compileVersionInfo $ABS_BUILD_PATH/../
    echo "Cordova version: $(cordova --version)"
    echo "APK versionCode: $CORDOVA_VERSION_CODE"
    cordova platform add android@${CORDOVA_ANDROID_VERSION} || true
    cordova prepare
    # build android debug apk
    cordova build android -- --versionCode="$CORDOVA_VERSION_CODE"
    cp ../platforms/android/app/build/outputs/apk/debug/app-debug.apk .
    rename "s/app-debug\.apk/rehagoal-android-debug-$BRANCH-$VERSION.apk/" app-debug.apk
fi

if [ "$BUILD_WEB" -eq "1" ]; then
    echo "Removing old web package..."
    rm $WEB_DEST_ZIP 2>/dev/null || true
    echo "Packaging web..."
    pushd $WEB_BUILD_PATH/
    zip -r $ZIP_DIR/$WEB_DEST_ZIP *
    popd
fi
if [ "$BUILD_ELECTRON" -eq "1" ]; then
    echo "Packaging electron..."
    mkdir -p electron
    pushd $BUILD_PATH
    find electron/ -name 'rehagoal-webapp-*' -maxdepth 1 -mindepth 1 -type d -exec zip -r $ZIP_DIR/{}$ELECTRON_DEST_ZIP_POSTFIX {} \;
    popd
fi

rm -R $BUILD_PATH
