'use strict';
const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module provides functions related to desktop integration.
const shell = electron.shell;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;

function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        webPreferences: {
            // Disable the Node integration in all renderers that display remote content
            // to prevent XSS2RCE vulnerabilities
            nodeIntegration: false,
            // Disable Node integration for the Web Workers API
            nodeIntegrationInWorker: false,
            // Enable context isolation in all renderers that display remote content
            contextIsolation: true,
            // Using sandbox for untrusted origins to limit the number exposed APIs
            sandbox: true
        },
        width: 800,
        height: 600
    });

    // Remove menu bar and actions associated with it
    mainWindow.removeMenu();

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname + "/www/", 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    // Defines that all links with target "_blank" will not be displayed
    // inside the electron window. Instead, the default browser will be called
    // with the provided url
    mainWindow.webContents.on('new-window', (e, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            e.preventDefault();
            shell.openExternal(url);
        }
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

// Verify the options and params of all <webview> tags before they get attached using the will-attach-webview event
// and clear xss preload scripts / urls, disable noteIntegration (for this webview renderer) and check if url belongs
// to the trusted domain
app.on('web-contents-created', (event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
        // Strip away preload scripts if unused or verify their location is legitimate
        delete webPreferences.preload;
        delete webPreferences.preloadURL;

        // Disable node integration
        webPreferences.nodeIntegration = false;

        // Verify URL being loaded
        // TODO replace with your rehagoal-server.local address here
        // if (!params.src.startsWith('https://rehagoal-server.local')) {
        event.preventDefault();
        // }
    });
    // Block navigation (except SPA in-page navigation)
    contents.on('will-navigate', (event, url) => {
        console.debug('[will-navigate]', url);
        event.preventDefault();
    });
    contents.on('will-redirect', (event, url) => {
        console.debug('[will-redirect]', url);
        event.preventDefault();
    });
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
