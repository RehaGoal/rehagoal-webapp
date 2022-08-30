# rehagoal-webapp

--------------------

RehaGoal is a cross-platform hybrid application for assisted execution of workflows (micro-prompting) by humans. It was developed in a research project with the aim of assisting people affected by an executive dysfunction. It is intended to be used integrated in a training concept (e.g. Goal Management Training with Errorless Learning) together with experts in the field such as job coaches or therapists.

The application allows therapists, job coaches and others to create custom workflows using a simplified block-based visual programming editor based on [Google Blockly][blockly].
These blocks support various functionalities, such as tasks, decisions (if-then-else), repetitions/loops, tasks in arbitrary order, reminders and waiting periods.
Additionally, images can be used in tasks for visualization purposes and a text-to-speech feature can help people with reading difficulties.
Workflows can be exchanged via a custom JSON-based file format, or via a sharing server using the [Private Link Pattern](https://privacypatterns.org/patterns/Private-link) and end-to-end encryption (see [`rehagoal-server`](https://github.com/RehaGoal/rehagoal-server) project).

Affected persons may then use the application to get step-by-step instructions and reminders on how to perform their activities of daily living, for which they need help.
Workflows can be scheduled in a sequence and/or at a future date/time with a reminder.

Note that the application is currently only available in German.

## Getting Started

To get you started you can simply clone the repository and install the dependencies:

### Prerequisites

You need git to clone the repository. You can get git from
https://git-scm.com/.

We also use a number of node.js tools to initialize and test rehagoal-webapp. You must have node.js and
its package manager (npm) installed.  You can get them from [https://nodejs.org/](http://nodejs.org/).

Furthermore, the following dependencies need to be installed (see also the GitHub workflows 
in [`.github/workflows`](.github/workflows)):

- Development & Testing
  - **bower**: Frontend dependencies (Required during `npm install`)
  - **JDK 8**: Selenium testing (Protractor E2E tests)
  - **graphicsmagick**: `protractor-screenshoter-plugin`, since `lwip2` build fails on recent node versions (Required during `npm install`)
  - **chromium-browser** or **google-chrome**: Unit tests and E2E tests
  - **Python** >= 3.6 with **pip**: Integration tests with `rehagoal-server`
- Additionally, for packaging:
  - **bash** (+ *common utilities*): Execution of [`deploy/package.sh`](deploy/package.sh)
  - **(un)zip**: Compression of packages 
  - **rename**: Renaming of files in [`deploy/package.sh`](deploy/package.sh)
  - Android build:
    - **gradle**
    - **cordova** = 9.0
    - **Android SDK Tools / Commandline Tools**
    - **Android Platform/Build-Tools etc.** (see GitHub workflows)
  - Electron build:
    - **wine64**: Win32 (x64) electron build


### Clone rehagoal-webapp

Clone the rehagoal-webapp repository using [git][git]:

```bash
# Over ssh with key-based authentication
git clone git@github.com:RehaGoal/rehagoal-webapp.git
# Over HTTPS
git clone https://github.com/RehaGoal/rehagoal-webapp.git
```

### Install Dependencies

We have two kinds of dependencies in this project: tools and frontend dependencies.  The tools help
us manage and test the application.

* We get the tools we depend upon via `npm`, the [node package manager][npm]. All are currently listed under
  in [`package.json`](package.json) under `devDependencies`.
* We get the frontend dependencies via `bower`, a [client-side code package manager][bower]. While bower is deprecated,
  existing packages can still be downloaded. Dependencies are listed in [`bower.json`](bower.json) under `dependencies`.

We have preconfigured `npm` to automatically run `bower` so we can simply do:

```bash
npm install
```

Behind the scenes this will also call `bower install`.  You should find that you have two new
folders in your project.

* [`node_modules`](node_modules) - contains the npm packages for the tools we need
* [`www/bower_components`](www/bower_components) - contains the frontend dependencies

*Note that the [`bower_components`](www/bower_components) folder would normally be installed in the root folder but
rehagoal-webapp changes this location through the [`.bowerrc`](.bowerrc) file.  Putting it in the [`www`](www) folder makes
it easier to serve the files by a webserver.*

For building the Android app, you also need to install the Android SDK and Apache Cordova.

### Run the Application

We have preconfigured the project with a simple development web server.  The simplest way to start
this server is:

```bash
npm start
```

Now browse to the app at [`http://localhost:8000/index.html`](http://localhost:8000/index.html).


## Testing

There are two kinds of tests in the rehagoal-webapp application: Unit tests and end-to-end (E2E) tests.

### Running Unit Tests

The rehagoal-webapp app comes preconfigured with unit tests. These are written in
[Jasmine][jasmine], which we run with the [Karma Test Runner][karma]. We provide a Karma
configuration file to run them.

* the configuration is found at [`karma.conf.js`](karma.conf.js)
* the unit tests are found next to the code they are testing and are named as `..._test.{ts|js}`.

The easiest way to run the unit tests is to use the supplied npm script:

```bash
npm test
```

This script will start the Karma test runner to execute the unit tests. Moreover, Karma will sit and
watch the source and test files for changes and then re-run the tests whenever any of them change.
This is the recommended strategy; if your unit tests are being run every time you save a file then
you receive instant feedback on any changes that break the expected code functionality.

You can also ask Karma to do a single run of the tests and then exit.  This is useful if you want to
check that a particular version of the code is operating as expected.  The project contains a
predefined script to do this:

```bash
npm run test-single-run
```

There are mainly two kinds of unit tests:
- Component (HTML) tests, which test interaction/functionality of elements in the DOM. These require the 
  `karma-ng-html2js-preprocessor` plugin (enabled by default), as well as the special AngularJS module 
  `rehagoalApp.templates` to be loaded when these tests are run.
- Classic unit tests, which test on a class or function level and do not require DOM elements to be present.

Both make use of Jasmine's Spy objects (https://jasmine.github.io/api/edge/Spy.html), i.e. mock objects.


### End-to-end (E2E) testing

The rehagoal-webapp app comes with end-to-end (E2E) tests, again written in [Jasmine][jasmine]. These tests
are run with the [Protractor][protractor] End-to-End test runner.  It uses native events and has
special features for AngularJS applications.
The idea of E2E tests is to ensure that the actions a user performs in the application achieve the correct responses.
Therefore, we try to mirror user interaction as close as reasonable, and we try to keep mocking of functionality to a
minimum, such that the application is as close as possible to the real deployed one.

* the configuration is found at [`e2e-tests/protractor.conf.js`](e2e-tests/protractor.conf.js)
* the end-to-end tests are found in [`e2e-tests/scenarios.js`](e2e-tests/scenarios.js)

Protractor simulates interaction with our web app and verifies that the application responds
correctly. Therefore, our web server needs to be serving up the application, so that Protractor
can interact with it:

```bash
npm start
```

In addition, since Protractor is built upon WebDriver we need to install this. The rehagoal-webapp
project comes with a predefined script to do this:

```bash
npm run update-webdriver
```

This will download and install the latest version of the stand-alone WebDriver tool.

Once you have ensured that the development web server hosting our application is up and running
and WebDriver is updated, you can run the end-to-end tests using the supplied npm script:

```bash
npm run protractor
```

This script will execute the end-to-end tests against the application being hosted on the
development server.

**Note:** Additionally, for integration tests with the rehagoal-server (REST API server) project, you need to set up 
and start a local instance of the server (otherwise these tests will fail).

Setup server:
```bash
pushd ci/rehagoal-server
# Delete old server database for a clean state
rm db.sqlite3 || true
# Install server requirements (only needed once)
pip3 install -r requirements.txt
# Setup the server/database
python3 manage.py generate_secret_key
python3 manage.py migrate
python3 manage.py shell < ../make_testuser.py
popd
```

Start server:
```bash
pushd ci/rehagoal-server
python3 manage.py runserver 127.0.0.1:8080 &
popd
```


## Serving the Application Files

While angular is client-side-only technology, and it's possible to create angular webapps that
don't require a backend server at all, we recommend serving the project files using a local
webserver during development to avoid issues with security restrictions (sandbox) in browsers. The
sandbox implementation varies between browsers, but quite often prevents things like cookies, xhr,
etc. to function properly when an html page is opened via `file://` scheme instead of `http://`.


### Running the App during Development

The rehagoal-webapp project comes preconfigured with a local development webserver.  It is a node.js
tool called [local-web-server][local-web-server].  You can start this webserver with `npm start` but you may choose to
install the tool globally:

```bash
sudo npm install -g local-web-server
```

Then you can start your own development web server to serve static files from a folder by
running:

```bash
ws --hostname localhost -p 8000
```

Alternatively, you can choose to configure your own webserver, such as Apache HTTP Server or nginx. Just
configure your server to serve the files under the `www/` directory.


### Running the App in Production (Web)

We recommend to use nginx as your webserver. Furthermore, you should properly set up headers and error pages.
For example, have a look at [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/).
Example configuration:
```nginx
# basic.conf
# don't send the nginx version number in error pages and Server header
server_tokens off;

# Prevent misinterpretation of MIME types
# https://www.owasp.org/index.php/List_of_useful_HTTP_headers
add_header X-Content-Type-Options nosniff;

# Deny including the site in a frame
# https://en.wikipedia.org/wiki/Clickjacking
add_header X-Frame-Options DENY;

# This header enables the Cross-site scripting (XSS) filter built into most recent web browsers.
# It's usually enabled by default anyway, so the role of this header is to re-enable the filter for 
# this particular website if it was disabled by the user.
# https://www.owasp.org/index.php/List_of_useful_HTTP_headers
add_header X-XSS-Protection "1; mode=block";

# with Content Security Policy (CSP) enabled(and a browser that supports it (https://caniuse.com/#feat=contentsecuritypolicy),
# you can tell the browser that it can only download content from the domains you explicitly allow
# https://www.owasp.org/index.php/Content_Security_Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'none'; object-src 'none'";

# ssl.conf
# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
# ...
```

You should ensure that your TLS configuration is currently considered secure. We recommend to periodically validate it 
using an external tool,  for example [testssl][testssl], or [ssllabs.com](https://www.ssllabs.com/ssltest/) 
(A+ grade is recommended). 
This also helps to detect if your certificate is about to expire, so that you can take countermeasures early on.
For example, have a look at:
- https://syslink.pl/cipherlist/
- https://ssl-config.mozilla.org/

It is also recommended, to deploy the API server on a different domain/origin.

**Note** that the above information **may be outdated** when you read it, therefore you should do your own research and know
what you are doing. 
**You are responsible** for running a secure service, including regular updates/patches of the software you are
running, secure configuration, (privacy-preserving) monitoring, incident response etc..


## Configuration

### Text-to-Speech (TTS)
The application supports text-to-speech (TTS) via different providers:
- Cordova/Android-native TTS via `cordova-plugin-tts`: This is the default when deployed via Cordova to Android devices.
  For privacy reasons and functionality without Internet access, we recommend to use a local TTS, e.g. download the 
  voice files for your language beforehand.
- Web Speech API: Web browsers might support TTS out of the box. However, they might use a cloud TTS. RehaGoal therefore
  validates the `localService` flag and skips voices that are not available locally, to avoid leaks to third parties.
- [meSpeak.js][mespeak] is a fully client-side JavaScript TTS, which was translated from C++ to JavaScript using Emscripten.
  As meSpeak is based on eSpeak, it is also released under GPLv3. This license is more restrictive compared to our license, 
  therefore we do not include it in this release. rehagoal-webapp provides a default implementation for use with MeSpeak v1.9.7.1, 
  without providing it. You might want to add it again to your version of this application, which would then also need
  to be released under GPLv3.
  TTS using meSpeak can be added by providing the following files within their corresponding folders:
  - `mespeak.min.js`: `www/components/tts/mespeak/mespeak.min.js`
  - `mespeak_config.json`: `www/components/tts/mespeak/mespeak_config.json`
  - `voices/` and relevant voice files: `www/components/tts/mespeak/voices/`

  Enabling TTS within rehagoal-webapp (settings) without providing these files or having support for a different TTS
  will queue all TTS requests until meSpeak has been loaded. Note that this could potentially lead to an issue, 
  if to many requests are queued. 
  Using TTS without providing meSpeak on a browser has not been validated extensively.

### rehagoal-server

- The `rehagoal-server` that should be used needs to be configured in [`restClient.config.ts`](www/components/restClient/restClient.config.ts).
- Additionally, for Cordova/Android you need to adjust the [`config.xml`](config.xml):
  - The access whitelist (`<access origin...>`) 
  - The intent filter (`<data android:host...>`)
  - see the TODO comments.
- Afterwards you need to build the application. You might also want to adjust the relevant testcases (which test the 
  URLs configured in `restClient.config.ts`).

### File Export on Android

For file export on Android, files are automatically saved to the external root directory using Cordova (different to export on other platforms) in `download.service.ts`.

Currently, we set the `android:requestLegacyExternalStorage` flag to `true` in the `AndroidManifest.xml`  (`config.xml` in Cordova).
This property is only respected if the target API level is 29 (See https://developer.android.com/reference/android/R.attr#requestLegacyExternalStorage).
It allows to use the `cordova.file.externalRootDirectory`, to which access is otherwise blocked due to the Scoped storage enforcement in Android 11 and later.
This is only a temporary workaround, but for now it allows to still store files in the external storage root directory. Otherwise with e.g. `cordova.file.externalDataDirectory`, files would be stored to the `Android/data/<org.your.packagename>/` directory, which is comparatively hard to find for users (usability). Using the alternative directory might also require changes such as a share action to share the file with other apps directly.
Another option could be to use the `MediaStore` API, e.g. `MediaStore.Downloads`, however this has not been implemented yet.
For targeting more recent API levels, this would need to be changed.

## Platforms and Packaging

The `rehagoal-webapp` is a cross-platform/hybrid web application. As such, modern web browsers should be supported, 
though we target **Firefox** and **Chrom{e|ium}**.
Desktop platforms (**Windows** and **Linux**) are also targeted via Electron. MacOS could be supported through Electron as well but was not tested.
Via Apache Cordova, it can be deployed on **Android** devices with better integration with the native platform features.
Devices running iOS would need additional changes for compatibility in the Cordova plugins and was not tested.

The [`deploy/package.sh`](deploy/package.sh) script can be used to build deployable packages for the targeted platforms.
```bash
$ bash ./package.sh [--allow-dirty] [[--cordova <bool>] [--electron <bool>] [--web <bool>]|--only-cordova|--only-electron|--only-web]

--cordova <bool>      Enable/Disable build of Cordova/Android package (apk)
--electron <bool>     Enable/Disable build of Electron packages for Linux & Windows (zip)
--web <bool>          Enable/Dsiable build of Web package (zip)
--only-cordova        Only build Cordova/Android package (apk)
--only-electron       Only build Electron packages for Linux & Windows (zip)
--only-web            Only build Web package (zip)
--allow-dirty         Allow git repository with uncommited changes, and add "-dirty" suffix to version string

where <bool> matches (case insensitive): ^([y1]|yes|true|enable)$|^([n0]|no|false|disable)$
```

The script also rewrites the [`version.ts`](www/version.ts) file, in order to reflect information about the platform,
git commit and git branch, which is shown the application on the `#!/settings` page.

Note that currently the packaged builds are typically *debug* builds. It is recommended to change them to *release* builds.
For example, for cordova you could add the `--release` flag in the `cordova build` command (see [`package.sh`](deploy/package.sh)).

You should cryptographically sign your builds before releasing them. The Android app is by default signed with a 
temporary debug key, and should be re-signed with a production key before releasing. Note that this is especially relevant
for communication with the `rehagoal-smartwatch` app (see requirements of Wear OS apps). Signing your builds also allows
to verify that the application has not been tampered with after your build.
We recommend that you sign both your Cordova/Android and Electron apps.

The Cordova application can be signed with:

```bash
$ANDROID_HOME/build-tools/28.0.3/zipalign -v -p 4 "deploy/$APK_NAME" app-1.apk
$ANDROID_HOME/build-tools/28.0.3/zipalign -v -p 4 app-1.apk app-2.apk
rm -f app-1.apk && mv -f app-2.apk "deploy/$APK_NAME"
$ANDROID_HOME/build-tools/28.0.3/apksigner sign --ks $ANDROID_KEYSTORE_FILE --ks-key-alias $ANDROID_KEY_ALIAS --ks-pass pass:$ANDROID_KEYSTORE_PASSWORD --key-pass pass:$ANDROID_KEY_PASSWORD "deploy/$APK_NAME"
```

or create a signed release build with (see also https://cordova.apache.org/docs/en/9.x/reference/cordova-cli/):
```bash
cordova build android --release -- --keystore=$ANDROID_KEYSTORE_FILE --storePassword=$ANDROID_KEYSTORE_PASSWORD --alias=$ANDROID_KEY_ALIAS
```


## Continuous Integration

### GitHub Workflows CI
The project uses GitHub Workflows to automate testing and packaging.
This is configured in the [`.github/workflows`](.github/workflows).
There are two workflows:
- [`tests.yml`](.github/workflows/tests.yml): Runs unit (karma) and E2E (protractor) tests with code coverage and provides
  reports as artifacts.
- [`package.yml`](.github/workflows/package.yml): Creates (debug) builds of the application for Windows/Linux/Android/Web 
  using the [`deploy/package.sh`](deploy/package.sh).
  - **Web** package (zip file with content for a web deployment)
  - **Electron** packages (Native packages with integrated browser for different OSs)
  - **Android** APKs for smartphones/tablets

## Privacy & Security
This project was developed in a Privacy by Design process.

In general, all functionality of the application can be used without Internet access, if it is deployed only locally,
for example as an Android or Electron app, or via a local web server.
This also means that you do not need an account to use the application and all data is stored on your device by default.

We followed the principle of data minimization, therefore the app only processes a minimal amount of data that you provide.
This includes the workflows that you create, including images you store in the application, and your settings.
By default, these are only stored on your device. This means that data in the app belongs to you, and you can delete it 
e.g. simply by uninstalling the app.

The app is preconfigured, such that no resources are loaded from third parties, i.e. everything is provided by the app
or webserver which serves it. This also means that in this open source release there should be no tracking, advertising,
or analytics (see also [study mode](#study-mode)).

### Privacy policy

You need to add your privacy policy/data protection policy in your user-facing application.
We recommend to provide an easy-to-read version in addition to a legally binding version.
You are responsible for being compliant with the GDPR and implementing appropriate processes and measures.

### General risk of smart devices
There is a general risk associated with the use of smart or connected devices. Typically, there are a lot of applications
installed, which could potentially track you during your activities. Additionally, there is always a certain risk due to
potential security vulnerabilities which have not been discovered or patched yet on your device. A device such as a 
smartphone contains a lot of sensors (e.g. camera, microphone, accelerometer, compass, GPS, ...) and often also a lot
of your personal information. This should therefore be kept in mind when using these devices.

### Text-to-speech (TTS)
We recommend to use an offline text-to-speech engine, to prevent leaking the steps in a workflow at the time the user is
doing them to third parties. On Android you should be able to download the voice files e.g. for Google TTS, which should
allow it to be used offline.

### Workflows and images
Keep in mind, that you might want to share workflows with others. Therefore, we recommend that you only create workflows
that do not contain personally identifiable information, including information contained in images, addresses or other
information in task descriptions and so on.

### Workflow sharing
Workflows can be imported/exported in the app from/to a file. This file can then be shared with others via your preferred
communication channel. Please note, that these exported files are not encrypted, so we recommend to share them e.g. via
secure end-to-end encrypted messengers, or to save them only on devices that you own (e.g. a USB flash drive).

An alternative is to use the `rehagoal-server` to share workflows. The `import from server`/`export to server` buttons
can be used to upload selected workflows to a configured server. Workflows shared in this way are stored end-to-end
encrypted on the server. This means that even the server provider cannot read your uploaded workflows. When you upload them, 
you will be shown a QR code and a URL (link). These contain the encryption key that can be used to decrypt the file
locally on your device. Since the encryption key is in the *fragment* part of the URL 
(everything after the hash (`#`) character), it will not be sent to the server if you visit the URL. Everyone with access
to either the full link or QR code will be able to download and decrypt the workflows (including images) you uploaded.
Therefore, this information should only be shared with people who you trust and who should have access to the workflows.
Workflows are encrypted symmetrically via [OpenPGP.js][openpgpjs], which uses AES-256 in (a variant of) CFB mode by default.
OpenPGP.js also supports authenticated encryption, which can be activated via `openpgp.config.aeadProtect = true`, see also
[OpenPGP,js README](https://github.com/openpgpjs/openpgpjs/blob/main/README.md). OpenPGP.js also uses 
Modification Detection Codes (MDCs) to detect (partial) tampering with the encrypted file. 

### Study mode
For use in intervention studies, there is a special *study mode*. This mode should not be used otherwise and requires
Informed Consent by the user. If this mode is active (as shown in settings), the application can record
privacy-preserving metrics (the preconfigured ones). These can then be exported to a file in an encrypted fashion for 
a study provider (asymmetric encryption using [OpenPGP.js][openpgpjs]).
With the open source released app it should not be possible to enter this mode by accident (you need to enter a password)
and the application needs to be build with preconfigured studies. Of course the application's code can always be
modified to activate study mode without you noticing, but so can other tracking be added to the app. Therefore, you should
trust the people who develop/deploy/provide the application, or build it yourself from the source code.

### Supported platforms
RehaGoal supports to be used fully offline, which is also the intended way of assisted workflow execution.
Limiting network communication during use reduces the risk of metadata leaks, as well as potential vulnerabilities.

Web applications served via a web server in general require a slightly different trust model, compared to natively 
installed applications. This is because the server needs to be trusted, as in principle every time a resource (e.g.
script) is requested, it could be replaced with a different version by the server. On the one hand, this is an advantage
of cloud services, since the software can be updated for all users without reconfiguration on their side. On the other
hand, the server operator can provide different software for every request or user. The responses need to be trusted, and
it is difficult to audit the provided scripts.
In comparison, for example an Android application needs to be cryptographically signed by the developer and is only
updated sometimes (but usually automatically) and if so for all users. Auditing of the source code or binary can thus be
done for the shared code for all users at a certain point in time. Updates of the application can also be noticed and 
possibly even prevented/reverted.

Packaged applications (Cordova/Electron) may be less affected by some XSS attack vectors, for
example these applications do not accept arbitrary links to be entered into the address bar. However, care still needs to
be taken, as the there is a higher impact if an XSS vulnerability can be exploited (access to native APIs).
Cordova/Android apps register an `intent-filter` for receiving intents that refer to shared workflows on the `rehagoal-server`.
This is a potential source of malicious input and is therefore validated in the application. Particularly, only the identifier
and encryption key are effectively used, while the origin is validated, but the embedded URL pattern is used instead.

See also
- [Cordova Security](https://cordova.apache.org/docs/en/9.x/guide/appdev/security/).

Regarding Electron apps, you should regularly update/rebuild/deploy the application, regardless of development of the 
webapp, since Electron basically ships a full web browser engine. Web browsers regularly receive security patches, 
therefore you should pass these on to the user with your deployed applications.
Furthermore, you may want to improve the security of Electron apps further, e.g. by applying a CSP and using a custom
file protocol to prevent access to files outside the scope the application 
(see e.g. [Reasonably Secure Electron](https://github.com/moloch--/reasonably-secure-electron#origin-security)). Make sure
to write a safe protocol handler, to prevent path traversal attacks.

See also
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security/)
- [Reasonably Secure Electron](https://github.com/moloch--/reasonably-secure-electron)




### AngularJS End-of-life
rehagoal-webapp was developed based on the AngularJS framework. Unfortunately, the official support for AngularJS has
ended as of January 2022 (https://docs.angularjs.org/misc/version-support-status).  You may want to acquire [extended long term support](https://docs.angularjs.org/misc/version-support-status).
Otherwise, there is a certain risk that there are vulnerabilities in the AngularJS framework which could affect the security
of the RehaGoal app. Furthermore, bugs will likely not be patched. For long-term use we recommend to switch to a more modern framework including updating all the dependencies.
At the time of writing, there are at least two known security vulnerabilities reported for AngularJS, which likely won't 
be patched:
- [CVE-2022-25869](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2022-25869): All versions of package angular are 
  vulnerable to Cross-site Scripting (XSS) due to insecure page caching in the Internet Explorer browser, which allows
  interpolation of `<textarea>` elements.
  - We don't think that this issue is critical for our application, as Internet Explorer is not supported by this 
    application anyway.
- [CVE-2022-25844](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-25844): The package angular after 1.7.0 are 
  vulnerable to Regular Expression Denial of Service (ReDoS) by providing a custom locale rule that makes it possible to
  assign the parameter in posPre: ' '.repeat() of NUMBER_FORMATS.PATTERNS. posPre with a very high value.
  - First, this is a denial of service (DoS) attack, therefore it can affect availability of the application, but is not
    a privacy issue per se. Second, if interpreted correctly, we think this issue is only relevant if the locale 
    configuration is changed, which only seems to be possible by changing the source code of the application.

It is however still possible that there are undisclosed vulnerabilities that may have a larger impact.




## Directory Layout

```
www/                    --> all of the source files for the application
  components/           --> all app specific modules
    authentication/       --> Authentication with the server component (workflow sharing)
      auth.module.ts          --> Authentication module
      auth.service.ts         --> Authentication service, managing the login state
    blockly/              --> angular wrapper for Blockly
      blockly.d.ts            --> TypeScript definitions for the blockly interface
      blockly.directive.js    --> Blockly directive for injecting blockly into the DOM
      blockly.module.js       --> Blockly module
      blockly.service.js      --> Blockly service for accessing window.Blockly as angular service
      blockly.template.html   --> Template for the blockly directive
      blocklyImage.service.ts --> Allows to capture images (SVGs) of connected blockly blocks - used for clipboard preview.
      ngBlockly.provider.js   --> Options provider for blockly (blockly configuration)
    blocklyConfig/        --> blockly configuration specific for the rehagoal-webapp project
      blockly.config.js          --> Configuration of Blockly toolbox and options
      blockly.config_test.js     --> Tests for the Blockly configuration
      blockly.config.serice.ts   --> Keeps track of blockly block IDs in the root goal block and available images.
      blockly-blocks.run.js      --> Definition of the Blockly blocks and block code generators
      blockly-blocks.run_test.js --> Tests of the Blockly blocks / code generator definitions
      blocklyConfig.module.js    --> BlocklyConfig module
    calendar/             --> Allows to schedule (a sequence of) workflows at a certain date/time.
      calendar.module.ts                --> Calendar module
      calendar.service.ts               --> Manages the list of planned calendar events and missed ones, and schedules their timers
      calendarEventHandler.component.ts --> View component for notifying about upcoming (start, cancel, postpone) and missed calendar events
      calendarEventHandler.css          --> Styles related to CalendarEventHandler
      calendarEventHandler.html         --> Overlay for upcoming calendar events
      calendarScheduler.service.ts      --> Schedules timers/alarms for triggering calendar events. Implementations for web (interval) and cordova (cordova-plugin-local-notification)
      missedEventsModal.html            --> View for the missed calendar events modal dialog. 
    clipboard/            --> Allows to copy/paste blockly blocks (and referenced images) in a workflow or across different workflows
      blocklyClipboard.service.ts --> Provides functionality to retrieve, or copy a given blockly block with children, referenced images and preview. Data is stored in ClipboardDB.
      clipboard.module.ts         --> Clipboard module
    crypto/               --> Cryptography-related services and functions
      bytes.js              --> Complementary functions for sjcl for converting to/from bitArray.
      worker/               --> Crypto-Webworker for performing computation-intensive tasks in the background. Separate folder due to different typescript config.
        crypto.worker.ts      --> WebWorker for cryptography functionality in the background. Currently only PBKDF2.
      crypto.module.ts      --> Cryptography module and PBKDF2 injectable function.
      cryptoFunctions.ts    --> Cryptography functions, may be used by WebWorker or in the Window context.
      cryptoShared.d.ts     --> Shared interface declarations for both WebWorker and WebWorker clients.
      pgpCrypto.service.ts  --> Created encrypted & signed exports of study data (workflow versions, metrics) for the study operator.
    database/             --> Storages in the browser based on Dexie/IndexedDB for various services.
      calendarDatabase.service.ts     --> Storage for calendar events in IndexedDB
      clipboardDatabase.serivce.ts    --> Storage for clipboard of copied blockly blocks (+ referenced images and preview images).
      database.module.ts              --> Database module
      dexie.d.ts                      --> Dexie type declarations for compatibility with our build process (no module loader)
      gamificationDatabase.service.ts --> Storage for gamification stats (points, level) and settings in IndexedDB
      imagesDatabase.service.ts       --> Storage for images referenced in workflows (IndexedDB)
      metricsDatabase.service.ts      --> Storage for metrics-related data (in studyMode): snapshots, temporary time measurements, last IDs
      workflowsDatabase.service.ts    --> Storage for workflow versions, only in studyMode
    exchange/             --> Exchange of workflows (download, import, export) and study data (export)
      async-jsonparse2.d.ts     --> Types for Async JSONparse2 compatibility with our build system (no module loader). Used in streamed import of workflow JSONs.
      download.service.ts       --> Downloads Blobs via Cordova/Web APIs
      exchange.module.ts        --> Exchange module
      importJob.factory.ts      --> Factory for import jobs of workflows (Blob) in JSON format. Streamed import (conservative memory usage), or string-based import. Multiple import jobs may be scheduled at once.
      studyExport.service.ts    --> Initializes the study (user key) and exports study data as a Blob (encrypted for study operator). 
      workflowExport.service.ts --> Export workflows as JSON in a Blob
      workflowImport.service.ts --> Import workflows from a JSON stream or string and manages running import jobs.
    execution/            --> components/services related to the workflow execution
      cordovaLocalNotification.d.ts         --> Type declarations for cordova-plugin-local-notification
      cordovaWakeuptimer.d.ts               --> Type declarations for cordova-plugin-wakeuptimer
      cordovaWakeuptimer.service.ts         --> Schedule/cancel callbacks in the future that wakeup the (Android) device and resumes the application. Used e.g. for reminders and wait blocks in workflows.
      executionBlock.component.d.ts         --> Type declarations for IExecutionBlockComponentController interface
      executionBlock.component.js           --> component logic for a single previous/current/next Block in the execution
      executionBlock.css                    --> stylesheet for the executionBlock
      executionBlock.html                   --> template for the execution block
      executionBlock-classic.html           --> template for the classic layout of the executionBlock (centered text with button below)
      executionBlock-flex.html              --> template for the flexible layout of the executionBlock (larger left/right aligned text and buttons)
      executionBlockParallel.component.d.ts --> Type declarations for IExecutionBlockParallelComponentController
      executionBlockParallel.component.js   --> component logic for the parallel block (and/or task groups)
      executionBlockParallel.html           --> template for the parallel block
      executionBlockParallel-classic.html   --> template for the classic layout of the parallel block
      executionBlockParallel-flex.html      --> template for the flexible layout of the parallel block 
      executionCountdown.service.ts         --> countdown service for the timer_sleep block (remaining seconds & device wakeup after completed wait time)
      executionLog.component.ts             --> component logic (TypeScript) for the (in-memory) log of completed steps in an execution workflow.
      executionLog.html                     --> template for the executionLog (log of completed steps in a workflow)
      executionTimer.service.ts             --> timer service for the timer_remember block (Reminder every <x> <time unit>) during execution
    gamification/         --> Gamification with points, levels and level progress + animations.
      assets/               --> Assets related to gamification. Currently only gamification icons.
        gamificationIcons.svg --> Icons available as "resource" to gain for points/levels. Separate svg elements adressed by id.
      gamification.module.ts                --> Gamification module
      gamification.service.ts               --> Handles gamification-related events during app usage, provides current stats (points/level) and broadcasts events (progress).
      gamificationSettings.service.ts       --> user settings related to gamification, e.g. enabled?, gain points?, icon
      navbarGamification.component.css      --> Styles and animations for gamification navbar
      navbarGamification.component.ts       --> Gamification navbar: Displays user-chosen icon, level and level progress. Animations when gaining points/level up
      navbarGamification.html               --> View of gamification navbar
      navbarGamificationStatusController.ts --> Handles state of whether to display/hide gamification navbar based on settings
    images/               --> Images in workflows
      images.module.ts          --> Images module
      images.service.ts         --> Manages images referenced in workflows. Deduplication of referenced images via hash.
    imageThumbnailChooser --> Image chooser component, used to select gamification icon in gamification settings
      imageThumbnailChooser.component.ts --> Component controller for image chooser component. Keeps track of selected image.
      imageThumbnailChooser.css          --> Styles for image chooser
      imageThumbnailChooser.module.ts    --> Image thumbnail chooser module
    intents/              --> Services related to (Android) intents
      cordova-webintent.d.ts    --> Type declarations for cordova-webintent
      cordovaToast.d.ts         --> Type declarations for cordova-plugin-x-toast
      intent.service.ts         --> Handles incoming intents and forwards them to the appropriate service
      intent_import.service.ts  --> Starts the import of workflows from the server, if the URL matches.
      intents.module.ts         --> Intents module
    lists/                --> Components related to creation/editing of lists
      changeOrder.directive.ts  --> Allows to swaps the order of two elements
      changeOrder.html          --> Template for changeOrder directive
      listBuilder.component.css --> Styles for list builder
      listBuilder.component.ts  --> Allows to create/edit lists of elements, by adding/removing them in sequence with a click/touch
      listBuilder.html          --> View for list builder
    metrics/              --> Privacy-preserving metrics, collected only in study mode (doi:10.5220/0008982801660177, doi:10.1007/978-3-030-72379-8_22)
      metric.factory.ts            --> Factory and implementations of Metrics (Number-, Meta-, Duration-Metric)
      metric.module.ts             --> Metric module
      metric.service.ts            --> This service is called at each record point (record/recordValue) and triggers affected metrics. Allows to register metrics at application startup.
      metricIdGenerator.service.ts --> Acquires and returns new execution and schedule IDs for use within record point assignments.
      metricRegistry.factory.ts    --> Keeps track of registered metrics and their record/clear points
      metric.d.ts                  --> Definition of metric language and related interfaces
      metrics.run.ts               --> Definitions of concrete (active) metrics, registered at application start. Also includes documentation of record points.
      metricsDB.d.ts               --> Type declarations for metric database
    modal/                --> modal dialog components
      infoModal.component.js    --> modal for displaying information to a user (notifications, warnings)
      leaveModal.component.js   --> modal for asking the user before leaving a page / navigating to another page
      loginModal.controller.js  --> modal for logging in to the server (workflow exchange).
      promptModal.component.js  --> modal for asking the user to input a string.
      ...
    overview/             --> overview related components
      overviewToolbar.html      --> Toolbar at the top of the overview page (new, file/server import/export, filter, sorting)
      overviewToolbar.ts        --> component controller for overview toolbar
      serverExportButton.html   --> Template for export button for server export & QR code dialog.
      serverExportButton.ts     --> Button for exporting selected workflows to the server, and displaying a QR code and URL in a small popover.
      workflowMenuStrip.html    --> Menu for each workflow in the overview table (start/edit/rename/duplicate/delete)
      workflowMenuStrip.ts      --> Component for workflowMenuStrip
    progress/             --> Progress bar supporting multiple subprogresses. 
      progress.component.ts     --> Progress bar supporting multiple subprogresses. Progress is updated via a named event. Hidden when finished.
      progressBar.html          --> Template for progress bar
    restClient/           --> REST client for communication with the server for import/export of workflows
      restClient.config.ts          --> Configuration of the REST client (Base URL and API endpoints regarding authentication)
      restClient.run.ts             --> sets up the REST client (based on config), including interceptors, for handling authentication/login and pagination
      restWorkflowExport.service.ts --> Export and import of workflows shared via the server. Requests user login, if required and retries afterwards.
    settings/             --> General user settings and settingsView related components.
      quotaUsageBar.component.ts --> Displays the quota usage of the local storage (IndexedDB/LocalStorage) as a progress bar
      quotaUsageBar.html         --> Template for the quota usage bar
      settings.module.ts         --> Settings module
      settings.service.ts        --> Keeps track of user settings. Settings are stored/retrieved synchronously via localStorage. Validates study mode (automatically disabled if outside of study or invalid key.
    smartCompanion/       --> Communication with companion apps/devices, such as Wear OS smart watch (Wear Data API), or via bluetooth. Allows these apps to act as another view for workflow execution (display & control).
      bluetoothCompanion.service.ts         --> experimental bluetooth connector (connection companion) for companion apps based on cordova-plugin-custom-bluetoothserial. Prototypically applied with Smart glasses.
      bluetoothSerial.d.ts                  --> TypeScript declarations for cordova-plugin-custom-bluetoothserial
      smartCompanion.module.ts              --> Smart companion module
      smartCompanion.service.ts             --> Synchronizes state between companion devices and this app via events and a custom JSON-based protocol.
      smartCompanion.ts                     --> Definitions of the Smart Companion Protocol and related interfaces
      wearCompanion.service.ts              --> Wear OS connector (connection companion) for communication with the rehagoal-smartwatch application.
      wearDataApi.ts                        --> Type definitions and constants for the Wear Data API
    toggleSwitch/         --> Switch representing a boolean state (on/off) as a toggleable slider (wraps checkbox input).
      toggleSwitch.component.ts --> Component controller for toggle switch
      toggleSwitch.css          --> Stylesheet for toggle switch and animation
      toggleSwitch.html         --> View template for toggle switch
      toggleSwitch.module.ts    --> Toggle switch module
    tts/                  --> Text-to-Speech (TTS)
      mespeak/                   --> meSpeak.js (https://masswerk.at/mespeak/) related files
        voices/                     --> Voice files for mespeak - currently only german (de) is used.
          ...
        mespeak.d.ts                --> Type declarations for mespeak
        mespeak.full.js             --> emscripten-compiled mespeak (v.1.9.7.1)
        mespeak.min.js              --> minified emscripten-compiled mespeak (v.1.9.7.1)
        mespeak.module.ts           --> mespeak module
        mespeak.service.ts          --> Wraps mespeak as an AngularJS service and asynchronously loads mespeak.
        mespeak_config.json         --> mespeak configuration data
      speakContents.css          --> Stylesheet for speak contents directive
      speakContents.directive.ts --> Directive that allows to enable an element's text to be read aloud (TTS), if the element is clicked.
      tts.module.ts              --> Text-to-Speech (TTS) module
      tts.service.ts             --> Loads an appropriate TTS service implementation and allows to read aloud text (if TTS is enabled in settings)
      tts.services.module.ts     --> Different implementations for accessing TTS engines (Cordova, Web Speech API, Mespeak)
    utilities/            --> Utility files, not fitting in another module/directory, or useful in general
      dev/                  --> Files only relevant during development and testing
        angular-bootstrap-lightbox.d.ts --> Type declarations for angular-bootstrap-lightbox
        angular-web-notification.d.ts   --> Type declarations for angular-web-notification
        blocklyTestHelpers.ts           --> Functions used in unit tests of blockly-related functionality
        jasmine-number-close-to.ts      --> Jasmine asymmetric matcher for approximate comparisons of floating point numbers with a certain precision.
        jasmine-promise-matchers.d.ts   --> Type declarations for jasmine promise matchers
        testUtilities.ts                --> Functions useful for unit tests, e.g. tryOrFailAsync, expectThrowsAsync
      ngAnimateCallbacks/   --> Directives for callbacks upon (CSS) animations
        onAnimate.directive.ts           --> Executes a callback, if an animation has entered a certain phase & ngAnimate event
      onLoad/               --> ngLoad directive for handling `load` events on a certain element
        onLoad.directive.ts              --> Executes a callback when the element has received the `load` event.
      scrollIntoView/       --> Directive for scrolling an element into view, if a certain event is received
        scrollIntoViewEvent.directive.ts --> Scrolls an element into view, if the specified event is received.
      streamUtilities.ts    --> Functions useful when working with (Readable)Streams and Blobs, including streamed JSON serialization
      utilities.module.ts   --> Utility functions and constants including hashing, renaming, UUIDs, DFS, assertUnreachable and more
    workflow/             --> components regarding workflow handling
      angular-webstorage.d.ts                      --> TypeScript declarations for angular-webstorage
      workflow.module.js                           --> Workflow module
      workflow.service.ts                          --> Workflow service managing CRUD operations and storage of local workflows
      workflow_builder.iface.ts                    --> Interface for the Workflow Builder, as used by the Blockly code generators
      workflow_execution.iface.ts                  --> Interfaces regarding workflow execution
      workflow_execution.service.ts                --> Service for the execution of workflows. Defines the logic of each block.
      workflow_execution_builder.service.ts        --> Implementation of the Workflow Builder for building executable workflows.
      workflow_test.ts                             --> Tests of the workflow service
      workflow_version_study_persist.controller.ts --> Controller that persists (initial) workflow versions of all currently stored workflows, upon entering study mode.
  views/                --> Main views of the application (those which can be accessed via fragment in the URL) 
    contact_help/         --> Contact and help pages
      img/                  --> Images used in contact and help pages
        ...
      contact_help.css      --> Stylesheet for contact and help views
      contactView.html      --> Template for contactView, containing information regarding how to contact the providers of the application
      contactView.js        --> View controller for contactView
      gallery-help.js       --> Gallery controller for the lightbox displaying the help images.
      help-lightbox.html    --> Lightbox template for viewing help images.
      helpView.html         --> Template for the help view, containing instructions how the application can be used.
      helpView.js           --> Component controller for the help view
    execution/            --> the workflow execution view template and logic
      executionComponent.html         --> Template for the execution component, including loader.
      executionComponent.ts           --> This is the visual component of workflow execution and connects to different services. Apart from workflow_execution.service.ts probably one of the most relevant files related to workflow execution. Embedded in executionView, flowEditView, and schedulingView.
      executionComponent-classic.html --> Classic three-block layout (previous, current, next task) of RehaGoal workflow execution
      executionComponent-flex.html    --> Flexible layout with only current block and larger image, alignment left/right particularly designed for hemispatial neglect.
      executionComponent_iface.ts     --> interface declaration for the executionComponent
      executionView.css               --> Styles for execution view
      executionView.js                --> Component for the execution view (`/start/:workflowId`), or shown when "start" button is pressed on a workflow
    flowEdit/             --> the workflow editor view template and logic
      flowEditView.css      --> Stylesheet for flowEditView
      flowEditView.html     --> Template for flowEditView, including blockly, image management, toolbar and modals.
      flowEditView.ts       --> Component for the workflow editor / flowEditView (`/edit/:workflowId`)
    gamification/         --> Gamification views: dashboard and settings
      gamificationDashboardView.css   --> Stylesheet for gamification dashboard
      gamificationDashboardView.html  --> Gamification dashboard template. Includes points, level, and progress.
      gamificationDashboardView.ts    --> Gamifcation dashboard view (`/gamification`). Shown when the user clicks on the navigation progress bar.
      gamificationSettingsView.css    --> Stylesheet for gamification settings
      gamificationSettingsView.html   --> Template for gamification settings view. Includes whether to collect points, display points/level, the icon selector, a preview and description.
      gamificationSettingsView.ts     --> Component controller for the gamification settings view (`/gamification-settings`). Accessible via settingsView or from gamification dashboard.
    overview/             --> the overview view template and logic (list of workflows)
      overviewView.html     --> template for the overview view. Displays a list/table of workflows, allowing to create/edit/rename/duplicate/delete/sort/filter workflows and import/export them from/to file/server.
      overviewView.ts       --> component controller of the overview view (`/overview`)
    planner/              --> Planning of workflows in the future (calendar)
      plannerView.css       --> Stylesheet for planner view
      plannerView.html      --> Template for planner view. Allows to create a sequence of workflows to be scheduled at a certain datetime, and to delete such calendar events.
      plannerView.ts        --> component controller for the planner view (`/planner`).
    scheduling/           --> Scheduling of multiple workflows in a sequence without a date, i.e. "now".
      schedulingView.css    --> Stylesheet for scheduling view.
      schedulingView.html   --> Template for scheduling view. Includes two main view states: Selecting the workflows to execute, and executing them in sequence (via executionComponent).
      schedulingView.ts     --> component controller for the scheduling view (`/scheduling`). This view is also used by the calendar event system to execute workflows in sequence.
    settings/             --> User settings view. General application settings, gamification and study settings and version/platform information for error reporting and storage quota usage.
      settingsView.css      --> Stylesheet for settings view.
      settingsView.html     --> Template for settings view. Includes several states for the study-related settings.
      settingsView.ts       --> component controller for settings view (`/settings`). Handles entering study mode and synchronizes settings with settingsService.
  app.css               --> default stylesheet
  app.js                --> main application module
  cordova.js            --> Placeholder file, to be replaced by Cordova build process (prevents 404 in web deployment).
  favicon.ico           --> RehaGoal favicon
  index.html            --> app layout file (the main html template file of the app)
  manifest.json         --> manifest file for Cordova apps.
  service-worker.js     --> ServiceWorker for Electron apps.
  version.ts            --> Version information, displayed in settingsView. Placeholders need to be replaced in the build process.
ci/       --> Files regarding Continous Integration (CI)
  rehagoal-server/   --> RehaGoal server submodule, compatible with this version of rehagoal-webapp. Used in integration tests.
  make_testuser.py   --> Creates a test user in the local rehagoal server for E2E testing. Do not use in production!
coverage/ --> Temporary files during coverage generation (raw coverage information), generated by protractor-coverage.py / nyc
deploy/   --> Deployment/Packaging scripts and files
  package.sh  --> Script for packaging for different OSs (Cordova/Android, Win32, Web, Electron (win/mac/linux))
e2e-tests/            --> end-to-end tests
  lws-middleware        --> Middlewares for local-web-server (LWS)
    lws-csp.js          --> Adds the Content-Security-Policy header to the response, as specified in the options.
  testfiles/            --> Testfiles, e.g. JSONs, images for use within E2E tests
  protractor.conf.js    --> Protractor config file
  scenarios.js          --> end-to-end scenarios to be run by Protractor
git-hooks/ --> Hooks for git.
  pre-commit-check-skipped-tests  --> Add this pre-commit script as `pre-commit` under `.git/hooks/` to prevent accidental commits with ignored (xdescribe, xit) of focussed (fdescribe, fit) tests.
hooks/     --> Hooks for Cordova
  after_platform_add/ --> To be executed after adding a platform.
    020_copy_build-extras.gradle.js --> Copies build-extras.gradle from the root directory to `platforms/android/`, to be used within the Android build process.
  after_prepare/      --> To be executed after preparing the application.
    010_add_platform_class.js       --> Automatically adds the platform class to the body tag.
node_modules/ --> NPM dependencies (dev tools)
platforms/    --> Platforms for Cordova
plugins/      --> Cordova plugins
reports/      --> Reports of unit/end-to-end tests and coverage
  coverage/     --> Code coverage reports
    karma/        --> Unit tests coverage reports
    protractor/   --> E2E tests coverage reports, generated by protractor-coverage.py / nyc
    combined/     --> Combined coverage reports (Unit & E2E tests), generated by combined-coverage-report.py / nyc
res/          --> Resources for Electron
resources/    --> Resources for Cordova
tmp/          --> Temporary files during coverage generation (instrumented files), and by package.sh script
.bowerrc                    --> Configuration of Bower
.gitattributes              --> Git Attributes, currently used for auto CRLF handling
.gitignore                  --> Files to ignore for git
.jshintrc                   --> Configuration for JSHint
angular-seed-LICENSE        --> LICENSE file for angular-seed
bower.json                  --> Bower frontend dependencies
build-extras.gradle         --> Additional instructions for gradle (Android build)
combined-coverage-report.py --> Generates a combined coverage report from both E2E and Unit testing coverage
config.xml                  --> Ionic/Cordova configuration
electron_main.js            --> Electron main logic (e.g. window management)
ionic.config.json           --> Ionic configuration
karma.conf.js               --> config file for running unit tests with Karma
lws.config.js               --> LWS (Local Web Server) configuration for the development server including content security policy
package.json                --> NPM dependencies (dev tools)
package-lock.json           --> Exact dependency tree of npm dependencies
protractor-coverage.py      --> Generates code coverage for end-to-end tests with protractor and nyc. Uses the LWS webserver.
README.md                   --> This file.
tsconfig.json               --> Configuration of the TypeScript Transpiler
...
```


## Contact

This project is hosted at https://github.com/RehaGoal/rehagoal-webapp.

For more information on AngularJS please check out https://angularjs.org/

[git]: https://git-scm.com/
[bower]: https://bower.io
[npm]: https://www.npmjs.org/
[node]: https://nodejs.org
[protractor]: https://github.com/angular/protractor
[jasmine]: https://jasmine.github.io
[karma]: https://karma-runner.github.io
[local-web-server]: https://github.com/lwsjs/local-web-server
[testssl]: https://testssl.sh/
[openpgpjs]: https://openpgpjs.org/
[mespeak]: https://masswerk.at/mespeak/
[blockly]: https://developers.google.com/blockly/
