'use strict';

require('jasmine2-custom-message');

const EC = protractor.ExpectedConditions;

/* https://github.com/angular/protractor/blob/master/docs/toc.md */

const ptor_restConfigModule = 'rehagoal.restClientConfig';
const ptor_ngCordova = 'ngCordova.plugins.toast';
const ptor_ttsServices = 'rehagoal.tts.services';
const ptor_mespeak = 'mespeak';
const ptor_settingsService = 'rehagoal.settings';

describe('RehaGoal Webapp', function () {

    beforeAll(function() {
        mockStubMespeak();
    });

    afterAll(function() {
        unmockStubMespeak();
    });

    by.addLocator('buttonTextOrCss',
        function (buttonText, buttonCss, opt_parentElement) {
            var using = opt_parentElement || document,
                buttons = using.querySelectorAll('button'),
                buttonsByCss = using.querySelectorAll('button ' + buttonCss);

            var buttonsByText = Array.prototype.filter.call(buttons, function (button) {
                var txt = button.innerText || button.textContent;
                return txt === buttonText;
            });

            return Array.prototype.concat(buttonsByText, buttonsByCss);
        });

    by.addLocator('linkTextOrCss',
        function (buttonText, buttonCss, opt_parentElement) {
            var using = opt_parentElement || document,
                buttons = using.querySelectorAll('a'),
                buttonsByCss = using.querySelectorAll('a ' + buttonCss);

            var buttonsByText = Array.prototype.filter.call(buttons, function (button) {
                var txt = button.innerText || button.textContent;
                return txt === buttonText;
            });

            return Array.prototype.concat(buttonsByText, buttonsByCss);
        });

    function sinceExpectToMatch(thing, detailInfo) {
        return since("expected " + thing + " to match '#{expected}' but is '#{actual}'\n" + detailInfo);
    }

    function sinceExpectToBe(thing, detailInfo) {
        return since("expected " + thing + " to be '#{expected}' but is '#{actual}'\n" + detailInfo);
    }

    function matchOrBe(thing, detailStr, expected, actual) {
        if (expected instanceof RegExp) {
            sinceExpectToMatch(thing, detailStr).expect(actual).toMatch(expected);
        } else {
            sinceExpectToBe(thing, detailStr).expect(actual).toBe(expected);
        }
    }

    function escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function getWorkflowsForName(targetName) {
        return element.all(by.repeater('workflow in $ctrl.workflows')).filter(function (workflow) {
            return getWorkflowName(workflow).then(function (name) {
                return name === targetName;
            });
        });
    }

    function isWorkflowPresentCondition(workflowName) {
        return () => {
            return getWorkflowsForName(workflowName)
                .count()
                .then((count) => {
                    return count > 0;
                });
        }
    }

    function waitForWorkflowPresence(workflowName, timeout) {
        browser.wait(isWorkflowPresentCondition(workflowName), timeout);
    }

    function filterDisplayed(elements) {
        return elements.filter(function (element) {
            return element.isDisplayed().then(function (displayed) {
                return displayed;
            });
        });
    }

    function getPageTitle() {
        return $$('[ng-view] h1').first().getText();
    }

    function getModal() {
        return element(by.css('.modal-dialog'));
    }

    function getModalByContainingText(textOrRegex) {
        return element(by.cssContainingText('.modal-dialog', textOrRegex));

    }

    function getModalTitle(modal) {
        return modal.element(by.css('.modal-title')).getText();
    }

    function getModalText(modal) {
        return modal.element(by.css('.modal-body')).getText();
    }

    function getPromptModal() {
        var modal = element(by.css('.modal-dialog'));
        browser.wait(EC.visibilityOf(modal), 5000, "Prompt modal should be displayed!");
        return modal;
    }

    function waitModalClosedAfterLogin() {
        const timeoutAfterLogin = 5000;
        const timeoutModalAutoClose = 3000;
        let modal = getModal();
        let loggedInText = element(by.css('div[ng-if="$ctrl.isUserLoggedIn()"]'));
        browser.wait(EC.or(EC.visibilityOf(loggedInText), EC.not(EC.presenceOf(modal))), timeoutAfterLogin);
        browser.wait(EC.not(EC.presenceOf(modal)), timeoutModalAutoClose);
    }

    function modalOK(modal) {
        modal.element(by.buttonText('OK')).click();
        browser.wait(EC.not(EC.presenceOf(modal)));
    }

    function modalAccept(modal) {
        modal.element(by.buttonText('Bestätigen')).click();
        browser.wait(EC.not(EC.presenceOf(modal)));
    }

    function modalDismiss(modal) {
        modal.element(by.buttonText('Zurück')).click();
        browser.wait(EC.not(EC.presenceOf(modal)));
    }

    function modalButton(modal, buttonText) {
        modal.element(by.buttonText(buttonText)).click();
        browser.wait(EC.not(EC.presenceOf(modal)));
    }

    function getRenameButton(workflow) {
        //return getWorkflowButtonByTextOrCss(workflow, "Umbenennen", ".glyphicon.glyphicon-pencil");
        return filterDisplayed(workflow.all(by.css('button[title=Umbenennen]'))).first();
    }

    function getDeleteButton(workflow) {
        //return getWorkflowButtonByTextOrCss(workflow, "Löschen", ".glyphicon.glyphicon-trash")
        return filterDisplayed(workflow.all(by.css('button[title=Löschen]'))).first();
    }

    function getStartButton(workflow) {
        //return getWorkflowLinkByTextOrCss(workflow, "Starten", ".glyphicon.glyphicon-play");
        return filterDisplayed(workflow.all(by.css('a[title=Starten]'))).first();
    }

    function getEditButton(workflow) {
        return filterDisplayed(workflow.all(by.css('a[title=Bearbeiten]'))).first();
    }

    function getExportButton() {
        return filterDisplayed(element.all(by.css('a[title="Auswahl in Datei exportieren"]'))).first();
    }

    function getDuplicateButton(workflow) {
        return filterDisplayed(workflow.all(by.css('button[title="Duplizieren"]'))).first();
    }

    function getWorkflowName(workflow) {
        return workflow.element(by.binding('workflow.name')).getText();
    }

    function getSelectWorkflowCheckbox(workflow) {
        return workflow.element(by.model('$ctrl.workflowSelection.ids[workflow.id]'));
    }

    function getSelectedWorkflows() {
        const workflows = element.all(by.repeater('workflow in $ctrl.workflows'));
        return workflows.filter(function (workflow) {
            const checkbox = getSelectWorkflowCheckbox(workflow);
            return checkbox.isSelected();
        });
    }

    function getSelectedWorkflowCount() {
        return getSelectedWorkflows().count();
    }

    /**
     * Returns the execution-block with current=true
     * @return {ElementFinder}
     */
    function getCurrentExecutionBlock() {
        var e = element(by.css('execution-block[current=true]'));
        browser.wait(EC.presenceOf(e), 2000);
        return e; //[current=true]'
    }

    function getExecutionBlockParallel() {
        var e = $('execution-block-parallel');
        browser.wait(EC.presenceOf(e), 2000);
        return e;
    }

    function getExecutionBlockText(executionBlock) {
        return getExecutionBlockTextElement(executionBlock).getText();
    }

    function getExecutionBlockTextElement(executionBlock) {
        return executionBlock.element(by.binding("$ctrl.text"));
    }

    function getExecutionBlockButtonCheck(executionBlock) {
        return executionBlock.element(by.css('.glyphicon.glyphicon-ok'));
    }

    function getExecutionBlockButtonYes(executionBlock) {
        return executionBlock.element(by.buttonText('Ja'));
    }

    function getExecutionBlockButtonNo(executionBlock) {
        return executionBlock.element(by.buttonText('Nein'));
    }

    function getExecutionBlockButtonSkip(executionBlock) {
        return executionBlock.element(by.css('.glyphicon.glyphicon-fast-forward'));
    }

    function getExecutionBlockLabelElement(executionBlock) {
        return executionBlock.$('.tasklabel[ng-click] > .execution-block-text');
    }

    function getExecutionBlockImage(executionBlock) {
        return executionBlock.$('.execution-block-image, .execution-block-flex-image');
    }

    function getGoalText() {
        return element(by.binding('goalDescription')).getText();
    }

    function getPreviousExecutionBlock() {
        return $$('execution-block[current=false]').first();
    }

    function getNextExecutionBlock() {
        return $$('execution-block[current=false]').last();
    }

    function getMiniTaskBlocks() {
        return element.all(by.css('execution-block[mini-task=true]'));
    }

    function getParallelBlockTitleElement() {
        return $$('execution-block-parallel h3.panel-title, execution-block-parallel .execution-block-title .execution-block-text').first();
    }

    function getParallelBlockTitle() {
        return getParallelBlockTitleElement().getText();
    }

    function getExecutionLogEntries() {
        return element.all(by.css('execution-log ul li'));
    }

    function getExecutionLogListText() {
        return element(by.css('execution-log ul')).getText();
    }

    /**
     * Returns an ElementFinder for the select element for changing the static postpone delay of calendar events in settingsView
     * @return {ElementFinder}
     */
    function getCalendarStaticPostponeDelaySelect() {
        return $('#selectCalendarStaticPostponeDelay');
    }

    function waitForExecutionComponentLoaded() {
        browser.wait(EC.and(
            EC.invisibilityOf($('#executionComponentLoader')),
            EC.visibilityOf($('#executionComponentContainer'))
        ), 2000, "Expected executionComponentLoader NOT to be present and executionComponentContainer to BE present");
    }

    function loadExecUrl(exec_url) {
        browser.get(exec_url);
        waitForExecutionComponentLoaded();
    }

    function makeTaskModalTestFunction(task_name, hasModal) {
        return function () {
            var modal = getModal();
            if (hasModal) {
                expect(modal.isPresent()).toBe(true);
                expect(modal.isDisplayed()).toBe(true);
                expect(getModalText(modal)).toBe(task_name);
                modalOK(modal);
            } else {
                expect(modal.isPresent()).toBe(false);
            }
            expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(task_name);
            getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
        };
    }

    const imageLoadTimeout = 2000;
    function checkImageFile(imageElement, relativeImagePath) {
        browser.wait(() => getImageSource(imageElement).then((src) => !!src), imageLoadTimeout);
        let actual = getImageDataUrl(imageElement).then(dataUrlToBase64);
        let path = require('path');
        var absoluteImagePath = path.resolve(__dirname, relativeImagePath);
        let expected = loadFileAsBase64(absoluteImagePath);
        since("Expected image to be displayed\n").
        expect(imageElement.isDisplayed()).toBeTruthy();
        since('Expected imageFile to be content-equal to ' + relativeImagePath)
            .expect(actual).toBe(expected);
    }

    /**
     *
     * @param {ElementFinder} imgElement
     * @return {Promise<[number, number]>}
     */
    function getImageElementNaturalDimensions(imgElement) {
        return browser.executeScript(function(imgElement) {
            return [imgElement.naturalWidth, imgElement.naturalHeight];
        }, imgElement);
    }

    /**
     *
     * @param {ElementFinder} imageElement
     * @return {Promise<boolean>}
     */
    function isImageLoaded(imageElement) {
        return getImageElementNaturalDimensions(imageElement).then(naturalDimensions => {
            return naturalDimensions[0] > 0 && naturalDimensions[1] > 0;
        });
    }

    let savedWindowSize;
    function saveWindowDimensionsAndResize(width, height) {
        return browser.driver.manage().window().getSize().then(function(size) {
            savedWindowSize = size;
        }).then(function(result) {
            browser.driver.manage().window().setSize(width, height);
        });
    }

    function restoreWindowDimensions() {
        browser.driver.manage().window().setSize(savedWindowSize.width, savedWindowSize.height);
    }

    function isScrolledIntoView(el) {
        return browser.executeScript(function(el) {
            const rect = el.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom >= 0;
        }, el);
    }

    function waitForElementToBeInView(element) {
        return browser.wait(() => isScrolledIntoView(element), 2000, "Timeout waiting for element to be scrolled into view");
    }

    function scrollToBottom() {
        return browser.executeScript(function() {
            window.scrollTo(0, document.body.scrollHeight);
        });
    }

    function automateWorkflow(automateInstructions) {
        /**
         * automateInstructions: [AutomateInstruction, ...]
         *
         * AutomateInstruction:
         * {
         *      instruction?: 'yes' | 'no' | 'ok' | 'skip' | 'click_label' | 'click_title',
         *      block?: 'mini' [0-9]+
         *      expect?: { // expect is checked first, then the instruction is executed.
         *          (  noTimerRememberAfter?: <Number> [ms]
         *             |
         *             (
         *                  timerRememberAfter?: <Number> [ms]
         *                  timerRememberText?: <String> | <RegExp>
                           )
         *          )?
         *          sleepTimer?: <Number> [ms]
         *          skipVisible?: <Boolean>
         *          taskText?: <String> | <RegExp>
         *          taskImageUrl?: <String> | <RegExp> | null
         *          taskImageFile?: <String> [FilePath]
         *          goalText?: <String> | <RegExp>
         *          titleText?: <String> | <RegExp>
         *          titleImageFile?: <String> [FilePath]
         *          titleImageUrl?: <String> | <RegExp> | null
         *          prevTaskText?: <String> | <RegExp>
         *          nextTaskText?: <String> | <RegExp>
         *          logText?: <String> | <RegExp>
         *          (  spoken: <String> | <RegExp>
         *             |
         *             notSpokenAfter: <Number> [ms]
         *          )?
         *      }
         * }
         */

        for (var i = 0; i < automateInstructions.length; ++i) {
            const instruction = automateInstructions[i];
            const instructionStr = "@ Instruction[" + i + "] = " + JSON.stringify(instruction);
            var miniBlock = null;
            let getParallelBlockImage = function() {
                return getExecutionBlockImage(getExecutionBlockParallel().element(by.css('.panel-heading')));
            };
            let getBlockImage = function() {
                if (miniBlock != null) {
                    return getExecutionBlockImage(getMiniTaskBlocks().get(miniBlock));
                } else {
                    return getExecutionBlockImage(getCurrentExecutionBlock());
                }
            };
            let checkImageUrl = function(subjectStr, imageElement, expectedUrl) {
                if (expectedUrl === null) {
                    since("Expected image not to be displayed\n" + instructionStr).
                    expect(imageElement.isDisplayed()).not.toBeTruthy();
                } else {
                    browser.wait(() => getImageSource(imageElement).then((src) => !!src), imageLoadTimeout,
                        "Expected imageUrl to be set.\n" + instructionStr);
                    let actualImageSrc = getImageSource(imageElement);
                    since("Expected image to be displayed\n" + instructionStr).
                    expect(imageElement.isDisplayed()).toBeTruthy();
                    matchOrBe(subjectStr, instructionStr,
                        expectedUrl,
                        actualImageSrc);
                }
            };

            if (instruction.hasOwnProperty('block')) {
                var match = instruction.block.match(/mini(\d+)/);
                if (match) {
                    miniBlock = Number.parseInt(match[1]);
                }
            }
            const expectations = instruction.expect;
            if (expectations) {
                if (expectations.hasOwnProperty('prevTaskText')) {
                    matchOrBe('prevTaskText', instructionStr,
                        expectations.prevTaskText,
                        getExecutionBlockText(getPreviousExecutionBlock()));
                }
                if (expectations.hasOwnProperty('nextTaskText')) {
                    matchOrBe('nextTaskText', instructionStr,
                        expectations.nextTaskText,
                        getExecutionBlockText(getNextExecutionBlock()));
                }
                if (expectations.hasOwnProperty('titleText')) {
                    matchOrBe('titleText', instructionStr,
                        expectations.titleText,
                        getParallelBlockTitle());
                }
                if (expectations.hasOwnProperty('goalText')) {
                    matchOrBe('goalText', instructionStr,
                        expectations.goalText,
                        getGoalText());
                }
                if (expectations.hasOwnProperty('logText')) {
                    matchOrBe('logText', instructionStr,
                        expectations.logText,
                        getExecutionLogListText());
                }
                if (expectations.hasOwnProperty('taskText')) {
                    var actualText;
                    if (miniBlock !== null) {
                        actualText = getMiniTaskBlocks().get(miniBlock).getText();
                    } else {
                        actualText = getExecutionBlockText(getCurrentExecutionBlock());
                    }
                    matchOrBe('taskText', instructionStr,
                        expectations.taskText,
                        actualText);
                }
                if (expectations.hasOwnProperty('skipVisible')) {
                    const expectedVisibility = expectations.skipVisible;
                    matchOrBe('skipButton visibility', instructionStr,
                        expectedVisibility,
                        getExecutionBlockButtonSkip(block).isDisplayed()
                    );
                }
                if (expectations.hasOwnProperty('taskImageUrl')) {
                    let imageElement = getBlockImage();
                    checkImageUrl('taskImageUrl', imageElement, expectations.taskImageUrl);
                }
                if (expectations.hasOwnProperty('taskImageFile')) {
                    let imageElement = getBlockImage();
                    checkImageFile(imageElement, expectations.taskImageFile);
                }
                if (expectations.hasOwnProperty('titleImageUrl')) {
                    let imageElement = getParallelBlockImage();
                    checkImageUrl('taskImageUrl', imageElement, expectations.titleImageUrl);
                }
                if (expectations.hasOwnProperty('titleImageFile')) {
                    let imageElement = getParallelBlockImage();
                    checkImageFile(imageElement, expectations.titleImageFile);
                }
                if (expectations.hasOwnProperty('spoken')) {
                    matchOrBe('spoken text', instructionStr,
                        expectations.spoken,
                        mockedTTSGetLastSpokenTextsJoined()
                    );
                    mockedTTSClearSpoken();
                } else if (expectations.hasOwnProperty('notSpokenAfter')) {
                    expect(browser.sleep(expectations.notSpokenAfter).then(function () {
                        since("expected nothing to have been spoken\n" + instructionStr).
                        expect(mockedTTSGetLastSpokenTextsJoined()).toBe('');
                    })).not.toBeDefined();
                }
                if (expectations.hasOwnProperty('timerRememberAfter')) {
                    expect(browser.sleep(expectations.timerRememberAfter).then(function () {
                        var modal = getModal();
                        since("expected modal to be present\n" + instructionStr).expect(modal.isPresent()).toBe(true);
                        since("expected modal to be displayed\n" + instructionStr).expect(modal.isDisplayed()).toBe(true);
                        if (expectations.hasOwnProperty('timerRememberText')) {
                            matchOrBe('timerRememberText', instructionStr,
                                expectations.timerRememberText,
                                getModalText(modal));
                        }
                        modalOK(modal);
                    })).not.toBeDefined();
                } else if (expectations.hasOwnProperty('noTimerRememberAfter')) {
                    expect(browser.sleep(expectations.noTimerRememberAfter).then(function () {
                        var modal = getModal();
                        since("expected modal to be NOT present\n" + instructionStr).expect(modal.isPresent()).toBe(false);
                    })).not.toBeDefined();
                } else if (expectations.hasOwnProperty('sleepTimer')) {
                    expect(browser.sleep(expectations.sleepTimer)).not.toBeDefined();
                }
            }
            if (instruction.hasOwnProperty('instruction')) {
                var modal = getModal();
                var block;
                if (miniBlock !== null) {
                    block = getMiniTaskBlocks().get(miniBlock);
                } else {
                    block = getCurrentExecutionBlock();
                }
                if (instruction.instruction === 'ok') {
                    getExecutionBlockButtonCheck(block).click();
                } else if (instruction.instruction === 'yes') {
                    getExecutionBlockButtonYes(block).click();
                } else if (instruction.instruction === 'no') {
                    getExecutionBlockButtonNo(block).click();
                } else if (instruction.instruction === 'skip') {
                    getExecutionBlockButtonSkip(block).click();
                } else if (instruction.instruction === 'click_label') {
                    getExecutionBlockLabelElement(block).click();
                } else if (instruction.instruction === 'click_title') {
                    getParallelBlockTitleElement().click();
                }
                browser.wait(EC.not(EC.presenceOf(modal)));
            }
        }
    }

    function getNewWorkflowButton() {
        return filterDisplayed(element.all(by.css('button[title="Neuen Workflow erstellen"]'))).first();
    }

    function getDeleteSelectedButton() {
        return filterDisplayed(element.all(by.css('a[title="Ausgewählte Workflows löschen"]'))).first();
    }

    function getWorkflowFilter() {
        return filterDisplayed(element.all(by.model('$ctrl.workflowFilter'))).first();
    }

    function getTTSSpeedSlider() {
        return element(by.id("sliderTTSSpeed"));
    }

    function getAudioSampleButton() {
        return element(by.id("ttsSample"));
    }

    function getSelectOptionByText(selectElement, optionText) {
        return selectElement.element(by.cssContainingText('option', optionText));
    }

    function getSelectedOption(selectElement) {
        return selectElement.element(by.css('option:checked'));
    }

    function getPopover(title) {
        return element.all(by.css('div.popover')).filter(function (element) {
            return element.getAttribute('uib-title').then(function (actualTitle) {
                return title === actualTitle;
            });
        }).first();
    }

    function waitForIncreasedWorkflowCount(initialCount) {
        browser.wait( () => {
            return initialCount.then(function(previousCount) {
                return getWorkflowCount().then(function(currentCount) {
                    return currentCount > previousCount;
                });
            });
        }, 3000, "workflow count did not increase");
    }

    function importTestfile(filename, allowFailed, filepath) {
        let initialCount = getWorkflowCount();
        if (!filepath) {
            filepath = 'testfiles';
        }
        const path = require('path');
        const fileToUpload = filepath + "/" + filename;
        const absolutePath = path.resolve(__dirname, fileToUpload);
        const input = element.all(by.css('input[type="file"][title="Workflows aus Datei importieren"]')).first();
        input.sendKeys(absolutePath);

        if (allowFailed) {
            return;
        }
        waitForIncreasedWorkflowCount(initialCount);
    }

    function deleteWorkflowIfAccept(workflow, accept) {
        getDeleteButton(workflow).click();
        var alertDialog = browser.switchTo().alert();
        expect(alertDialog.getText()).toMatch(/Wirklich/);
        expect(alertDialog.getText()).toMatch(/löschen/);
        if (accept) {
            alertDialog.accept();
        } else {
            alertDialog.dismiss();
        }
    }

    function deleteSelectedWorkflows() {
        return getSelectedWorkflows().then(selectedWorkflows => {
            const count = selectedWorkflows.length;
            getDeleteSelectedButton().click();
            let alert = browser.switchTo().alert();
            expect(alert.getText()).toBe(count + ' Workflows löschen?');
            alert.accept();
            alert = browser.switchTo().alert();
            expect(alert.getText()).toMatch(/bestätigen:/);
            alert.accept();
            let allDeletedCondition = EC.and(...selectedWorkflows.map((workflow) =>
                EC.not(EC.presenceOf(workflow))
            ));
            return browser.wait(allDeletedCondition, 10000, "Timeout waiting for selected workflows to be deleted");
        });

    }

    function renameWorkflow(workflow, newName) {
        getRenameButton(workflow).click();
        var input = element(by.model("$parent.$data")).clear();
        input.sendKeys(newName);
        element.all(by.css(".glyphicon.glyphicon-ok")).click();
    }

    function clearWebStorage() {
        browser.executeScript('window.sessionStorage.clear();');
        browser.executeScript('window.localStorage.clear();');
    }

    function clearDB(dbName) {
        const status = browser.executeAsyncScript(function() {
            const dbName = arguments[0];
            const done = arguments[arguments.length - 1];
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onerror = function(event) {
                done(false);
            }
            deleteRequest.onsuccess = function(event) {
                done(true);
            }
        }, dbName);
        expect(status).toBe(true, `Error while deleting ${dbName}`);
        browser.refresh();
    }

    function clearClipboardDB() {
        clearDB('clipboardDB');
    }

    function clearFileDB() {
        clearDB('fileDB');
    }

    function clearCalendarDB() {
        clearDB('calendarDB');
    }

    function mockServer() {
        //console.log('Protractor: register mock module');
        browser.addMockModule(ptor_restConfigModule, function () {
            console.log('Browser: register mock module');
            angular.module('rehagoal.restClientConfig', [])
                .constant('REST_API', (function () {
                    var server_base = 'http://127.0.0.1:8080';
                    return {
                        TOKEN_AUTH_URL: server_base + '/api-token-auth/',
                        TOKEN_REFRESH_URL: server_base + '/api-token-refresh/',
                        TOKEN_VERIFY_URL: server_base + '/api-token-verify/',
                        BASE_URL: server_base + '/api/v2'
                    };
                })());
        });
        browser.get('index.html#!/overview');
    }

    function unmockServer() {
        browser.removeMockModule(ptor_restConfigModule);
    }

    function mockCordovaImport() {
        browser.addMockModule(ptor_ngCordova, function () {
            console.log('Browser: register mock ng-cordova module');
            angular.module('ngCordova.plugins.toast', [])
                .factory('$cordovaToast', [function () {
                    return {
                        showLongBottom: function (message) {
                        }
                    };
                }]);
        });
        browser.get('index.html#!/overview');
    }

    function unmockCordovaImport() {
        browser.removeMockModule(ptor_ngCordova);
    }

    function installMockedDateModule(isoDate) {
        browser.addMockModule('mockedDate', function(isoDate) {
            angular.module('mockedDate', [])
                .run(function() {
                    window.__ptor_mocked_iso_date = isoDate;
                    if (window.__ptor_original_date === undefined) {
                        window.__ptor_original_date = Date;
                    }
                    /**
                     * @return {Date}
                     */
                    Date = function() {
                        if (arguments.length > 0 || window.__ptor_mocked_iso_date === null) {
                            // Use original Date
                            return new window.__ptor_original_date(...arguments);
                        } else {
                            // Use mocked Date
                            return new window.__ptor_original_date(window.__ptor_mocked_iso_date);
                        }
                    };
                    Date.UTC = window.__ptor_original_date.UTC;
                    Date.parse = window.__ptor_original_date.parse;
                    Date.now = function() {
                        return new Date().valueOf();
                    };
                    Date.toString = window.__ptor_original_date.toString;
                });
        }, isoDate);
    }

    function uninstallMockedDateModule() {
        browser.removeMockModule('mockedDate');
        browser.executeScript(function() {
            if (window.__ptor_original_date === undefined) {
                return;
            }
            Date = window.__ptor_original_date;
        });
    }

    /**
     * (Re-)registers module with updated date as part of browser control flow and afterwards load page.
     * This ensures, that Date is mocked before angular is loaded and with the newly registered date.
     * Please use this method instead of installMockedDate & browser.get, as the latter does not ensure that
     * the Date is mocked before angular constructors are run.
     * @param {Date} targetDate new Date to use as mock, or null to use real Date value
     * @param {string} url URL to navigate to with browser.get, after Date mock has been prepared
     */
    function installMockedDateModuleAndLoadPage(targetDate, url) {
        const isoDate = targetDate.toISOString();
        browser.controlFlow().execute(() => uninstallMockedDateModule());
        browser.controlFlow().execute(() => installMockedDateModule(isoDate));
        browser.get(url);
    }

    /**
     * @param {Date} targetDate new Date to use as mock or null to use real Date value
     */
    function installMockedDate(targetDate) {
        const isoDate = targetDate.toISOString();
        browser.executeScript(function(isoDate) {
            window.__ptor_mocked_iso_date = isoDate;
        }, isoDate);
    }

    function disableMockedDate() {
        browser.executeScript(function() {
            window.__ptor_mocked_iso_date = null;
        });
    }

    function setTTSEnabled(enabled) {
        setToggleSwitchByCheckboxId('chkTTSEnabled', enabled);
    }

    function settingsSetTTSEnabled(enabled) {
        browser.get("#!/settings");
        setTTSEnabled(enabled);
    }

    function settingsSetFlexviewEnabled(enabled) {
        browser.get('#!/settings');
        var layoutSelect = element(by.model('$ctrl.executionViewLayout'));
        let layout = enabled ? 'Flexible Ansicht' : 'Standard-Ansicht';
        getSelectOptionByText(layoutSelect, layout).click();
    }

    function settingsSetFlexviewAlignment(alignment) {
        browser.get('#!/settings');
        var selectContentAlignment = element(by.model('$ctrl.executionViewFlexContentAlignment'));
        let alignText = alignment === 'left' ? 'Links' : 'Rechts';
        getSelectOptionByText(selectContentAlignment, alignText).click();
    }

    function setGamificationEnabled(enabled) {
        setToggleSwitchByCheckboxId('chkGamificationEnabled', enabled);
    }

    function settingsSetGamificationEnabled(enabled) {
        browser.get('index.html#!/settings');
        setGamificationEnabled(enabled);
    }

    function mockStubMespeak() {
        browser.addMockModule(ptor_mespeak, function () {
            console.log('Browser: register mock mespeak module');
            angular.module('mespeak')
                .service('mespeakLoader', ['$q', function($q) {
                    this.get = function() {
                        var deferred = $q.defer();
                        deferred.reject();
                        return deferred.promise;
                    };
                }]);
        });
    }

    function unmockStubMespeak() {
        browser.removeMockModule(ptor_mespeak);
    }

    function mockStudyReferences() {
        browser.addMockModule(ptor_settingsService, function() {
            console.log('Browser: register mock settingsService.availableStudyReferences');

            angular.module('rehagoal.settings')
                .value('availableStudyReferences', {
                    "validRef": {
                        startDate: new Date("2019-01-01T00:00:01"),
                        endDate: new Date("2022-12-31T23:59:59"),
                        studyName: "ValidStudy"
                    },
                    "invalidRef_sameDay": {
                        startDate: new Date("2019-01-02T23:59:59"),
                        endDate: new Date("2021-12-31T23:59:59"),
                        studyName: "InvalidStudy - start to soon"
                    },
                    "7469d43a4bbd43daab20835b9c506ff903a91b1c3f382301a7d06dfa401a3213": { // Password: "aa"
                        studyName: "Test Study",
                        referenceOptions: {
                            salt: "-@yR6J!cgj!)/4q8",
                            iterations: 100000,
                            keySize: 256
                        },
                        startDate: new Date("2019-01-01T00:00:01"),
                        endDate: new Date("2022-12-31T23:59:59")
                    }
                });
        });
        browser.get('index.html#!/overview');
    }

    function unmockStudyReferences() {
        browser.removeMockModule(ptor_settingsService);
    }

    function setStudyMode(active, reference) {
        let studyReference = "validRef";

        if (typeof active !== 'boolean') {
            throw new Error('expected parameter to be boolean');
        }

        if (reference) {
            if (typeof reference != "string") {
                throw new Error('expected parameter to be String');
            }
            studyReference = reference;
        }
        browser.executeScript(function(studyReference, active) {
            let settings = JSON.parse(window.localStorage.rehagoalSettings || '{}');
            settings['studyReferenceKey'] = studyReference;
            settings['studyModeEnabled'] = active;
            window.localStorage.rehagoalSettings = JSON.stringify(settings);
        }, studyReference, active);
    }

    function mockWebSpeechSynthesis(explicitResolve) {
        explicitResolve = !!explicitResolve || false;
        browser.addMockModule(ptor_ttsServices, function (explicitResolve) {
            function StubSpeakService() {
                this.speak = function() {};
                this.whenSupported = function() {
                    return new Promise(function(resolve, reject) {
                        reject("StubSpeakService is never supported");
                    });
                };
            }

            window.ptor_spoken = [];
            window.ptor_spoken_canceled_times = 0;
            window.ptor_spoken_resolves = [];
            console.log('Browser: register TTS mock module');
            angular.module('rehagoal.tts.services')
                .factory('webSpeechSynthesis', [function () {
                    var synth = {
                        onvoiceschanged: null,
                        paused: false,
                        pending: false,
                        speaking: true,
                        cancel: function() {
                            window.ptor_spoken_canceled_times++;
                        },
                        getVoices: function() {
                            return [{
                                localService: true,
                                lang: 'de-DE',
                                ptor_valid_voice: true
                            }];
                        },
                        pause: function() {
                            synth.paused = true;
                        },
                        resume: function() {
                            synth.paused = false;
                        },
                        speak: function(utterance) {
                            function resolveSpoken() {
                                utterance.onend && utterance.onend();
                            }
                            console.log('[ProtractorMockedTTS] speak', utterance);
                            if (explicitResolve) {
                                window.ptor_spoken_resolves.push(resolveSpoken);
                            } else {
                                resolveSpoken();
                            }
                            window.ptor_spoken.push(utterance);
                        },
                        addEventListener: function(type, listener, useCapture) {

                        }
                    };
                    return synth;
                }])
                .factory('webSpeechSynthesisUtterance', [function () {
                    return function() {
                        this.voice = null;
                        this.text = null;
                        this.onend = null;
                        this.onerror = null;
                    };
                }])
                .service('mespeakService', StubSpeakService)
                .service('cordovaSpeechService', StubSpeakService);
        }, explicitResolve);
        browser.get('index.html#!/overview');
    }

    function unmockWebSpeechSynthesis() {
        browser.removeMockModule(ptor_ttsServices);
    }

    function mockedTTSClearSpoken() {
        browser.executeScript(function() {
            window.ptor_spoken = [];
        });
    }

    function mockedTTSResolveLastSpoken() {
        browser.executeScript(function() {
            if (window.ptor_spoken_resolves.length === 0) {
                return;
            }
            window.ptor_spoken_resolves.pop()();
        });
    }

    function mockedTTSGetSpoken() {
        return browser.executeScript(function () {
            return window.ptor_spoken;
        });
    }

    function mockedTTSGetLastSpokenTexts() {
        return mockedTTSGetSpoken().then(function(utterances) {
            var texts = [];
            for (var i = 0; i < utterances.length; ++i) {
                texts.push(utterances[i].text);
            }
            return texts;
        });
    }

    function mockedTTSGetLastSpokenTextsJoined() {
        return mockedTTSGetLastSpokenTexts().then(function(texts) {
            return texts.join('\n');
        });
    }

    function getLoginMenuButton() {
        return filterDisplayed(element.all(by.css('a[ng-click="loginModalCtrl.showLoginModal()"]'))).first();
    }

    function getLoginCloseButton(modal) {
        return modal.element(by.css('button[aria-label="Close"]'));
    }

    function getLoginSubmitButton(modal) {
        return modal.element(by.css('button[ng-click="$ctrl.onLogin()"]'));
    }

    function getLoginUsername(modal) {
        return modal.element(by.css('input[name="username"]'));
    }

    function getLoginPassword(modal) {
        return modal.element(by.css('input[name="password"]'));
    }

    function getLogoutButton(modal) {
        return modal.element(by.css('button[ng-click="$ctrl.onLogout()"]'));
    }

    function getImageFileInput() {
        return $('input[type="file"]#inputImageFile');
    }

    function getImageFilenameInput() {
        return $('input#filename');
    }

    function getImageSaveButton() {
        return $('button#saveImage');
    }

    function getImageRemoveButton() {
        return $('button#removeImage');
    }

    function getFlowEditViewStartButton() {
        return $$('.glyphicon-play').first();
    }

    function getImageSource(imageElement) { // => Promise<string|null>
        return imageElement.getCssValue('background-image').then((bgImage) => {
            if (bgImage === null) {
                throw Error('No background-image found!');
            }
            const cssUrlRegex = /url\(['"](blob:[^'"]*)['"]\)/;
            let match = cssUrlRegex.exec(bgImage);
            if (!match) {
                throw Error('Could not match background-image!');
            }
            return match[1];
        }).catch((e) => {
            return imageElement.getAttribute('src');
        });
    }

    function getImageDataUrl(imgElement) {
        return getImageSource(imgElement).then((src) => {
            return browser.executeAsyncScript(
                function (src, callback) {
                    fetch(src).then((response) => {
                        return response.blob();
                    }).then((blob) => {
                        let reader = new FileReader();
                        reader.addEventListener('load', (e) => {
                            callback(e.target.result);
                        });
                        reader.readAsDataURL(blob);
                    });
                }, src
            );
        });
    }

    function loadFileAsBase64(path) {
        let fs = require('fs');
        let file = fs.readFileSync(path);
        return file.toString('base64');
    }

    function dataUrlToBase64(dataUrl) {
        return dataUrl.split(',')[1];
    }

    function getImageSelect() {
        return element(by.id('imageSelect'));
    }

    function getImageSelection() {
        return getImageSelect().element(by.css('option:checked'));
    }

    function getImageSelectionText() {
        return getImageSelection().getText();
    }

    function getUploadImageButton() {
        return element(by.id("imageFileUpload"));
    }

    function triggerUploadClick() {
        const waitTime = 10000;
        const command = "document.querySelector('#imageFileUpload').click();";

        browser.executeScript(command).then(() => {
            browser.wait(EC.invisibilityOf(element(by.id("imageUploadPreview"))), waitTime, "Expected upload preview to not be visible");
            browser.wait(EC.not(EC.elementToBeClickable(element(by.id("saveImage")))), waitTime, "Expected save button not to be clickable");
            browser.wait(EC.not(EC.presenceOf(element(by.id("imageUploadError")))), waitTime, "Expected error window to be absent");
        });
    }

    function getImageUploadedPreview() {
        return element(by.id("imageUploadPreview"));
    }

    function getImageSavedPreview() {
        return element(by.id("imagePreview"));
    }

    function getImageSizeWarningResizingEnabled() {
        return element(by.id('sizeWarningResizeEnabled'));
    }

    function getImageSizeWarningResizingDisabled() {
        return element(by.id('sizeWarningResizeDisabled'));
    }

    function getImageUploadErrorWarning() {
        return element(by.id("imageUploadError"));
    }

    function getWorkflowCount() {
        return element.all(by.repeater('workflow in $ctrl.workflows')).count();
    }

    function uploadImageFile(relativePath, skipWaitForPreview) {
        var path = require('path');
        var absolutePath = path.resolve(__dirname, relativePath);
        getImageFileInput().sendKeys(absolutePath);
        if (!skipWaitForPreview) {
            browser.wait(EC.visibilityOf(element(by.id("imageUploadPreview"))),2500, "Expected uploaded image to be previewed");
        }
    }

    function uploadImageFileAndSave(relativePath, imageName, skipWaitForSave) {
        let oldImageSource;
        browser.wait(() => element(by.id("imageUploadPreview")).getAttribute('src').then(oldImageSrc => {
            oldImageSource = oldImageSrc;
            return true;
        }), 1500);
        uploadImageFile(relativePath);
        browser.wait(() => element(by.id("imageUploadPreview")).getAttribute('src')
            .then(newImageSrc => newImageSrc !== oldImageSource), 2500, "Expected uploaded image to be previewed and selected.");
        getImageFilenameInput().clear().sendKeys(imageName);
        browser.wait(EC.elementToBeClickable(getImageSaveButton()), 1500, "Expected save button to be clickable");
        getImageSaveButton().click();

        if (skipWaitForSave) {
            return;
        }
        browser.wait(() => element(by.id("imageSelect"))
            .element(by.css('option:checked')).getText()
            .then(text => text === imageName,
                     () => false)
        );
    }

    function loginTestUser() {
        var username = "testuser", password = "e2e_test-rehagoal";
        browser.get('index.html#!/overview');
        getLoginMenuButton().click();
        var loginModal = getModal();
        var userInput = getLoginUsername(loginModal);
        var passInput = getLoginPassword(loginModal);
        var submitBtn = getLoginSubmitButton(loginModal);

        userInput.sendKeys(username);
        passInput.sendKeys(password);
        submitBtn.click();
        browser.wait(EC.not(EC.presenceOf(loginModal)), 3000);
    }

    function logout() {
        getLoginMenuButton().click();
        var loginModal = getModal();

        var logoutBtn = getLogoutButton(loginModal);
        logoutBtn.click();
        getLoginCloseButton(loginModal).click();
        browser.wait(EC.not(EC.presenceOf(loginModal)), 3000);
    }

    function deleteAllFilesInDirectory(path) {
        var fs = require('fs');
        var files = fs.readdirSync(path);
        files.forEach(function (file) {
            fs.unlinkSync(path + '/' + file);
        });
    }

    const downloadFolder = '/tmp/e2e-tests/downloads';
    function createCleanTemporaryFolder() {
        var fs = require('fs');
        var mkdirp = require('mkdirp');
        mkdirp(downloadFolder);
        browser.wait(function () {
            try {
                fs.accessSync(downloadFolder, fs.F_OK);
                deleteAllFilesInDirectory(downloadFolder);
                return true;
            } catch (err) {
                return false;
            }
        }, 1000);
    }

    const testLightbox = function (img) {
        img.click();
        const lightbox = getModal();
        browser.wait(EC.visibilityOf(lightbox), 3000, "Clicking on an image should open a lightbox");
        const lightboxImage = lightbox.$("img");
        since("Lightbox image should be displayed").expect(lightboxImage.isDisplayed()).toBe(true);
        const lightboxImageSrc = img.getAttribute("src");
        since("Lightbox image should be a blob").expect(lightboxImageSrc).toMatch(/blob:\S+/);
        lightboxImage.click();
        browser.wait(EC.invisibilityOf(lightbox), 3000, "Clicking on the image in the lightbox should close the lightbox");
        return lightboxImageSrc;
    };

    function getToggleSwitchByCheckBoxId(id) {
        return element.all(by.tagName('toggle-switch')).filter(function(elem) {
            return elem.getAttribute("id-checkbox").then(function(currentCheckBoxId) {
                return currentCheckBoxId === id;
            });
        }).first();
    }

    function getToggleSwitchStatePromiseById(id) {
        const toggleSwitch = getToggleSwitchByCheckBoxId(id);
        const toggleSwitchInput = toggleSwitch.element(by.tagName("input"));
        return toggleSwitchInput.isSelected();
    }

    function setToggleSwitchByCheckboxId(id, enabled) {
        const toggleSwitch = getToggleSwitchByCheckBoxId(id);
        const toggleSwitchInput = toggleSwitch.element(by.tagName("input"));

        const toggleEnabled = function() {
            return toggleSwitchInput.getAttribute("disabled").then(function(current) {
                return current !== "disabled";
            });
        };

        browser.wait(toggleEnabled, 1500, `ToggleSwitch ${id} was not enabled`);

        toggleSwitchInput.isSelected().then((currentState) => {
            if (currentState !== enabled) {
                toggleSwitch.click();
            }
        });

        const correctState = function() {
            return toggleSwitchInput.isSelected().then(function(current) {
                return current === enabled;
            });
        };

        const reason = `${id} should be ${enabled} now but is not`;
        browser.wait(correctState, 1500, reason);
        since(reason).expect(toggleSwitchInput.isSelected()).toBe(enabled);
    }

    function getGamificationNavbarFromMenuBar() {
        return filterDisplayed(element.all(by.css('.navbar')).all(by.tagName('navbar-gamification'))).first();
    }

    function getGamificationNavbarProgressBarPoints(navbarElement = null) {
        navbarElement = navbarElement || getGamificationNavbarFromMenuBar();
        let navbarProgressbarElement = navbarElement.all(by.css('.gamification-progress')).all(by.css('.progress-bar')).first();
        return navbarProgressbarElement.getAttribute('aria-valuenow');
    }

    function getGamificationNavbarLevelElement(navbarElement = null) {
        navbarElement = navbarElement || getGamificationNavbarFromMenuBar();
        return filterDisplayed(navbarElement.all(by.css('.gamification-level'))).first();
    }

    function getGamificationNavbarLevel(navbarElement = null) {
        const navbarLevelElement = getGamificationNavbarLevelElement(navbarElement);
        return navbarLevelElement.all(by.tagName('text')).first().getText();
    }

    function getGamificationNavbarIconStyleHref(navbarElement = null) {
        navbarElement = navbarElement || getGamificationNavbarFromMenuBar();
        const navbarIconElement = navbarElement.all(by.css('.gamification-icon-wrapper')).first();
        return navbarIconElement.all(by.tagName('svg')).first().all(by.tagName('use')).first().getAttribute("href");
    }

    function waitForGamificationNavbarLoaded() {
        browser.wait(EC.presenceOf(getGamificationNavbarFromMenuBar()), 1000);
    }

    function getGamificationNavbarAddedPointsElements() {
        return filterDisplayed(element.all(by.css('.points-animation-element')));
    }

    function getGamificationNavbarAddedPointsContainer() {
        return filterDisplayed(element.all(by.css('.points-animation-container'))).first();
    }

    function getGamificationNavbarIconColor() {
        return getGamificationNavbarLevelElement().all(by.tagName('use')).first().getAttribute('class');
    }

    function getGamificationNavbarConfettiContainer() {
        return filterDisplayed(element.all(by.css('.confetti-container'))).first();
    }

    function getWindowGamificationAddedPointsPromise() {
        return browser.executeScript(() => {
            return window.ptor_gamification.addedPoints;
        });
    }

    function getWindowGamificationLevelElementPromise() {
        return browser.executeScript(() => {
            return window.ptor_gamification.levelElementClassList;
        });
    }

    function getWindowGamificationConfettiContainerPromise() {
        return browser.executeScript(() => {
            return window.ptor_gamification.confettiContainerClassList;
        });
    }

    function waitForGamificationNavbarAddedPointsAnimationEnd() {
        browser.wait(EC.invisibilityOf(getGamificationNavbarAddedPointsElements().first()), 2300, "addedPoints animation element did not disappear");
    }

    const LEVELUP_ANIMATION_CLASS_NAME = 'animated-level-up';
    const CONFETTI_ANIMATION_CLASS_NAME = 'animate-confetti';

    function expectLevelUpNotAnimating() {
        since('level element should not be animated')
            .expect(getGamificationNavbarLevelElement().getAttribute('class')).not.toContain(LEVELUP_ANIMATION_CLASS_NAME);
        since('levelup confetti should not be animated')
            .expect(getGamificationNavbarConfettiContainer().getAttribute('class')).not.toContain(CONFETTI_ANIMATION_CLASS_NAME);
    }

    /*
                 * Protractor inherently waits for angular events and processes to be completed. This includes animation events.
                 * Thus, attempting to get a class list during animation (i.e. before "animationend") is not possible
                 * these promises return the classLists after "animationstart" but before "animationend".
                 * Any getAttribute calls on their respective elements in protractor will inevitably come after "animationend"
                 */
    function setUpGamificationTestUtilities() {
        createWindowGamificationObject();
        registerAddedPointsListener();
        registerLevelUpListener();

        function createWindowGamificationObject() {
            browser.executeScript(() => {
                window.ptor_gamification = {};
            });
        }
        function registerAddedPointsListener() {
            const addedPointsContainer = getGamificationNavbarAddedPointsContainer();

            browser.executeScript(() => {
                window.ptor_gamification.addedPoints = [];
                const cache = []; //cache object references in-browser for addedPoints elements to avoid counting them more than once
                const addedPointsContainer = arguments[0];
                const addedPointsEventListener = () => {
                    for (let child of addedPointsContainer.children) {
                        if (!cache.includes(child)) {
                            cache.push(child);
                            window.ptor_gamification.addedPoints.push(child.innerHTML);
                        }
                    }
                };
                window.ptor_gamification.removeAddedPointsEventListener = () => {
                    addedPointsContainer.removeEventListener("animationstart", addedPointsEventListener);
                };
                addedPointsContainer.addEventListener("animationstart", addedPointsEventListener);
            }, addedPointsContainer);
        }
        function registerLevelUpListener() {
            const levelElement = getGamificationNavbarLevelElement();
            const confettiContainer = getGamificationNavbarConfettiContainer();

            browser.executeScript(() => {
                const levelElement = arguments[0];
                const confettiContainer = arguments[1];
                const levelUpEventListener = () => {
                    /* [...classlist] takes copy of classList, as we want the contents, not reference */
                    window.ptor_gamification.levelElementClassList = [...levelElement.classList];
                    window.ptor_gamification.confettiContainerClassList = [...confettiContainer.classList];
                };
                window.ptor_gamification.removeLevelUpEventListener = () => {
                    levelElement.removeEventListener("animationstart", levelUpEventListener);
                };
                levelElement.addEventListener("animationstart", levelUpEventListener);
            }, levelElement, confettiContainer);
        }
    }

    function tearDownGamificationTestUtilities() {
        unregisterAddedPointsListener();
        unregisterLevelUpListener();
        deleteWindowGamificationObject();
        clearDB('gamificationDB');

        function deleteWindowGamificationObject() {
            browser.executeScript(() => {
                delete window.ptor_gamification;
            });
        }
        function unregisterAddedPointsListener() {
            browser.executeScript(() => {
                if (window.ptor_gamification) {
                    window.ptor_gamification.removeAddedPointsEventListener();
                }
            });
        }
        function unregisterLevelUpListener() {
            browser.executeScript(() => {
                if (window.ptor_gamification) {
                    window.ptor_gamification.removeLevelUpEventListener();
                }
            });
        }
    }

    it('should automatically redirect to /overview when location hash/fragment is empty', function () {
        browser.get('index.html');
        expect(browser.getCurrentUrl()).toMatch("/overview");
    });

    describe('app name', function() {
        beforeAll(function() {
            browser.get('index.html');
        });

        it('should have navBrand "RehaGoal"', function() {
            expect(element(by.css('nav.navbar .navbar-brand')).getText()).toEqual('RehaGoal');
        });

        it('should have page title "RehaGoal"', function() {
            expect(browser.getTitle()).toEqual('RehaGoal');
        });
    });

    describe('menubar', function() {
        describe('menubar navigation', function() {
            beforeEach(function () {
                browser.get('index.html');
            });
            afterEach(clearWebStorage);

            it('should render schedulingView when user navigates to /scheduling', function () {
                element(by.linkText('Ablaufplanung')).click();
                expect(getPageTitle()).toMatch(/Ablaufplanung/);
            });

            it('should render plannerView when user navigates using calendar icon', function () {
                element(by.css('.glyphicon.glyphicon-calendar')).click();
                expect(getPageTitle()).toMatch(/Terminplanung/);
            });

            it('should render overviewView when user navigates to /overview', function () {
                element.all(by.css(".glyphicon.glyphicon-question-sign")).click();
                element(by.linkText('Übersicht')).click();
                expect(getPageTitle()).toMatch(/Workflow-Übersicht/);
            });

            it('should render overviewView when user navigates clicks on the RehaGoal-Logo', function () {
                element.all(by.css(".glyphicon.glyphicon-question-sign")).click();
                element(by.linkText('RehaGoal')).click();
                expect(getPageTitle()).toMatch(/Workflow-Übersicht/);
            });

            it('should render helpView when user navigates to /help', function() {
                element.all(by.css(".glyphicon.glyphicon-question-sign")).click();
                expect(getPageTitle()).toMatch(/Hilfebereich/);
            });

            it('should render settingsView when user navigates to /settings', function() {
                element.all(by.css(".glyphicon.glyphicon-cog")).click();
                expect(getPageTitle()).toMatch(/Einstellungen/);
            });
        });

        describe('gamification navbar element', function() {

            beforeAll(function() {
                settingsSetGamificationEnabled(true);
                clearDB('gamificationDB');

                browser.get('index.html#!/overview');
                importTestfile("singleTask.json");
                importTestfile("taskBlock.json");
                getNewWorkflowButton().click();
            });

            afterAll(function() {
                clearDB('gamificationDB');
                clearWebStorage();
            });

            it('should open gamificationDashboardView if navbar is clicked', () => {
                waitForGamificationNavbarLoaded();
                filterDisplayed(element.all(by.css('.navbar')).all(by.css('.gamification-progress'))).click();
                expect(browser.getCurrentUrl()).toMatch(/\/gamification/);
            });

            describe('gamification animations tests', function() {
                beforeAll(function() {
                    browser.get('index.html#!/overview')
                });

                beforeEach(function() {
                    /* should wait for initializing */
                    waitForGamificationNavbarLoaded();
                    setUpGamificationTestUtilities();
                });

                afterEach(function() {
                    tearDownGamificationTestUtilities();
                    browser.get('index.html#!/overview');
                });

                it('should show an addedPoints animation when workflow is started', function() {
                    /* state before: no addedPoints animation element should exist*/
                    since('#{expected} addedPoints animation element should exist, but #{actual} exist')
                        .expect(getGamificationNavbarAddedPointsElements().count()).toEqual(0);

                    /* trigger points animation */
                    const workflow = getWorkflowsForName("Protractor::singleTask").first();
                    getStartButton(workflow).click();
                    waitForExecutionComponentLoaded();
                    waitForGamificationNavbarLoaded();


                    /* state during animation: exactly one element should exist, as only one is triggered */
                    browser.wait(getWindowGamificationAddedPointsPromise().then((addedPoints) => {
                        /* returns count of addedPoints Event after animationstart event, but before animationEnd event */
                        since('addedPoints animation elements should appear exactly as #{expected} (start), but #{actual} appeared')
                            .expect(addedPoints).toEqual(['+5']);
                    }), 500, 'windowGamificationAddedPointsPromise did not resolve');

                    /* state after: no more elements should exist */
                    waitForGamificationNavbarAddedPointsAnimationEnd();
                });
                it('should make an addedPoints animation element appear and then disappear when as task is completed, as task completion grants points', function() {
                    const workflow = getWorkflowsForName("Protractor::taskBlock").first();
                    getStartButton(workflow).click();

                    /* state before: no addedPoints animation element should exist (waiting for workflow start points animation to disappear) */
                    waitForGamificationNavbarAddedPointsAnimationEnd();

                    /* trigger points animation */
                    waitForExecutionComponentLoaded();
                    automateWorkflow([
                        {instruction: 'ok'}
                    ]);

                    /* state during animation: exactly one element should exist, as only one is triggered */
                    browser.wait(getWindowGamificationAddedPointsPromise().then((addedPoints) => {
                        /* returns addedPoints elements after animationstart event, but before animationEnd event */
                        since('addedPoints animation elements should appear exactly as #{expected} (start, taskDone), but #{actual} appeared')
                            .expect(addedPoints).toEqual(['+5', '+1']);
                    }), 500, 'windowGamificationAddedPointsPromise did not resolve');

                    /* state after: no more elements should exist */
                    waitForGamificationNavbarAddedPointsAnimationEnd();
                });
                it('addedPoints should have an entry for each task if multiple tasks are done', function() {
                    const workflow = getWorkflowsForName("Protractor::taskBlock").first();
                    getStartButton(workflow).click();

                    /* state before: no addedPoints animation element should exist (waiting for workflow start points animation to disappear) */
                    waitForGamificationNavbarAddedPointsAnimationEnd();
                    waitForExecutionComponentLoaded();
                    automateWorkflow([
                        {instruction: 'ok'},
                        {instruction: 'ok'},
                        {instruction: 'ok'}
                    ]);

                    /* state during animation: exactly one element should exist, as only one is triggered */
                    browser.wait(getWindowGamificationAddedPointsPromise().then((addedPoints) => {
                        /* returns addedPoints elements after animationstart event, but before animationEnd event */
                        since('exactly #{expected} addedPoints animation elements should appear exactly as #{expected} (start, taskDone, taskDone and taskDone), but #{actual} appeared')
                            .expect(addedPoints).toEqual(['+5', '+1', '+1', '+1']);
                    }), 500, 'windowGamificationAddedPointsPromise did not resolve');

                    /* state after: no more elements should exist */
                    waitForGamificationNavbarAddedPointsAnimationEnd();
                });
                it('should make an addedPoints animation element appear and then disappear when a workflow is finished, as workflow execution completion grants points', function() {
                    const workflow = getWorkflowsForName("Protractor::singleTask").first();
                    getStartButton(workflow).click();

                    /* state before: no addedPoints animation element should exist (waiting for workflow start points animation to disappear)*/
                    waitForGamificationNavbarAddedPointsAnimationEnd();

                    /* trigger points animation */
                    waitForExecutionComponentLoaded();
                    automateWorkflow([
                        {instruction: 'ok'}
                    ]);

                    /* state during animation: exactly one element should exist, as only one is triggered */
                    browser.wait(getWindowGamificationAddedPointsPromise().then((addedPoints) => {
                        /* returns count of addedPoints Event after animationstart event, but before animationEnd event*/
                        since('exactly #{expected} addedPoints animation elements should appear exactly as #{expected} (start, taskDone, finish), but #{actual} appeared')
                            .expect(addedPoints).toEqual(['+5', '+1', '+10']);
                    }), 500, 'windowGamificationAddedPointPromise did not resolve');

                    /* state after: no more elements should exist */
                    waitForGamificationNavbarAddedPointsAnimationEnd();
                });
                it('should animate the level icon and confetti and change color on levelup', function() {
                    /* state before: element should not be animated yet, level should be 1 */
                    expectLevelUpNotAnimating();
                    since('level on start should be #{expected} but was #{actual}')
                        .expect(getGamificationNavbarLevel()).toEqual("1");
                    const originalIconColor = getGamificationNavbarIconColor();


                    /* trigger levelUp by fast completion of two workflows*/
                    const workflow = getWorkflowsForName("New Workflow").first();
                    getStartButton(workflow).click();
                    waitForExecutionComponentLoaded();
                    /* using browser.get reloads page. After a page reload, all objects manipulated into the window object will be gone which ruins the test run. Thus, link in browser is clicked. */
                    element(by.linkText('Übersicht')).click();
                    getStartButton(workflow).click();
                    waitForExecutionComponentLoaded();

                    /* state during animation: correct animation classes should have been added at "animationstart" event
                     returns snapshot of classList of levelElement directly after animationstart event */
                    browser.wait(getWindowGamificationLevelElementPromise().then((levelElementClassList) => {
                            /* tate during animation: levelElement should have class animated-level-up at "animationstart" event */
                            since('level element should have animated-level-up class, but actual classes were #{actual}')
                                .expect(levelElementClassList).toContain(LEVELUP_ANIMATION_CLASS_NAME);
                            /* state after: element should no longer be animated after "animationend" event */
                            since('level element should no longer be animated, but it was')
                                .expect(getGamificationNavbarLevelElement().getAttribute('class')).not.toContain(LEVELUP_ANIMATION_CLASS_NAME);
                        }), 500, 'windowGamificationLevelElementPromise did not resolve');
                    browser.wait(getWindowGamificationConfettiContainerPromise()
                        .then((confettiContainerClassList) => {
                            /* returns snapshot of classList of confettiContainer directly after animationstart event*/
                            /* state during animation: levelElement should have class animated-level-up */
                            since('confetti container should have animate-confetti class, but actual classes were #{actual}')
                                .expect(confettiContainerClassList).toContain(CONFETTI_ANIMATION_CLASS_NAME);
                            /* state after: element should no longer be animated after "animationend" event */
                            since('levelup confetti should no longer be animated, but it was')
                                .expect(getGamificationNavbarConfettiContainer().getAttribute('class')).not.toContain(CONFETTI_ANIMATION_CLASS_NAME);
                        }), 500, 'windowGamificationConfettiContainerPromise did not resolve');

                    /* state after: element should not be animated yet, level should be 2, color should have changed */
                    expectLevelUpNotAnimating();
                    since('level on start should be #{expected} but was #{actual}')
                        .expect(getGamificationNavbarLevel()).toEqual("2");
                    since('icon color should have changed but it did not change')
                        .expect(originalIconColor).not.toEqual(getGamificationNavbarIconColor());
                });
            });
        });
    });

    describe('overviewView', function () {
        beforeEach(function () {
            browser.get('index.html#!/overview');
        });

        function getServerExportButton() {
            return filterDisplayed(element.all(by.css('button[title="Server Export"]'))).first();
        }

        function getServerImportButton() {
            return filterDisplayed(element.all(by.css('button[ng-click="$ctrl.overviewCtrl.requestServerImportModal()"]'))).first();
        }

        function createImportIntent(uri) {
            getServerImportButton().click();
            var modal = getModal();
            browser.wait(EC.presenceOf(modal));
            modal.element(by.model('$ctrl.userInput')).sendKeys(uri);
            modal.element(by.css('[ng-click="$ctrl.onConfirm()"]')).click();
        }

        it('should render overviewView when user navigates to /overview', function () {
            expect(getPageTitle()).toMatch(/Workflow-Übersicht/);
        });
        it("should create new Workflow, when 'Neuer Workflow' is clicked", function () {
            getWorkflowCount().then(function (startCount) {
                element(by.buttonText("Neuer Workflow")).isDisplayed().then(function (visible) {
                    if (visible) {
                        element(by.buttonText("Neuer Workflow")).click();
                    } else {
                        element(by.buttonText("Neu")).click();
                    }
                });
                getWorkflowCount().then(function (endCount) {
                    expect((startCount++) === endCount);
                });
            });
        });
        it("should NOT rename new Workflow, when 'umbenennen' is declined", function () {
            var workflow = element(by.repeater('workflow in $ctrl.workflows').row(0));
            getRenameButton(workflow).click();
            var input = element(by.model("$parent.$data")).clear();
            input.sendKeys("Testing");
            element.all(by.css(".glyphicon.glyphicon-remove")).click();
            workflow = element(by.repeater('workflow in $ctrl.workflows').row(0));
            workflow.getText().then(function (descr) {
                expect(descr).toMatch(/New Workflow/);
            });
        });
        it("should rename new Workflow, when 'umbenennen' is accepted", function () {
            var workflowRow = element(by.repeater('workflow in $ctrl.workflows').row(0));
            workflowRow.element(by.buttonText("Umbenennen")).isDisplayed().then(function (visible) {
                if (visible) {
                    workflowRow.element(by.buttonText("Umbenennen")).click();
                } else {
                    workflowRow.element(by.css(".glyphicon.glyphicon-pencil")).click();
                }
            });
            var input = element(by.model("$parent.$data")).clear();
            input.sendKeys("Testing");
            element.all(by.css(".glyphicon.glyphicon-ok")).click();
            workflowRow.getText().then(function (descr) {
                expect(descr.indexOf("Testing") !== -1);
            });
        });
        it("should NOT delete new Workflow, when 'loeschen' is declined", function () {
            var workflow = getWorkflowsForName('Test Workflow').first();
            deleteWorkflowIfAccept(workflow, false);
            expect(workflow.isPresent()).toBe(true);
        });
        it("should rename a workflow to a new name, when the name is already in use", function () {
            getNewWorkflowButton().click();
            getNewWorkflowButton().click();
            var workflow1 = element(by.repeater('workflow in $ctrl.workflows').row(1));
            var workflow2 = element(by.repeater('workflow in $ctrl.workflows').row(2));
            renameWorkflow(workflow1, "New Workflow (2)");
            expect(workflow1.element(by.binding('workflow.name')).getText()).toBe("New Workflow (3)");
            renameWorkflow(workflow2, "New Workflow (3)");
            expect(workflow2.element(by.binding('workflow.name')).getText()).toBe("New Workflow (4)");
            renameWorkflow(workflow2, "New Workflow (3)");
            expect(workflow2.element(by.binding('workflow.name')).getText()).toBe("New Workflow (4)");
            renameWorkflow(workflow1, "New Workflow");
            expect(workflow1.element(by.binding('workflow.name')).getText()).toBe("New Workflow");
            clearWebStorage();
        });
        it('should order workflows matching selected order type', function () {
            var sortButton = filterDisplayed(element.all(by.id('dropdown-sort-workflow'))).first();
            var sortNameAsc =  filterDisplayed(element.all(by.id('dropdown-sort-workflow-name-asc'))).first();
            var sortCreatedDesc = filterDisplayed(element.all(by.id('dropdown-sort-workflow-created-desc'))).first();

            var workflow = getWorkflowsForName('Test Workflow').first();
            deleteWorkflowIfAccept(workflow, true);
            browser.wait(EC.not(EC.presenceOf(getEditButton(workflow))), 2000);


            getNewWorkflowButton().click(); // New Workflow
            getNewWorkflowButton().click(); // New Workflow (2)

            // order by name ascending
            sortButton.click();
            sortNameAsc.click();
            browser.sleep(1000);

            element.all(by.repeater('workflow in $ctrl.workflows')).then(function(workflow) {
                var workflowTitle1 = workflow[0].element(by.tagName('i'));
                var workflowTitle2 = workflow[1].element(by.tagName('i'));
                expect(workflowTitle1.getText()).toEqual('New Workflow');
                expect(workflowTitle2.getText()).toEqual('New Workflow (2)');
            });

            // order by creation ascending
            sortButton.click();
            sortCreatedDesc.click();
            browser.sleep(1000);

            element.all(by.repeater('workflow in $ctrl.workflows')).then(function(workflow) {
                var workflowTitle1 = workflow[0].element(by.tagName('i'));
                var workflowTitle2 = workflow[1].element(by.tagName('i'));
                expect(workflowTitle1.getText()).toEqual('New Workflow (2)');
                expect(workflowTitle2.getText()).toEqual('New Workflow');
            });
            clearWebStorage();
        });
        it("should delete new Workflow, when 'loeschen' is accepted", function () {
            var workflow = getWorkflowsForName('Test Workflow').first();
            deleteWorkflowIfAccept(workflow, true);
            browser.wait(EC.not(EC.presenceOf(getEditButton(workflow))), 2000);
            expect(workflow.isPresent()).toBe(false);
            clearWebStorage();
        });
        it("should import an uploaded workflow", function () {
            importTestfile('singleTask.json');
            var workflows = element.all(by.repeater('workflow in $ctrl.workflows')).filter(function (workflow) {
                return workflow.element(by.binding('workflow.name')).getText().then(function (name) {
                    return name === 'Protractor::singleTask';
                });
            });
            expect(workflows.count()).toEqual(1);
            clearWebStorage();
            clearFileDB();
        });
        it("should import an uploaded workflow twice, if uploaded twice", function () {
            for (var i = 0; i < 2; ++i) {
                importTestfile('singleTask.json');
                importTestfile('', true); // clear the file upload
            }
            var workflows1 = getWorkflowsForName('Protractor::singleTask');
            var workflows2 = getWorkflowsForName('Protractor::singleTask (2)');
            expect(workflows1.count()).toEqual(1);
            expect(workflows2.count()).toEqual(1);
            clearWebStorage();
            clearFileDB();
        });
        it("should show notification, when exporting with no workflows selected", function () {
            getExportButton().click();
            var modal = getModal();
            expect(modal.isPresent()).toBe(true);
            expect(modal.isDisplayed()).toBe(true);
            expect(getModalText(modal)).toMatch(/Die Auswahl ist leer/);
            modalOK(modal);
            expect(getModal().isPresent()).toBe(false);
        });
        it("should export a single selected workflow, when export is clicked", function () {
            createCleanTemporaryFolder();

            const workflow = getWorkflowsForName('Test Workflow').first();
            workflow.element(by.css('input[type=checkbox]')).click();
            getExportButton().click();
            const filenameRegex = /test_workflow/;
            browser.wait(function () {
                const fs = require('fs');
                const filenames = fs.readdirSync(downloadFolder);
                return filenames.some((filename) => filename.match(filenameRegex));
            }, 1000, `Timeout while waiting for a file matching ${filenameRegex} in ${downloadFolder}`);
            browser.sleep(1000);
            expect(getModal().isPresent()).toBeFalsy();
            clearWebStorage();
        });
        it("should export multiple selected workflows, when export is clicked", function () {
            createCleanTemporaryFolder();

            importTestfile('goalTimer.json');
            importTestfile('test-workflow.json');
            importTestfile('singleTask.json');
            expect(getWorkflowsForName('Test Workflow').count()).toBe(1);
            expect(getWorkflowsForName('Test Workflow (2)').count()).toBe(1);
            expect(getWorkflowsForName('Protractor::goalTimer').count()).toBe(1);
            expect(getWorkflowsForName('Protractor::singleTask').count()).toBe(1);

            getWorkflowsForName('Protractor::goalTimer').first().element(by.css('input[type=checkbox]')).click();
            getWorkflowsForName('Protractor::singleTask').first().element(by.css('input[type=checkbox]')).click();
            getExportButton().click();
            const filenameRegex = /rehagoal-export/;
            browser.wait(function () {
                const fs = require('fs');
                const filenames = fs.readdirSync(downloadFolder);
                return filenames.some((filename) => filename.match(filenameRegex));
            }, 1000, `Timeout while waiting for a file matching ${filenameRegex} in ${downloadFolder}`);
            browser.sleep(1000);
            expect(getModal().isPresent()).toBeFalsy();
            clearWebStorage();
        });
        it("should duplicate a workflow, when 'Duplizieren' is clicked", function () {
            var testWorkflow = getWorkflowsForName('Test Workflow').first();
            expect(getWorkflowCount()).toBe(1);
            getDuplicateButton(testWorkflow).click();
            var testWorkflowCopy1 = getWorkflowsForName('Test Workflow (2)').first();
            browser.wait(EC.elementToBeClickable(getEditButton(testWorkflowCopy1)), 2000);
            expect(getWorkflowCount()).toBe(2);
            expect(testWorkflowCopy1.isPresent()).toBe(true);
            getDuplicateButton(testWorkflowCopy1).click();
            var testWorkflowCopy2 = getWorkflowsForName('Test Workflow (3)').first();
            browser.wait(EC.elementToBeClickable(getEditButton(testWorkflowCopy2)), 2000);
            expect(getWorkflowCount()).toBe(3);
            expect(testWorkflowCopy2.isPresent()).toBe(true);
            clearWebStorage();
        });
        it("should display only workflows matching the filter text", function () {
            let workflow = getWorkflowsForName('Test Workflow').first();
            deleteWorkflowIfAccept(workflow, true);
            browser.wait(EC.not(EC.presenceOf(getEditButton(workflow))), 2000);
            let workflows = element.all(by.repeater('workflow in $ctrl.workflows'));
            browser.wait(EC.not(EC.textToBePresentInElementValue(workflows, 'Test Workflow')), 1000, "Should not display test workflow!");
            let alert = element(by.css('div[role="alert"]'));
            expect(alert.isPresent()).toBe(true);
            expect(alert.isDisplayed()).toBe(true);
            let filter = getWorkflowFilter();

            // Empty workflow list
            filter.sendKeys("testfilter1");
            expect(getWorkflowCount()).toBe(0);
            expect(alert.isPresent()).toBe(true);
            expect(alert.isDisplayed()).toBe(true);
            filter.clear();
            expect(getWorkflowCount()).toBe(0);
            expect(alert.isPresent()).toBe(true);
            expect(alert.isDisplayed()).toBe(true);

            // by title
            getNewWorkflowButton().click(); // New Workflow
            getNewWorkflowButton().click(); // New Workflow (2)
            getNewWorkflowButton().click(); // New Workflow (3)

            let workflow1 = getWorkflowsForName('New Workflow').first();
            let workflow2 = getWorkflowsForName('New Workflow (2)').first();
            let workflow3 = getWorkflowsForName('New Workflow (3)').first();
            expect(getWorkflowCount()).toBe(3);
            expect(workflow1.isPresent()).toBe(true);
            expect(workflow2.isPresent()).toBe(true);
            expect(workflow3.isPresent()).toBe(true);

            filter.sendKeys("New");
            expect(getWorkflowCount()).toBe(3);
            filter.sendKeys(" Workflow");
            expect(getWorkflowCount()).toBe(3);
            filter.sendKeys(" (2");
            expect(getWorkflowCount()).toBe(1);
            expect(workflow1.isPresent()).toBe(false);
            expect(workflow2.isPresent()).toBe(true);
            expect(workflow3.isPresent()).toBe(false);
            filter.sendKeys(")");
            expect(getWorkflowCount()).toBe(1);
            expect(workflow1.isPresent()).toBe(false);
            expect(workflow2.isPresent()).toBe(true);
            expect(workflow3.isPresent()).toBe(false);
            filter.sendKeys("aaa");
            expect(getWorkflowCount()).toBe(0);
            expect(workflow1.isPresent()).toBe(false);
            expect(workflow2.isPresent()).toBe(false);
            expect(workflow3.isPresent()).toBe(false);
            filter.clear();
            expect(getWorkflowCount()).toBe(3);
            expect(workflow1.isPresent()).toBe(true);
            expect(workflow2.isPresent()).toBe(true);
            expect(workflow3.isPresent()).toBe(true);

            //by xml
            filter.sendKeys("<xml><block");
            expect(getWorkflowCount()).toBe(3);
            filter.sendKeys(">");
            expect(getWorkflowCount()).toBe(0);

            clearWebStorage();
        });
        describe("Selection tests", function() {
            function getSelectAll() {
                return element(by.model('$ctrl.workflowSelectAll'));
            }

            afterEach(clearWebStorage);

            describe('workflow selectAll and Filter tests', function() {
                let workflows;
                const workflow = getWorkflowsForName('Test Workflow').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));

                beforeEach(function() {
                    for (let i = 0; i < 5; ++i) { // Test Workflow + 5 x New Workflow
                        getNewWorkflowButton().click();
                    }
                    workflows = element.all(by.repeater('workflow in $ctrl.workflows'));
                    browser.wait(() => getWorkflowCount().then((count) => count === 6), 2000, "Expected workflow count to be 6");
                    expect(getWorkflowCount()).toBe(6);
                    expect(getSelectedWorkflowCount()).toBe(0);
                });
                it("should select/deselect all workflows, when 'Alle auswählen' is clicked", function () {
                    getSelectAll().click();
                    expect(getSelectedWorkflowCount()).toBe(6);
                    getSelectAll().click();
                    expect(getSelectedWorkflowCount()).toBe(0);
                    getSelectAll().click();
                    expect(getSelectedWorkflowCount()).toBe(6);
                    workflows.get(1).element(by.css('input[type=checkbox]')).click();
                    expect(getSelectedWorkflowCount()).toBe(5);
                    expect(workflows.get(1).element(by.css('input[type=checkbox]')).isSelected()).toBe(false);
                    expect(getSelectAll().isSelected()).toBe(false);
                    getSelectAll().click();
                    expect(getSelectedWorkflowCount()).toBe(6);
                });
                it("should select all filtered workflows, when 'Alle auswählen' is clicked", function () {
                    getWorkflowFilter().sendKeys("Test");
                    expect(getWorkflowCount()).toBe(1);
                    expect(workflow.isPresent()).toBe(true);
                    expect(workflowCheckbox.isSelected()).toBe(false);
                    expect(getSelectAll().isSelected()).toBe(false);
                    getSelectAll().click();
                    expect(workflowCheckbox.isSelected()).toBe(true);
                    expect(getSelectedWorkflowCount()).toBe(1);
                    getWorkflowFilter().clear();
                    expect(getWorkflowCount()).toBe(6);
                    expect(getSelectedWorkflowCount()).toBe(1);
                    expect(workflowCheckbox.isSelected()).toBe(true);
                });
                it("should deselect all filtered workflows, when 'Alle auswählen' is clicked", function () {
                    expect(workflowCheckbox.isSelected()).toBe(false);
                    expect(getSelectAll().isSelected()).toBe(false);
                    getSelectAll().click();
                    expect(getSelectedWorkflowCount()).toBe(6);
                    getWorkflowFilter().sendKeys("Test");
                    expect(getWorkflowCount()).toBe(1);
                    expect(getSelectAll().isSelected()).toBe(true);
                    getSelectAll().click();
                    expect(workflowCheckbox.isSelected()).toBe(false);
                    expect(getSelectAll().isSelected()).toBe(false);
                    expect(getSelectedWorkflowCount()).toBe(0);
                    getWorkflowFilter().clear();
                    expect(getSelectedWorkflowCount()).toBe(5);
                    expect(workflowCheckbox.isSelected()).toBe(false);
                });
            });
            it("should create an unselected workflow and unselect 'Alle auswählen', when 'Neuer Workflow' is clicked", function(){
                getSelectAll().click();
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(true);
                getNewWorkflowButton().click();
                const workflow = getWorkflowsForName('New Workflow').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));
                browser.wait(EC.presenceOf(workflow), 2000, "Expected 'New Workflow' to be present");
                expect(getWorkflowCount()).toBe(2);
                expect(workflowCheckbox.isSelected()).toBe(false);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(false);
            });
            it("should create an unselected workflow and unselect 'Alle auswählen', when 'Import Workflow' is clicked", function(){
                getSelectAll().click();
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(true);
                importTestfile('test-workflow.json', true);
                const workflow = getWorkflowsForName('Test Workflow (2)').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(workflowCheckbox.isSelected()).toBe(false);
                expect(getSelectAll().isSelected()).toBe(false);
            });
            it("should duplicate a workflow unselected and unselect 'Alle auswählen', when 'Duplizieren' is clicked'",function(){
                getSelectAll().click();
                const workflow = getWorkflowsForName('Test Workflow').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(true);

                getDuplicateButton(workflow).click();
                const duplicatedWorkflow = getWorkflowsForName('Test Workflow (2)').first();
                const duplicatedWorkflowCheckbox = duplicatedWorkflow.element(by.css('input[type="checkbox"]'));
                browser.wait(EC.presenceOf(duplicatedWorkflow), 2000, "Duplicated workflow should be present");
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(workflowCheckbox.isSelected()).toBe(true);
                expect(duplicatedWorkflowCheckbox.isSelected()).toBe(false);
                expect(getSelectAll().isSelected()).toBe(false);
            });
            it("should select 'Alle auswählen' when last unselected workflow is deleted", function(){
                getNewWorkflowButton().click(); // Test Workflow + New Workflow
                getNewWorkflowButton().click(); // Test Workflow + New Workflow + New Workflow
                browser.wait(() => getWorkflowCount().then((count) => count === 3), 2000, "Expected workflow count to be 3");
                expect(getWorkflowCount()).toBe(3);

                const firstWorkflow = getWorkflowsForName('Test Workflow').first();
                const firstWorkflowCheckbox = firstWorkflow.element(by.css('input[type="checkbox"]'));
                expect(firstWorkflow.isPresent()).toBe(true);
                expect(firstWorkflowCheckbox.isSelected()).toBe(false);
                firstWorkflowCheckbox.click();
                expect(firstWorkflowCheckbox.isSelected()).toBe(true);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(false);

                const secondWorkflow = getWorkflowsForName('New Workflow (2)').first();
                const secondWorkflowCheckbox = secondWorkflow.element(by.css('input[type="checkbox"]'));
                expect(secondWorkflow.isPresent()).toBe(true);
                expect(secondWorkflowCheckbox.isSelected()).toBe(false);
                deleteWorkflowIfAccept(secondWorkflow, true);
                browser.wait(EC.not(EC.presenceOf(getEditButton(secondWorkflow))), 2000);
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(firstWorkflowCheckbox.isSelected()).toBe(true);
                expect(getSelectAll().isSelected()).toBe(false);

                const thirdWorkflow = getWorkflowsForName('New Workflow').first();
                const thirdWorkflowCheckbox = thirdWorkflow.element(by.css('input[type="checkbox"]'));
                expect(thirdWorkflow.isPresent()).toBe(true);
                expect(thirdWorkflowCheckbox.isSelected()).toBe(false);
                deleteWorkflowIfAccept(thirdWorkflow, true);
                browser.wait(EC.not(EC.presenceOf(getEditButton(thirdWorkflow))), 2000);
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(getSelectAll().isSelected()).toBe(true);
            });
            it("should select 'Alle auswählen' when all workflows are manually selected", function(){
                getNewWorkflowButton().click(); // Test Workflow + New Workflow
                browser.wait(() => getWorkflowCount().then((count) => count === 2), 2000, "Expected workflow count to be 2");
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(0);
                expect(getSelectAll().isSelected()).toBe(false);

                let workflow = getWorkflowsForName('New Workflow').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));
                expect(workflow.isPresent()).toBe(true);
                workflowCheckbox.click();
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(workflowCheckbox.isSelected()).toBe(true);
                expect(getSelectAll().isSelected()).toBe(false);

                workflow = getWorkflowsForName('Test Workflow').first();
                expect(workflow.isPresent()).toBe(true);
                workflow.element(by.css('input[type="checkbox"]')).click();
                expect(getSelectedWorkflowCount()).toBe(2);
                expect(getSelectAll().isSelected()).toBe(true);
            });
            it("should not remember workflow selection after deletion", function() {
                getNewWorkflowButton().click(); // Test Workflow + New Workflow
                browser.wait(() => getWorkflowCount().then((count) => count === 2), 2000, "Expected workflow count to be 2");
                const workflow = getWorkflowsForName('New Workflow').first();
                const workflowCheckbox = workflow.element(by.css('input[type="checkbox"]'));
                expect(workflow.isPresent()).toBe(true);
                workflowCheckbox.click();
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(1);
                expect(workflowCheckbox.isSelected()).toBe(true);

                deleteWorkflowIfAccept(workflow, true);
                browser.wait(EC.not(EC.presenceOf(getEditButton(workflow))), 2000);
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(0);
                getNewWorkflowButton().click(); //same id as first New Workflow
                expect(getWorkflowCount()).toBe(2);
                expect(getSelectedWorkflowCount()).toBe(0);
            });
            it("should delete selected workflows when 'Auswahl löschen' is clicked, with at least one workflow selected", function () {
                for (let i = 0; i < 5; ++i) { // Test Workflow + 5 x New Workflow
                    getNewWorkflowButton().click();
                }
                browser.wait(() => getWorkflowCount().then((count) => count === 6), 2000, "Expected workflow count to be 6");
                const workflow = getWorkflowsForName('New Workflow (2)').first();
                expect(workflow.isPresent()).toBe(true);
                workflow.element(by.css('input[type="checkbox"]')).click();
                getDeleteSelectedButton().click();
                let alert = browser.switchTo().alert();
                expect(alert.getText()).toBe('1 Workflows löschen?');
                alert.accept();
                alert = browser.switchTo().alert();
                expect(alert.getText()).toMatch(/bestätigen: \n- New Workflow \(2\)/);
                alert.accept();
                browser.wait(EC.not(EC.presenceOf(workflow)), 3000);
                expect(workflow.isPresent()).toBe(false);
                expect(getWorkflowCount()).toBe(5);
                expect(getSelectedWorkflowCount()).toBe(0);

                getSelectAll().click();
                expect(getSelectedWorkflowCount()).toBe(5);
                getDeleteSelectedButton().click();
                alert = browser.switchTo().alert();
                expect(alert.getText()).toBe('5 Workflows löschen?');
                alert.accept();
                alert = browser.switchTo().alert();
                expect(alert.getText()).toMatch(/bestätigen: \n- Test Workflow\n- New Workflow\n- New Workflow \(3\)\n- New Workflow \(4\)\n- New Workflow \(5\)/);
                alert.accept();
                browser.wait(() => getWorkflowCount().then((count) => count === 0), 3000, "Expected all workflows to be deleted");
                expect(getWorkflowCount()).toBe(0);
                expect(getSelectedWorkflowCount()).toBe(0);
            });
            it('should NOT delete any workflow if none is selected', function () {
                expect(getWorkflowCount()).toBe(1);
                expect(getSelectedWorkflowCount()).toBe(0);
                getDeleteSelectedButton().click();
                const modal = getModal();
                expect(modal.isPresent()).toBe(true);
                expect(getModalText(modal)).toContain('Die Auswahl ist leer!');
                expect(getWorkflowCount()).toBe(1);
            });
            it('should delete multiple selected workflows (NOT ALL)', function () {
                getNewWorkflowButton().click();
                getNewWorkflowButton().click();

                getWorkflowFilter().sendKeys("New");
                expect(getWorkflowCount()).toBe(2);
                getSelectAll().click();
                expect(getSelectedWorkflowCount()).toBe(2);
                getWorkflowFilter().clear();
                expect(getWorkflowCount()).toBe(3);
                getDeleteSelectedButton().click();

                let alert = browser.switchTo().alert();
                expect(alert.getText()).toBe('2 Workflows löschen?');
                alert.accept();
                alert = browser.switchTo().alert();
                expect(alert.getText()).toMatch(/bestätigen: \n- New Workflow\n- New Workflow \(2\)/);
                alert.accept();
                browser.wait(() => getWorkflowCount().then((count) => count === 1), 3000, "Expected two workflows to be deleted => count=1.");
                expect(getWorkflowCount()).toBe(1);
                const workflow = getWorkflowsForName('Test Workflow').first();
                expect(workflow.isPresent()).toBe(true);
                expect(getSelectedWorkflowCount()).toBe(0);
            });
        });
        it('should import a valid workflow with an image and show this image in the executionView', function() {
            importTestfile("importWithImageValid.json");
            var workflow = getWorkflowsForName("Protractor :: import with images Workflow").first();
            getStartButton(workflow).click();
            var block = getCurrentExecutionBlock();
            var img = getExecutionBlockImage(block);
            expect(img.isDisplayed()).toBe(true);
        });
        it('should import a valid workflow with multiple images and show all those images in the executionView', function() {
            importTestfile("importWithMultipleImages.json");
            var workflow = getWorkflowsForName("Protractor :: import multiple images").first();
            getStartButton(workflow).click();
            automateWorkflow([
                {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}},
                {instruction: 'ok'},
                {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                {instruction: 'ok'},
                {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}}
            ]);
        });
        it('should show the correct error messages when importing an invalid workflow', function() {
            getWorkflowCount().then(function(previousCount) {
                importTestfile("importWithImageInvalid.json", true);
                let modal = getPromptModal();
                expect(modal.isPresent()).toBe(true);
                expect(modal.isDisplayed()).toBe(true);
                expect(getModalTitle(modal)).toBe('Fehler beim Import');
                expect(getModalText(modal)).toBe('Error: Missing images property in import, while workflow contains images!');
                expect(getWorkflowCount()).toEqual(previousCount);
            });
        });
        it('should allow to import another workflow after the import of an invalid workflow failed', function() {
            importTestfile("importWithImageInvalid.json", true);
            modalOK(getPromptModal());
            importTestfile("importWithImageValid.json");
            var workflow = getWorkflowsForName("Protractor :: import with images Workflow").first();
            getStartButton(workflow).click();
            var block = getCurrentExecutionBlock();
            var img = getExecutionBlockImage(block);
            expect(img.isDisplayed()).toBe(true);
        });

        describe('Import/Export feature', function () {

            function exportSelectedWorkflows() {
                getExportButton().click();

                const filenameRegex = /rehagoal-export/;
                return browser.wait(function () {
                    const fs = require('fs');
                    const filenames = fs.readdirSync(downloadFolder);
                    const [exportFile] = filenames.filter((filename) => filename.match(filenameRegex) && filename.indexOf(".crdownload") === -1);
                    if (exportFile !== undefined) {
                        return exportFile;
                    }
                    return false;
                }, 5000, `Timeout while waiting for a file matching ${filenameRegex} in ${downloadFolder}`);
            }

            function exportAndCheckExportEquality(expectedTestfileRelativePath, preprocessExportJSONFunc) {
                let actualExportFilename = null;
                // Wait for promise / existence of export file
                browser.wait(exportSelectedWorkflows().then(function(exportFilename) {
                    actualExportFilename = exportFilename;
                }));
                // Wait for function return true / successfully parsed JSON
                browser.wait(function() {
                    const fs = require('fs');
                    const path = require('path');
                    const actualContent = fs.readFileSync(downloadFolder + "/" + actualExportFilename, 'utf8');
                    const expectedExport = path.resolve(__dirname, expectedTestfileRelativePath);
                    const expectedContent = fs.readFileSync(expectedExport, 'utf8');
                    try {
                        let parsedActualContent = JSON.parse(actualContent);
                        let parsedExpectedContent = JSON.parse(expectedContent);
                        if (preprocessExportJSONFunc) {
                            preprocessExportJSONFunc(parsedActualContent);
                            preprocessExportJSONFunc(parsedExpectedContent);
                        }
                        expect(parsedActualContent).toEqual(parsedExpectedContent);
                        return true;
                    } catch (err) {
                        console.warn("Error while parsing JSON content", err);
                    }
                    return false;
                }, 5000, "Timeout while waiting for successfully parsed JSON");
            }


            describe('v2', function () {
                beforeEach(function () {
                    importTestfile("images_export_import_v2.json");
                    browser.get('index.html#!/overview');

                });
                afterEach(function () {
                    clearWebStorage();
                    clearFileDB();
                });

                it('should contain images after importing a workflow containing images in json', function () {
                    let workflow;

                    workflow = getWorkflowsForName("Protractor::images_export_import_1").first();
                    getStartButton(workflow).click();
                    automateWorkflow([
                        {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                        {instruction: 'ok'},
                        {expect: {taskText: /ende/i}},
                    ]);

                    browser.get('index.html#!/overview');

                    workflow = getWorkflowsForName("Protractor::images_export_import_2").first();
                    getStartButton(workflow).click();
                    automateWorkflow([
                        {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                        {instruction: 'ok'},
                        {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                        {instruction: 'ok'},
                        {expect: {taskText: /ende/i}},
                    ]);

                    browser.get('index.html#!/overview');

                    workflow = getWorkflowsForName("Protractor::images_export_import_3").first();
                    getStartButton(workflow).click();
                    automateWorkflow([
                        {expect: {taskText: /ende/i}},
                    ]);
                });
                it('should be able to import workflows multiple times, even if it contains the same images', function () {
                    const numberOfImportedWorkflows = 3;

                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v2.json");
                        browser.get('index.html#!/overview');
                        expect(getWorkflowCount()).toBe(previousCount+numberOfImportedWorkflows);
                    });
                });
                it('should show modal and not import workflows, if blob hash doesnt match image data', function () {
                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v2_fail.json", true);
                        modalOK(getPromptModal());
                        expect(getWorkflowCount()).toBe(previousCount);
                    });
                });
                it('should still be able to import workflows, after import before failed v2', function () {
                    const numberOfImportedWorkflows = 3;

                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v2_fail.json", true);
                        expect(getWorkflowCount()).toBe(previousCount);

                        modalOK(getPromptModal());

                        importTestfile("images_export_import_v2.json");
                        browser.get('index.html#!/overview');
                        expect(getWorkflowCount()).toBe(previousCount + numberOfImportedWorkflows);
                    });
                });
                it('should still be able to create New Workflow, after import before failed', function () {
                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v2_fail.json", true);
                        expect(getWorkflowCount()).toBe(previousCount);

                        modalOK(getPromptModal());

                        getNewWorkflowButton().click();
                        expect(getWorkflowCount()).toBe(previousCount+1);

                        const newWorkflow = getWorkflowsForName("New Workflow").first();
                        expect(newWorkflow.isPresent()).toBe(true);
                    });
                });
                it('should only delete all failed workflows during single import not workflows from separate import before (second click - other file)', function () {
                    importTestfile("images_export_import_v2.json");

                    getWorkflowCount().then(function(previousCount) {
                        browser.get('index.html#!/overview');
                        importTestfile("images_export_import_v2_fail.json", true);
                        expect(getWorkflowCount()).toBe(previousCount);
                    });
                });
                it('exported file should be the same as imported file (import - export - match files)', function () {

                    createCleanTemporaryFolder();

                    const workflow1 = getWorkflowsForName('Protractor::images_export_import_1').first();
                    const workflow2 = getWorkflowsForName('Protractor::images_export_import_2').first();
                    const workflow3 = getWorkflowsForName('Protractor::images_export_import_3').first();

                    workflow1.element(by.css('input[type=checkbox]')).click();
                    workflow2.element(by.css('input[type=checkbox]')).click();
                    workflow3.element(by.css('input[type=checkbox]')).click();

                    exportAndCheckExportEquality('testfiles/images_export_import_v3.json', function(parsedJSON) {
                        //removing uuid from both since its generated if not present
                        delete parsedJSON.workflows[0].uuid;
                        delete parsedJSON.workflows[1].uuid;
                        delete parsedJSON.workflows[2].uuid;
                    });
                });
                //FIXME: Flaky
                it('export and re-imported workflow should be the same, as exported workflow (export [& delete original] - import - match workflows)', function () {
                    createCleanTemporaryFolder();

                    //export Workflows
                    const workflow1 = getWorkflowsForName('Protractor::images_export_import_1').first();
                    const workflow2 = getWorkflowsForName('Protractor::images_export_import_2').first();
                    const workflow3 = getWorkflowsForName('Protractor::images_export_import_3').first();
                    workflow1.element(by.css('input[type=checkbox]')).click();
                    workflow2.element(by.css('input[type=checkbox]')).click();
                    workflow3.element(by.css('input[type=checkbox]')).click();

                    browser.wait(exportSelectedWorkflows().then(function(exportFile) {
                        //delete Workflows
                        workflow1.element(by.css('input[type=checkbox]')).click();
                        workflow2.element(by.css('input[type=checkbox]')).click();
                        workflow3.element(by.css('input[type=checkbox]')).click();
                        getDeleteSelectedButton().click();

                        let alert = browser.switchTo().alert();
                        expect(alert.getText()).toBe('3 Workflows löschen?');
                        alert.accept();
                        alert = browser.switchTo().alert();
                        expect(alert.getText()).toMatch(/bestätigen: \n- Protractor::images_export_import_1\n- Protractor::images_export_import_2\n- Protractor::images_export_import_3/);
                        alert.accept();
                        browser.wait(EC.not(EC.and(
                            EC.presenceOf(workflow1),
                            EC.presenceOf(workflow2),
                            EC.presenceOf(workflow3),
                        )), 5000);
                        expect(getWorkflowCount()).toBe(1);

                        //import Workflows again and test them
                        importTestfile(exportFile, false, downloadFolder);

                        browser.get('index.html#!/overview');

                        //Check for correctness
                        browser.wait(EC.and(
                            EC.presenceOf(workflow1),
                            EC.presenceOf(workflow2),
                            EC.presenceOf(workflow3),
                        ), 5000);

                        getStartButton(workflow1).click();
                        automateWorkflow([
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                            {instruction: 'ok'},
                            {expect: {taskText: /ende/i}},
                        ]);

                        browser.get('index.html#!/overview');

                        getStartButton(workflow2).click();
                        automateWorkflow([
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                            {instruction: 'ok'},
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                            {instruction: 'ok'},
                            {expect: {taskText: /ende/i}},
                        ]);

                        browser.get('index.html#!/overview');

                        getStartButton(workflow3).click();
                        automateWorkflow([
                            {expect: {taskText: /ende/i}},
                        ]);
                    }));

                });
            });

            describe('v3', function () {
                beforeEach(function () {
                    importTestfile("images_export_import_v3.json");
                    browser.get('index.html#!/overview');

                });
                afterEach(function () {
                    clearWebStorage();
                    clearFileDB();
                });

                it('should still be able to create New Workflow, after import before failed v3', function () {
                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v3_fail.json", true);
                        expect(getWorkflowCount()).toBe(previousCount);

                        modalOK(getPromptModal());

                        getNewWorkflowButton().click();
                        expect(getWorkflowCount()).toBe(previousCount+1);

                        const newWorkflow = getWorkflowsForName("New Workflow").first();
                        expect(newWorkflow.isPresent()).toBe(true);
                    });
                });
                it('exported file should be the same as imported file (import - export - match files)', function () {

                    createCleanTemporaryFolder();

                    const workflow1 = getWorkflowsForName('Protractor::images_export_import_1').first();
                    const workflow2 = getWorkflowsForName('Protractor::images_export_import_2').first();
                    const workflow3 = getWorkflowsForName('Protractor::images_export_import_3').first();

                    workflow1.element(by.css('input[type=checkbox]')).click();
                    workflow2.element(by.css('input[type=checkbox]')).click();
                    workflow3.element(by.css('input[type=checkbox]')).click();

                    exportAndCheckExportEquality('testfiles/images_export_import_v3.json');
                });
                // FIXME: Flaky
                it('export and re-imported workflow should be the same, as exported workflow (export [& delete original] - import - match workflows)', function () {
                    createCleanTemporaryFolder();

                    //export Workflows
                    const workflow1 = getWorkflowsForName('Protractor::images_export_import_1').first();
                    const workflow2 = getWorkflowsForName('Protractor::images_export_import_2').first();
                    const workflow3 = getWorkflowsForName('Protractor::images_export_import_3').first();
                    workflow1.element(by.css('input[type=checkbox]')).click();
                    workflow2.element(by.css('input[type=checkbox]')).click();
                    workflow3.element(by.css('input[type=checkbox]')).click();

                    browser.wait(exportSelectedWorkflows().then(function(exportFile) {
                        //delete Workflows
                        workflow1.element(by.css('input[type=checkbox]')).click();
                        workflow2.element(by.css('input[type=checkbox]')).click();
                        workflow3.element(by.css('input[type=checkbox]')).click();
                        getDeleteSelectedButton().click();

                        let alert = browser.switchTo().alert();
                        expect(alert.getText()).toBe('3 Workflows löschen?');
                        alert.accept();
                        alert = browser.switchTo().alert();
                        expect(alert.getText()).toMatch(/bestätigen: \n- Protractor::images_export_import_1\n- Protractor::images_export_import_2\n- Protractor::images_export_import_3/);
                        alert.accept();
                        browser.wait(EC.not(EC.and(
                            EC.presenceOf(workflow1),
                            EC.presenceOf(workflow2),
                            EC.presenceOf(workflow3),
                        )), 5000);
                        expect(getWorkflowCount()).toBe(1);

                        //import Workflows again and test them
                        importTestfile(exportFile, false, downloadFolder);

                        browser.get('index.html#!/overview');

                        //Check for correctness
                        browser.wait(EC.and(
                            EC.presenceOf(workflow1),
                            EC.presenceOf(workflow2),
                            EC.presenceOf(workflow3),
                        ), 5000);

                        getStartButton(workflow1).click();
                        automateWorkflow([
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                            {instruction: 'ok'},
                            {expect: {taskText: /ende/i}},
                        ]);

                        browser.get('index.html#!/overview');

                        getStartButton(workflow2).click();
                        automateWorkflow([
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                            {instruction: 'ok'},
                            {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                            {instruction: 'ok'},
                            {expect: {taskText: /ende/i}},
                        ]);

                        browser.get('index.html#!/overview');

                        getStartButton(workflow3).click();
                        automateWorkflow([
                            {expect: {taskText: /ende/i}},
                        ]);
                    }));

                });
            });

            describe('special workflow names', function() {
                const workflowCountBeforeSpecialImport = 2;
                const workflowNamesBefore = ["Test Workflow", "Protractor::singleTask"];
                const specialWorkflowNames = [
                    '__lookupGetter__',
                    'valueOf',
                    'toString',
                    '__prototype__',
                    'hasOwnProperty',
                    'entries',
                    '__proto__',
                ];
                function expectPreviousAndSpecialWorkflowNames() {
                    expect(getWorkflowCount()).toBe(workflowCountBeforeSpecialImport + specialWorkflowNames.length);
                    expect(getModal().isPresent()).toBe(false);
                    [...workflowNamesBefore, ...specialWorkflowNames].forEach((workflowName) => {
                        expect(getWorkflowsForName(workflowName).count()).toBe(1, `Expected one instance of workflow with name '${workflowName}'`);
                    });
                }
                function expectEmptyWorkflowExecutable(workflowName) {
                    waitForWorkflowPresence(workflowName, 5000);
                    getStartButton(getWorkflowsForName(workflowName).first()).click();
                    waitForExecutionComponentLoaded();
                    automateWorkflow([
                        {expect: {taskText: /ende/i}, instruction: 'click_label'}
                    ]);
                }

                function expectWorkflowEditable(workflowName) {
                    browser.get('index.html#!/overview');
                    waitForWorkflowPresence(workflowName, 5000);
                    getEditButton(getWorkflowsForName(workflowName).first()).click();
                    expect(element.all(by.css('[ng-view] h1')).last().getText()).toMatch(`Workflow[- ]Editor: ${escapeRegex(workflowName)}`);
                    browser.wait(EC.visibilityOf(element(by.cssContainingText('.blocklyText', 'Ziel'))), 5000);
                }

                afterEach(function() {
                    clearWebStorage();
                })

                describe('long running tests', function() {
                    let originalTimeout;
                    beforeEach(function () {
                        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                        // Increase timeout, as we have some long running tests (timing)
                        jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
                    });

                    afterEach(function () {
                        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                    });

                    it('should import special workflow names without breaking', function () {
                        importTestfile("singleTask.json");
                        expect(getWorkflowCount())
                            .toBe(workflowCountBeforeSpecialImport);
                        expect(getWorkflowsForName("Test Workflow")
                            .count())
                            .toBe(1);
                        expect(getWorkflowsForName("Protractor::singleTask")
                            .count())
                            .toBe(1);
                        importTestfile("specialWorkflowNames.json");

                        expectPreviousAndSpecialWorkflowNames();
                        browser.get('index.html#!/overview');
                        expectPreviousAndSpecialWorkflowNames();

                        expectEmptyWorkflowExecutable('hasOwnProperty');
                        expectEmptyWorkflowExecutable('toString');
                        expectEmptyWorkflowExecutable('__proto__');

                        waitForWorkflowPresence('Protractor::singleTask', 2000);
                        getStartButton(getWorkflowsForName('Protractor::singleTask')
                            .first())
                            .click();
                        waitForExecutionComponentLoaded();
                        automateWorkflow([
                            {
                                expect: {taskText: "Task 1"},
                                instruction: 'ok'
                            },
                            {
                                expect: {taskText: /ende/i},
                                instruction: 'click_label'
                            },
                        ]);

                        expectWorkflowEditable('Protractor::singleTask');
                        expectWorkflowEditable('toString');
                        expectWorkflowEditable('__proto__');
                        expectWorkflowEditable('hasOwnProperty');

                        browser.get('index.html#!/overview');
                        getNewWorkflowButton()
                            .click();
                        expect(getWorkflowCount())
                            .toBe(workflowCountBeforeSpecialImport + specialWorkflowNames.length + 1);
                        waitForWorkflowPresence("New Workflow");


                        browser.get('index.html#!/overview');
                        renameWorkflow(getWorkflowsForName("toString")
                            .first(), "toString (2)");
                        renameWorkflow(getWorkflowsForName("hasOwnProperty")
                            .first(), "my hasOwnProperty");
                        renameWorkflow(getWorkflowsForName("__proto__")
                            .first(), "__proto__ 2");
                        waitForWorkflowPresence("toString (2)");
                        waitForWorkflowPresence("my hasOwnProperty");
                        waitForWorkflowPresence("__proto__ 2");
                    })
                });
            })

            describe('with studyModeEnabled', function() {
                const defaultNumberOfWorkflows = 1;

                beforeEach(function() {
                    mockStudyReferences();
                    setStudyMode(true);
                    browser.get('index.html#!/overview');
                });

                afterEach(function () {
                    unmockStudyReferences();
                    clearWebStorage();
                    clearFileDB();
                });
                it('should deny importing older workflows < 3', function () {
                    importTestfile("goalTimer.json", true);
                    importTestfile("images_export_import_v2.json", true);
                    browser.get('index.html#!/overview');
                    expect(getWorkflowCount()).toBe(defaultNumberOfWorkflows);
                });
                it('should only import workflows with version >= v3', function () {
                    const numberOfImportedWorkflows = 3;

                    getWorkflowCount().then(function(previousCount) {
                        importTestfile("images_export_import_v3.json");
                        browser.get('index.html#!/overview');
                        expect(getWorkflowCount()).toBe(previousCount + numberOfImportedWorkflows);
                    });
                });
            });
        });

        describe('Server integration', function () {

            beforeAll(mockServer);
            afterAll(unmockServer);

            describe('server export button', function () {
                it('should show login modal before trying to export to server', function () {
                    getServerExportButton().click();
                    expect(getModal().isPresent()).toBe(true);
                    expect(getModal().isDisplayed()).toBe(true);
                    expect(getModalTitle(getModal())).toBe('Login Menü');
                });
                it('should continue to export to server after login is successful', function () {
                    clearWebStorage();
                    browser.get('index.html#!/overview');
                    const username = "testuser", password = "e2e_test-rehagoal";
                    getServerExportButton().click();
                    const modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    expect(getModalTitle(modal)).toBe('Login Menü');
                    getLoginUsername(modal).sendKeys(username);
                    getLoginPassword(modal).sendKeys(password);
                    getLoginSubmitButton(modal).click();
                    waitModalClosedAfterLogin();
                    browser.wait(EC.presenceOf(element(by.css('div.popover'))), 2000);
                    const popover = getPopover('Server Export URL');
                    expect(popover.isPresent()).toBe(true);
                    expect(popover.isDisplayed()).toBe(true);
                    logout();
                });
                describe('while being logged in', function () {
                    beforeAll(loginTestUser);
                    afterAll(logout);
                    it('should show popup regarding empty selection, if no workflow was selected for export', function () {
                        getServerExportButton().click();
                        browser.wait(EC.presenceOf(element(by.css('div.popover'))), 2000);
                        const popover = getPopover('Server Export URL');
                        expect(popover.isPresent()).toBe(true);
                        expect(popover.isDisplayed()).toBe(true);
                        expect(popover.element(by.css('.popover-content')).getText())
                            .toMatch(/Fehler: Keine Workflows ausgewählt!/);
                        const closeBtn = popover.element(by.css('button.close'));
                        closeBtn.click();
                        expect(popover.isPresent()).toBe(false);
                    });
                    it('should export a single workflow to the server', function () {
                        const workflow = getWorkflowsForName('Test Workflow').first();
                        workflow.element(by.css('input[type=checkbox]')).click();
                        getServerExportButton().click();
                        browser.wait(EC.presenceOf(element(by.css('div.popover'))), 2000);
                        const popover = getPopover('Server Export URL');
                        browser.wait(EC.textToBePresentInElement(popover.element(by.css('.popover-content')),'Erfolgreich exportiert!'), 3000);
                        const qrCode = popover.$('qrcode canvas');
                        const qrLink = popover.element(by.binding('$ctrl.serverExportUrl'));
                        expect(qrCode.isPresent()).toBe(true);
                        expect(qrCode.isDisplayed()).toBe(true);
                        expect(qrLink.isPresent()).toBe(true);
                        expect(qrLink.isDisplayed()).toBe(true);
                        expect(qrLink.getText()).toMatch(/http:\/\/127\.0\.0\.1:8080\/api\/v2\/workflows\/[a-zA-Z0-9]+#[a-fA-F0-9]{64}/);
                        expect(qrLink.getAttribute('href')).toMatch(/http:\/\/127\.0\.0\.1:8080\/api\/v2\/workflows\/[a-zA-Z0-9]+#[a-fA-F0-9]{64}/);
                    });
                });
            });
            describe('server import intent', function () {
                let importWorkflowURI;

                function assertErrorAndCloseImportModal(expectedText) {
                    let modal = getModal();
                    browser.wait(EC.presenceOf(modal), 3000);
                    expect(getModalTitle(modal)).toEqual('Fehler beim Import');
                    expect(getModalText(modal)).toEqual(expectedText);
                    modalOK(modal);
                }

                beforeAll(mockCordovaImport);
                beforeAll(function () {
                    loginTestUser();

                    const workflow = getWorkflowsForName('Test Workflow').first();
                    workflow.element(by.css('input[type=checkbox]')).click();
                    getServerExportButton().click();
                    browser.wait(EC.presenceOf(element(by.css('div.popover'))), 2000);
                    const popover = getPopover('Server Export URL');
                    browser.wait(EC.textToBePresentInElement(popover.element(by.css('.popover-content')),'Erfolgreich exportiert!'), 3000);
                    const qrLink = popover.element(by.binding('$ctrl.serverExportUrl'));
                    qrLink.getText().then(function (url) {
                        importWorkflowURI = url;
                    });

                    logout();
                });
                afterAll(unmockCordovaImport);
                beforeEach(clearWebStorage);
                afterEach(function () {
                    clearWebStorage();
                    clearFileDB();
                });

                it('should have a valid url to import from export testing', function () {
                    expect(importWorkflowURI).toBeDefined();
                    // should contain workflow export id (alphanumeric, 12 chars) + separator + decryption key (hexadecimal, 64 chars)
                    expect(importWorkflowURI).toMatch(/http:\/\/127\.0\.0\.1:8080\/api\/v2\/workflows\/[a-zA-Z0-9]+#[a-fA-F0-9]{64}/);
                });
                it('should show login modal before trying to import from server', function () {
                    createImportIntent(importWorkflowURI);
                    browser.wait(EC.presenceOf(getModal()), 2000);
                    expect(getModalTitle(getModal())).toBe('Login Menü');
                });
                it('should continue to import from server after login is successful', function () {
                    const username = "testuser", password = "e2e_test-rehagoal";

                    let countBefore;

                    getWorkflowCount().then(function (count) {
                        countBefore = count;
                    });

                    createImportIntent(importWorkflowURI);
                    browser.wait(EC.presenceOf(getModal()), 2000);
                    const modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    expect(getModalTitle(modal)).toBe('Login Menü');
                    getLoginUsername(modal).sendKeys(username);
                    getLoginPassword(modal).sendKeys(password);
                    getLoginSubmitButton(modal).click();
                    waitModalClosedAfterLogin();
                    getWorkflowCount().then(function (count) {
                        expect(count).toBeGreaterThan(countBefore);
                    });
                    logout();
                });
                describe('while being logged in', function () {
                    const modalErrorInvalidImportURL = 'Error: Eingegebene URL konnte nicht gelesen werden.';
                    const modalErrorMissingId = 'Error: Workflow-Link enthält keine gültige Workflow-ID. Import gescheitert.';
                    const modalErrorMissingDecryptionKey = 'Error: Workflow-Link enthält keinen Entschlüsselungscode. Import gescheitert.';
                    const modalErrorInvalidServerURL = 'Error: Intent does not match server URL, aborting.';
                    const modalErrorImportingWorkflow = 'Error: Workflows konnten nicht vom Server geladen werden!';

                    beforeEach(loginTestUser);
                    afterEach(logout);
                    it('should NOT import workflows from server with INVALID uri', function () {
                        let uri = 'nonesense';
                        createImportIntent(uri);
                        expect(getWorkflowCount()).toBe(1);
                        assertErrorAndCloseImportModal(modalErrorInvalidImportURL);
                        uri = 'http://127.0.0.1:8080/api/v2/workflows/0';
                        createImportIntent(uri);
                        assertErrorAndCloseImportModal(modalErrorMissingId);
                        expect(getWorkflowCount()).toBe(1);
                    });
                    it('should DO import workflows from server with VALID uri', function () {
                        expect(getWorkflowCount()).toBe(1);
                        createImportIntent(importWorkflowURI);
                        browser.sleep(1000);
                        expect(getWorkflowCount()).toBe(2);
                    });
                    it('should NOT import workflows from server with VALID uri WITHOUT decryption key', function() {
                        expect(getWorkflowCount()).toBe(1);
                        const trimmedImportWorkflowURI = importWorkflowURI.split('#')[0];
                        createImportIntent(trimmedImportWorkflowURI);
                        assertErrorAndCloseImportModal(modalErrorMissingDecryptionKey);
                        expect(getWorkflowCount()).toBe(1);
                    });
                    it('should NOT import workflows from server with VALID uri WITH invalid decryption key', function() {
                        expect(getWorkflowCount()).toBe(1);
                        const invalidDecryptionKeys = [
                            importWorkflowURI.substring(0, importWorkflowURI.length - 3) + 'FFF',   // wrong key
                            importWorkflowURI.substring(0, importWorkflowURI.length - 1),           // partial key

                        ];
                        for (const invalidDecryptionKey of invalidDecryptionKeys) {
                            createImportIntent(invalidDecryptionKey);
                            assertErrorAndCloseImportModal(modalErrorImportingWorkflow);
                            expect(getWorkflowCount()).toBe(1);
                        }
                    });
                    it('should NOT import workflows from server with INVALID server url', function() {
                        expect(getWorkflowCount()).toBe(1);
                        const invalidServerUriList = [
                            'https://rehagoal-server.local/api/v2/workflows/aaaabbbbcccc',
                            'http://127.0.0.1:8080/api/workflow/aaaabbbbcccc',
                            'http://127.0.0.1:8080/api/v1/workflows/aaaabbbbcccc',
                            'http://127.0.0.1:8080/workflow/aaaabbbbcccc'
                        ];
                        for (const invalidUri of invalidServerUriList) {
                            createImportIntent(invalidUri);
                            assertErrorAndCloseImportModal(modalErrorInvalidServerURL);
                            expect(getWorkflowCount()).toBe(1);
                        }
                    });
                });
            });
        });

        describe('import progress bar', function() {
            // gets hidden Progressbar
            function getProgressBar() {
                return element.all(by.css('.hidden-xs')).all(by.css('.progress')).first();
            }

            function testProgressBarAppearing() {
                const initialCount = getWorkflowCount();
                // true => import does not need to be finished
                importTestfile('test-workflow.json', true);
                browser.wait(EC.visibilityOf(getProgressBar()), 2000, "progress bar did not appear");
                waitForIncreasedWorkflowCount(initialCount);
            }

            function testProgressBarAppearingFailedImport() {
                const initialCount = getWorkflowCount();
                // true => import does not need to be finished
                importTestfile('importWithImageInvalid.json', true);
                browser.wait(EC.visibilityOf(getProgressBar()), 2000, "progress bar did not appear");
            }

            beforeEach(function() {
                browser.get('index.html#!/overview');
            });

            afterAll(function() {
                clearWebStorage();
            })

            it('the progress bar should not be visible by default', function() {
                expect(getProgressBar().isDisplayed()).toBe(false);
            });

            it('should show the progress bar only when an import is started', function () {
                expect(getProgressBar().isDisplayed()).toBe(false);
                testProgressBarAppearing();
            });

            it('should hide the progress bar after 2000ms', function () {
                testProgressBarAppearing();
                browser.wait(EC.invisibilityOf(getProgressBar()),
                    2300, "progress bar did not disappear");
            });

            it('should hide the progress bar when an import is finished', function () {
                testProgressBarAppearing();
                browser.wait(EC.not(EC.visibilityOf(getProgressBar())),
                    2300, "progress bar did not disappear");
            });

            it('should hide the progress bar when an import has failed', function() {
                testProgressBarAppearingFailedImport();
                browser.wait(EC.not(EC.visibilityOf(getProgressBar())),
                    2300, "progress bar did not disappear");
            })

            it('the progress bar should be visible for a short time', function() {
                testProgressBarAppearing();
                expect(getProgressBar().isDisplayed()).toBe(true);
            });
        });

        describe('speakable contents (TTS)', function () {
            beforeAll(() => mockWebSpeechSynthesis(true));
            beforeAll(function () {
                getNewWorkflowButton().click();
                expect(getWorkflowCount()).toBe(2);
            });
            afterAll(function() {
                clearWebStorage();
            });
            afterAll(unmockWebSpeechSynthesis);
            function getWorkflowNameElement(workflowName) {
                const workflowElement = getWorkflowsForName(workflowName).first();
                return workflowElement.element(by.binding("workflow.name"));
            }
            function expectActiveSpeakingStyle(element) {
                expect(element.getCssValue('border')).toEqual('1px solid rgb(255, 0, 0)');
            }
            function expectNotSpeakingStyle(element) {
                expect(element.getCssValue('border-width')).toEqual('0px');
            }
            describe('with TTS enabled', function() {
                beforeAll(function() {
                    settingsSetTTSEnabled(true);
                });
                beforeAll(function() {
                    browser.get('/');
                })
                afterAll(function() {
                    settingsSetTTSEnabled(false);
                });
                it('should speak workflow names when clicking on them', function() {
                    const workflowNameElement = getWorkflowNameElement('Test Workflow');
                    workflowNameElement.click();
                    browser.wait(() => mockedTTSGetLastSpokenTextsJoined().then((spoken) => spoken.match(/^\s*Test Workflow\s*$/)), 1000, "Should have spoken workflow name");
                    expectActiveSpeakingStyle(workflowNameElement);
                    mockedTTSResolveLastSpoken();
                    expectNotSpeakingStyle(workflowNameElement);
                });
                it('should not speak same workflow name again, while already speaking', function() {
                    const workflowNameElement = getWorkflowNameElement('Test Workflow');
                    workflowNameElement.click();
                    browser.wait(() => mockedTTSGetLastSpokenTextsJoined().then((spoken) => spoken.match(/^\s*Test Workflow\s*$/)), 1000, "Should have spoken workflow name (1/2)");
                    workflowNameElement.click();
                    browser.sleep(1000);
                    expect(mockedTTSGetLastSpokenTextsJoined()).toMatch(/^\s*Test Workflow\s*$/, "Should only have spoken workflow name once");
                    expectActiveSpeakingStyle(workflowNameElement);
                    mockedTTSResolveLastSpoken();
                    expectNotSpeakingStyle(workflowNameElement);
                    workflowNameElement.click();
                    browser.wait(() => mockedTTSGetLastSpokenTextsJoined().then((spoken) => spoken.match(/^(\s*Test Workflow\s*){2}$/)), 1000, "Should have spoken workflow name a second time");
                    expectActiveSpeakingStyle(workflowNameElement);
                    mockedTTSResolveLastSpoken();
                    expectNotSpeakingStyle(workflowNameElement);
                });
                it('should speak other workflow name, if other element is clicked while speaking', function() {
                    const workflowNameElement1 = getWorkflowNameElement('Test Workflow');
                    const workflowNameElement2 = getWorkflowNameElement('New Workflow');
                    workflowNameElement1.click();
                    browser.wait(() => mockedTTSGetLastSpokenTextsJoined().then((spoken) => spoken.match(/^\s*Test Workflow\s*$/)), 1000, "Should have spoken first workflow name");
                    expectActiveSpeakingStyle(workflowNameElement1);
                    workflowNameElement2.click();
                    browser.wait(() => mockedTTSGetLastSpokenTextsJoined().then((spoken) => spoken.match(/^\s*Test Workflow\s*New Workflow\s*$/)), 1000, "Should have spoken second workflow name after first");
                    expectActiveSpeakingStyle(workflowNameElement2);
                    expectActiveSpeakingStyle(workflowNameElement1);
                    mockedTTSResolveLastSpoken();
                    expectNotSpeakingStyle(workflowNameElement2);
                    mockedTTSResolveLastSpoken();
                    expectNotSpeakingStyle(workflowNameElement1);
                });
            });
            describe('with TTS disabled', function() {
                beforeAll(function() {
                    browser.get('/');
                });
                it('should NOT speak workflow names when clicking on them', function() {
                    const workflowNameElement = getWorkflowNameElement('Test Workflow');
                    workflowNameElement.click();
                    expectNotSpeakingStyle(workflowNameElement);
                    browser.sleep(1000);
                    expect(mockedTTSGetLastSpokenTextsJoined()).toEqual("");
                    expectNotSpeakingStyle(workflowNameElement);
                });
            })

        });

        describe('expand workflow names', function() {
            const longWorkflowName = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.';
            beforeAll(function() {
                browser.get('index.html');
                importTestfile('longWorkflowName.json');
                for (let i = 0; i < 3; ++i) {
                    getDuplicateButton(getWorkflowsForName(longWorkflowName).first()).click();
                }
            });
            afterAll(function() {
                clearWebStorage();
            });
            function isElementOverflowing(element) {
                return browser.executeScript(function(elem) {
                    return [elem.offsetWidth, elem.scrollWidth];
                }, element).then(arr => {
                    const offsetWidth = arr[0];
                    const scrollWidth = arr[1];
                    return offsetWidth < scrollWidth;
                });
            }
            function getWorkflowNameContainer(workflow) {
                return workflow.element(by.css('.overview-table-workflow-name'));
            }
            function getWorkflowNameElement(workflow) {
                return workflow.element(by.binding('workflow.name'));
            }
            function expectWorkflowCssOverflow(workflow, shouldHaveEllipsisNotBreak) {
                const workflowNameElement = getWorkflowNameElement(workflow);
                const workflowNameContainer = getWorkflowNameContainer(workflow);

                if (shouldHaveEllipsisNotBreak) {
                    //should not break, use ellipsis
                    expect(workflowNameContainer.getCssValue('overflow')).toEqual('hidden');
                    expect(workflowNameContainer.getCssValue('text-overflow')).toEqual('ellipsis');
                    expect(workflowNameElement.getCssValue('word-wrap')).toEqual('normal');
                    expect(workflowNameElement.getCssValue('white-space')).toEqual('nowrap');
                } else {
                    //should break
                    expect(workflowNameContainer.getCssValue('overflow')).toEqual('hidden');
                    expect(workflowNameContainer.getCssValue('text-overflow')).toEqual('ellipsis');
                    expect(workflowNameElement.getCssValue('word-wrap')).toEqual('break-word');
                    expect(workflowNameElement.getCssValue('white-space')).toEqual('normal');
                }
            }
            it('should abbreviate long workflow names by default', function() {
                element.all(by.repeater('workflow in $ctrl.workflows')).each(function(workflow) {
                    const workflowNameContainer = getWorkflowNameContainer(workflow);
                    expectWorkflowCssOverflow(workflow, true);
                    workflowNameContainer.getText().then(text => {
                        if (text.indexOf(longWorkflowName) !== -1) {
                            expect(isElementOverflowing(workflowNameContainer)).toBe(true, "Element should be overflowing");
                        } else {
                            expect(isElementOverflowing(workflowNameContainer)).toBe(false, "Element should not be overflowing");
                        }
                    });
                });
            });
            it('should show full workflow name, when abbreviated name is clicked', function() {
                const workflow = getWorkflowsForName(longWorkflowName).first();
                const workflowNameContainer = getWorkflowNameContainer(workflow);
                const workflowNameElement = getWorkflowNameElement(workflow);

                expectWorkflowCssOverflow(workflow, true);
                expect(isElementOverflowing(workflowNameContainer)).toBe(true, "Element should be overflowing");

                workflowNameElement.click();
                expectWorkflowCssOverflow(workflow, false);
                expect(isElementOverflowing(workflowNameContainer)).toBe(false, "Element should not be overflowing");
            });
            describe('long running tests', function() {
                let originalTimeout;
                beforeEach(function () {
                    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                    // Increase timeout, as we have some long running tests (timing)
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
                });

                afterEach(function () {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                });
                it('should only show at most one full workflow name, when it was clicked', function() {
                    const workflow1 = getWorkflowsForName(longWorkflowName).first();
                    const workflow2 = getWorkflowsForName(`${longWorkflowName} (2)`).first();
                    const workflow3 = getWorkflowsForName(`${longWorkflowName} (3)`).first();
                    const workflow4 = getWorkflowsForName(`${longWorkflowName} (4)`).first();
                    const testWorkflow = getWorkflowsForName('Test Workflow').first();
                    const longWorkflows = [workflow1, workflow2, workflow3, workflow4];
                    const allWorkflows =  [...longWorkflows, testWorkflow];
                    for (const workflow of allWorkflows) {
                        expectWorkflowCssOverflow(workflow, true);
                    }
                    for (const workflow of longWorkflows) {
                        expect(isElementOverflowing(getWorkflowNameContainer(workflow))).toBe(true, "Element should be overflowing");
                    }
                    expect(isElementOverflowing(getWorkflowNameContainer(testWorkflow))).toBe(false, "Element should not be overflowing");

                    getWorkflowNameElement(workflow2).click();
                    for (const workflow of allWorkflows) {
                        expectWorkflowCssOverflow(workflow, workflow !== workflow2);
                        expect(isElementOverflowing(getWorkflowNameContainer(workflow))).toBe(![workflow2, testWorkflow].includes(workflow));
                    }

                    getWorkflowNameElement(workflow4).click();
                    for (const workflow of allWorkflows) {
                        expectWorkflowCssOverflow(workflow, workflow !== workflow4);
                        expect(isElementOverflowing(getWorkflowNameContainer(workflow))).toBe(![workflow4, testWorkflow].includes(workflow));
                    }

                    getWorkflowNameElement(testWorkflow).click();
                    for (const workflow of allWorkflows) {
                        expectWorkflowCssOverflow(workflow, workflow !== testWorkflow);
                        expect(isElementOverflowing(getWorkflowNameContainer(workflow))).toBe(![testWorkflow].includes(workflow));
                    }
                });
            })

        });
    });

    describe('flowEditView', function () {
        function getFlyout() {
            return element(by.css(".blocklyWorkspace .blocklyFlyout"));
        }

        function getCanvas() {
            return element(by.css(".blocklyWorkspace .blocklyFlyout + .blocklyBlockCanvas"));
        }

        function getGoalBlock() {
            var canvas = getCanvas();
            var draggable = canvas.all(by.css(".blocklyDraggable"));
            return draggable.filter(function (elem) {
                return elem.getText().then(function (text) {
                    return text.match(/Ziel/);
                });
            }).first();
        }

        function getTimerRememberBlock(canvas) {
            var draggable = canvas.all(by.css(".blocklyDraggable"));
            return draggable.filter(function (elem) {
                return elem.getText().then(function (text) {
                    return text.match(/Erinnerung/);
                });
            }).first();
        }

        function getSaveButton() {
            return $$('.glyphicon-floppy-disk').first();
        }

        /**
         *
         * @return {ElementFinder}
         */
        function getUndoButton() {
            return element(by.cssContainingText('button', "Rückgängig"));
        }

        function getRedoButton() {
            return element(by.cssContainingText('button', "Wiederholen"));
        }

        function getPreviewButton() {
            return $$('.glyphicon-film').first();
        }

        /**
         *
         * @return {ElementFinder}
         */
        function getPreviewDiv() {
            return $$('#mySidenav').first();
        }

        function getPreviewCloseButton() {
            return $$('button#previewClose').first();
        }

        function getGoalDescription() {
            return element(by.id('headline-executed-workflow'));
        }

        function getHeaderAlertDiv() {
            return $$('div#headerAlert').first();
        }

        function getPreviewAlertDiv() {
            return $$('div#previewAlert').first();
        }

        function getImageButton() {
            return $$('.glyphicon-picture').first();
        }

        function getImageSelectionDiv() {
            return $$('#image-selection-container').first();
        }

        function getImageSelectionCloseButton() {
            return $('button#imageSelectionClose');
        }

        function getImageSelect() {
            const imageSelect = element(by.id('imageSelect'));
            browser.wait(EC.elementToBeClickable(imageSelect), 3000, 'imageSelect should be visible and enabled');
            return imageSelect;
        }

        function getImageSelection() {
            return getImageSelect().element(by.css('option:checked'));
        }

        function getImageSelectionText() {
            return getImageSelection().getText();
        }

        function waitForBlockly() {
            browser.wait(EC.presenceOf(getGoalBlock()), 3000);
        }

        function togglePreview() {
            browser.wait(EC.not(EC.presenceOf($('#mySidenav.ng-animate'))), 2000, "Timeout while waiting for non-animating preview sidebar");
            return browser.wait(getPreviewDiv().getAttribute("class").then(function(classString) {
                const classes = classString.split(" ");
                let wasOpen = null;
                if (classes.indexOf("sidenav-open") !== -1) {
                    wasOpen = true;
                } else if (classes.indexOf("sidenav-hide") !== -1) {
                    wasOpen = false;
                }
                expect(wasOpen).not.toBeNull("sidebar should have either sidenav-open or sidenav-hide class");
                EC.visibilityOf(getPreviewButton(), 500,  "PreviewButton should be visible");
                getPreviewButton().click();
                if (wasOpen) {
                    return browser.wait(EC.and(
                        EC.presenceOf($('#mySidenav.sidenav-hide')),
                        EC.not(EC.presenceOf($('#mySidenav.ng-animate')))
                    ), 2000, "Timeout while waiting for preview sidebar to hide & animation complete");
                } else {
                    return browser.wait(EC.and(
                        EC.presenceOf($('#mySidenav.sidenav-open')),
                        EC.not(EC.presenceOf($('#mySidenav.ng-animate')))
                    ), 2000, "Timeout while waiting for preview sidebar to show & animation complete");
                }
            }), 3000, "Timeout while waiting for preview to toggle");
        }

        function getWorkflowEditViewAndStartPreview(name) {
            var workflow = getWorkflowsForName(name);
            getEditButton(workflow).click();
            waitForBlockly();
            EC.visibilityOf(getPreviewButton(), 500,  "PreviewButton should be visible");
            togglePreview();
        }

        function doBlockly(func, ...args) {
            waitForBlockly();
            browser.executeScript(function() {
                const GOAL_BLOCK_TYPE = "task_group";
                const TASK_BLOCK_TYPE = "task";
                const PARALLEL_BLOCK_TYPE = "parallel_or";
                const IF_THEN_ELSE_BLOCK_TYPE = 'if_then_else';
                const GOAL_STATEMENTS = "tasks";
                const REMEMBER_BLOCK_TYPE = "timer_remember";
                const IMAGE_FIELD = "image";
                const DESCRIPTION_FIELD = "description";
                const CONDITION_FIELD = "condition";
                window.ProtractorBlockly = (function() {
                    function getWorkspace() {
                        return Blockly.getMainWorkspace();
                    }
                    function getGoalBlock() {
                        return getBlocksOfType(GOAL_BLOCK_TYPE)[0];
                    }
                    function getTopBlocks() {
                        return getWorkspace().getTopBlocks();
                    }
                    function getWorkspaceXml() {
                        return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(getWorkspace()));
                    }
                    function getBlockXml(block) {
                        return Blockly.Xml.domToText(Blockly.Xml.blockToDom(block));
                    }
                    function getBlocksOfType(blockType) {
                        let workspace = getWorkspace();
                        return workspace.getAllBlocks().filter((block) => block.type === blockType);
                    }
                    function getFieldText(block, fieldName) {
                        let field = block.getField(fieldName);
                        return field.getText();
                    }

                    /**
                     *
                     * @return {Blockly.Block | null}
                     */
                    function getGoalFirstStatementBlock() {
                        const goal = getGoalBlock();
                        return goal.getInput(GOAL_STATEMENTS).connection.targetBlock();
                    }
                    function createBlock(blockType) {
                        let workspace = getWorkspace();
                        let block = workspace.newBlock(blockType);
                        block.initSvg();
                        block.render();
                        return block;
                    }
                    function selectBlock(block) {
                        block.select();
                    }
                    function deleteBlock(block) {
                        block.dispose();
                    }
                    function deleteAllBlocks() {
                        let workspace = getWorkspace();
                        workspace.getAllBlocks()
                            .filter(block => block.type !== GOAL_BLOCK_TYPE)
                            .map(block => block.dispose());
                    }
                    function addFirstStatement(parentBlock, inputName, childBlock) {
                        childBlock.previousConnection.connect(parentBlock.getInput(inputName).connection);
                    }
                    function setBlockMenuOption(block, fieldName, optionName) {
                        let field = block.getField(fieldName);
                        let options = field.menuGenerator_();
                        field.setValue(options.filter(entry => entry[0] === optionName)[0][1]);
                    }
                    return {
                        GOAL_BLOCK_TYPE,
                        TASK_BLOCK_TYPE,
                        PARALLEL_BLOCK_TYPE,
                        IF_THEN_ELSE_BLOCK_TYPE,
                        GOAL_STATEMENTS,
                        REMEMBER_BLOCK_TYPE,
                        IMAGE_FIELD,
                        DESCRIPTION_FIELD,
                        CONDITION_FIELD,
                        getBlocksOfType,
                        getGoalBlock,
                        getTopBlocks,
                        getWorkspaceXml,
                        getBlockXml,
                        getGoalFirstStatementBlock,
                        getFieldText,
                        createBlock,
                        selectBlock,
                        deleteBlock,
                        deleteAllBlocks,
                        addFirstStatement,
                        setBlockMenuOption,
                    };
                })();
            });
            return browser.executeScript(func, ...args);
        }
        describe('general', function () {

            beforeEach(function () {
                browser.get('index.html#!/edit/0');
            });

            it('should render flowEditView when user navigates to /edit/0', function () {
                expect(element.all(by.css('[ng-view] h1')).last().getText()).toMatch(/Workflow[- ]Editor/);
            });
            it('check that blockly elements are present and displayed in flowEditView', function () {
                waitForBlockly();
                since("blocklyWorkspace should be displayed").expect($('.blocklyWorkspace').isDisplayed()).toBe(true);
                since("blocklyFlyout should be displayed").expect($('.blocklyFlyout').isDisplayed()).toBe(true);
                since("blocklyBlockCanvas should be displayed").expect($('.blocklyBlockCanvas').isDisplayed()).toBe(true);
                since("blocklyBubbleCanvas should be present").expect($('.blocklyBubbleCanvas').isPresent()).toBe(true);
            });
            it('when leaving flowEditView, blockly should not be present', function () {
                browser.setLocation('overview');
                since("blocklyWorkspace should not be present").expect($('.blocklyWorkspace').isPresent()).toBe(false);
                since("blocklyFlyout should not be present").expect($('.blocklyFlyout').isPresent()).toBe(false);
                since("blocklyBlockCanvas should not be present").expect($('.blocklyBlockCanvas').isPresent()).toBe(false);
                since("blocklyBubbleCanvas should not be present").expect($('.blocklyBubbleCanvas').isPresent()).toBe(false);
            });
            /**
             * LeaveModal and redirection from flowEditView
             */
            it('should redirect to executionView without changes in workflow', function () {
                waitForBlockly();
                expect(browser.getCurrentUrl()).toMatch(/\/edit\/0$/);
                browser.setLocation('start/0');
                expect(browser.getCurrentUrl()).toMatch(/\/start\/0$/);
            });
            it("check leave modal redirection to executionView", function () {
                waitForBlockly();
                // Modify the workspace
                browser.actions().dragAndDrop(getGoalBlock(), {x: 30, y: 20}).perform();
                browser.setLocation('start/0');
                var modal = getModal();
                since("leave modal should be present").expect(modal.isPresent()).toBe(true);
                modalAccept(modal);
                expect(browser.getCurrentUrl()).toMatch(/\/start\/0$/);
            });
            it("should NOT show leave modal after unchanged workspace", function () {
                browser.setLocation('overview');
                expect(getPageTitle()).toMatch(/Workflow-Übersicht/);
            });
            it("should show leave modal after changed workspace", function () {
                waitForBlockly();
                var goalBlock = getGoalBlock();

                // Modify the workspace
                browser.actions().dragAndDrop(goalBlock, {x: 30, y: 20}).perform();

                browser.setLocation('overview');
                var modal = getModal();
                since("leave modal should be present").expect(modal.isPresent()).toBe(true);
                modalDismiss(modal);
                expect(browser.getCurrentUrl()).toMatch(/\/edit\/0$/);

                browser.setLocation('overview');
                modalAccept(modal);
                expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
            });
            it("should switch to execution view when pressing play button", function () {
                var playButton = $$('.glyphicon-play').first();
                playButton.click();
                expect(browser.getCurrentUrl()).toMatch(/#!\/start/);
            });
            it('should show tooltip regarding "save for updated preview" only when workspace has changed and preview is open', function() {
                const tooltipElement = element(by.cssContainingText('div.tooltip', 'Speichern für aktuelle Vorschau'));
                const tooltipOpenDelay = 200;
                //not modified, no preview
                expect(tooltipElement.isPresent()).toBe(false);

                //not modified, preview
                togglePreview();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isPresent()).toBe(false);

                //modified, no preview
                togglePreview();
                // Modify the workspace
                browser.actions().dragAndDrop(getGoalBlock(), {x: 30, y: 20}).perform();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isPresent()).toBe(false);

                //modified, preview
                togglePreview();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isDisplayed()).toBe(true);

                //modified, no preview
                togglePreview();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isPresent()).toBe(false);

                //modified, preview
                togglePreview();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isDisplayed()).toBe(true);

                //not modified, preview
                getSaveButton().click();
                browser.sleep(tooltipOpenDelay);
                expect(tooltipElement.isPresent()).toBe(false);
            });
            /**
             * Editing and saving
             */
            it("should show message when saving and hide it afterwards", function () {
                waitForBlockly();
                var saveButton = getSaveButton();
                saveButton.click();
                var thisIsMyAlert = getHeaderAlertDiv();
                browser.wait(EC.visibilityOf(thisIsMyAlert), 2000, 'alert should be displayed after click on save');
                since('alert text should match "Workflow erfolgreich gespeichert"').expect(thisIsMyAlert.getText()).toMatch(/Workflow erfolgreich gespeichert/);
                browser.sleep(3000);
                since('alert should be displayed still after 3 seconds').expect(thisIsMyAlert.isDisplayed()).toBe(true);
                browser.wait(EC.invisibilityOf(thisIsMyAlert), 3000, 'alert should be hidden after 6 seconds');
            });
            describe('undo function', function() {
                function emulateCtrlZ() {
                    /**
                     * as of now, chrome driver does not support non-us keyboards correctly.
                     * https://chromedriver.chromium.org/help/keyboard-support
                     * because of this, ctrl-z ('undo') cannot be done correctly via browser.actions()
                     *
                     * in the future, this version (using browser.actions()) might work:
                     * browser.actions().keyDown(protractor.Key.CONTROL).sendKeys('z').keyUp(protractor.Key.CONTROL).perform();
                     */
                    browser.executeScript(function() {
                        const eventInitializer = {
                            keyCode: "Z".charCodeAt(0),
                            ctrlKey: true
                        };
                        document.dispatchEvent(new KeyboardEvent("keydown", eventInitializer));
                        document.dispatchEvent(new KeyboardEvent("keyup", eventInitializer)); // maybe optional, seems cleaner
                    });
                }

                beforeEach(function () {
                    browser.get('index.html#!/edit/0');
                    waitForBlockly();
                    since("blocklyWorkspace should be displayed").expect($('.blocklyWorkspace').isDisplayed()).toBe(true);
                });

                /** constants/actions used for testUndo- and testUndoFunctionThreeSteps */
                const changedDescriptionText = "My first task";
                const goalBlock = getGoalBlock();
                const originalText = "<Beschreibung>";
                const changedText = "<Changed>";
                const doesTaskBlockExist = () => doBlockly(function() {
                        return ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE).length === 1;
                    });
                const isTaskBlockAttached = () => doBlockly(function() {
                    const goal = ProtractorBlockly.getGoalBlock();
                    const task = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    const children = goal.getChildren();
                    return children.length === 1 && children[0] === task;
                });
                const getFirstTaskDescription = () => doBlockly(function() {
                    const task = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(task, ProtractorBlockly.DESCRIPTION_FIELD);
                });

                function testUndoFunction(undoOperation) {
                    /** change of text of goal block used as example action */
                    const canvas = getCanvas();

                    expect(goalBlock.getText()).toContain(originalText);

                    // Change goal description
                    goalBlock.$('.blocklyEditableText').click();
                    $('.blocklyHtmlInput').sendKeys(changedText);
                    canvas.click();

                    expect(goalBlock.getText()).not.toContain(originalText);
                    expect(goalBlock.getText()).toContain(changedText);

                    //undo change of goal description
                    undoOperation();

                    expect(goalBlock.getText()).toContain(originalText);
                    expect(goalBlock.getText()).not.toContain(changedText);
                }

                function testUndoFunctionThreeSteps(undoOperation) {
                    doBlockly(function(changedDescriptionText) {
                        let goal = ProtractorBlockly.getGoalBlock();
                        // first step
                        let task = ProtractorBlockly.createBlock(ProtractorBlockly.TASK_BLOCK_TYPE);
                        // second step
                        ProtractorBlockly.addFirstStatement(goal, ProtractorBlockly.GOAL_STATEMENTS, task);
                        // third step
                        task.setFieldValue(changedDescriptionText, ProtractorBlockly.DESCRIPTION_FIELD);
                    }, changedDescriptionText);

                    expect(doesTaskBlockExist()).toBe(true);
                    expect(isTaskBlockAttached()).toBe(true);
                    expect(getFirstTaskDescription()).toBe(changedDescriptionText);

                    // Undo third operation (change task description) & validate
                    undoOperation();
                    expect(doesTaskBlockExist()).toBe(true);
                    expect(isTaskBlockAttached()).toBe(true);
                    expect(getFirstTaskDescription()).toBe('<Beschreibung>');

                    // Undo second operation (attach task block) & validate
                    undoOperation();
                    expect(doesTaskBlockExist()).toBe(true);
                    expect(isTaskBlockAttached()).toBe(false);
                    expect(getFirstTaskDescription()).toBe('<Beschreibung>');

                    undoOperation();
                    expect(doesTaskBlockExist()).toBe(false);
                    expect(isTaskBlockAttached()).toBe(false);
                }

                it('should undo the last action when pressing ctrl-z', function() {
                    testUndoFunction(() => emulateCtrlZ());
                });

                it('should undo the last action when clicking the undo button', function() {
                    testUndoFunction(() => {
                        expect(getUndoButton().isEnabled()).toBe(true);
                        getUndoButton().click();
                    });
                    expect(getUndoButton().isEnabled()).toBe(false);
                });

                it('should undo three actions when clicking the undo button three times', function() {
                    testUndoFunctionThreeSteps(() => {
                        expect(getUndoButton().isEnabled()).toBe(true);
                        getUndoButton().click();
                    });
                    expect(getUndoButton().isEnabled()).toBe(false);
                });

                it('should undo three actions when pressing ctrl-z three times', function() {
                    testUndoFunctionThreeSteps(() => {
                        expect(getUndoButton().isEnabled()).toBe(true);
                        emulateCtrlZ();
                    });
                    expect(getUndoButton().isEnabled()).toBe(false);
                });

                it('should disable the undo button, if there is nothing to undo', function() {
                    expect(getUndoButton().isEnabled()).toBe(false);
                });

                it('should not undo the goal block', function() {
                    emulateCtrlZ();
                    since("GoalBlock should be present").expect(getGoalBlock().isPresent()).toBe(true);
                });

                describe('redo function', function() {
                    function emulateCtrlShiftZ() {
                        /**
                         * as of now, chrome driver does not support non-us keyboards correctly.
                         * https://chromedriver.chromium.org/help/keyboard-support
                         * because of this, ctrl-shift-z ('redo') cannot be done correctly via browser.actions()
                         *
                         * in the future, this version (using browser.actions()) might work:
                         * browser.actions().keyDown(protractor.Key.CONTROL).keyDown(protractor.Key.SHIFT).sendKeys('z').keyUp(protractor.Key.CONTROL).keyDown(protractor.Key.SHIFT).perform();
                         */
                        browser.executeScript(function() {
                            const eventInitializer = {
                                keyCode: "Z".charCodeAt(0),
                                ctrlKey: true,
                                shiftKey: true
                            };
                            document.dispatchEvent(new KeyboardEvent("keydown", eventInitializer));
                            document.dispatchEvent(new KeyboardEvent("keyup", eventInitializer)); // maybe optional, seems cleaner
                        });
                    }

                    function testRedoFunction(undoOperation, redoOperation) {
                        /** change of text of goal block used as example action */
                        testUndoFunction(undoOperation);

                        //redo change of goal description
                        redoOperation();

                        expect(goalBlock.getText()).not.toContain(originalText);
                        expect(goalBlock.getText()).toContain(changedText);
                    }

                    function testRedoFunctionThreeSteps(undoOperation, redoOperation) {
                        testUndoFunctionThreeSteps(undoOperation);

                        //redo first undo (deletion of task block) & validate
                        redoOperation();
                        expect(doesTaskBlockExist()).toBe(true);
                        expect(isTaskBlockAttached()).toBe(false);
                        expect(getFirstTaskDescription()).toBe('<Beschreibung>');

                        // redo second undo (detach task block) & validate
                        redoOperation();
                        expect(doesTaskBlockExist()).toBe(true);
                        expect(isTaskBlockAttached()).toBe(true);
                        expect(getFirstTaskDescription()).toBe('<Beschreibung>');

                        // redo first undo (reset task description) & validate
                        redoOperation();
                        expect(doesTaskBlockExist()).toBe(true);
                        expect(isTaskBlockAttached()).toBe(true);
                        expect(getFirstTaskDescription()).toBe(changedDescriptionText);

                    }

                    it('should redo the last undone action when pressing ctrl-shift-z', function() {
                        testRedoFunction(() => emulateCtrlZ(), () => emulateCtrlShiftZ());
                    });

                    it('should redo the last undone action when clicking the redo button', function() {
                        testRedoFunction(() => {
                            expect(getUndoButton().isEnabled()).toBe(true);
                            getUndoButton().click();
                        },() => {
                            expect(getRedoButton().isEnabled()).toBe(true);
                            getRedoButton().click();
                        });
                        expect(getRedoButton().isEnabled()).toBe(false);
                    });

                    it('should redo three undone actions when clicking the redo button three times', function() {
                        testRedoFunctionThreeSteps(() => {
                            expect(getUndoButton().isEnabled()).toBe(true);
                            getUndoButton().click();
                        },() => {
                            expect(getRedoButton().isEnabled()).toBe(true);
                            getRedoButton().click();
                        });
                        expect(getRedoButton().isEnabled()).toBe(false);
                    });

                    it('should redo three undone actions when pressing ctrl-shift-z three times', function() {
                        testRedoFunctionThreeSteps(() => {
                            expect(getUndoButton().isEnabled()).toBe(true);
                            emulateCtrlZ();
                        }, () => {
                            expect(getRedoButton().isEnabled()).toBe(true);
                            emulateCtrlShiftZ();
                        });
                        expect(getRedoButton().isEnabled()).toBe(false);
                    });

                    it('should disable the redo button, if there is nothing to redo', function() {
                        expect(getRedoButton().isEnabled()).toBe(false);
                    });

                    it('should undo something redone when clicking the undo button after clicking the redo button', function() {
                        const undoOperation = () => {
                            expect(getUndoButton().isEnabled()).toBe(true);
                            getUndoButton().click();
                        };

                        testRedoFunction(undoOperation, () => {
                            expect(getRedoButton().isEnabled()).toBe(true);
                            getRedoButton().click();
                        });

                        //redo change of goal description
                        undoOperation();

                        expect(goalBlock.getText()).toContain(originalText);
                        expect(goalBlock.getText()).not.toContain(changedText);
                    });

                    it('should undo something redone when pressing ctrl-z after pressing ctrl-shift-z', function() {
                        const undoOperation = () => {
                            expect(getUndoButton().isEnabled()).toBe(true);
                            getUndoButton().click();
                        };

                        testRedoFunction(undoOperation, () => {
                            expect(getRedoButton().isEnabled()).toBe(true);
                            getRedoButton().click();
                        });

                        //redo change of goal description
                        undoOperation();

                        expect(goalBlock.getText()).toContain(originalText);
                        expect(goalBlock.getText()).not.toContain(changedText);
                    });
                });
            });
            /**
             * Execution Worfkflow-Preview (Sidebar left)
             */
            it("should make Workflow-preview visible when pressing preview button", function () {
                togglePreview();
                var previewDiv = getPreviewDiv();
                browser.wait(EC.visibilityOf(previewDiv),1000, "Expected previewDiv to be displayed");
                since("Expected execution-log NOT to be present!").expect(previewDiv.$('execution-log').isPresent()).toBe(false);

                previewDiv.getCssValue('width').then(function (cssValue) {
                    expect(cssValue).not.toBe('0px');
                });
            });
            it("should make preview invisible when pressing close button", function () {
                togglePreview();
                var closeButton = getPreviewCloseButton();
                browser.wait(EC.visibilityOf(closeButton), 1500, 'close button should be visible');
                closeButton.click();
                browser.wait(EC.invisibilityOf(closeButton), 1500, 'close button should be visible');

                getPreviewDiv().getCssValue('width').then(function (cssValue) {
                    expect(cssValue).toBe('0px');
                });
            });
            it("should reload preview of a workflow, if the workflow is saved", function () {
                var canvas = getCanvas();

                var goalBlock = getGoalBlock();
                var goalDescription = getGoalDescription();

                // Open preview
                togglePreview();
                waitForExecutionComponentLoaded();

                expect(goalDescription.getText()).toBe("<Beschreibung>");

                // Change goal description
                goalBlock.$('.blocklyEditableText').click();
                $('.blocklyHtmlInput').sendKeys('Test-Goal');
                canvas.click();

                // Save
                getSaveButton().click();

                browser.wait(EC.textToBePresentInElement(goalDescription, "Test-Goal"), 1000);

                clearWebStorage();
            });
            /**
             * Image Selection (Sidebar right)
             */
            it("should show image-selection and toggle visibility by pressing image button", function () {
                // default: image selection visible
                var imageSelectionDiv = getImageSelectionDiv();
                since("Expected imageSelectionDiv to be displayed!").expect(imageSelectionDiv.isDisplayed()).toBe(true);
                imageSelectionDiv.getCssValue('width').then(function (cssValue) {
                    expect(cssValue).not.toBe('0px');
                });

                var imageButton = getImageButton();
                //close image selection
                imageButton.click();
                browser.wait(EC.invisibilityOf(getImageSelectionCloseButton()), 1000, 'image selection sidebar should not be visible');
                imageSelectionDiv.getCssValue('width').then(function (cssValue) {
                    expect(cssValue).toBe('0px');
                });

                //show image selection again
                imageButton.click();
                browser.wait(EC.visibilityOf(getImageSelectionCloseButton()), 1000, 'image selection sidebar should be visible');
                imageSelectionDiv.getCssValue('width').then(function (cssValue) {
                    expect(cssValue).not.toBe('0px');
                });
            });
            it("should hide image-selection when pressing close button", function () {
                // default: image selection visible
                var closeButton = getImageSelectionCloseButton();
                // close image selection
                closeButton.click();
                browser.wait(EC.invisibilityOf(getImageSelectionCloseButton()), 1000, 'image selection sidebar should not be visible');

                getImageSelectionDiv().getCssValue('width').then(function (cssValue) {
                    expect(cssValue).toBe('0px');
                });
            });
            it("should display buttons and empty image selection/preview", function () {
                since("Image file upload button should be displayed").expect($('label#imageFileUpload').isDisplayed()).toBe(true);
                since("Image save button should be displayed").expect(getImageSaveButton().isDisplayed()).toBe(true);
                since("Image save button should be disabled by default").expect(getImageSaveButton().isEnabled()).toBe(false);
                since("Image filename input should be displayed").expect(getImageFilenameInput().isDisplayed()).toBe(true);
                since("Image remove button should be displayed").expect(getImageRemoveButton().isDisplayed()).toBe(true);
                since("Image selection should be displayed").expect(getImageSelection().isDisplayed()).toBe(true);
                since("Image selection should be empty").expect(getImageSelectionText()).toBe("");
                since("Image preview should not be present").expect(getImageSavedPreview().isPresent()).toBe(false);
                since("Remove button should be disabled when selection is empty").expect(getImageRemoveButton().isEnabled()).toBe(false);
            });
            it("should show message if image name is empty", function () {
                uploadImageFile("testfiles/TuxCrab.png");

                var saveButton = getImageSaveButton();
                saveButton.click();
                var thisIsMyAlert = getHeaderAlertDiv();
                browser.wait(EC.visibilityOf(thisIsMyAlert), 2000);
                since("Expected alert to be displayed!").expect(thisIsMyAlert.isDisplayed()).toBe(true);
                expect(thisIsMyAlert.getText()).toMatch(/Bitte geben Sie einen Namen ein/);
            });
            it("should reset uploaded preview images and disable save image button if \'Bild auswählen\' button is pressed", function() {
                expect(getImageUploadedPreview().isDisplayed()).toBe(false);
                expect(getImageSaveButton().isEnabled()).toBe(false);

                uploadImageFile('testfiles/TuxCrab.png');

                expect(getImageUploadedPreview().isDisplayed()).toBe(true);
                expect(getImageSaveButton().isEnabled()).toBe(true);

                triggerUploadClick();

                expect(getImageUploadedPreview().isDisplayed()).toBe(false);
                expect(getImageSaveButton().isEnabled()).toBe(false);
            });
            it("should show message if no image was selected", function () {
                expect(getImageSaveButton().isDisplayed()).toBe(true);
                expect(getImageSaveButton().isEnabled()).toBe(false);

                getImageFilenameInput().sendKeys('ImageName');

                expect(getImageSaveButton().isEnabled()).toBe(false);
            });
            it("check upload and save image, delete image via button", function () {
                var imageName = 'Image';
                uploadImageFileAndSave('testfiles/TuxCrab.png', imageName);
                since("Expected alert not to be displayed!").expect(getHeaderAlertDiv().isDisplayed()).toBe(false);
                browser.wait(EC.textToBePresentInElement(getImageSelectionText(), imageName), 1000);
                expect(getImageSelectionText()).toBe(imageName);
                var imageSrc = getImageSavedPreview().getAttribute("src");
                expect(imageSrc).toMatch(/blob:\S+/);

                // 2nd save (still same image as input)
                getImageSaveButton().click();
                var thisIsMyAlert = getHeaderAlertDiv();
                browser.wait(EC.visibilityOf(thisIsMyAlert), 2000, "Expected alert to be displayed!");
                expect(thisIsMyAlert.getText()).toMatch(/Dieses Bild wurde bereits gespeichert/);

                // check with another image name
                getImageFilenameInput().sendKeys('2');
                var imageName2 = imageName + "2";

                // click save but cancel renaming
                getImageSaveButton().click();
                var modal = getPromptModal();
                since("Expected Prompt modal for existing image to be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                var regExpStr = "Dieses Bild wurde bereits unter dem Namen '" + imageName + "' gespeichert! " +
                    "Möchten Sie dieses Bild in '" + imageName2 + "' umbenennen\?";
                var regExp = new RegExp(regExpStr);
                expect(getModalText(modal)).toMatch(regExp);
                modalButton(modal, 'Abbrechen');
                expect(getImageSelectionText()).toBe(imageName);
                expect(getImageSavedPreview().getAttribute("src")).toBe(imageSrc);

                doBlockly(function(imageName) {
                    let goal = ProtractorBlockly.getGoalBlock();
                    let task = ProtractorBlockly.createBlock(ProtractorBlockly.TASK_BLOCK_TYPE);
                    ProtractorBlockly.addFirstStatement(goal, ProtractorBlockly.GOAL_STATEMENTS, task);
                    ProtractorBlockly.setBlockMenuOption(task, ProtractorBlockly.IMAGE_FIELD, 'Bild: ' + imageName);
                }, imageName);

                let imageFieldText1 = doBlockly(function() {
                    let task = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(task, ProtractorBlockly.IMAGE_FIELD);
                });
                expect(imageFieldText1).toBe('Bild: ' + imageName);

                // click save and confirm renaming
                getImageSaveButton().click();
                modal = getPromptModal();
                since("Expected Prompt modal confirming rename image to be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                modalButton(modal, 'Umbenennen');
                expect(getImageSelectionText()).toBe(imageName2);
                expect(getImageSavedPreview().getAttribute("src")).toMatch(/blob:\S+/);
                checkImageFile(getImageSavedPreview(), 'testfiles/TuxCrab.png');

                let imageFieldText2 = doBlockly(function() {
                    let task = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(task, ProtractorBlockly.IMAGE_FIELD);
                });
                since("Renaming an image should update blockly dropdowns").
                expect(imageFieldText2).toBe('Bild: ' + imageName2);

                // click image remove button but cancel prompt
                getImageRemoveButton().click();
                modal = getPromptModal();
                since("Prompt modal for remove image to be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                regExp = new RegExp("Soll das Bild '" + imageName2 + "' wirklich gelöscht werden\?");
                expect(getModalText(modal)).toMatch(regExp);
                modalButton(modal, 'Abbrechen');
                expect(getImageSelectionText()).toBe(imageName2);
                expect(getImageSavedPreview().getAttribute("src")).toMatch(/blob:\S+/);

                // click image remove button and confirm prompt
                getImageRemoveButton().click();
                modal = getPromptModal();
                since("Prompt modal for remove image to be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                modalButton(modal, 'Löschen');
                expect(getImageSelectionText()).toBe("");
                expect(getImageSavedPreview().isPresent()).toBe(false);

                doBlockly(function() {
                    ProtractorBlockly.deleteAllBlocks();
                });
            });
            it("check overwrite image if image name is the same", function () {
                var imageName = 'Image';
                // upload image and save it
                uploadImageFileAndSave('testfiles/TuxCrab.png', imageName);
                browser.wait(EC.presenceOf(getImageSavedPreview()), 2000, "image preview should be displayed!");
                var imageSrc = getImageSavedPreview().getAttribute("src");
                expect(imageSrc).toMatch(/blob:\S+/);

                // upload another image
                uploadImageFile('testfiles/TuxMagician.jpg');

                // click save but cancel prompt
                getImageSaveButton().click();
                // show prompt modal for overwriting image
                var modal = getPromptModal();
                since("Prompt modal for overwrite image should be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                var regExpStr = "Der Name '" + imageName + "' wurde bereits verwendet! " +
                    "Soll das alte Bild überschrieben werden\?";
                var regExp = new RegExp(regExpStr);
                expect(getModalText(modal)).toMatch(regExp);
                modalButton(modal, 'Abbrechen');
                expect(getImageSelectionText()).toBe(imageName);
                expect(getImageSavedPreview().getAttribute("src")).toBe(imageSrc);

                // click save and confirm overwrite
                getImageSaveButton().click();
                modal = getPromptModal();
                since("Prompt modal for overwrite image should be displayed!").expect(modal.isDisplayed()).toBeTruthy();
                modalButton(modal, 'Überschreiben');
                expect(getImageSelectionText()).toBe(imageName);
                expect(getImageSavedPreview().getAttribute("src")).not.toBe(imageSrc);
                expect(getImageSavedPreview().getAttribute("src")).toMatch(/blob:\S+/);
            });

            it('should show preview image in lightbox when clicked on image preview', function() {
                uploadImageFileAndSave('testfiles/TuxCrab.png', 'Lightbox Image');
                const previewImage = getImageSavedPreview();
                testLightbox(previewImage);
            });
        });

        describe('workflow images import v2', function () {
            const imageCheckTimeout = 2000;

            beforeEach(function () {
                browser.get('index.html#!/overview');
            });

            afterEach(function () {
                clearWebStorage();
                clearFileDB();
            });

            it('should already contain both images that are imported (both in blocks)', function () {
                const numberOfImages = 2;
                const imagesNames = ['tuxblack', 'tuxcl'];
                const imgFileNames = ['TuxBlackSuit.jpg', 'TuxCheckList.jpg'];

                importTestfile("images_import1.json");
                browser.get('index.html#!/edit/1');
                waitForBlockly();

                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(numberOfImages);

                //Check first Image
                getSelectOptionByText(getImageSelect(), imagesNames[0]).click();
                browser.wait(EC.visibilityOf(getImageSavedPreview()), imageCheckTimeout);
                const image1 = getImageSavedPreview().getAttribute("src");
                checkImageFile(image1, "testfiles/" + imgFileNames[0]);

                //check second Image
                getSelectOptionByText(getImageSelect(), imagesNames[1]).click();
                browser.wait(EC.visibilityOf(getImageSavedPreview()), imageCheckTimeout);
                const image2 = getImageSavedPreview().getAttribute("src");
                checkImageFile(image2, "testfiles/" + imgFileNames[1]);
            });

            it('should already contain both images that are imported (but only one used blocks)', function () {
                const numberOfImages = 2;
                const imagesNames = ['tuxGandalf', 'tuxi'];
                const imgFileNames = ['TuxMagician.jpg', 'TuxCrab.png'];

                importTestfile("images_import2.json");
                browser.get('index.html#!/edit/1');
                waitForBlockly();

                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(numberOfImages);

                //Check first Image
                getSelectOptionByText(getImageSelect(), imagesNames[0]).click();
                browser.wait(EC.visibilityOf(getImageSavedPreview()), imageCheckTimeout);
                const image1 = getImageSavedPreview().getAttribute("src");
                checkImageFile(image1, "testfiles/" + imgFileNames[0]);

                //check second Image
                getSelectOptionByText(getImageSelect(), imagesNames[1]).click();
                browser.wait(EC.visibilityOf(getImageSavedPreview()), imageCheckTimeout);
                const image2 = getImageSavedPreview().getAttribute("src");
                checkImageFile(image2, "testfiles/" + imgFileNames[1]);
            });
        });

        describe("image removal", function() {
            function beforeFlowEditImageDeletion(workflowFile, workflowName) {
                browser.get('index.html#!/overview');
                importTestfile(workflowFile);
                waitForWorkflowPresence(workflowName, 5000);
                let workflow = getWorkflowsForName(workflowName).first();
                getEditButton(workflow).click();
            }
            afterEach(() => {
                clearWebStorage();
                clearFileDB();
            });
            it("should remove images from the workflow if the image is deleted", function () {
                beforeFlowEditImageDeletion('imageRemoval.json', 'Protractor::imageRemoval');

                uploadImageFileAndSave('testfiles/TuxCrab.png', 'Image');
                getImageRemoveButton().click();
                var modal = getPromptModal();
                modalButton(modal, 'Löschen');

                let blocklyImageDropdownText = doBlockly(() => {
                    let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(taskBlock, "image");
                });
                since("Blockly image selection should be reset after image removal").
                expect(blocklyImageDropdownText).toBe("<Bild>");
                since("With zero images to select, there should be no selected option").
                expect(getImageSelectionText()).toBe("");
                since("There should be no images (option text != '') in the select menu").
                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(0);

                getFlowEditViewStartButton().click();
                automateWorkflow([
                    {expect: {taskImageUrl: null}},
                    {instruction: 'ok'},
                ]);
            });
            it("should remove only the deleted image while other images are unchanged", function () {
                beforeFlowEditImageDeletion('imageRemovalMultiple.json', 'Protractor::imageRemovalMultiple');

                uploadImageFileAndSave('testfiles/TuxCrab.png', 'Image1');
                uploadImageFileAndSave('testfiles/TuxMagician.jpg', 'Image2');
                getImageSelect().element(by.cssContainingText('option', 'Image1')).click();
                getImageRemoveButton().click();
                var modal = getPromptModal();
                modalButton(modal, 'Löschen');

                let blocklyImageDropdownText1 = doBlockly(() => {
                    let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(taskBlock, "image");
                });
                let blocklyImageDropdownText2 = doBlockly(() => {
                    let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[1];
                    return ProtractorBlockly.getFieldText(taskBlock, "image");
                });
                since("Blockly image selection should be reset after image removal").
                expect(blocklyImageDropdownText1).toBe("<Bild>");
                since("Blockly image selection should be kept for non-removed images").
                expect(blocklyImageDropdownText2).toBe("Bild: Image2");
                since("Selected image option should be empty").
                expect(getImageSelectionText()).toBe("");
                since("There should be only one image (option text != '') in the select menu").
                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(1);
                since("The only available image for selection should be #{expected}").
                expect(getImageSelect().$$('option').filter(option => {
                    return option.getText().then(text => text !== "");
                }).first().getText()).toBe("Image2");

                getFlowEditViewStartButton().click();
                automateWorkflow([
                    {instruction: 'ok'},
                    {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}}
                ]);
            });
            it("should be able to remove images from any block", function () {
                beforeFlowEditImageDeletion('imageRemovalAnyBlock.json', 'Protractor::imageRemovalAnyBlock');
                uploadImageFileAndSave('testfiles/TuxBlackSuit.jpg', 'Image');
                getImageRemoveButton().click();
                var modal = getPromptModal();
                modalButton(modal, 'Löschen');

                getFlowEditViewStartButton().click();
                automateWorkflow([
                    {instruction: 'no', expect: {taskImageUrl: null}},
                    {instruction: 'yes', expect: {taskImageUrl: null}},
                    {instruction: 'ok', expect: {taskImageUrl: null}},
                    {expect: {taskImageUrl: null, sleepTimer: 2000}},
                    {expect: {taskImageUrl: null, titleImageUrl: null}},
                ]);
            });
            it("should remove image from dropdown, even if the image is referenced by another workflow, while not deleting the file", function() {
                // Import workflows and images
                beforeFlowEditImageDeletion('imageRemoval.json', 'Protractor::imageRemoval');
                uploadImageFileAndSave('testfiles/TuxCrab.png', 'ImageRef1');
                getSaveButton().click();
                beforeFlowEditImageDeletion('imageRemoval.json', 'Protractor::imageRemoval (2)');
                uploadImageFileAndSave('testfiles/TuxCrab.png', 'ImageRef2');
                getImageRemoveButton().click();
                var modal = getPromptModal();
                modalButton(modal, 'Löschen');

                // Check image dropdowns
                let blocklyImageDropdownText = doBlockly(() => {
                    let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(taskBlock, "image");
                });
                since("Blockly image selection should be reset after image removal").
                expect(blocklyImageDropdownText).toBe("<Bild>");
                since("With zero images to select, there should be no selected option").
                expect(getImageSelectionText()).toBe("");
                since("There should be no images (option text != '') in the select menu").
                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(0);

                // Test execution
                getFlowEditViewStartButton().click();
                automateWorkflow([
                    {expect: {taskImageUrl: null}}
                ]);

                // Workflow 2: Check that it remains intact.
                browser.get('index.html#!/overview');
                let workflow = getWorkflowsForName('Protractor::imageRemoval').first();
                getEditButton(workflow).click();

                // Check image dropdowns
                let blocklyImageDropdownText2 = doBlockly(() => {
                    let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                    return ProtractorBlockly.getFieldText(taskBlock, "image");
                });
                since("Blockly image selection should still be #{expected}").
                expect(blocklyImageDropdownText2).toBe("Bild: ImageRef1");
                since("There should be one image (option text != '') in the select menu").
                expect(getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count()).toBe(1);
                since("The only available image for selection should be #{expected}").
                expect(getImageSelect().$$('option').filter(option => {
                    return option.getText().then(text => text !== "");
                }).first().getText()).toBe("ImageRef1");

                // Test execution
                getFlowEditViewStartButton().click();
                automateWorkflow([
                    {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}}
                ]);
            });
        });

        describe('image size warning and resizing', function() {
            const IMAGE_MAX_WIDTH = 1280;
            const IMAGE_MAX_HEIGHT = 720;

            const TEST_FILE_PATH_RELATIVE = "testfiles/";

            const IMAGE_TESTFILES = {
                MAX_FILE_SIZE: {
                    // Created with ImageMagick 6.9.10-23
                    // $ convert -seed 42 -size 1280x720 xc:white +noise random -alpha set -define bmp:format=bmp4 TestImage_FileSize.bmp
                    path: TEST_FILE_PATH_RELATIVE + "TestImage_FileSize.bmp",
                    originalDimensions: [1280, 720],
                    resizedDimensions:  [1280, 720]
                },
                MAX_WIDTH: {
                    path: TEST_FILE_PATH_RELATIVE + "TestImage_MaxWidth.png",
                    originalDimensions: [1281, 400],
                    resizedDimensions:  [1280, 399]
                },
                MAX_HEIGHT: {
                    path: TEST_FILE_PATH_RELATIVE + "TestImage_MaxHeight.png",
                    originalDimensions: [600, 721],
                    resizedDimensions:  [599, 720]
                },
                HASHES: {
                    // Created with ImageMagick 6.9.10-23
                    // $ convert -seed 42 -size 4912x3264 xc:white +noise random -define jpeg:extent=3000kb TestImage_HashesAfterResize.jpg
                    path: TEST_FILE_PATH_RELATIVE + "TestImage_HashesAfterResize.jpg",
                    originalDimensions: [4912, 3264],
                    resizedDimensions:  [1083, 720]
                },
                FINE: {
                    path: TEST_FILE_PATH_RELATIVE + "TestImage_Fine.png",
                    originalDimensions: [1279, 719],
                    resizedDimensions:  [1279, 719]
                }
            }

            function sinceTestFileImageDimensions(testFileLabel, dimensionLabel) {
                return since(`expected test file ${testFileLabel} ${dimensionLabel} dimensions to be
                 #{expected}, got #{actual}. Images may need to be regenerated.`);
            }

            beforeAll(function () {
                sinceTestFileImageDimensions("MAX_FILE_SIZE", "original")
                    .expect(IMAGE_TESTFILES.MAX_FILE_SIZE.originalDimensions).toEqual([IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT]);
                sinceTestFileImageDimensions("MAX_FILE_SIZE", "resized")
                    .expect(IMAGE_TESTFILES.MAX_FILE_SIZE.resizedDimensions).toEqual([IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT]);

                sinceTestFileImageDimensions("MAX_WIDTH", "original")
                    .expect(IMAGE_TESTFILES.MAX_WIDTH.originalDimensions[0]).toEqual(IMAGE_MAX_WIDTH + 1);
                sinceTestFileImageDimensions("MAX_WIDTH", "resized")
                    .expect(IMAGE_TESTFILES.MAX_WIDTH.resizedDimensions[0]).toEqual(IMAGE_MAX_WIDTH);

                sinceTestFileImageDimensions("MAX_HEIGHT", "original")
                    .expect(IMAGE_TESTFILES.MAX_HEIGHT.originalDimensions[1]).toEqual(IMAGE_MAX_HEIGHT + 1);
                sinceTestFileImageDimensions("MAX_HEIGHT", "resized")
                    .expect(IMAGE_TESTFILES.MAX_HEIGHT.resizedDimensions[1]).toEqual(IMAGE_MAX_HEIGHT);

                sinceTestFileImageDimensions("FINE", "original")
                    .expect(IMAGE_TESTFILES.FINE.originalDimensions).toEqual([IMAGE_MAX_WIDTH - 1, IMAGE_MAX_HEIGHT - 1]);
                sinceTestFileImageDimensions("FINE", "resized")
                    .expect(IMAGE_TESTFILES.FINE.originalDimensions).toEqual([IMAGE_MAX_WIDTH - 1, IMAGE_MAX_HEIGHT - 1]);

                sinceTestFileImageDimensions("HASHES", "resized")
                    .expect(IMAGE_TESTFILES.HASHES.resizedDimensions[1]).toEqual(IMAGE_MAX_HEIGHT);
            });

            beforeEach(function () {
                browser.get('index.html#!/edit/0');
            });

            afterAll(function() {
                clearWebStorage();
                clearFileDB();
            });

            function settingsSetImageResizingEnabled(enabled) {
                browser.get("#!/settings");
                setToggleSwitchByCheckboxId('chkImageResizeEnabled', enabled);
            }

            function expectImageDimensionsToBe(imgElement, expectedDimensions) {
                browser.wait(getImageElementNaturalDimensions(imgElement)
                        .then((actualDimensions) => expect(actualDimensions).toEqual(expectedDimensions))
                    , 2500, 'should fetch image natural dimensions');
            }

            function expectResizedAndWarningShowing(imgElement, image_testfile) {
                browser.wait(EC.visibilityOf(getImageSizeWarningResizingEnabled()), 2000);
                expect(getImageSizeWarningResizingEnabled().isDisplayed()).toBe(true);
                expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);
                expectImageDimensionsToBe(imgElement, image_testfile.resizedDimensions);
            }

            function expectNotResizedAndWarningShowing(imgElement, image_testfile) {
                browser.wait(EC.visibilityOf(getImageSizeWarningResizingDisabled()), 2000);
                expect(getImageSizeWarningResizingEnabled().isPresent()).toBe(false);
                expect(getImageSizeWarningResizingDisabled().isDisplayed()).toBe(true);
                expectImageDimensionsToBe(imgElement, image_testfile.originalDimensions);
            }

            function expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(imgElement) {
                expect(getImageSizeWarningResizingEnabled().isPresent()).toBe(false);
                expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);
                expectImageDimensionsToBe(imgElement, IMAGE_TESTFILES.FINE.originalDimensions);
            }

            function expectImageAlreadyExistingModalWithNames(oldImgName, newImgName) {
                const modal = getPromptModal();
                expect(modal.isDisplayed()).toBeTruthy();
                let expectedModalText = "Dieses Bild wurde bereits unter dem Namen \'" + oldImgName +
                    "\' gespeichert! Möchten Sie dieses Bild in \'" + newImgName + "\' umbenennen\?";
                expect(getModalText(modal)).toBe(expectedModalText);
            }

            describe('resizing enabled', function() {
                beforeAll(function () {
                    settingsSetImageResizingEnabled(true);
                });

                it('should have the correct style for size warning', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);
                    expect(getImageSizeWarningResizingEnabled().getAttribute("class")).toContain("bg-warning");
                });
                it('should show the warning and resize image if image is bigger than max file size', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);
                });
                it('should show the warning and resize image if image exceeds max width', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_WIDTH.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_WIDTH);
                });
                it('should show the warning and resize image if image exceeds max height', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_HEIGHT.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_HEIGHT);
                });
                it('should not show warning and not resize image if image is within boundaries', function() {
                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview())
                });
                it('should show and hide the warning correctly (and resize) after consecutive image selections', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);

                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview());

                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);

                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview());

                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);
                });
                it('should also have resized image dimension if image is saved and still show warning', function() {
                    uploadImageFileAndSave(IMAGE_TESTFILES.MAX_FILE_SIZE.path, "ImageBig");
                    expectResizedAndWarningShowing(getImageSavedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);
                });
                it('should have the same hashes after resizing the same image multiple times', function () {
                    const numberOfTries = 3;

                    let oldImageName = "hashTest";
                    uploadImageFileAndSave(IMAGE_TESTFILES.HASHES.path, oldImageName);
                    browser.wait(EC.visibilityOf(getImageSavedPreview()), 2000);

                    for (let i = 0; i < numberOfTries; i++) {
                        let imageName = "hashTest" + i;
                        uploadImageFile(IMAGE_TESTFILES.HASHES.path);
                        browser.wait(EC.visibilityOf(getImageUploadedPreview()), 2000);
                        getImageFilenameInput().clear().sendKeys(imageName);
                        getImageSaveButton().click();

                        browser.wait(EC.visibilityOf(getPromptModal()), 1000);
                        expectImageAlreadyExistingModalWithNames(oldImageName, imageName);
                        modalButton(getPromptModal(), 'Umbenennen');

                        browser.wait(EC.textToBePresentInElement(getImageSelectionText(), imageName), 1000);
                        browser.wait(EC.visibilityOf(getImageSavedPreview()), 1000);
                        expectResizedAndWarningShowing(getImageSavedPreview(), IMAGE_TESTFILES.HASHES);
                        oldImageName = imageName;
                    }
                });
                it("should reset size warning after \'Bild auswählen\' button is pressed", function() {
                    expect(getImageSizeWarningResizingEnabled().isPresent()).toBe(false);

                    uploadImageFile('testfiles/TestImage_MaxWidth.png');
                    browser.wait(EC.visibilityOf(getImageSizeWarningResizingEnabled()), 1000, "Expected sizeWarningResizeEnabled to be displayed!");

                    triggerUploadClick();

                    expect(getImageSizeWarningResizingEnabled().isPresent()).toBe(false);
                });
            });

            describe('resizing disabled', function() {
                beforeAll(function () {
                    settingsSetImageResizingEnabled(false);
                });

                it('should have the correct style for size warning', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectNotResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);
                    expect(getImageSizeWarningResizingDisabled().getAttribute("class")).toContain("bg-warning");
                });
                it('should show warning correctly and not resize if resize is disabled', function() {
                    uploadImageFile(IMAGE_TESTFILES.MAX_FILE_SIZE.path);
                    expectNotResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_FILE_SIZE);

                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview());

                    uploadImageFile(IMAGE_TESTFILES.MAX_WIDTH.path);
                    expectNotResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_WIDTH);

                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview());

                    uploadImageFile(IMAGE_TESTFILES.MAX_HEIGHT.path);
                    expectNotResizedAndWarningShowing(getImageUploadedPreview(), IMAGE_TESTFILES.MAX_HEIGHT);

                    uploadImageFile(IMAGE_TESTFILES.FINE.path);
                    expectNoSizeWarningPresentAndImageDimensionsLikeFineImage(getImageUploadedPreview());
                });
                it("should reset size warning after \'Bild auswählen\' button is pressed", function() {
                    expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);

                    uploadImageFile('testfiles/TestImage_MaxWidth.png');
                    browser.wait(EC.visibilityOf(getImageSizeWarningResizingDisabled()), 1000, "Expected sizeWarningResizeDisabled to be displayed!");

                    triggerUploadClick();

                    expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);
                });
            });
        });

        describe('upload error warning', function() {
            const waitTime = 1000;

            beforeEach(function () {
                browser.get('index.html#!/edit/0');
            });

            afterEach(function() {
                clearWebStorage();
                clearFileDB();
            });

            it("should show error message (in correct style) if corrupt image is uploaded and save button still be disabled", function () {
                expect(getImageUploadErrorWarning().isPresent()).toBe(false);

                uploadImageFile('testfiles/TestImages_CorruptHeader.png', true);
                browser.wait(EC.visibilityOf(getImageUploadErrorWarning()), waitTime, "Expected imageUploadError to be displayed!");
                expect(getImageUploadErrorWarning().getAttribute("class")).toContain("bg-danger");


                expect(getImageUploadErrorWarning().getText()).toMatch(/Achtung: Das hochgeladene Bild ist fehlerhaft!/);

                expect(getImageSaveButton().isEnabled()).toBe(false);
            });
            it("should not show image corrupt warning after another errorless upload", function () {
                expect(getImageUploadErrorWarning().isPresent()).toBe(false);

                uploadImageFile('testfiles/TestImages_CorruptHeader.png', true);
                browser.wait(EC.visibilityOf(getImageUploadErrorWarning()), waitTime, "Expected imageUploadError to be displayed!");
                expect(getImageSaveButton().isEnabled()).toBe(false);

                uploadImageFile('testfiles/TestImage_MaxHeight.png')

                browser.wait(EC.invisibilityOf(getImageUploadErrorWarning()), waitTime, "Expected imageUploadError to disappear!");

                expect(getImageSizeWarningResizingEnabled().isDisplayed()).toBe(true);
                expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);
                expect(getImageSaveButton().isEnabled()).toBe(true);
            });
            it("should not show image size warning after large and then corrupt upload", function () {
                uploadImageFile('testfiles/TestImage_MaxHeight.png')
                expect(getImageUploadErrorWarning().isPresent()).toBe(false);
                expect(getImageSizeWarningResizingEnabled().isDisplayed()).toBe(true);
                expect(getImageSaveButton().isEnabled()).toBe(true);

                uploadImageFile('testfiles/TestImages_CorruptHeader.png', true);

                browser.wait(EC.visibilityOf(getImageUploadErrorWarning()), waitTime, "Expected imageUploadError to be displayed!");
                expect(getImageUploadErrorWarning().getText()).toMatch(/Achtung: Das hochgeladene Bild ist fehlerhaft!/);

                expect(getImageSizeWarningResizingEnabled().isPresent()).toBe(false);
                expect(getImageSizeWarningResizingDisabled().isPresent()).toBe(false);
                expect(getImageSaveButton().isEnabled()).toBe(false);
            });
            it("should reset corrupt warning after \'Bild auswählen\' button is pressed", function() {
                expect(getImageUploadErrorWarning().isPresent()).toBe(false);

                uploadImageFile('testfiles/TestImages_CorruptHeader.png', true);
                browser.wait(EC.visibilityOf(getImageUploadErrorWarning()), 1000, "Expected imageUploadError to be displayed!");

                triggerUploadClick();

                expect(getImageUploadErrorWarning().isPresent()).toBe(false);
            });
        });

        describe('timer notifications', function () {
            beforeEach(function () {
                browser.get('index.html#!/overview');
                importTestfile('executionTimerTest.json');
            });

            beforeEach(function () {
                browser.get('index.html#!/overview');
            });

            afterEach(function () {
                clearWebStorage();
                clearFileDB();
            });

            function checkForPreviewNotification(waitingTime) {
                since("expecting PreviewAlert not to be present already (workflow start)").
                expect(getPreviewAlertDiv().isDisplayed()).toBe(false);
                // We cannot be sure here that the first preview alert occurred too early, but it is better than having flaky tests here...
                browser.wait(EC.visibilityOf(getPreviewAlertDiv()), waitingTime, "Expected previewNotification to be displayed!");
            }

            describe('special cases', function () {
                const waitTime = 4000;

                beforeEach(function () {
                    browser.get('index.html#!/overview');
                    importTestfile('goalTimer2.json');
                });

                //last preview should still be visible
                function checkForNextPreviewNotification(waitTimeBetweenTimeouts, previewDuration) {
                    const testDelay = 1500;
                    let previewNotification = getPreviewAlertDiv();

                    browser.wait(EC.visibilityOf(previewNotification), previewDuration, "Expected first previewNotification to be displayed!");

                    //waiting for preview to disappear
                    browser.wait(EC.invisibilityOf(previewNotification), waitTimeBetweenTimeouts, "Expected previewNotification to disappear!");

                    browser.wait(EC.visibilityOf(previewNotification), waitTimeBetweenTimeouts + testDelay, "Expected second previewNotification to be displayed!");
                }

                it("should show timer notifications in workflow preview", function () {
                    getWorkflowEditViewAndStartPreview('Protractor::goalTimer2');
                    //alert should appear after the waiting interval in a preview
                    checkForPreviewNotification(waitTime);
                    //checking for no notification if preview is disabled
                    getPreviewCloseButton().click();
                    browser.sleep(waitTime); //waiting for last notification to disappear
                    expect(getPreviewAlertDiv().isDisplayed()).toBe(false);
                    browser.sleep(waitTime);
                    expect(getPreviewAlertDiv().isDisplayed()).toBe(false);
                    getSaveButton().click(); //Saving again to reset Timer
                    togglePreview();
                    checkForPreviewNotification(waitTime);
                });
                it("should show timer notifications not just once, but multiple times (3x), with the correct timing in between", function() {
                    getWorkflowEditViewAndStartPreview('Protractor::goalTimer2');
                    checkForPreviewNotification(waitTime);
                    expect(getPreviewAlertDiv().getText()).toMatch(/Erinnerung: Task 1/);

                    checkForNextPreviewNotification(waitTime, 3000);
                    checkForNextPreviewNotification(waitTime, 3000);

                });
                it("should not show alert after Timer is removed and workflow is saved", function () {
                    getWorkflowEditViewAndStartPreview('Protractor::goalTimer2');
                    togglePreview();

                    doBlockly(function() {
                        let firstRememberBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.REMEMBER_BLOCK_TYPE)[0];
                        ProtractorBlockly.deleteBlock(firstRememberBlock);
                    });

                    getSaveButton().click();
                    togglePreview();
                    browser.sleep(waitTime + 250);
                    expect(getPreviewAlertDiv().isDisplayed()).toBe(false);
                });
            });
        });

        describe('skipable timer sleep block', function() {
            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile('sleepTimerLong.json');
            });
            afterAll(function() {
                clearWebStorage();
                clearFileDB();
            });
            //FIXME: Flaky
            it('should skip sleep in editor if skip button is pressed', function () {
                /* Task "1"; Sleep 1 Minute "Please Wait"; Task "2" */
                getWorkflowEditViewAndStartPreview('Protractor::LongSleep');
                automateWorkflow([
                    {expect: {taskText: '1'}, instruction: 'ok'},
                    {expect: {taskText: 'Please wait', skipVisible: true, sleepTimer: 3000}},
                    {expect: {taskText: 'Please wait', skipVisible: true}, instruction: 'skip'},
                    {expect: {taskText: '2'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                ]);
            });
        });

        describe('TTS tests', function () {
            beforeAll(() => mockWebSpeechSynthesis());
            beforeAll(function() {
                settingsSetTTSEnabled(true);
            });
            afterAll(function() {
                settingsSetTTSEnabled(false);
            });
            afterAll(() => unmockWebSpeechSynthesis());

            beforeEach(function () {
                browser.get('index.html#!/edit/0');
                waitForBlockly();
            });

            it('should not speak in flowEditView unless label is clicked', function() {
                togglePreview();
                var previewDiv = getPreviewDiv();
                browser.wait(EC.visibilityOf(previewDiv), 2000, "Expected previewDiv to be displayed!");

                expect(browser.sleep(1000).then(function () {
                    since("expected nothing to have been spoken").
                    expect(mockedTTSGetLastSpokenTextsJoined()).toBe('');
                })).not.toBeDefined();

                var block = getCurrentExecutionBlock();
                expect(block.getText()).toMatch(/ende/i);
                getExecutionBlockLabelElement(block).click();
                since("expected TTS to speak current block text (expected #{expected} but was #{actual})").
                expect(mockedTTSGetLastSpokenTextsJoined()).toMatch(/ende/i);


                //close preview
                var closeButton = getPreviewCloseButton();
                closeButton.click();
            });
        });

        describe('Object URL releasing', function() {
            function hookObjectURLMethods() {
                browser.executeScript(function() {
                    if (window.ptor_orig_createObjectURL || window.ptor_orig_revokeObjectURL) {
                        throw new Error('ObjectURL methods already hooked!');
                    }
                    window.ptor_orig_createObjectURL = URL.createObjectURL;
                    window.ptor_orig_revokeObjectURL = URL.revokeObjectURL;
                    window.ptor_createdObjectURLsToStack = new Map();
                    URL.createObjectURL = function() {
                        const objectURL = window.ptor_orig_createObjectURL(...arguments);
                        window.ptor_createdObjectURLsToStack.set(objectURL, new Error().stack);
                        return objectURL;
                    };
                    URL.revokeObjectURL = function(objectURL) {
                        const ret = window.ptor_orig_revokeObjectURL(...arguments);
                        window.ptor_createdObjectURLsToStack.delete(objectURL);
                        return ret;
                    };
                });
            }

            function restoreObjectURLMethods() {
                browser.executeScript(function() {
                    if (!window.ptor_orig_createObjectURL || !window.ptor_orig_revokeObjectURL) {
                        throw new Error('Original ObjectURL methods are missing!');
                    }
                    URL.createObjectURL = window.ptor_orig_createObjectURL;
                    URL.revokeObjectURL = window.ptor_orig_revokeObjectURL;
                    delete window.ptor_orig_createObjectURL;
                    delete window.ptor_orig_revokeObjectURL;
                    delete window.ptor_createdObjectURLsToStack;
                });
            }

            function expectAllObjectURLsReleased() {
                const createdObjectURLsToStackEntries = browser.executeScript(function() {
                    return [...window.ptor_createdObjectURLsToStack.entries()];
                });
                browser.wait(createdObjectURLsToStackEntries.then(entries => {
                    let errors = [];
                    for (const [url, stackTrace] of entries) {
                        errors.push(`Object URL has not been revoked: ${url}.\nAcquired from ${stackTrace}`);
                    }
                    if (errors.length > 0) {
                        fail(errors.join('\n\n'));
                    }
                    expect(entries.length).toBe(0);
                }), 3000);
            }

            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile("importWithMultipleImages.json");
                importTestfile("imagesParallel-with-images.json");
            });

            afterAll(function() {
                clearWebStorage();
                clearFileDB();
            });

            beforeEach(function() {
                browser.get('index.html#!/edit/1');
                hookObjectURLMethods();
            });

            afterEach(function() {
                browser.setLocation('/overview');
                waitForWorkflowPresence('Test Workflow', 3000);
                expectAllObjectURLsReleased();
                restoreObjectURLMethods();
            });

            it('should release all object URLs created by imagePreview', function() {
                const images = ['Image1', 'Image2', 'Image3'];
                for (let i = 0; i < 2; ++i) {
                    for (const img of images) {
                        getImageSelect().element(by.cssContainingText('option', img)).click();
                        browser.wait(EC.visibilityOf(getImageSavedPreview()), 2000);
                    }
                }
            });

            it('should release all object URLs created by execution preview', function() {
                togglePreview();
                waitForExecutionComponentLoaded();
                automateWorkflow([
                    {instruction: 'ok' },
                    {instruction: 'ok' },
                    {instruction: 'ok' },
                    {instruction: 'click_label' },
                    {instruction: 'ok' },
                    {instruction: 'ok', expect: {taskImageFile: 'testfiles/TuxCheckList.jpg'} },
                    {instruction: 'ok' },
                    {instruction: 'click_label' },
                ]);
            });

            it('should release all object URLs created by executionView', function() {
                getFlowEditViewStartButton().click();
                waitForExecutionComponentLoaded();
                automateWorkflow([
                    {instruction: 'ok' },
                    {instruction: 'ok', expect: {taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok' },
                    {instruction: 'click_label' },
                ]);
            });

            it('should release all object URLs created by executionView (parallel block)', function() {
                browser.setLocation('/edit/2');
                getFlowEditViewStartButton().click();
                waitForExecutionComponentLoaded();
                automateWorkflow([
                    {instruction: 'ok', block: 'mini1'},
                    {instruction: 'ok', block: 'mini0'},
                    {instruction: 'ok', block: 'mini0'},
                    {instruction: 'click_label' },
                ]);
            });
        });

        describe('Global block copy & paste', function() {
            /**
             *
             * @return {ElementFinder}
             */
            function getCopyButton() {
                return element(by.cssContainingText('.flow-edit-button-bar .btn', 'Kopieren'));
            }
            /**
             *
             * @return {ElementFinder}
             */
            function getPasteButton() {
                return element(by.cssContainingText('.flow-edit-button-bar .btn', 'Einfügen'));
            }

            /**
             *
             * @return {ElementFinder}
             */
            function getPastePreviewPopover() {
                return $('.popover[uib-title=Vorschau]');
            }

            /**
             *
             * @return {ElementFinder}
             */
            function getPastePreviewPopoverImage() {
                return getPastePreviewPopover().$('img');
            }

            /**
             *
             * @return {String}
             */
            function getFirstBlockXml() {
                return doBlockly(function() {
                    const firstBlock = ProtractorBlockly.getGoalFirstStatementBlock();
                    return firstBlock === null ? '' : ProtractorBlockly.getBlockXml(firstBlock);
                });
            }

            function copySelectedToBlockClipboard() {
                getCopyButton().click();
                browser.wait(() => getCopyButton().isEnabled(), 5000, "Timeout while waiting for copy button to be enabled");
            }
            function pasteFromBlockClipboard() {
                return getNumNonGoalTopBlocks().then((pastedBlockCountBefore) => {
                    getPasteButton().click();
                    waitForPastedBlocks(pastedBlockCountBefore + 1);
                });
            }

            function getNumNonGoalTopBlocks() {
                return doBlockly(function() {
                    const goalBlock = ProtractorBlockly.getGoalBlock();
                    const nonGoalTopBlocks = ProtractorBlockly.getTopBlocks().filter((block) => block !== goalBlock);
                    return nonGoalTopBlocks.length;
                });
            }

            function waitForPastedBlocks(numPastedBlocks) {
                numPastedBlocks = numPastedBlocks || 1;
                return browser.wait(() => getNumNonGoalTopBlocks().then(
                    count => count === numPastedBlocks
                ), 5000, `Timeout while waiting for ${numPastedBlocks} pasted block groups`);
            }

            function attachPastedBlockToGoal() {
                return doBlockly(function() {
                    const goalBlock = ProtractorBlockly.getGoalBlock();
                    const nonGoalTopBlocks = ProtractorBlockly.getTopBlocks().filter((block) => block !== goalBlock);
                    if (nonGoalTopBlocks.length !== 1) {
                        throw new Error('Expected exactly one non-goal top block!');
                    }
                    const pastedBlock = nonGoalTopBlocks[0];
                    ProtractorBlockly.addFirstStatement(goalBlock, ProtractorBlockly.GOAL_STATEMENTS, pastedBlock);
                });
            }

            function selectFirstBlock() {
                return doBlockly(() => ProtractorBlockly.selectBlock(ProtractorBlockly.getGoalFirstStatementBlock()));
            }

            function getNumberOfTaskBlocks() {
                return doBlockly(function() {
                    return ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE).length;
                });
            }
            function getImageOptionsNames() {
                return getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).map((option) => {
                    return option.getText();
                });
            }
            function getNumberOfImageOptions() {
                return getImageSelect().all(by.tagName('option')).filter(option => {
                    return option.getText().then(text => text !== "");
                }).count();
            }
            function checkImageAvailableInImageSelect(imageName, testFileName) {
                const imageCheckTimeout = 2000;
                getImageSelect().$('[value="string:'+ imageName +'"]').click();
                browser.wait(EC.visibilityOf(getImageSavedPreview()), imageCheckTimeout);
                const image1 = getImageSavedPreview().getAttribute("src");
                checkImageFile(image1, "testfiles/" + testFileName);
            }
            function checkPastePreviewImage() {
                browser.actions().mouseMove(getPasteButton()).perform();
                browser.wait(EC.visibilityOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover to be visible");
                browser.wait(() => isImageLoaded(getPastePreviewPopoverImage()), 2000, "Timeout waiting for paste preview image to be loaded");
                browser.actions().mouseMove(getCopyButton()).perform();
                browser.wait(EC.stalenessOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover not to be present");
            }

            afterEach(function() {
                clearClipboardDB();
            });
            describe('without images', function() {
                let testWorkflowEditUrl;
                let nestedBlocksEditUrl;
                beforeAll(function () {
                    browser.get('index.html#!/overview');
                    importTestfile('nestedBlocks.json');
                    waitForWorkflowPresence("Protractor::nestedBlocks");
                    getEditButton(getWorkflowsForName("Test Workflow").first()).getAttribute('href').then(href => {
                        testWorkflowEditUrl = href;
                    });
                    getEditButton(getWorkflowsForName("Protractor::nestedBlocks").first()).getAttribute('href').then(href => {
                        nestedBlocksEditUrl = href;
                    });
                });
                afterAll(function() {
                    clearWebStorage();
                    clearFileDB();
                });

                it('should copy & paste a single block within the same workflow', function() {
                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    doBlockly(function() {
                        const goal = ProtractorBlockly.getGoalBlock();
                        const task = ProtractorBlockly.createBlock(ProtractorBlockly.TASK_BLOCK_TYPE);
                        task.setFieldValue('Example task', ProtractorBlockly.DESCRIPTION_FIELD);
                        ProtractorBlockly.addFirstStatement(goal, ProtractorBlockly.GOAL_STATEMENTS, task);
                    });
                    selectFirstBlock();
                    expect(getNumberOfTaskBlocks()).toBe(1);
                    copySelectedToBlockClipboard();
                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    expect(getNumberOfTaskBlocks()).toBe(2);
                    pasteFromBlockClipboard();
                    expect(getNumberOfTaskBlocks()).toBe(3);
                });
                it('should copy & paste a block with children from one workflow to another', function() {
                    // Copy block from original workflow
                    browser.get(nestedBlocksEditUrl);
                    waitForBlockly();
                    const origXml = getFirstBlockXml();
                    selectFirstBlock();
                    expect(origXml).toMatch(/^<block.*/);
                    copySelectedToBlockClipboard();

                    // Paste block to new workflow
                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);
                    checkPastePreviewImage();
                    pasteFromBlockClipboard();

                    // Attach pasted block to goal
                    expect(getFirstBlockXml()).toBe('');
                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);

                    // After refreshing the editor page (and not saving)
                    browser.refresh();
                    waitForBlockly();
                    expect(getFirstBlockXml()).toBe('');

                    // Paste again
                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                });
                it('should update the clipboard preview image between different copy actions', function() {
                    browser.get(nestedBlocksEditUrl);
                    waitForBlockly();
                    // before copying, image should not be present
                    browser.actions().mouseMove(getPasteButton()).perform();
                    browser.wait(EC.visibilityOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover to be visible");
                    browser.wait(EC.stalenessOf(getPastePreviewPopover().$('img')), 2000, "Timeout waiting for paste preview image to be stale");
                    browser.actions().mouseMove(getCopyButton()).perform();

                    selectFirstBlock();
                    copySelectedToBlockClipboard();
                    browser.actions().mouseMove(getPasteButton()).perform();
                    browser.wait(EC.visibilityOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover to be visible");
                    browser.wait(() => isImageLoaded(getPastePreviewPopoverImage()), 2000, "Timeout waiting for paste preview image to be loaded");
                    getImageDataUrl(getPastePreviewPopoverImage()).then((clipboardPreview1Data) => {
                        getImageElementNaturalDimensions(getPastePreviewPopoverImage()).then((clipboardPreview1NaturalDimensions) => {
                            browser.actions().mouseMove(getCopyButton()).perform();
                            browser.wait(EC.stalenessOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover to be stale");

                            // select second block
                            doBlockly(function() {
                                const q1Block = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.IF_THEN_ELSE_BLOCK_TYPE)
                                    .filter((block) => ProtractorBlockly.getFieldText(block, ProtractorBlockly.CONDITION_FIELD) === 'CondA2')[0];
                                ProtractorBlockly.selectBlock(q1Block);
                            });
                            copySelectedToBlockClipboard();
                            browser.actions().mouseMove(getPasteButton()).perform();
                            browser.wait(EC.visibilityOf(getPastePreviewPopover()), 2000, "Timeout waiting for paste preview popover to be visible");
                            browser.wait(() => isImageLoaded(getPastePreviewPopoverImage()), 2000, "Timeout waiting for paste preview image to be loaded");
                            browser.wait(() => getImageDataUrl(getPastePreviewPopoverImage()).then((clipboardPreview2Data) => {
                                return clipboardPreview2Data !== clipboardPreview1Data;
                            }), 2000, "Timeout waiting for clipboard preview image to change");
                            getImageElementNaturalDimensions(getPastePreviewPopoverImage()).then(clipboardPreview2NaturalDimensions => {
                                // Second preview image should be smaller in height than the first one (since less blocks selected).
                                expect(clipboardPreview1NaturalDimensions[1]).toBeGreaterThan(clipboardPreview2NaturalDimensions[1]);
                            });
                            browser.actions().mouseMove(getCopyButton()).perform();
                        });
                    });
                });

                describe('auto-expiry', function() {
                    beforeAll(function() {
                        installMockedDateModule(null);
                    });
                    afterAll(function() {
                        uninstallMockedDateModule();
                    });
                    afterEach(function () {
                        disableMockedDate();
                    });

                    function getClipboardExpiryTooltip() {
                        return element(by.css('button[ng-click="$ctrl.pasteGlobally()"] + .tooltip'));
                    }

                    it('should clear clipboard, if data is expired, and show tooltip', function() {
                        const date1 = new Date(Date.UTC(2021, 3, 10, 14, 39, 42, 354));
                        const date2 = new Date(Date.UTC(2021, 3, 12, 0, 20, 11, 876));
                        installMockedDateModuleAndLoadPage(date1, testWorkflowEditUrl);
                        waitForBlockly();
                        doBlockly(function() {
                            const goal = ProtractorBlockly.getGoalBlock();
                            const task = ProtractorBlockly.createBlock(ProtractorBlockly.TASK_BLOCK_TYPE);
                            task.setFieldValue('Example task', ProtractorBlockly.DESCRIPTION_FIELD);
                            ProtractorBlockly.addFirstStatement(goal, ProtractorBlockly.GOAL_STATEMENTS, task);
                        });
                        selectFirstBlock();
                        expect(getNumberOfTaskBlocks()).toBe(1);
                        copySelectedToBlockClipboard();
                        pasteFromBlockClipboard();
                        expect(getNumberOfTaskBlocks()).toBe(2);
                        expect(getClipboardExpiryTooltip().isPresent()).toBe(false);

                        installMockedDateModuleAndLoadPage(date2, testWorkflowEditUrl);
                        waitForBlockly();
                        expect(getNumberOfTaskBlocks()).toBe(0);
                        getPasteButton().click();
                        browser.wait(EC.visibilityOf(getClipboardExpiryTooltip()), 2000, "Expected clipboard expiry tooltip to be displayed");
                        expect(getClipboardExpiryTooltip().getText()).toEqual("Alter Inhalt gelöscht");
                        browser.sleep(1000);
                        expect(getNumberOfTaskBlocks()).toBe(0);
                        browser.wait(EC.invisibilityOf(getClipboardExpiryTooltip()), 1000, "Expected clipboard expiry tooltip to be hide after 2 seconds");
                        // TODO: Check tooltip
                    });
                })
            });

            describe('with images', function() {
                let testWorkflowEditUrl;
                let nestedImagesEditUrl;
                let imagesExistingEditUrl;
                let imagesExisting2EditUrl;
                afterEach(function() {
                    clearWebStorage();
                    clearFileDB();
                });
                beforeEach(function() {
                    browser.get('index.html#!/overview');
                    importTestfile('nestedImages.json');
                    importTestfile('imagesExisting.json');
                    waitForWorkflowPresence("Protractor::nestedImages");
                    waitForWorkflowPresence("Protractor::imagesExisting");
                    waitForWorkflowPresence("Protractor::imagesExisting2");
                    getEditButton(getWorkflowsForName("Test Workflow").first()).getAttribute('href').then(href => {
                        testWorkflowEditUrl = href;
                    });
                    getEditButton(getWorkflowsForName("Protractor::nestedImages").first()).getAttribute('href').then(href => {
                        nestedImagesEditUrl = href;
                    });
                    getEditButton(getWorkflowsForName("Protractor::imagesExisting").first()).getAttribute('href').then(href => {
                        imagesExistingEditUrl = href;
                    });
                    getEditButton(getWorkflowsForName("Protractor::imagesExisting2").first()).getAttribute('href').then(href => {
                        imagesExisting2EditUrl = href;
                    });
                });

                it('should copy & paste only referenced images to another workflow (first block selected)', function() {
                    browser.get(nestedImagesEditUrl);
                    waitForBlockly();
                    const origXml = getFirstBlockXml();
                    expect(origXml).toMatch(/^<block.*/);

                    selectFirstBlock();
                    copySelectedToBlockClipboard();

                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);

                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    browser.wait(getNumberOfImageOptions().then((count) => count === 3), 5000, "Timeout while waiting for number of imageSelect options to be 3");
                    // magician should not be there, as it was not referenced in the workflow
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['BlackSuit', 'Crab', 'Checklist']));
                    checkImageAvailableInImageSelect('BlackSuit', 'TuxBlackSuit.jpg');
                    checkImageAvailableInImageSelect('Crab', 'TuxCrab.png');
                    checkImageAvailableInImageSelect('Checklist', 'TuxCheckList.jpg');

                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                });

                it('should copy & paste only referenced images to another workflow (first block selected, original workflow is deleted)', function() {
                    browser.get(nestedImagesEditUrl);
                    waitForBlockly();
                    const origXml = getFirstBlockXml();
                    expect(origXml).toMatch(/^<block.*/);

                    selectFirstBlock();
                    copySelectedToBlockClipboard();

                    browser.get('index.html#!/overview');
                    const workflows = element.all(by.repeater('workflow in $ctrl.workflows'));
                    workflows.each(workflow => {
                        getWorkflowName(workflow).then(name => {
                            if (name !== "Test Workflow") {
                                getSelectWorkflowCheckbox(workflow).click();
                            }
                        });
                    });
                    deleteSelectedWorkflows();

                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);

                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    browser.wait(getNumberOfImageOptions().then((count) => count === 3), 5000, "Timeout while waiting for number of imageSelect options to be 3");
                    // magician should not be there, as it was not referenced in the workflow
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['BlackSuit', 'Crab', 'Checklist']));
                    checkImageAvailableInImageSelect('BlackSuit', 'TuxBlackSuit.jpg');
                    checkImageAvailableInImageSelect('Crab', 'TuxCrab.png');
                    checkImageAvailableInImageSelect('Checklist', 'TuxCheckList.jpg');

                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                });

                it('should copy & paste only referenced images to another workflow (second block selected)', function() {
                    browser.get(nestedImagesEditUrl);
                    waitForBlockly();
                    const origXml = doBlockly(function() {
                        const q1Block = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.IF_THEN_ELSE_BLOCK_TYPE)
                            .filter((block) => ProtractorBlockly.getFieldText(block, ProtractorBlockly.CONDITION_FIELD) === 'Q1')[0];
                        ProtractorBlockly.selectBlock(q1Block);
                        return ProtractorBlockly.getBlockXml(q1Block);
                    });
                    expect(origXml).toMatch(/^<block.*/);

                    copySelectedToBlockClipboard();

                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);

                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    browser.wait(getNumberOfImageOptions().then((count) => count === 2), 5000, "Timeout while waiting for number of imageSelect options to be 3");
                    // blacksuit should not be there, as it was not referenced in the selected blocks
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Crab', 'Checklist']));
                    checkImageAvailableInImageSelect('Crab', 'TuxCrab.png');
                    checkImageAvailableInImageSelect('Checklist', 'TuxCheckList.jpg');

                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                });

                it('should copy & paste only referenced images to another workflow (inner parallel block selected)', function() {
                    browser.get(nestedImagesEditUrl);
                    waitForBlockly();
                    const origXml = doBlockly(function() {
                        const p1Block = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.PARALLEL_BLOCK_TYPE)
                            .filter((block) => ProtractorBlockly.getFieldText(block, ProtractorBlockly.DESCRIPTION_FIELD) === 'P1')[0];
                        ProtractorBlockly.selectBlock(p1Block);
                        return ProtractorBlockly.getBlockXml(p1Block);
                    });
                    expect(origXml).toMatch(/^<block.*/);

                    copySelectedToBlockClipboard();

                    browser.get(testWorkflowEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);

                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    browser.wait(getNumberOfImageOptions().then((count) => count === 1), 5000, "Timeout while waiting for number of imageSelect options to be 3");
                    // only crab should be there (only referenced image in selection)
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Crab']));
                    checkImageAvailableInImageSelect('Crab', 'TuxCrab.png');

                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                });

                it('should copy & paste referenced images, auto-renaming if necessary, and reusing existing images', function() {
                    browser.get(imagesExisting2EditUrl);
                    waitForBlockly();
                    const origXml = getFirstBlockXml();
                    expect(origXml).toMatch(/^<block.*/);
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Blacksuit', 'Checklist', 'Tux']));

                    selectFirstBlock();
                    copySelectedToBlockClipboard();

                    browser.get(imagesExistingEditUrl);
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Tux', 'Tux (2)', 'Tux (3)']));

                    checkPastePreviewImage();
                    pasteFromBlockClipboard();
                    browser.wait(getNumberOfImageOptions().then((count) => count === 4), 5000, "Timeout while waiting for number of imageSelect options to be 4");

                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Tux', 'Tux (2)', 'Tux (3)', 'Tux (4)']));
                    checkImageAvailableInImageSelect('Tux', 'TuxBlackSuit.jpg');
                    checkImageAvailableInImageSelect('Tux (2)', 'TuxCheckList.jpg');
                    checkImageAvailableInImageSelect('Tux (3)', 'TuxCrab.png');
                    checkImageAvailableInImageSelect('Tux (4)', 'TuxMagician.jpg');

                    attachPastedBlockToGoal();
                    expect(getFirstBlockXml()).toEqual(origXml);
                    let blocklyImageDropdownText1 = doBlockly(() => {
                        let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[0];
                        return ProtractorBlockly.getFieldText(taskBlock, "image");
                    });
                    expect(blocklyImageDropdownText1).toBe('Bild: Tux');
                    let blocklyImageDropdownText4 = doBlockly(() => {
                        let taskBlock = ProtractorBlockly.getBlocksOfType(ProtractorBlockly.TASK_BLOCK_TYPE)[3];
                        return ProtractorBlockly.getFieldText(taskBlock, "image");
                    });
                    expect(blocklyImageDropdownText4).toBe('Bild: Tux (4)');

                    browser.refresh();
                    waitForBlockly();
                    expect(getFirstBlockXml()).not.toEqual(origXml);
                    expect(getImageOptionsNames()).toEqual(jasmine.arrayWithExactContents(['Tux', 'Tux (2)', 'Tux (3)', 'Tux (4)']));
                    checkImageAvailableInImageSelect('Tux', 'TuxBlackSuit.jpg');
                    checkImageAvailableInImageSelect('Tux (2)', 'TuxCheckList.jpg');
                    checkImageAvailableInImageSelect('Tux (3)', 'TuxCrab.png');
                    checkImageAvailableInImageSelect('Tux (4)', 'TuxMagician.jpg');
                });
            });
        });

        describe('with gamification enabled', function() {

            beforeAll(function() {
                settingsSetGamificationEnabled(true);
                clearDB('gamificationDB');
            });

            afterAll(function() {
                clearWebStorage();
            });

            beforeEach(function () {
                browser.get('index.html#!/overview');
            });

            afterEach(function() {
                clearDB('gamificationDB');
            });

            it('should not gain points when workflow is previewed', function() {
                importTestfile("taskBlock.json");
                getWorkflowEditViewAndStartPreview("Protractor::taskBlock");

                since('should have #{expected} points after starting preview, but were #{actual}')
                    .expect(getGamificationNavbarProgressBarPoints()).toEqual('0');

                automateWorkflow([
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'A2'}, instruction: 'ok'},
                    {expect: {taskText: 'A3'}, instruction: 'ok'},
                    {expect: {taskText: 'A4'}, instruction: 'ok'}
                ]);

                since('should have #{expected} points after completing tasks in preview, but were #{actual}')
                    .expect(getGamificationNavbarProgressBarPoints()).toEqual('0');

                automateWorkflow([
                    {expect: {taskText: 'A5'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}}
                ]);

                since('should have #{expected} points after finishing workflow in preview, but were #{actual}')
                    .expect(getGamificationNavbarProgressBarPoints()).toEqual('0');

                getSaveButton().click();

                since('should have #{expected} points after saving workflow in preview, but were #{actual}')
                    .expect(getGamificationNavbarProgressBarPoints()).toEqual('0');

                getPreviewButton().click();

                since('should have #{expected} points after closing workflow preview, but were #{actual}')
                    .expect(getGamificationNavbarProgressBarPoints()).toEqual('0');
            });
        });
    });

    describe('executionView', function () {

        var exec_url, edit_url;

        function beforeAllExecutionView(workflowFile, workflowName) {
            browser.get('index.html#!/overview');
            importTestfile(workflowFile);
            waitForWorkflowPresence(workflowName, 5000);
            let workflow = getWorkflowsForName(workflowName).first();
            let exec_url_promise = getStartButton(workflow).getAttribute('href');
            expect(exec_url_promise).toMatch(/#!\/start\/[0-9]+$/);
            return exec_url_promise.then(function (url) {
                exec_url = url;
                edit_url = exec_url.replace("start", "edit");
            });
        }

        describe('Workflow: simpleTask', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('singleTask.json', 'Protractor::singleTask');
            });

            it('should render executionView when user navigates to /start/<id>', function () {
                expect(getPageTitle()).toMatch(/Workflow[- ]Ausführung/);
            });
            it('should open window popup when leaving execution view and workflow not finished', function () {
                browser.setLocation('overview');
                var modal = getModal();
                expect(browser.getCurrentUrl()).toBe(exec_url);
                expect(modal.isPresent()).toBe(true);
                modalAccept(modal);
                expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
            });
            it('should not open window popup when leaving execution view and workflow is finished', function () {
                var currentExecutionBlock = getCurrentExecutionBlock();
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                expect(getCurrentExecutionBlock().getText()).toMatch(/ENDE/);
                browser.setLocation('overview');
                var modal = getModal();
                expect(modal.isPresent()).toBe(false);
                expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
            });
            it('should redirect to overview, when clicked on ENDE', function () {
                var currentExecutionBlock = getCurrentExecutionBlock();
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
                currentExecutionBlock.click();
                expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
            });
            it('should redirect to flowEditView after finished', function () {
                var currentExecutionBlock = getCurrentExecutionBlock();
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                expect(getCurrentExecutionBlock().getText()).toMatch(/ENDE/);
                browser.setLocation('edit/0');
                expect(browser.getCurrentUrl()).toMatch(/\/edit\/0$/);
            });
            it('check leave modal redirection to flowEditView', function () {
                browser.setLocation('edit/0');
                var modal = getModal();
                since("leave modal should be present").
                expect(modal.isPresent()).toBe(true);
                modalAccept(modal);
                expect(browser.getCurrentUrl()).toMatch(/\/edit\/0$/);
            });

            describe('with gamification enabled', function() {

                beforeAll(function () {
                    settingsSetGamificationEnabled(true);
                    clearDB('gamificationDB');
                });

                beforeEach(function() {
                    waitForGamificationNavbarLoaded();
                    setUpGamificationTestUtilities();
                    waitForExecutionComponentLoaded();
                });

                afterEach(function() {
                    tearDownGamificationTestUtilities();
                });

                it('should grant points when a task block and workflow is completed', function() {
                    since('workflow execution start should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('5');

                    automateWorkflow([
                        {instruction: 'ok'},
                        {instruction: 'click_label'}
                    ]);

                    since('start, task and workflow completion should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('16');
                });
                it('should not grant points for workflow abortion', function() {
                    browser.setLocation('overview');
                    const modal = getModal();
                    since("leave modal should be present").expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview/);

                    since('workflow with repeat should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('5');
                });
            });
        });

        describe('Workflow: taskBlock', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('taskBlock.json', 'Protractor::taskBlock');
            });

            /**
             * Protractor::taskBlock
             *      A1
             *      A2
             *      A3
             *      A4
             *      A5
             */
            it('should follow given workflow (condition yes)', function () {
                automateWorkflow([
                    {expect: {goalText: /Protractor::taskBlock/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {nextTaskText: 'A2'}},
                    {expect: {logText: ''}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A1'}},
                    {expect: {nextTaskText: 'A3'}},
                    {expect: {logText: /A1/}},
                    {expect: {taskText: 'A2'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A2'}},
                    {expect: {nextTaskText: 'A4'}},
                    {expect: {logText: /A1[\s]+A2/}},
                    {expect: {taskText: 'A3'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A3'}},
                    {expect: {nextTaskText: 'A5'}},
                    {expect: {logText: /A1[\s]+A2[\s]+A3/}},
                    {expect: {taskText: 'A4'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A4'}},
                    {expect: {nextTaskText: /ende/i}},
                    {expect: {logText: /A1[\s]+A2[\s]+A3[\s]+A4/}},
                    {expect: {taskText: 'A5'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A5'}},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+A2[\s]+A3[\s]+A4[\s]+A5/}}
                ]);
            });
        });

        describe('Workflow: images', function () {
            afterAll(function () {
                clearWebStorage();
                clearFileDB();
            });

            beforeAll(function () {
                beforeAllExecutionView('images.json', 'Protractor::images')
                    // TODO remove this block, if images are saved into file
                    .then(function() {
                    browser.get(edit_url);
                    uploadImageFileAndSave("testfiles/TuxCrab.png", "TuxCrab");
                    uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                });
            });

            beforeEach(function() {
                loadExecUrl(exec_url);
            });

            it('should show images in execution view', function () {
                automateWorkflow([
                    {expect: {taskText: 'TuxCrab', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                ]);
                let img = getExecutionBlockImage(getCurrentExecutionBlock());
                let lightboxImageSrc1 = testLightbox(img);
                automateWorkflow([
                    {instruction: 'ok'},
                    {expect: {taskText: 'TuxMagician', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                ]);
                img = getExecutionBlockImage(getCurrentExecutionBlock());
                let lightboxImageSrc2 = testLightbox(img);
                expect(lightboxImageSrc1).not.toEqual(lightboxImageSrc2);
                automateWorkflow([
                    {instruction: 'ok'},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });

            it('should hide images of previous and next blocks', function () {
                loadExecUrl(exec_url);

                var block = getPreviousExecutionBlock();
                var img = getExecutionBlockImage(block);
                browser.wait(EC.invisibilityOf(img), 1000, 'should not display image in previous block');
                block = getNextExecutionBlock();
                img = getExecutionBlockImage(block);
                browser.wait(EC.invisibilityOf(img), 1000, 'should not display image in next block');
                block = getCurrentExecutionBlock();
                getExecutionBlockButtonCheck(block).click();
                browser.sleep(1000);

                block = getPreviousExecutionBlock();
                img = getExecutionBlockImage(block);
                browser.wait(EC.invisibilityOf(img), 1000, 'should not display image in previous block');
                block = getNextExecutionBlock();
                img = getExecutionBlockImage(block);
                browser.wait(EC.invisibilityOf(img), 1000, 'should not display image in previous block');
            });

            describe('scrollIntoView behaviour', function() {
                beforeAll(function() {
                    saveWindowDimensionsAndResize(400, 500);
                });

                afterAll(function() {
                    restoreWindowDimensions();
                });

                it('should scroll to current block', function () {
                    automateWorkflow([
                        {expect: {taskText: 'TuxCrab', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    ]);
                    waitForElementToBeInView(getCurrentExecutionBlock());
                    scrollToBottom();
                    automateWorkflow([
                        {instruction: 'ok'},
                        {expect: {taskText: 'TuxMagician', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    ]);
                    waitForElementToBeInView(getCurrentExecutionBlock());
                    scrollToBottom();
                    automateWorkflow([
                        {instruction: 'ok'},
                        {expect: {taskText: /ENDE/, taskImageUrl: null}},
                    ]);
                    waitForElementToBeInView(getCurrentExecutionBlock());
                });
            });
        });

        describe('Workflow: imagesIf', function () {
            afterAll(function () {
                clearWebStorage();
                clearFileDB();
            });

            beforeAll(function () {
                beforeAllExecutionView('imagesIf.json', 'Protractor::imagesIf');
            });

            beforeEach(function () {

            });

            it('should show images in execution view', function () {

                // TODO remove this block, if images are saved into file
                browser.get(edit_url);
                uploadImageFileAndSave("testfiles/TuxCrab.png", "TuxCrab");
                uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                uploadImageFileAndSave("testfiles/TuxCheckList.jpg", "TuxChecklist");
                loadExecUrl(exec_url);

                automateWorkflow([
                    {instruction: 'yes', expect: {taskText: 'TuxChecklist', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok', expect: {taskText: 'TuxCrab', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });
        });

        describe('Workflow: imagesWhile', function () {
            afterAll(function () {
                clearWebStorage();
                clearFileDB();
            });

            beforeAll(function () {
                beforeAllExecutionView('imagesWhile.json', 'Protractor::imagesWhile');
            });

            beforeEach(function () {

            });

            it('should show images in execution view', function () {

                // TODO remove this block, if images are saved into file
                browser.get(edit_url);
                uploadImageFileAndSave("testfiles/TuxCheckList.jpg", "TuxChecklist");
                uploadImageFileAndSave("testfiles/TuxCrab.png", "TuxCrab");
                uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                loadExecUrl(exec_url);

                automateWorkflow([
                    {instruction: 'yes', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    {instruction: 'ok', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    {instruction: 'no', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });
        });

        describe('Workflow: imagesWait', function () {
            afterAll(function () {
                clearWebStorage();
                clearFileDB();
            });

            beforeAll(function () {
                beforeAllExecutionView('imagesWait.json', 'Protractor::imagesWait').then(function() {
                    // TODO remove this block, if images are saved into file
                    browser.get(edit_url);
                    uploadImageFileAndSave("testfiles/TuxCheckList.jpg", "TuxChecklist");
                    uploadImageFileAndSave("testfiles/TuxCrab.png", "TuxCrab");
                    uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                });
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            it('should show images in execution view', function () {
                automateWorkflow([
                    {instruction: 'ok', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    {expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg', sleepTimer: 5000}},
                    //Try to fix flakiness of this test by commenting out the line below and changing above timer to 5s
                    //{expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCheckList.jpg', sleepTimer: 4000}},
                    {instruction: 'ok', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });


            it('should close the lightbox automatically, when the flow proceeds', function() {
                automateWorkflow([
                    {instruction: 'ok', expect: {taskText: 'TuxCrab'}},
                    {expect: {taskText: 'TuxChecklist'}},
                ]);
                let img = getExecutionBlockImage(getCurrentExecutionBlock());
                img.click();
                let lightbox = getModal();
                browser.wait(EC.presenceOf(lightbox), 3000, "Lightbox should be present after clicking the image");
                browser.wait(EC.not(EC.presenceOf(lightbox)), 5500, "Lightbox should close when flow proceeds");
                automateWorkflow([
                    {instruction: 'ok', expect: {taskText: 'TuxMagician'}},
                    {expect: {taskText: /ende/i}},
                ]);
            });
        });

        describe('Workflow: imagesParallel', function () {
            afterAll(function () {
                clearWebStorage();
                clearFileDB();
            });

            beforeAll(function () {
                beforeAllExecutionView('imagesParallel.json', 'Protractor::imagesParallel').then(function() {
                    browser.get(edit_url);
                    uploadImageFileAndSave("testfiles/TuxCrab.png", "TuxCrab");
                    uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                    uploadImageFileAndSave("testfiles/TuxCheckList.jpg", "TuxChecklist");
                    uploadImageFileAndSave("testfiles/TuxBlackSuit.jpg", "TuxBlackSuit");
                });
            });

            beforeEach(function() {
                loadExecUrl(exec_url);
            });

            it('check that image of first task is displayed while tasks are ticked', function () {
                automateWorkflow([
                    {expect: {titleImageUrl: /blob:\S+/, titleImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok', block: 'mini0', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    {expect: {titleImageUrl: /blob:\S+/, titleImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok', block: 'mini0', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    {expect: {titleImageUrl: /blob:\S+/, titleImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {instruction: 'ok', block: 'mini0', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });

            it('should show all images of mini tasks in execution view', function () {
                automateWorkflow([
                    {expect: {titleImageUrl: /blob:\S+/, titleImageFile: 'testfiles/TuxCheckList.jpg'}},
                    {block: 'mini0', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                    {block: 'mini1', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    {block: 'mini2', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}},
                    {instruction: 'ok', block: 'mini0'},
                    {instruction: 'ok', block: 'mini1'},
                    {instruction: 'ok', block: 'mini0'},
                    {expect: {taskText: /ENDE/, taskImageUrl: null}},
                ]);
            });

            describe('scrollIntoView behaviour', function() {
                beforeAll(function() {
                    saveWindowDimensionsAndResize(400, 300);
                });

                afterAll(function() {
                    restoreWindowDimensions();
                });

                it('should scroll to current block', function () {
                    automateWorkflow([
                        {expect: {titleImageUrl: /blob:\S+/, titleImageFile: 'testfiles/TuxCheckList.jpg'}},
                        {block: 'mini0', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxCrab.png'}},
                        {block: 'mini1', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                        {block: 'mini2', expect: {taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}},
                    ]);
                    waitForElementToBeInView(getExecutionBlockParallel());
                    scrollToBottom();
                    automateWorkflow([
                        {instruction: 'ok', block: 'mini0'},
                    ]);
                    waitForElementToBeInView(getExecutionBlockParallel());
                    scrollToBottom();
                    automateWorkflow([
                        {instruction: 'ok', block: 'mini1'},
                        {instruction: 'ok', block: 'mini0'},
                        {expect: {taskText: /ENDE/, taskImageUrl: null}},
                    ]);
                    waitForElementToBeInView(element(by.cssContainingText('execution-block[current=true]', /ENDE/)));
                });
            });
        });

        describe('Workflow: parallel2of3', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('parallel2of3.json', 'Protractor::parallel2of3');
            });

            it('should render parallel block', function () {
                expect($$('execution-block-parallel').first().isPresent()).toBe(true);
                expect($$('h1.mini-task span').first().getText()).toMatch(/Aufgabe 1/);
                expect(getParallelBlockTitle()).toMatch(/2 von 3/);
            });
            it('should hide checked sub-tasks (1,2)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().first();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 1/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                expect(getParallelBlockTitle()).toMatch(/1 von 2/);
                currentExecutionBlock = getMiniTaskBlocks().first();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 2/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });
            it('should hide checked sub-tasks (3,2)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().last();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 3/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                expect(getParallelBlockTitle()).toMatch(/1 von 2/);
                currentExecutionBlock = getMiniTaskBlocks().last();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 2/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });
            it('should hide checked sub-tasks (2,3)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().get(1);
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 2/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                expect(getParallelBlockTitle()).toMatch(/1 von 2/);
                currentExecutionBlock = getMiniTaskBlocks().last();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 3/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });

            describe('with gamification enabled', function() {

                beforeAll(function () {
                    settingsSetGamificationEnabled(true);
                    clearDB('gamificationDB');
                });

                beforeEach(function() {
                    waitForGamificationNavbarLoaded();
                    setUpGamificationTestUtilities();
                    waitForExecutionComponentLoaded();
                });

                afterEach(function() {
                    tearDownGamificationTestUtilities();
                });

                it('should grant points when a parallel block is completed', function() {
                    since('workflow execution start should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('5');

                    getMiniTaskBlocks().last().click();
                    since('miniTaskBlock should not give points. Points should stay at #{expected} but was #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('5');

                    getMiniTaskBlocks().last().click();
                    since('workflow start, parallel block completion and workflow finish should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('16');
                });
            });
        });

        describe('Workflow: parallelOR', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('parallelOr.json', 'Protractor::parallelOr');
            });

            it('should render parallel block', function () {
                expect($$('execution-block-parallel').first().isPresent()).toBe(true);
                expect($$('h1.mini-task span').first().getText()).toMatch(/Aufgabe 1/);
                expect(getParallelBlockTitle()).toMatch(/1 von 3/);
            });
            it('should hide checked sub-task (1)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().first();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 1/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });
            it('should hide checked sub-tasks (2)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().get(1);
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 2/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });
            it('should hide checked sub-tasks (3)', function () {
                var currentExecutionBlock = getMiniTaskBlocks().last();
                expect(currentExecutionBlock.getText()).toMatch(/Aufgabe 3/);
                getExecutionBlockButtonCheck(currentExecutionBlock).click();
                currentExecutionBlock = getCurrentExecutionBlock();
                expect(currentExecutionBlock.getText()).toMatch(/ENDE/);
            });
        });

        describe('Workflow: repeatWhile', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('repeatWhile.json', 'Protractor::repeatWhile');
            });

            /**
             * Protractor::repeatWhile
             *      A1
             *      While Bedingung B
             *          B1
             *      C1
             *      While Bedingung D
             *          D1
             *          D2
             *          D3
             *      E1
             */
            it('should follow given workflow (condition false)', function () {
                automateWorkflow([
                    {expect: {goalText: /Repeat Test/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {nextTaskText: 'Bedingung B'}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'A1'}},
                    {expect: {nextTaskText: '???'}},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                    {expect: {prevTaskText: 'Bedingung B'}},
                    {expect: {nextTaskText: 'Bedingung D'}},
                    {expect: {taskText: 'C1'}, instruction: 'ok'},
                    {expect: {prevTaskText: 'C1'}},
                    {expect: {nextTaskText: '???'}},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'no'},
                    {expect: {prevTaskText: 'Bedingung D'}},
                    {expect: {nextTaskText: /ende/i}},
                    {expect: {taskText: 'E1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+Nein: Bedingung B[\s]+C1[\s]+Nein: Bedingung D[\s]+E1/}}
                ]);
            });

            it('should follow given workflow (repeat several times)', function () {
                automateWorkflow([
                    {expect: {goalText: /Repeat Test/}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                    {expect: {taskText: 'C1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'yes'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'yes'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'no'},
                    {expect: {taskText: 'E1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+Ja: Bedingung B[\s]+B1[\s]+Ja: Bedingung B[\s]+B1[\s]+Nein: Bedingung B[\s]+C1[\s]+Ja: Bedingung D[\s]+D1[\s]+D2[\s]+D3[\s]+Ja: Bedingung D[\s]+D1[\s]+D2[\s]+D3[\s]+Nein: Bedingung D[\s]+E1/}}
                ]);
            });

        });

        describe('Workflow: repeatUntil', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('repeatUntil.json', 'Protractor::repeatUntil');
            });

            /**
             * Protractor::repeatUntil
             *      A1
             *      Repeat Until Bedingung B
             *          B1
             *      C1
             *      Repeat Until Bedingung D
             *          D1
             *          D2
             *          D3
             *      E1
             */
            it('should follow given workflow (condition true)', function () {
                automateWorkflow([
                    {expect: {goalText: /Repeat Test/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {nextTaskText: 'Bedingung B'}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'yes'},
                    {expect: {taskText: 'C1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'yes'},
                    {expect: {taskText: 'E1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}}
                ]);
            });

            it('should follow given workflow (repeat several times)', function () {
                automateWorkflow([
                    {expect: {goalText: /Repeat Test/}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung B'}, instruction: 'yes'},
                    {expect: {taskText: 'C1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'no'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'no'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung D'}, instruction: 'yes'},
                    {expect: {taskText: 'E1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}}
                ]);
            });

            describe('with gamification enabled', function() {

                beforeAll(function () {
                    settingsSetGamificationEnabled(true);
                    clearDB('gamificationDB');
                });

                beforeEach(function() {
                    waitForGamificationNavbarLoaded();
                    setUpGamificationTestUtilities();
                    waitForExecutionComponentLoaded();
                });

                afterEach(function() {
                    tearDownGamificationTestUtilities();
                });

                it('should not grant points for repeatUntil blocks', function() {
                    automateWorkflow([
                        {expect: {goalText: /Repeat Test/}},
                        {instruction: 'ok'},
                        {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                        {instruction: 'ok'},
                        {expect: {taskText: 'Bedingung B'}, instruction: 'no'},
                        {instruction: 'ok'},
                        {expect: {taskText: 'Bedingung B'}, instruction: 'yes'},
                        {instruction: 'ok'},
                        {expect: {taskText: 'Bedingung D'}, instruction: 'no'},
                        {instruction: 'ok'}
                    ]);

                    since('workflow with repeat should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('10');
                });
            });
        });

        describe('Workflow: repeatTimes', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('repeatTimes.json', 'Protractor::repeatTimes');
            });

            /**
             * Protractor::repeatTimes
             *      A1
             *      Wiederhole 3x
             *          B1
             *      C1
             *      Wiederhole 2x
             *          D1
             *          D2
             *          D3
             *      E1
             */
            it('should follow given workflow', function () {
                automateWorkflow([
                    {expect: {goalText: /Protractor::repeatTimes/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {taskText: 'A1', nextTaskText: 'Noch 3 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'B1', prevTaskText: 'Noch 3 mal...', nextTaskText: 'Noch 3 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'B1', prevTaskText: 'Noch 2 mal...', nextTaskText: 'Noch 2 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'B1', prevTaskText: 'Noch 1 mal...', nextTaskText: 'Noch 1 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'C1', prevTaskText: 'Noch 0 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'D1', prevTaskText: 'Noch 2 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3', nextTaskText: 'Noch 2 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'D1', prevTaskText: 'Noch 1 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'D2'}, instruction: 'ok'},
                    {expect: {taskText: 'D3', nextTaskText: 'Noch 1 mal...'}, instruction: 'ok'},
                    {expect: {taskText: 'E1', prevTaskText: 'Noch 0 mal...'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+B1[\s]+B1[\s]+B1[\s]+C1[\s]+D1[\s]+D2[\s]+D3[\s]+D1[\s]+D2[\s]+D3[\s]+E1/}}
                ]);
            });

            describe('with gamification enabled', function() {

                beforeAll(function () {
                    settingsSetGamificationEnabled(true);
                    clearDB('gamificationDB');
                });

                beforeEach(function() {
                    waitForGamificationNavbarLoaded();
                    setUpGamificationTestUtilities();
                    waitForExecutionComponentLoaded();
                });

                afterEach(function() {
                    tearDownGamificationTestUtilities();
                });

                it('should not grant points for repeatTimes blocks', function() {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatTimes/}},
                        {expect: {prevTaskText: /start/i}},
                        {expect: {taskText: 'A1', nextTaskText: 'Noch 3 mal...'}, instruction: 'ok'},
                        {expect: {taskText: 'B1', prevTaskText: 'Noch 3 mal...', nextTaskText: 'Noch 3 mal...'}, instruction: 'ok'},
                        {expect: {taskText: 'B1', prevTaskText: 'Noch 2 mal...', nextTaskText: 'Noch 2 mal...'}, instruction: 'ok'},
                        {expect: {taskText: 'B1', prevTaskText: 'Noch 1 mal...', nextTaskText: 'Noch 1 mal...'}, instruction: 'ok'}
                    ]);

                    since('workflow with repeat should have given #{expected} points, but actual points were #{actual}')
                        .expect(getGamificationNavbarProgressBarPoints()).toEqual('9');
                });
            });
        });

        describe('Workflow: ifBlock', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('ifBlock.json', 'Protractor::ifBlock');
            });

            /**
             * Protractor::ifBlock
             *      A1
             *      wenn Bedingung
             *          B1
             *          B2
             *      sonst
             *          C1
             *          C2
             *      D1
             */
            it('should follow given workflow (condition yes)', function () {
                automateWorkflow([
                    {expect: {goalText: /Protractor::ifBlock/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {nextTaskText: 'Bedingung'}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'B2'}, instruction: 'ok'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+Ja: Bedingung[\s]+B1[\s]+B2[\s]+D1/}}
                ]);
            });

            it('should follow given workflow (condition no)', function () {
                automateWorkflow([
                    {expect: {goalText: /Protractor::ifBlock/}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung'}, instruction: 'no'},
                    {expect: {taskText: 'C1'}, instruction: 'ok'},
                    {expect: {taskText: 'C2'}, instruction: 'ok'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}},
                    {expect: {logText: /A1[\s]+Nein: Bedingung[\s]+C1[\s]+C2[\s]+D1/}}
                ]);
            });
        });

        describe('Workflow: nestedBlocks', function () {
            afterAll(function () {
                clearWebStorage();
            });

            beforeEach(function () {
                loadExecUrl(exec_url);
            });

            beforeAll(function () {
                beforeAllExecutionView('nestedBlocks.json', 'Protractor::nestedBlocks');
            });

            /**
             * Protractor::nestedBlocks
             *      wenn CondA1
             *          wenn CondA2
             *              A2a
             *          sonst
             *              wenn CondA3
             *                  A3a
             *              sonst
             *                  A3b
             *      sonst
             *          A1b
             *      wiederhole solange CondB1
             *          B1
             *          wiederhole bis CondB2
             *              B2
             *      wiederhole 2x
             *          wenn CondC1
             *              wiederhole solange CondC2
             *                  parallel and AndC3
             *                      C3a
             *                      C3b
             *              C1
             *          sonst
             *              parallel or OrC1
             *                  C1a
             *                  C1b
             */
            it('should follow given workflow (condition yes)', function () {
                automateWorkflow([
                    {expect: {goalText: /Protractor::nestedBlocks/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {taskText: 'CondA1'}, instruction: 'yes'},
                    {expect: {taskText: 'CondA2'}, instruction: 'yes'},
                    {expect: {taskText: 'A2a'}, instruction: 'ok'},
                    {expect: {taskText: 'CondB1'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'CondB2'}, instruction: 'no'},
                    {expect: {taskText: 'B2'}, instruction: 'ok'},
                    {expect: {taskText: 'CondB2'}, instruction: 'no'},
                    {expect: {taskText: 'B2'}, instruction: 'ok'},
                    {expect: {taskText: 'CondB2'}, instruction: 'yes'},
                    {expect: {taskText: 'CondB1'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'CondB2'}, instruction: 'yes'},
                    {expect: {taskText: 'CondB1'}, instruction: 'no'},
                    {expect: {taskText: 'CondC1'}, instruction: 'yes'},
                    {expect: {taskText: 'CondC2'}, instruction: 'yes'}
                ]);
            });
        });

        /**
         * Test Empty
         *      a
         *      Wenn <Frage (Bedingung)>
         *      dann
         *      sonst
         *      Wiederhole 0 mal
         *      mache
         *      Wiederhole empty repeat condition?
         *      Solange Ja
         *      2 beliebige Aufabe(n) parallel not enough tasks
         *          only one task here :/
         *      1 beliebige Aufgabe parallel empty
         *      b
         *
         */
        describe('Workflow: test_empty', function() {
            beforeAll(function () {
                beforeAllExecutionView('test_empty.json', 'Test Empty');
            });
            beforeEach(function () {
                loadExecUrl(exec_url);
            });
            afterAll(clearWebStorage);

            it('should be able to finish empty blocks and parallel blocks with unfulfillable conditions', function() {
                automateWorkflow([
                    {expect: {taskText: 'a'}, instruction: 'ok'},
                    {expect: {taskText: 'empty if?'}, instruction: 'yes'},
                    {expect: {taskText: 'empty repeat condition?'}, instruction: 'no'},
                    {expect: {titleText: '2 von 1: parallel not enough tasks'}},
                    {block: 'mini0', expect: {taskText: 'only one task here :/'}, instruction: 'ok'},
                    {expect: {taskText: 'b'}, instruction: 'ok'}
                ]);
            });
        });

        describe('Workflow: JSInjection', function() {
            beforeAll(function () {
                beforeAllExecutionView('js-injection.json', 'JSInjection');
            });
            beforeEach(function () {
                loadExecUrl(exec_url);
            });
            afterAll(clearWebStorage);

            it('should not show alert', function() {
                browser.wait(EC.not(EC.alertIsPresent()), 5000);
            });
        })

        describe('Timer tests', function () {
            var originalTimeout;
            beforeEach(function () {
                originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                // Increase timeout, as we have some long running tests (timing)
                jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
            });

            afterEach(function () {
                jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            });

            describe('Workflow: goalTimer', function () {
                const timer_delta = 150;
                const timer_interval = 4000;

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('goalTimer.json', 'Protractor::goalTimer');
                });

                it('should show popup, when goal has timer attached after specified interval, repeatedly', function () {
                    browser.sleep(timer_interval + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    browser.sleep(timer_interval / 4);
                    expect(getModalText(modal)).toMatch(/Task 1/);
                    modalOK(modal);
                    browser.sleep(2 * timer_interval / 4);
                    expect(modal.isPresent()).toBe(false);
                    browser.sleep(2 * timer_interval / 4 + timer_delta);
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    expect(getModalText(modal)).toMatch(/Task 1/);
                });

                it('should reset timer, when proceeding to next task', function () {
                    browser.sleep(timer_interval / 2);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(false);
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    browser.sleep(timer_interval / 2)
                    expect(modal.isPresent()).toBe(false);
                    browser.sleep(timer_interval / 2 + timer_delta);
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                });

                it('should stop timer, when workflow is finished', function () {
                    browser.sleep(timer_interval + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    modalOK(getModal());
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toMatch(/ende/i);
                    browser.sleep(timer_interval + timer_delta);
                    expect(modal.isPresent()).toBe(false);
                });

                it('should stop timer, when execution view is left', function () {
                    browser.sleep(timer_interval + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    modalOK(modal);
                    browser.setLocation('overview');
                    modal = getModal();
                    expect(browser.getCurrentUrl()).toBe(exec_url);
                    expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                    browser.sleep(timer_interval + timer_delta);
                    expect(modal.isPresent()).toBe(false);
                });
            });

            describe('timer notifications', function () {
                beforeAll(function () {
                    browser.get('index.html#!/overview');
                    importTestfile('executionTimerTest.json');
                });

                beforeEach(function () {
                    browser.get('index.html#!/overview');
                });

                afterAll(function () {
                    clearWebStorage();
                    clearFileDB();
                });

                function startWorkflowByName(workflowName) {
                    let workflow = getWorkflowsForName(workflowName);
                    getStartButton(workflow).click();
                    waitForExecutionComponentLoaded();
                }

                function checkVisibilityOfNotificationForTimeStamp(waitingTime) {
                    const testDelay = 500;
                    automateWorkflow([
                        {expect: {noTimerRememberAfter: waitingTime/2}},
                        {expect: {timerRememberAfter: waitingTime / 2 + testDelay}}
                    ]);
                }

                describe('time_base', function () {
                    const waitTimeInMillis = 5000;
                    it('should use default time_base (s) if invalid Time Base is choosen (b)', function () {
                        startWorkflowByName('Protractor::ExecutionTimer_invalid_TimeBase_b');
                        checkVisibilityOfNotificationForTimeStamp(waitTimeInMillis);
                    });
                });

                describe('timeInput', function () {
                    const waitTimeInMillis = 4000;

                    it('should use default time (0s -> changed to min Time 4s) if invalid Time Input is given (letter "c")', function () {
                        startWorkflowByName('Protractor::ExecutionTimer_invalid_TimerInput_letter');
                        checkVisibilityOfNotificationForTimeStamp(waitTimeInMillis);
                    });
                });

                describe('min. Timer', function () {
                    const minimalTimer = 4000;

                    it('should use default time minimalTimer (4s) if Timer is below minTime (current Input: 1)', function () {
                        startWorkflowByName('Protractor::ExecutionTimer_incorrect_minTime_1');
                        checkVisibilityOfNotificationForTimeStamp(minimalTimer);
                    });
                    it('should use correct Timer if it is above minimalTimer (4s) (current Input: 6)', function () {
                        startWorkflowByName('Protractor::ExecutionTimer_correct_minTime_6');
                        checkVisibilityOfNotificationForTimeStamp(6000);
                    });
                });

                describe('modal close on leave', function() {
                    const waitTimeInMillis = 5000;
                    const modalShowTimeout = waitTimeInMillis + 500;
                    it('should NOT close infoModal (reminder) before location is successfully changed', function() {
                        startWorkflowByName('Protractor::ExecutionTimer_correct_TimeBase_s');
                        browser.sleep(modalShowTimeout);
                        const timerModal = getModalByContainingText('<Beschreibung>');
                        const leaveModal = getModalByContainingText('Sie sind dabei die Ausführung abzubrechen');
                        const topModal = getModal();
                        since("expected infoModal to be present").expect(timerModal.isPresent()).toBe(true);
                        since("expected infoModal to be displayed").expect(timerModal.isDisplayed()).toBe(true);
                        browser.setLocation('overview');
                        since("should not leave before accepting leaveModal").expect(browser.getCurrentUrl()).toMatch(/\/start\/\d+$/);
                        since("leave modal should be present").expect(leaveModal.isPresent()).toBe(true);
                        expect(getModalText(topModal)).toMatch(/Sie sind dabei die Ausführung abzubrechen/);
                        modalDismiss(leaveModal);
                        since("should not leave with dismissed leaveModal").expect(browser.getCurrentUrl()).toMatch(/\/start\/\d+$/);
                        since("infoModal (reminder) should still be present when dismissing leaveModal").expect(timerModal.isPresent()).toBe(true);
                        expect(getModalText(topModal)).toBe('<Beschreibung>');
                        modalOK(topModal);
                    });
                    it('should close infoModal (reminder) after location is successfully changed', function() {
                        startWorkflowByName('Protractor::ExecutionTimer_correct_TimeBase_s');
                        browser.sleep(modalShowTimeout);
                        const timerModal = getModalByContainingText('<Beschreibung>');
                        const leaveModal = getModalByContainingText('Sie sind dabei die Ausführung abzubrechen');
                        const topModal = getModal();
                        since("expected infoModal to be present").expect(timerModal.isPresent()).toBe(true);
                        since("expected infoModal to be displayed").expect(timerModal.isDisplayed()).toBe(true);
                        browser.setLocation('overview');
                        expect(browser.getCurrentUrl()).toMatch(/\/start\/\d+$/);
                        since("leave modal should be present").expect(leaveModal.isPresent()).toBe(true);
                        expect(getModalText(topModal)).toMatch(/Sie sind dabei die Ausführung abzubrechen/);
                        modalAccept(leaveModal);
                        since("should leave with accepted leaveModal").expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                        since("timerModal should not be present after leaving").expect(timerModal.isPresent()).toBe(false);
                        since("leaveModal should not be present after leaving").expect(leaveModal.isPresent()).toBe(false);
                        since("no modal should not be present back at overview").expect(topModal.isPresent()).toBe(false);
                    });
                });

                describe('special cases', function () {
                    const waitTime = 4000;

                    beforeAll(function () {
                        browser.get('index.html#!/overview');
                        importTestfile('goalTimer2.json');
                    });

                    it("should show timer notifications not just once, but multiple times, with the correct timing in between", function() {
                        startWorkflowByName('Protractor::goalTimer2');
                        checkVisibilityOfNotificationForTimeStamp(waitTime);
                        checkVisibilityOfNotificationForTimeStamp(waitTime);
                        checkVisibilityOfNotificationForTimeStamp(waitTime);
                    });
                    it("should reset timer notifications when ok is clicked", function() {
                        startWorkflowByName('Protractor::goalTimer2');
                        checkVisibilityOfNotificationForTimeStamp(waitTime);
                        browser.sleep(7000);
                        modalOK(getModal());
                        checkVisibilityOfNotificationForTimeStamp(waitTime);
                    });
                });

            });

            describe('Workflow: taskTimer', function () {
                const timer_delta = 150;
                const timer_interval1 = 4000;
                const timer_interval2 = 5000;
                const task_names = [
                    'taskWithTimer1',
                    'taskWithoutTimer1',
                    'taskWithoutTimer2',
                    'taskWithTimer2',
                    'taskWithTimer3',
                    'taskWithoutTimer3'
                ];
                /**
                 * Protractor::taskTimer
                 *      Task: taskWithTimer1 < Timer every 4 sec
                 *      Task: taskWithoutTimer1
                 *      Task: taskWithoutTimer2
                 *      Task: taskWithTimer2 < Timer every 5 sec
                 *      Task: taskWithTimer3 < Timer every 4 sec
                 *      Task: taskWithoutTimer3
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('taskTimer.json', 'Protractor::taskTimer');
                });

                it('should show popup, when task has timer attached after specified interval, repeatedly', function () {
                    browser.sleep(timer_interval1 + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    browser.sleep(timer_interval1 / 4);
                    expect(getModalText(modal)).toBe('taskWithTimer1');
                    modalOK(modal);
                    browser.sleep(2 * timer_interval1 / 4);
                    expect(modal.isPresent()).toBe(false);
                    browser.sleep(2 * timer_interval1 / 4 + timer_delta);
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    expect(getModalText(modal)).toBe('taskWithTimer1');
                });

                it('should show popup with task text, for each task with attached timer', function () {
                    browser.sleep(timer_interval1 + timer_delta);
                    makeTaskModalTestFunction(task_names[0], true)();
                    makeTaskModalTestFunction(task_names[1], false)();
                    makeTaskModalTestFunction(task_names[2], false)();
                    browser.sleep(timer_interval2 + timer_delta);
                    makeTaskModalTestFunction(task_names[3], true)();
                    browser.sleep(timer_interval1 + timer_delta);
                    makeTaskModalTestFunction(task_names[4], true)();
                    makeTaskModalTestFunction(task_names[5], false)();
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toMatch(/ende/i);
                    expect(getModal().isPresent()).toBe(false);
                });

                it('should stop timer, when proceeding to next task', function () {
                    browser.sleep(timer_interval1 / 2);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(false);
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    browser.sleep(timer_interval1 / 2);
                    expect(modal.isPresent()).toBe(false);
                });

                it('should stop timer, when workflow is finished', function () {
                    browser.sleep(timer_interval1 + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    modalOK(getModal());
                    for (var i = 0; i < task_names.length; ++i) {
                        expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(task_names[i]);
                        getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    }
                    browser.sleep(timer_interval2 + timer_delta);
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toMatch(/ende/i);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(false);
                });

                it('should stop timer, when execution view is left', function () {
                    browser.sleep(timer_interval1 + timer_delta);
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    modalOK(modal);
                    browser.setLocation('overview');
                    modal = getModal();
                    expect(browser.getCurrentUrl()).toBe(exec_url);
                    expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                    browser.sleep(timer_interval1 + timer_delta);
                    expect(modal.isPresent()).toBe(false);
                });
            });

            describe('Workflow: ifTimer', function () {
                const timer_delta = 150;
                const timer_interval1 = 4000;
                const timer_interval2 = 5000;
                var block_texts = [
                    {
                        'if': 'cond1',
                        'then': ['c1t1', 'c1t2'],
                        'else': ['c1e1', 'c1e2']
                    },
                    {
                        'if': 'cond2withTimer',
                        'then': ['c2t1', 'c2t2'],
                        'else': []
                    },
                    {
                        'if': 'cond3withTimer',
                        'then': [],
                        'else': ['c3e1', 'c3e2']
                    },
                    {
                        'if': 'cond4',
                        'then': ['c4t1'],
                        'else': ['c4e1']
                    }
                ];
                /**
                 * Protractor::ifTimer
                 *      if (cond1) {
                 *          Task: c1t1
                 *          Task: c1t2
                 *      } else {
                 *          Task: c1e1
                 *          Task: c1e2
                 *      }
                 *      if (cond2withTimer) < Timer every 4 sec {
                 *          Task: c2t1
                 *          Task: c2t2
                 *      } else {
                 *
                 *      }
                 *      if (cond3withTimer) < Timer every 5 sec {
                 *
                 *      } else {
                 *          Task: c3e1
                 *          Task: c3e2
                 *      }
                 *      if (cond4) {
                 *          Task: c4t1
                 *      } else {
                 *          Task: c4e1
                 *      }
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('ifTimer.json', 'Protractor::ifTimer');
                });

                it('should show popup, when if has timer attached after specified interval, repeatedly', function () {
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(block_texts[0]['if']);
                    getExecutionBlockButtonYes(getCurrentExecutionBlock()).click();
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(block_texts[0]['then'][0]);
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(block_texts[0]['then'][1]);
                    getExecutionBlockButtonCheck(getCurrentExecutionBlock()).click();
                    expect(getExecutionBlockText(getCurrentExecutionBlock())).toBe(block_texts[1]['if']);
                    browser.sleep(timer_interval1 + timer_delta)
                    var modal = getModal();
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                    browser.sleep(timer_interval1 / 4)
                    expect(getModalText(modal)).toBe(block_texts[1]['if']);
                    modalOK(modal);
                    browser.sleep(2 * timer_interval1 / 4)
                    expect(modal.isPresent()).toBe(false);
                    browser.sleep(2 * timer_interval1 / 4 + timer_delta)
                    expect(modal.isPresent()).toBe(true);
                    expect(modal.isDisplayed()).toBe(true);
                });
                it('should follow a workflow', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::ifTimer/}},
                        {expect: {taskText: block_texts[0]['if']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[0]['then'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[0]['then'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['if']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[1]['then'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['then'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2]['if']}, instruction: 'no'},
                        {expect: {taskText: block_texts[2]['else'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2]['else'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[3]['if']}, instruction: 'no'},
                        {expect: {taskText: block_texts[3]['else'][0]}, instruction: 'ok'},
                        {expect: {taskText: /ende/i}}
                    ]);
                });
                it('should show popup with condition text, for each if with attached timer and subtasks', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::ifTimer/}},
                        {expect: {taskText: block_texts[0]['if']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[0]['then'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[0]['then'][1]}, instruction: 'ok'},
                        {
                            expect: {
                                taskText: block_texts[1]['if'], timerRememberAfter: timer_interval1,
                                timerRememberText: block_texts[1]['if']
                            },
                            instruction: 'yes'
                        },
                        {expect: {taskText: block_texts[1]['then'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['then'][1], noTimerRememberAfter: 2 * timer_interval1 / 4}},
                        {
                            expect: {
                                taskText: block_texts[1]['then'][1],
                                timerRememberAfter: 2 * timer_interval1 / 4,
                                timerRememberText: block_texts[1]['then'][1]
                            },
                            instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[2]['if'], noTimerRememberAfter: timer_interval2 / 5 * 2}},
                        {
                            expect: {
                                taskText: block_texts[2]['if'],
                                timerRememberAfter: timer_interval2 / 5 * 3, timerRememberText: block_texts[2]['if']
                            }, instruction: 'no'
                        },
                        {
                            expect: {
                                taskText: block_texts[2]['else'][0],
                                timerRememberAfter: timer_interval2, timerRememberText: block_texts[2]['else'][0]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[2]['else'][1]}, instruction: 'ok'},
                        {
                            expect: {
                                taskText: block_texts[3]['if'],
                                noTimerRememberAfter: timer_interval2 + timer_delta
                            },
                            instruction: 'no'
                        },
                        {
                            expect: {
                                taskText: block_texts[3]['else'][0],
                                noTimerRememberAfter: timer_interval2 + timer_delta
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: /ende/i}},
                        {expect: {noTimerRememberAfter: timer_interval2 + timer_delta}}
                    ]);
                });
                it('should stop timer, when execution view is left', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::ifTimer/}},
                        {expect: {taskText: block_texts[0]['if']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[0]['then'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[0]['then'][1]}, instruction: 'ok'},
                        {
                            expect: {
                                taskText: block_texts[1]['if'], timerRememberAfter: timer_interval1 + timer_delta,
                                timerRememberText: block_texts[1]['if']
                            }
                        }
                    ]);
                    browser.setLocation('overview');
                    var modal = getModal();
                    expect(browser.getCurrentUrl()).toBe(exec_url);
                    expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                    browser.sleep(timer_interval1 + timer_delta)
                    expect(modal.isPresent()).toBe(false);
                });
            });

            describe('Workflow: repeatTimesTimer', function () {
                var block_texts = [
                    'r1a1',
                    'r2a1',
                    'r2a2',
                    'r3a1'
                ];
                /**
                 * Protractor::repeatTimesTimer
                 *      Repeat (3) {
                 *          Task: r1a1
                 *      }
                 *      Repeat (2) < Timer every 4 sec {
                 *          Task: r2a1
                 *          Task: r2a2
                 *      }
                 *      Repeat (3) {
                 *          Task: r3a1
                 *      }
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('repeatTimesTimer.json', 'Protractor::repeatTimesTimer');
                });

                var originalTimeout;
                beforeEach(function () {
                    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                    // Increase timeout, as we have some long running tests (timing)
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
                });

                afterEach(function () {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                });

                it('should show popup, when repeatTimes has timer attached after specified interval, repeatedly', function () {
                    var i;
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatTimesTimer/}}
                    ]);
                    for (i = 0; i < 3; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[0]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: block_texts[1], noTimerRememberAfter: 2000}},
                        {expect: {taskText: block_texts[1], timerRememberAfter: 2000}},
                        {expect: {taskText: block_texts[1], noTimerRememberAfter: 2000}},
                        {expect: {taskText: block_texts[1], timerRememberAfter: 2000}},
                        {expect: {taskText: block_texts[1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2]}}
                    ]);
                });

                it('should show popup with condition/task text, for each if with attached timer and subtasks', function () {
                    var i;
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatTimesTimer/}}
                    ]);
                    for (i = 0; i < 3; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[0]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: block_texts[1], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[2], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[2],
                                timerRememberAfter: 2000, timerRememberText: block_texts[2]
                            }, instruction: 'ok'
                        }
                    ]);
                    automateWorkflow([
                        {expect: {taskText: block_texts[1], noTimerRememberAfter: 2000}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[2],
                                timerRememberAfter: 2000, timerRememberText: block_texts[2]
                            }, instruction: 'ok'
                        }
                    ]);
                    automateWorkflow([
                        {expect: {taskText: block_texts[3], noTimerRememberAfter: 4000}, instruction: 'ok'}
                    ]);
                    for (i = 0; i < 2; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[3]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: /ende/i, noTimerRememberAfter: 4000}}
                    ]);
                });

                it('should stop timer, when execution view is left', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatTimesTimer/}}
                    ]);
                    for (var i = 0; i < 3; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[0]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: block_texts[1], noTimerRememberAfter: 2000}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[2],
                                timerRememberAfter: 2000, timerRememberText: block_texts[2]
                            }
                        }
                    ]);
                    browser.setLocation('overview');
                    var modal = getModal();
                    expect(browser.getCurrentUrl()).toBe(exec_url);
                    expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                    automateWorkflow([
                        {expect: {noTimerRememberAfter: 4150}}
                    ]);
                });
            });

            describe('Workflow: repeatConditionTimer', function () {
                var block_texts = [
                    {
                        'while': 'cond1',
                        'body': ['r1a1']
                    },
                    {
                        'until': 'cond2',
                        'body': ['r2a1', 'r2a2']
                    },
                    {
                        'while': 'cond3',
                        'body': ['r3a1', 'r3a2']
                    }
                ];
                /**
                 * Protractor::repeatConditionTimer
                 *      while (cond1) {
                 *          Task: r1a1
                 *      }
                 *      until (cond2) < Timer every 4 sec {
                 *          Task: r2a1
                 *          Task: r2a2
                 *      }
                 *      while (cond3) {
                 *          Task: r3a1
                 *          Task: r3a2
                 *      }
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('repeatConditionTimer.json', 'Protractor::repeatConditionTimer');
                });

                it('should show popup, when repeatCondition has timer attached after specified interval, repeatedly', function () {
                    var i;
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatConditionTimer/}}
                    ]);
                    for (i = 0; i < 2; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[0]['while']}, instruction: 'yes'},
                            {expect: {taskText: block_texts[0]['body'][0]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: block_texts[0]['while']}, instruction: 'no'}
                    ]);
                    automateWorkflow([
                        {expect: {taskText: block_texts[1]['until'], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['until']
                            }
                        },
                        {expect: {taskText: block_texts[1]['until'], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['until']
                            }, instruction: 'no'
                        },
                        {expect: {taskText: block_texts[1]['body'][0], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['body'][0],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['body'][0]
                            }
                        },
                        {expect: {taskText: block_texts[1]['body'][0], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['body'][0],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['body'][0]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[1]['body'][1]}}
                    ]);
                });

                it('should show popup with condition text, for each if with attached timer and subtasks', function () {
                    var i;
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatConditionTimer/}}
                    ]);
                    for (i = 0; i < 2; ++i) {
                        automateWorkflow([
                            {expect: {taskText: block_texts[0]['while']}, instruction: 'yes'},
                            {expect: {taskText: block_texts[0]['body'][0]}, instruction: 'ok'}
                        ]);
                    }
                    automateWorkflow([
                        {expect: {taskText: block_texts[0]['while']}, instruction: 'no'}
                    ]);
                    automateWorkflow([
                        {expect: {taskText: block_texts[1]['until'], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['until']
                            }, instruction: 'no'
                        },
                        {expect: {taskText: block_texts[1]['body'][0], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['body'][0],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['body'][0]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[1]['body'][1], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['body'][1],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['body'][1]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[1]['until'], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['until']
                            }, instruction: 'no'
                        },
                        {expect: {taskText: block_texts[1]['body'][0]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['body'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['until']}, instruction: 'no'},
                        {expect: {taskText: block_texts[1]['body'][0], noTimerRememberAfter: 2000}},
                        {
                            expect: {
                                taskText: block_texts[1]['body'][0],
                                timerRememberAfter: 2000, timerRememberText: block_texts[1]['body'][0]
                            }, instruction: 'ok'
                        },
                        {expect: {taskText: block_texts[1]['body'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[1]['until']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[2]['while']}, instruction: 'yes'},
                        {expect: {taskText: block_texts[2]['body'][0], noTimerRememberAfter: 4000}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2]['body'][1]}, instruction: 'ok'},
                        {expect: {taskText: block_texts[2]['while']}, instruction: 'no'}
                    ]);
                    automateWorkflow([
                        {expect: {taskText: /ende/i, noTimerRememberAfter: 4000}}
                    ]);
                });

                it('should stop timer, when execution view is left', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::repeatConditionTimer/}}
                    ]);
                    automateWorkflow([
                        {expect: {taskText: block_texts[0]['while']}, instruction: 'no'},
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                noTimerRememberAfter: 2000
                            }
                        },
                        {
                            expect: {
                                taskText: block_texts[1]['until'],
                                timerRememberAfter: 2000
                            }
                        }
                    ]);
                    browser.setLocation('overview');
                    var modal = getModal();
                    expect(browser.getCurrentUrl()).toBe(exec_url);
                    expect(modal.isPresent()).toBe(true);
                    modalAccept(modal);
                    expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
                    automateWorkflow([
                        {expect: {noTimerRememberAfter: 4150}}
                    ]);
                });
            });

            describe('Workflow: sleepTimer', function () {
                /**
                 * Protractor::sleepTimer
                 * A1
                 * Wait 2s (Wait1)
                 * A2
                 * Wait 4s (Wait2)
                 * A3
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('sleepTimer.json', 'Protractor::sleepTimer');
                });

                it('should follow a workflow', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::sleepTimer/}},
                        {expect: {taskText: 'A1'}, instruction: 'ok'},
                        {expect: {taskText: 'Wait1', sleepTimer: 2000, skipVisible: false}},
                        {expect: {taskText: 'A2'}, instruction: 'ok'},
                        {expect: {taskText: 'Wait2', sleepTimer: 500, skipVisible: false}},
                        {expect: {taskText: 'Wait2', sleepTimer: 500, skipVisible: false}},
                        {expect: {taskText: 'Wait2', sleepTimer: 3000, skipVisible: false}},
                        {expect: {taskText: 'A3'}, instruction: 'ok'},
                        {expect: {taskText: /ende/i}}
                    ]);
                });

                describe('with gamification enabled', function() {

                    beforeAll(function () {
                        settingsSetGamificationEnabled(true);
                        clearDB('gamificationDB');
                    });

                    beforeEach(function() {
                        waitForGamificationNavbarLoaded();
                        setUpGamificationTestUtilities();
                        waitForExecutionComponentLoaded();
                    });

                    afterEach(function() {
                        tearDownGamificationTestUtilities();
                    });

                    it('should grant points when a timer block is completed', function() {
                        since('workflow execution start should have given #{expected} points, but actual points were #{actual}')
                            .expect(getGamificationNavbarProgressBarPoints()).toEqual('5');

                        automateWorkflow([
                            {instruction: 'ok'},
                            {expect: {'sleepTimer': 2000}}
                        ]);
                        since('start, a single task and wait completion should have given #{expected} points, but actual points were #{actual}')
                            .expect(getGamificationNavbarProgressBarPoints()).toEqual('7');
                    });
                });
            });

            describe('Workflow: sleepTimer2', function () {
                const timer_delta = 500;

                /**
                 * Protractor::sleepTimer2
                 * A1
                 * Wait 0s (Wait1)
                 * A2
                 * If Cond
                 * Then
                 *   Wait 4s (Wait2)
                 * Else
                 *   Wait -3s (Wait3)
                 * A3
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('sleepTimer2.json', 'Protractor::sleepTimer2');
                });

                it('should follow a workflow with zero as sleep time (expected skip)', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::sleepTimer2/}},
                        {expect: {taskText: 'A1'}, instruction: 'ok'},
                        {expect: {taskText: 'A2'}, instruction: 'ok'},
                        {expect: {taskText: 'Cond'}, instruction: 'yes'},
                        {expect: {taskText: 'Wait2', sleepTimer: 4000 + timer_delta}},
                        {expect: {taskText: 'A3'}, instruction: 'ok'},
                        {expect: {taskText: /ende/i}}
                    ]);
                });

                it('should follow a workflow with non positive sleep times (expected skip)', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::sleepTimer2/}},
                        {expect: {taskText: 'A1'}, instruction: 'ok'},
                        {expect: {taskText: 'A2'}, instruction: 'ok'},
                        {expect: {taskText: 'Cond'}, instruction: 'no'},
                        {expect: {taskText: 'A3'}, instruction: 'ok'},
                        {expect: {taskText: /ende/i}}
                    ]);
                });
            });

            describe('Workflow: sleepTimer3', function () {
                const timer_delta = 150;
                const timer_interval1 = 5000;
                const timer_interval2 = 8000;

                /**
                 * Protractor::sleepTimer3
                 * A1 (with notification after 5sec)
                 * Wait 8s (Wait1, no notification)
                 * A2 (with notification after 5sec)
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('sleepTimer3.json', 'Protractor::sleepTimer3');
                });

                it('should disable notifications while waiting (expected)', function () {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::sleepTimer3/}},
                        {
                            expect: {taskText: 'A1', timerRememberAfter: timer_interval1, timerRememberText: 'A1'},
                            instruction: 'ok'
                        },
                        {expect: {taskText: 'Wait1', noTimerRememberAfter: timer_interval2}},
                        {
                            expect: {taskText: 'A2', timerRememberAfter: timer_interval1, timerRememberText: 'A2'},
                            instruction: 'ok'
                        },
                        {expect: {taskText: /ende/i}}
                    ]);
                });
            });

            describe('Workflow: unusedBlock', function(){
                /**
                 * Goal: Protractor::UnusedBlock
                 *      Task: Task 1
                 *
                 *
                 * If "unused condition":
                 */

                afterAll(function () {
                    clearWebStorage();
                });

                beforeEach(function () {
                    loadExecUrl(exec_url);
                });

                beforeAll(function () {
                    beforeAllExecutionView('unusedblock.json', 'Protractor::UnusedBlock');
                });

                it('should execute workflows with unused blocks laying around in the workspace', function() {
                    automateWorkflow([
                        {expect: {goalText: /Protractor::UnusedBlock/}},
                        {expect: {taskText: 'Task 1'}, instruction: 'ok'},
                        {expect: {taskText: /ende/i}},
                    ]);
                });
            });
        });

        describe('TTS tests', function () {
            beforeAll(() => mockWebSpeechSynthesis());
            afterAll(() => unmockWebSpeechSynthesis());


            /**
             * Protractor::taskBlock
             *      A1
             *      A2
             *      A3
             *      A4
             *      A5
             */
            describe('Protractor::taskBlock', function() {
                beforeAll(function () {
                    beforeAllExecutionView('taskBlock.json', 'Protractor::taskBlock');
                    settingsSetTTSEnabled(true);
                });
                beforeEach(function () {
                    loadExecUrl(exec_url);
                });
                afterAll(clearWebStorage);

                let testSpecification = function () {
                    automateWorkflow([
                        {expect: {taskText: 'A1', spoken: 'A1'}},
                        {expect: {notSpokenAfter: 300}, instruction: 'ok'},
                        {expect: {taskText: 'A2', spoken: 'A2'}, instruction: 'ok'},
                        {expect: {taskText: 'A3', spoken: 'A3'}, instruction: 'ok'},
                        {expect: {taskText: 'A4', spoken: 'A4'}, instruction: 'ok'},
                        {expect: {taskText: 'A5', spoken: 'A5'}, instruction: 'ok'},
                        {expect: {taskText: /ende/i, spoken: /ende/i}},
                        {expect: {notSpokenAfter: 300}}
                    ]);
                };


                it('should speak task text when block is entered', testSpecification);

                describe('FlexView', function() {
                    beforeAll(function() {
                        settingsSetFlexviewEnabled(true);
                    });
                    afterAll(function() {
                        settingsSetFlexviewEnabled(false);
                    });

                    it('should speak task text when block is entered', testSpecification);
                });
            });

            /**
             * Protractor::TTS
             *      Task 1
             *      Wenn "Is the condition true?"
             *      dann
             *          2 beliebige Aufgabe(n): select statements
             *              yes
             *              correct
             *              true
             *      sonst
             *      remind me now < Erinnerung Alle 4 Sekunden
             *      Warte 1 Sekunden "please wait"
             */
            describe('Protractor::TTS', function() {
                beforeAll(function () {
                    beforeAllExecutionView('tts.json', 'Protractor::TTS');
                });
                afterAll(clearWebStorage);

                let testSpec1 = function () {
                    settingsSetTTSEnabled(true);
                    loadExecUrl(exec_url);
                    automateWorkflow([
                        {expect: {taskText: 'Task 1', spoken: 'Task 1'}},
                        {expect: {notSpokenAfter: 300}, instruction: 'click_label'},
                        {expect: {spoken: 'Task 1'}, instruction: 'ok'},
                        {expect: {taskText: 'Is the condition true?', spoken: 'Is the condition true?'}},
                        {expect: {notSpokenAfter: 300}, instruction: 'click_label'},
                        {expect: {spoken: 'Is the condition true?'}, instruction: 'yes'},
                        {expect: {spoken: 'select statements\n2 von 3:\nyes\ncorrect\ntrue\n'}},
                        {expect: {notSpokenAfter: 300}, instruction: 'click_title'},
                        {expect: {spoken: 'select statements\n2 von 3:\nyes\ncorrect\ntrue\n'}},
                        {block: 'mini0', expect: {notSpokenAfter: 300}, instruction: 'click_label'},
                        {block: 'mini0', expect: {spoken: 'yes'}, instruction: 'ok'},
                        {block: 'mini1', expect: {notSpokenAfter: 300}, instruction: 'click_label'},
                        {block: 'mini1', expect: {spoken: 'true'}, instruction: 'ok'},
                        {expect: {taskText: 'remind me now', spoken: 'remind me now'}},
                        {expect: {timerRememberAfter: 5000, timerRememberText: 'remind me now'}},
                        {expect: {spoken: 'Erinnerung: remind me now'}, instruction: 'ok'},
                        {expect: {taskText: 'please wait', spoken: 'please wait', sleepTimer: 2000}},
                        //FIXME: ignored due to flakiness
                        {expect: {taskText: /ende/i, /*spoken: /ende/i*/}},
                        {expect: {/*notSpokenAfter: 300*/}, instruction: 'click_label'},
                        //{expect: {spoken: /ende/i}},
                    ]);
                    settingsSetTTSEnabled(false);
                };

                let testSpec2 = function() {
                    loadExecUrl(exec_url);
                    automateWorkflow([
                        {expect: {taskText: 'Task 1'}},
                        {instruction: 'click_label'},
                        {instruction: 'ok'},
                        {expect: {taskText: 'Is the condition true?'}},
                        {instruction: 'click_label'},
                        {instruction: 'yes'},
                        {instruction: 'click_title'},
                        {block: 'mini0', instruction: 'click_label'},
                        {block: 'mini0', instruction: 'ok'},
                        {block: 'mini1', instruction: 'click_label'},
                        {block: 'mini1', instruction: 'ok'},
                        {expect: {taskText: 'remind me now'}},
                        {expect: {timerRememberAfter: 5000, timerRememberText: 'remind me now'}, instruction: 'ok'},
                        {expect: {taskText: 'please wait', sleepTimer: 2000}},
                        {expect: {taskText: /ende/i}, instruction: 'click_label'},
                        {expect: {notSpokenAfter: 300}},
                    ]);
                };


                it('should speak text when block is entered, label is clicked or notification appears', testSpec1);

                it('should not speak if TTS is disabled', testSpec2);

                it('should speak entries in executionLog if TTS is enabled', function() {
                    settingsSetTTSEnabled(true);
                    loadExecUrl(exec_url);
                    automateWorkflow([
                        {expect: {taskText: 'Task 1'}, instruction: 'ok'},
                        {expect: {taskText: 'Is the condition true?'}, instruction: 'yes'},
                    ]);
                    mockedTTSClearSpoken();
                    getExecutionLogEntries().get(0).click();
                    matchOrBe('Last spoken text', '', /^\s*Task 1\s*$/, mockedTTSGetLastSpokenTextsJoined());
                    mockedTTSClearSpoken();
                    getExecutionLogEntries().get(1).click();
                    matchOrBe('Last spoken text', '', /^\s*Ja: Is the condition true\?\s*$/, mockedTTSGetLastSpokenTextsJoined());
                    mockedTTSClearSpoken();
                    settingsSetTTSEnabled(false);
                });

                describe('FlexView', function() {
                    beforeAll(function() {
                        settingsSetFlexviewEnabled(true);
                    });
                    afterAll(function() {
                        settingsSetFlexviewEnabled(false);
                    });

                    it('should speak text when block is entered, label is clicked or notification appears', testSpec1);

                    it('should not speak if TTS is disabled', testSpec2);
                });
            })
        });

        describe('Flex view tests', function() {
            beforeAll(function() {
                settingsSetFlexviewEnabled(true);
            });
            afterAll(function() {
                clearWebStorage();
            });
            beforeEach(function() {
                loadExecUrl(exec_url);
            });
            describe('FlexView workflow', function() {
                /**
                 * Task: Task1
                 * If Question1 [Image: TuxMagician] Then  [< Timer 3s]
                 *      Task: Q1: Yes [Image: TuxBlackSuit]
                 * Else:
                 *      Task: Q1: No
                 * If Question2 Then
                 *      Task: Q2: Yes
                 * Else:
                 *      Task: Q2: No [Image: TuxMagician]
                 * Loop 3
                 *      Task: Loop Times
                 * LoopWhile ContinueLoop?
                 *      Task: ContinueLoop
                 * 3 of 3: Parallel
                 *      Task: PTask1 [Image: TuxBlackSuit]
                 *      Task: PTask2
                 *      Task: PTask3 [Image: TuxMagician]
                 * Wait 5s: "Wait"
                 *
                 */
                beforeAll(function() {
                    beforeAllExecutionView('flexview-images.json', 'Protractor::FlexView').then(() => {
                        // TODO remove this block, if images are saved into file
                        browser.get(edit_url);
                        uploadImageFileAndSave("testfiles/TuxMagician.jpg", "TuxMagician");
                        uploadImageFileAndSave("testfiles/TuxBlackSuit.jpg", "TuxBlackSuit");
                    });
                });
                beforeEach(function() {
                    loadExecUrl(exec_url);
                });
                it('should complete a workflow with all block types', function() {
                    automateWorkflow([
                        {instruction: 'ok', expect: {taskText: 'Task 1', taskImageUrl: null, timerRememberAfter: 4000, timerRememberText: 'Task 1'}}, // Task1
                        {instruction: 'yes', expect: {taskText: 'Question 1', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}}, //Q1
                        {instruction: 'ok', expect: {taskText: 'Q1: Yes', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}}, //Q1: yes
                        {instruction: 'no', expect: {taskText: 'Question 2', taskImageUrl: null}}, //Q2
                        {instruction: 'ok', expect: {taskText: 'Q2: No', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}}, //Q2: no
                        {instruction: 'ok', expect: {taskText: 'Loop Times', taskImageUrl: null}}, //LoopTimes
                        {instruction: 'ok', expect: {taskText: 'Loop Times', taskImageUrl: null}}, //LoopTimes
                        {instruction: 'ok', expect: {taskText: 'Loop Times', taskImageUrl: null}}, //LoopTimes
                        {instruction: 'yes', expect: {taskText: 'ContinueLoop?', taskImageUrl: null}}, //LoopWhile
                        {instruction: 'ok', expect: {taskText: 'ContinueLoop', taskImageUrl: null}}, //ContinueLoop
                        {instruction: 'no', expect: {taskText: 'ContinueLoop?', taskImageUrl: null}}, //LoopWhile
                        {instruction: 'ok', block: 'mini0', expect: {taskText: 'PTask1', titleText: "3 von 3: Parallel", taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxBlackSuit.jpg'}},
                        {instruction: 'ok', block: 'mini1', expect: {taskText: 'PTask3', titleText: "2 von 2: Parallel", taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                        {instruction: 'ok', block: 'mini0', expect: {taskText: 'PTask2', titleText: "1 von 1: Parallel", taskImageUrl: null}},
                        {expect: {sleepTimer: 5000, taskText: 'Wait', taskImageUrl: null}},
                        {instruction: 'click_label', expect: {taskText: /ENDE/, taskImageUrl: null}},
                    ]);
                    since("Should redirect to overview after clicking on ENDE.").
                    expect(browser.getCurrentUrl()).toMatch("/overview");
                }, 60000);

                it('should not show lightbox, when image is clicked', function() {
                    automateWorkflow([
                        {instruction: 'ok', expect: {taskText: 'Task 1', taskImageUrl: null}}, // Task1
                        {expect: {taskText: 'Question 1', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                    ]);
                    getExecutionBlockImage(getCurrentExecutionBlock()).click();
                    expect(getModal().isPresent()).toBeFalsy();
                });

                describe('Alignment tests', function() {
                    let getTestSpecButtons = function(xPosExpectation) {
                        return function () {
                            browser.manage().window().getSize().then(function (windowSize) {
                                automateWorkflow([{expect: {taskText: 'Task 1'}}]);
                                getExecutionBlockButtonCheck(getCurrentExecutionBlock()).getLocation().then(location => {
                                    xPosExpectation(location.x, windowSize.width);
                                });
                                automateWorkflow([
                                    {instruction: 'ok', expect: {taskText: 'Task 1'}},
                                    {
                                        expect: {
                                            taskText: 'Question 1',
                                            taskImageUrl: /blob:\S+/,
                                            taskImageFile: 'testfiles/TuxMagician.jpg'
                                        }
                                    },
                                ]);
                                getExecutionBlockButtonYes(getCurrentExecutionBlock()).getLocation().then(location => {
                                    xPosExpectation(location.x, windowSize.width);
                                });
                                getExecutionBlockButtonNo(getCurrentExecutionBlock()).getLocation().then(location => {
                                    xPosExpectation(location.x, windowSize.width);
                                });
                            });
                        };
                    };

                    let getTestSpecText = function(alignment) {
                        const paddingTypeExpectation = "padding-" + (alignment === 'left' ? 'right' : 'left');
                        function checkPadding(elemName, elem) {
                            let getPxValue = (styleValue) => parseFloat(/(.+)px/.exec(styleValue)[1]);
                            let widthPx = elem.getCssValue('width').then(getPxValue);
                            let paddingPx = elem.getCssValue(paddingTypeExpectation).then(getPxValue);
                            widthPx.then(widthPx => {
                                since("Expected " + elemName + " to be padded to 50% with " + paddingTypeExpectation +
                                    "\nExpected #{expected}; Actual: #{actual}").
                                expect(paddingPx).toBeCloseTo(widthPx / 2);
                            });
                        }
                        return function() {
                            automateWorkflow([{expect: {taskText: 'Task 1'}}]);
                            checkPadding("executionBlockText", getExecutionBlockTextElement(getCurrentExecutionBlock()));
                            since("executionBlockText should have text-align: ").
                                expect(getExecutionBlockTextElement(getCurrentExecutionBlock()).getCssValue("text-align"))
                                .toBe(alignment);
                            automateWorkflow([
                                {instruction: 'ok'}, // Task1
                                {instruction: 'yes', expect: {taskText: 'Question 1'}}, //Q1
                                {instruction: 'ok', expect: {taskText: 'Q1: Yes'}}, //Q1: yes
                                {instruction: 'no', expect: {taskText: 'Question 2'}}, //Q2
                                {instruction: 'ok', expect: {taskText: 'Q2: No'}}, //Q2: no
                                {instruction: 'ok', expect: {taskText: 'Loop Times'}}, //LoopTimes
                                {instruction: 'ok', expect: {taskText: 'Loop Times'}}, //LoopTimes
                                {instruction: 'ok', expect: {taskText: 'Loop Times'}}, //LoopTimes
                                {instruction: 'no', expect: {taskText: 'ContinueLoop?'}}, //LoopWhile
                                {expect: {titleText: "3 von 3: Parallel"}}
                            ]);
                            checkPadding("parallelBlockTitle", getParallelBlockTitleElement());
                            expect(getParallelBlockTitleElement().getCssValue("text-align"))
                                .toBe(alignment);
                            automateWorkflow([
                                {instruction: 'ok', block: 'mini0'},
                                {instruction: 'ok', block: 'mini1'},
                                {instruction: 'ok', block: 'mini0'},
                                {expect: {taskText: 'Wait'}},
                            ]);
                            checkPadding("executionBlockText", getExecutionBlockTextElement(getCurrentExecutionBlock()));
                            expect(getExecutionBlockTextElement(getCurrentExecutionBlock()).getCssValue("text-align"))
                                .toBe(alignment);
                            checkPadding("additionalText", getCurrentExecutionBlock().element(by.binding('$ctrl.additionalText')));
                            expect(getCurrentExecutionBlock().element(by.binding('$ctrl.additionalText')).getCssValue("text-align"))
                                .toBe(alignment);
                        };
                    };

                    let getTestSpecImages = function(xPosExpectation) {
                        return function() {
                            automateWorkflow([
                                {instruction: 'ok', expect: {taskText: 'Task 1'}},
                                {expect: {taskText: 'Question 1', taskImageUrl: /blob:\S+/, taskImageFile: 'testfiles/TuxMagician.jpg'}},
                            ]);
                            getExecutionBlockImage(getCurrentExecutionBlock()).getCssValue('background-position-x').then(bgX => {
                                let x_percent = /(\d+)%/.exec(bgX)[1];
                                xPosExpectation(x_percent);
                            })
                        }
                    };

                    describe('Left alignment', function() {
                        beforeAll(function() {
                            settingsSetFlexviewAlignment('left');
                        });

                        it('should have buttons aligned to the left (< 1/3 of window width)',
                            getTestSpecButtons((x, width) => expect(x).toBeLessThan(width / 3))
                        );
                        it('should have images aligned to the left (background-position-x < 33%)',
                            getTestSpecImages((xPercent) => expect(xPercent).toBeLessThan(33))
                        );
                        it('should have text aligned to the left (padding-right: 50%)',
                            getTestSpecText('left')
                        );
                    });

                    describe('Right alignment', function() {
                        beforeAll(function() {
                            settingsSetFlexviewAlignment('right');
                        });

                        it('should have buttons aligned to the right (> 2/3 of window width)',
                            getTestSpecButtons((x, width) => expect(x).toBeGreaterThan(2 * width / 3))
                        );

                        it('should have images aligned to the right (background-position-x > 66%)',
                            getTestSpecImages((xPercent) => expect(xPercent).toBeGreaterThan(66))
                        );

                        it('should have text aligned to the right (padding-left: 50%)',
                            getTestSpecText('right')
                        );
                    })
                })
            });
        });
    });

    describe('schedulingView', function () {
        beforeAll(function () {
            browser.get('index.html#!/overview');
            element(by.buttonText("Neuer Workflow")).isDisplayed().then(function (visible) {
                if (visible) {
                    element(by.buttonText("Neuer Workflow")).click();
                } else {
                    element(by.buttonText("Neu")).click();
                }
            });
            // add workflow with timer event
            importTestfile('taskTimer.json');
        });

        beforeEach(function () {
            browser.get('index.html#!/scheduling');
        });

        afterAll(function () {
            clearWebStorage();
        });

        function getListBuilder() {
            return $('list-builder');
        }

        function getAvailableWorkflows() {
            return getListBuilder().all(by.repeater('item in $ctrl.allItems'));
        }

        function getSelectedWorkflows() {
            return getListBuilder().all(by.repeater('item in $ctrl.selectedItems'));
        }

        function getNoSelectedWorkflowsWarning() {
            return getListBuilder().$('.alert-warning');
        }

        it('should render schedulingView when user navigates to /scheduling', function () {
            expect(getPageTitle()).toMatch(/Ablaufplanung/);
        });
        it('should list all available workflows on the right side/on the bottom', function () {
            var workflows = getAvailableWorkflows();
            expect(workflows.isDisplayed()).toBeTruthy();
            expect(workflows.count()).toEqual(3);

        });
        it('should add an available workflow to the scheduling list when clicked', function () {
            var tasks = getSelectedWorkflows();
            tasks.count().then(function (startCount) {
                element(by.buttonText("Test Workflow")).click();

                tasks.count().then(function (endCount) {
                    expect(endCount).toEqual(++startCount);
                });
            });

            var tasksNames = tasks.map(function (entries) {
                return entries.getText();
            });

            tasksNames.then(function (entry) {
                expect(entry).toContain('1. Test Workflow');
            });
        });
        it('should show the start button when one or more workflows are added to the scheduling list', function () {
            element(by.buttonText("Test Workflow")).click();
            expect(element(by.buttonText("Ablauf starten")).isDisplayed()).toBeTruthy();
        });
        it('should NOT show the start button if no workflow has been added to the scheduling list', function () {
            expect(element(by.buttonText("Ablauf starten")).isDisplayed()).toBeFalsy();
        });
        it('should add the same workflow twice, if the workflow is clicked twice successively, without notification', function () {
            expect(getSelectedWorkflows().count()).toBe(0);
            element(by.buttonText("Test Workflow")).click();
            expect(getSelectedWorkflows().count()).toBe(1);
            element(by.buttonText("Test Workflow")).click();
            expect(getModal().isPresent()).toBe(false, "Expected modal NOT to be present");
            expect(getSelectedWorkflows().count()).toBe(2);
            expect(getSelectedWorkflows().first().getText()).toBe('1. Test Workflow');
            expect(getSelectedWorkflows().last().getText()).toBe('2. Test Workflow');
            expect(element(by.buttonText("Ablauf starten")).isDisplayed()).toBeTruthy();
        });
        it('should show a notification if no workflow has been added to the scheduling list', function () {
            expect(getNoSelectedWorkflowsWarning().isDisplayed()).toBeTruthy();
            element(by.buttonText("Test Workflow")).click();
            expect(getNoSelectedWorkflowsWarning().isPresent()).toBeFalsy();
            element(by.buttonText("1. Test Workflow")).click();
            expect(getNoSelectedWorkflowsWarning().isDisplayed()).toBeTruthy();
        });
        it('should order the added workflows according to how they were added', function () {
            getAvailableWorkflows().each(function (entry) {
                entry.click();
            });

            var tasks = getSelectedWorkflows();
            expect(tasks.first().getText()).toBe('1. Test Workflow');
            expect(tasks.last().getText()).toBe('3. Protractor::taskTimer');
        });
        it('should execute the first workflow if start scheduling has been clicked', function () {
            element(by.buttonText("Test Workflow")).click();

            var startButton = element(by.buttonText("Ablauf starten"));
            expect(startButton.isDisplayed()).toBeTruthy();
            startButton.click();
            waitForExecutionComponentLoaded();
            expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeTruthy();

        });
        it('should continue the execution if the first workflow is finished (2 or more active workflows)', function () {
            element(by.buttonText("Test Workflow")).click();
            element(by.buttonText("New Workflow")).click();
            element(by.buttonText("Ablauf starten")).click();
            waitForExecutionComponentLoaded();

            automateWorkflow([
                {instruction: 'click_label', expect: {'taskText': /ende/i}},
                {instruction: 'click_label', expect: {'taskText': /ende/i}}
            ])
            expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeFalsy();
        });
        it('should show the abort-button if scheduling is running', function () {
            element(by.buttonText("Test Workflow")).click();
            element(by.buttonText("Ablauf starten")).click();
            waitForExecutionComponentLoaded();
            expect($('[ng-click="$ctrl.stopScheduler()"]').isDisplayed()).toBeTruthy();
        });
        it('should NOT show the abort-button if scheduling is NOT running', function () {
            expect($('[ng-click="$ctrl.stopScheduler()"]').isDisplayed()).toBeFalsy();
        });
        it('should notify the user if leaving the schedulingView', function () {
            browser.setLocation('overview');
            var modal = getModal();
            expect(modal.isPresent()).toBe(true);
            expect(modal.isDisplayed()).toBe(true);
            expect(getModalText(modal)).toMatch(/Sie sind dabei die Ablaufplanung zu verlassen/);
            modalDismiss(modal);
            expect(getModal().isPresent()).toBe(false);
        });
        it('should notify the user if a notificationEvent occurred', function () {
            const timer_delta = 150;
            const timer_interval1 = 4000;

            element(by.buttonText("Protractor::taskTimer")).click();
            element(by.buttonText("Ablauf starten")).click();
            waitForExecutionComponentLoaded();

            browser.sleep(timer_interval1 + timer_delta).then(function () {
                var modal = getModal();
                expect(modal.isPresent()).toBe(true);
                expect(modal.isDisplayed()).toBe(true);
                expect(getModalText(modal)).toBe('taskWithTimer1');
                modalOK(modal);
            });
        });
        it('should redirect to overview if leaveModal was accepted', function () {
            browser.setLocation('overview');
            var modal = getModal();
            expect(modal.isPresent()).toBe(true);
            expect(modal.isDisplayed()).toBe(true);
            expect(getModalText(modal)).toMatch(/Sie sind dabei die Ablaufplanung zu verlassen/);
            modalAccept(modal);
            expect(browser.getCurrentUrl()).toMatch(/\/overview$/);
        });

        describe('with multiple schedules', function() {

            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile('singleTask.json');
            });

            it('should execute the same workflow twice in a row', function () {
                element(by.buttonText("Protractor::singleTask")).click();
                element(by.buttonText("Protractor::singleTask")).click();
                expect(getSelectedWorkflows().count()).toBe(2);
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();
                expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeTruthy();
                automateWorkflow([
                    {instruction: 'ok', expect: {'taskText': /Task 1/i}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, 'logText': /Task 1/i}},
                    {instruction: 'ok', expect: {'taskText': /Task 1/i, 'logText': /Protractor::singleTask beendet/i}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, 'logText': /Protractor::singleTask beendet ---\nTask 1/i}}
                ]);
                expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeFalsy();
            });
            it('should execute different workflows in a row', function () {
                element(by.buttonText("Protractor::singleTask")).click();
                element(by.buttonText("Test Workflow")).click();
                element(by.buttonText("Protractor::singleTask")).click();
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();
                expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeTruthy();
                automateWorkflow([
                    {instruction: 'ok', expect: {'taskText': /Task 1/i}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, 'logText': /Task 1/i}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, 'logText': /Protractor::singleTask beendet/i}},
                    {instruction: 'ok', expect: {'taskText': /Task 1/i, 'logText': /Test Workflow beendet/i}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, 'logText': /Test Workflow beendet ---\nTask 1/i}}
                ]);
                expect($('[ng-show="$ctrl.isSchedulerRunning()"]').isDisplayed()).toBeFalsy();
            });
        });

        describe('TTS tests', function () {
            beforeAll(() => settingsSetTTSEnabled(true));
            beforeAll(() => mockWebSpeechSynthesis());
            afterAll(() => unmockWebSpeechSynthesis());

            it('should read task text and reminder notifications', function() {
                element(by.buttonText("New Workflow")).click();
                element(by.buttonText("Protractor::taskTimer")).click();
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();

                automateWorkflow([
                    {expect: {spoken: "ENDE"}, instruction: 'click_label'},
                    {expect: {spoken: "ENDE\ntaskWithTimer1"}}, //ENDE with next task directly starting afterwards
                    {expect: {timerRememberAfter: 4000, timerRememberText: "taskWithTimer1"}},
                    {expect: {spoken: "Erinnerung: taskWithTimer1"}, instruction: 'ok'},
                    {expect: {spoken: "taskWithoutTimer1"}},
                ])
            });
        });

        describe('with gamification enabled', () => {
            let originalTimeout;

            beforeAll(function () {
                originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                // Increase timeout, as we have a long running test (timing)
                jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;

                settingsSetGamificationEnabled(true);
                clearDB('gamificationDB');

                browser.get('index.html#!/overview');
                importTestfile('repeatTimesMinimal.json');
                importTestfile('ifBlock.json');
                importTestfile('singleTask.json');
            });

            beforeEach(function() {
                waitForGamificationNavbarLoaded();
                setUpGamificationTestUtilities();
            });

            afterEach(function() {
                tearDownGamificationTestUtilities();
            });

            afterAll(function() {
                jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

                settingsSetGamificationEnabled(false);
                clearDB('gamificationDB');
            });

            it('should receive correct amount of points in scheduling execution', () => {
                element(by.buttonText("Protractor::repeatTimesMinimal")).click();
                element(by.buttonText("Protractor::ifBlock")).click();
                element(by.buttonText("Protractor::singleTask")).click();
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();

                // 1. run workflow repeatTimesMinimal, (23 points ->  aria 23 , lvl 1)
                automateWorkflow([
                    {expect: {goalText: /Protractor::repeatTimesMinimal/}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}, instruction: 'click_label'}
                ]);
                expect(getGamificationNavbarProgressBarPoints()).toEqual("23");
                expect(getGamificationNavbarLevel()).toEqual("1");

                // 2. run ifBlock --> (42 points ->  aria 16 , lvl 2)
                automateWorkflow([
                    {expect: {goalText: /Protractor::ifBlock/}},
                    {expect: {prevTaskText: /start/i}},
                    {expect: {nextTaskText: 'Bedingung'}},
                    {expect: {taskText: 'A1'}, instruction: 'ok'},
                    {expect: {taskText: 'Bedingung'}, instruction: 'yes'},
                    {expect: {taskText: 'B1'}, instruction: 'ok'},
                    {expect: {taskText: 'B2'}, instruction: 'ok'},
                    {expect: {taskText: 'D1'}, instruction: 'ok'},
                    {expect: {taskText: /ende/i}, instruction: 'click_label'}
                ]);
                expect(getGamificationNavbarProgressBarPoints()).toEqual("16");
                expect(getGamificationNavbarLevel()).toEqual("2");

                // 3. run test workflow --> (53 points ->  aria 2 , lvl 3)
                automateWorkflow([
                    {expect: {'taskText': /Task 1/i}, instruction: 'ok'},
                    {expect: {'taskText': /ende/i}, instruction: 'click_label'}
                ]);
                expect(getGamificationNavbarProgressBarPoints()).toEqual("2");
                expect(getGamificationNavbarLevel()).toEqual("3");
            });
            it('should receive no points if schedule is cancelled', () => {
                element(by.buttonText("Test Workflow")).click();
                element(by.buttonText("New Workflow")).click();
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();

                const expectedPoints = getGamificationNavbarProgressBarPoints();
                const expectedLevel = getGamificationNavbarLevel();

                const abortButton = $('[ng-click="$ctrl.stopScheduler()"]');
                abortButton.click();

                expect(getGamificationNavbarProgressBarPoints()).toEqual(expectedPoints);
                expect(getGamificationNavbarLevel()).toEqual(expectedLevel);
            });

        });

        describe('with flexView', () => {
            beforeAll(() => settingsSetFlexviewEnabled(true));
            afterAll(() => settingsSetFlexviewEnabled(false));
            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile('singleTask.json');
            });

            it('should execute a simple workflow with flex view layout', function() {
                element(by.buttonText("Protractor::singleTask")).click();
                element(by.buttonText("Ablauf starten")).click();
                waitForExecutionComponentLoaded();
                expect($('execution-block#current-block .execution-block-flex').isDisplayed()).toBe(true);
                expect($('execution-log').isPresent()).toBe(false);
                expect(getPreviousExecutionBlock().isPresent()).toBe(false);
                expect(getNextExecutionBlock().isPresent()).toBe(false);
                automateWorkflow([
                    {instruction: 'ok', expect: {'taskText': "Task 1", taskImageUrl: null}},
                    {instruction: 'click_label', expect: {'taskText': /ende/i, taskImageUrl: null}},
                ]);
                browser.wait(EC.visibilityOf(getListBuilder()), 2000, "Should go back to list builder after execution finished");
            });
        });
    });

    describe('loginMenu', function () {
        var loginModal, closeBtn, userInput, passInput, submitBtn;

        var help_user_invalid = "Bitte Benutzernamen eingeben.";
        var help_pass_invalid = "Bitte Passwort eingeben.";
        var help_pass_short = "Das Passwort muss min. 8 Zeichen lang sein.";

        function getHelpTextForUserValid(modal) {
            return modal.element(by.css('p[ng-show="loginForm.username.$invalid && !loginForm.username.$pristine"]'));
        }

        function getHelpTextForPassValid(modal) {
            return modal.element(by.css('p[ng-show="loginForm.password.$error.required && !loginForm.password.$pristine"]'));
        }

        function getHelpTextForPassShort(modal) {
            return modal.element(by.css('p[ng-show="loginForm.password.$error.minlength && !loginForm.password.$error.required"]'));
        }

        function getHelpTextForErrorMessage(modal) {
            return modal.element(by.css('span[name="errorMessage"]'));
        }

        function getModalInstance() {
            getLoginMenuButton().click();
            loginModal = getModal();
            closeBtn = getLoginCloseButton(loginModal);
            userInput = getLoginUsername(loginModal);
            passInput = getLoginPassword(loginModal);
            submitBtn = getLoginSubmitButton(loginModal);
        }

        function loginModalBeforeEach() {
            browser.get('index.html#!/overview');

            getModalInstance();
        }

        beforeEach(loginModalBeforeEach);

        it('should verify that the loginMenu and form exists', function () {
            expect(loginModal.isPresent()).toBeTruthy();
            expect(loginModal.isDisplayed()).toBeTruthy();
            expect(closeBtn.isPresent()).toBeTruthy();
            expect(userInput.isPresent()).toBeTruthy();
            expect(passInput.isPresent()).toBeTruthy();
            closeBtn.click();
            browser.wait(EC.invisibilityOf(loginModal), 1000, "LoginModal should not be visible!");
        });
        it('should NOT open the loginModal multiple times', function () {
            expect(loginModal.isPresent()).toBeTruthy();
            expect(loginModal.isDisplayed()).toBeTruthy();
            getLoginMenuButton().click().then(
                function () {
                    expect(false)
                },
                function (error) {
                    expect(error).toBeDefined()
                }
            );
            closeBtn.click();
            browser.wait(EC.invisibilityOf(loginModal), 1000, "LoginModal should not be visible!");
        });

        describe('Server integration', function () {
            beforeEach(function () {
                mockServer();
                loginModalBeforeEach();
            });
            afterEach(function () {
                unmockServer();
            });
            it('should logout an user and show loginForm again', function () {
                var username = "testuser", password = "e2e_test-rehagoal";

                userInput.sendKeys(username);
                passInput.sendKeys(password);
                submitBtn.click();
                browser.wait(EC.invisibilityOf(loginModal), 2000, "form should not be visible!");

                // renew modal instance
                getModalInstance();

                var logoutBtn = getLogoutButton(loginModal);
                logoutBtn.click();
                browser.wait(EC.invisibilityOf(logoutBtn), 1000, "user should be logged out!");

                expect(userInput.isDisplayed()).toBeTruthy();
                expect(passInput.isDisplayed()).toBeTruthy();
                expect(submitBtn.isDisplayed()).toBeTruthy();
            });
            it('should show error message if server response invalid (Status: 400)', function () {
                var username = "testuser", password = "wrongpassword";
                userInput.sendKeys(username);
                passInput.sendKeys(password);
                submitBtn.click();
                var errorMsg = getHelpTextForErrorMessage(loginModal);
                browser.wait(EC.presenceOf(errorMsg), 1000, "Expected error message not shown!");
                expect(errorMsg.getText()).toEqual("Fehler: Die angegebenen Zugangsdaten stimmen nicht.");
            });
            it('should keep the user state if modal is closed and reopened', function () {
                var username = "testuser", password = "e2e_test-rehagoal";

                userInput.sendKeys(username);
                passInput.sendKeys(password);
                submitBtn.click();
                browser.wait(EC.invisibilityOf(loginModal), 3000, "loginModal should not be displayed!");

                // renew modal instance
                getModalInstance();

                expect(getLogoutButton(loginModal).isPresent()).toBeTruthy();
                expect(getLogoutButton(loginModal).isDisplayed()).toBeTruthy();
                closeBtn.click();
                browser.wait(EC.not(EC.presenceOf(loginModal)), 3000);
                getLoginMenuButton().click();
                expect(getLogoutButton(loginModal).isPresent()).toBeTruthy();
                expect(getLogoutButton(loginModal).isDisplayed()).toBeTruthy();
            });
            it('should NOT login a user with INVALID credentials', function () {
                var username = "testuser", password = "wrongpassword";
                userInput.sendKeys(username);
                passInput.sendKeys(password);
                submitBtn.click();
                browser.wait(EC.invisibilityOf(getLogoutButton(loginModal)), 1000, "user should not be logged in!");
                expect(submitBtn.isDisplayed()).toBeTruthy();
            });
            it('should verify that the loginMenu shows a help if user/pass are NOT valid', function () {
                var username = "test", password = "short";
                userInput.sendKeys(username);
                passInput.sendKeys(password);
                expect(getHelpTextForUserValid(loginModal).isDisplayed()).toBeFalsy();
                expect(getHelpTextForPassValid(loginModal).isDisplayed()).toBeFalsy();
                expect(getHelpTextForPassShort(loginModal).isDisplayed()).toBeTruthy();
                expect(getHelpTextForPassShort(loginModal).getText()).toEqual(help_pass_short);
                passInput.clear();
                expect(getHelpTextForPassValid(loginModal).getText()).toEqual(help_pass_invalid);
                userInput.clear();
                expect(getHelpTextForUserValid(loginModal).getText()).toEqual(help_user_invalid);
            });
            it('should login a user with VALID credentials', function () {
                var username = "testuser", password = "e2e_test-rehagoal";

                expect(submitBtn.isEnabled()).toBeFalsy();
                userInput.sendKeys(username);
                passInput.sendKeys(password);
                expect(submitBtn.isEnabled()).toBeTruthy();
                submitBtn.click();
                browser.wait(EC.invisibilityOf(loginModal), 3000, "LoginModal should not be displayed!");

                // renew modal instance
                getModalInstance();

                expect(getLogoutButton(loginModal).isPresent()).toBeTruthy();
                expect(getLogoutButton(loginModal).isDisplayed()).toBeTruthy();
            });
        });
    });

    describe('calendar-related', function () {

        /**
         * @return {ElementFinder}
         */
        function getPlanDateField() {
            return element(by.id("planDate"));
        }

        /**
         * @return {ElementFinder}
         */
        function getPlanTimeField() {
            return element(by.id("planTime"));
        }

        /**
         * @return {ElementFinder}
         */
        function getPlannedTasksPanel() {
            const panel = element(by.cssContainingText("div.panel", "Geplante Aufgaben"));
            expect(panel.element(by.css('div.panel-heading')).getText()).toEqual("Geplante Aufgaben");
            return panel;
        }

        /**
         * @return {ElementFinder}
         */
        function getAvailableTasksPanel() {
            const panel = element(by.cssContainingText("div.panel", "Verfügbare Aufgaben"));
            expect(panel.element(by.css('div.panel-heading')).getText()).toEqual("Verfügbare Aufgaben");
            return panel;
        }

        /**
         * @param {ElementFinder} panel
         * @return {ElementFinder}
         */
        function getPanelBody(panel) {
            return panel.element(by.css(".panel-body"));
        }

        /**
         *
         * @param {ElementFinder} panel
         * @return {ElementFinder}
         */
        function getPanelWarning(panel) {
            return getPanelBody(panel).element(by.css(".alert.alert-warning[role=alert]"));
        }

        /**
         * @param {ElementFinder} panel
         * @return {ElementArrayFinder | *}
         */
        function getPanelListItems(panel) {
            return getPanelBody(panel).$$('.list-group-item');
        }

        /**
         * @return {ElementFinder}
         */
        function getPlannedEventsElement() {
            return $('#plannedEvents');
        }

        /**
         * @return {ElementFinder}
         */
        function getNoPlannedEventsWarning() {
            return element(by.cssContainingText('*', "Keine geplanten Termine"));
        }

        /**
         * @return {ElementFinder}
         */
        function getPlannedEventsText() {
            return element(by.cssContainingText('*', "Bereits geplante Termine"));
        }

        /**
         * @return {ElementFinder}
         */
        function getPlannedEventsTable() {
            return $('.planned-events-table');
        }

        /**
         * @return {ElementFinder}
         */
        function getSaveEventButton() {
            return element(by.buttonText("Termin speichern"));
        }

        /**
         * @param {Date} date
         * @return {string}
         */
        function getISODateString(date) {
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            return`${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        }

        /**
         * @param {string[]} workflowNames
         */
        function addWorkflowsToEvent(workflowNames) {
            const availableItems = getPanelListItems(getAvailableTasksPanel());
            for (let workflowName of workflowNames) {
                const workflowItem = availableItems.filter((item) => item.getText().then((text) => text === workflowName)).first();
                workflowItem.click();
                expect(getPanelWarning(getPlannedTasksPanel()).isPresent()).toBe(false);
            }
        }

        /**
         * @param {Date} date
         * @return {promise.Promise<string>}
         */
        function getBrowserDateLocaleString(date) {
            const isoDate = date.toISOString();
            return browser.executeScript(function(isoDate) {
                let date = new Date(isoDate);;
                return date.toLocaleString();
            }, isoDate);
        }

        /**
         * @param {Date} date
         * @return {promise.Promise<void>}
         */
        function setDateAndTimeForEvent(date) {
            const isoDate = date.toISOString();
            return browser.executeScript(function(isoDate) {
                // This should be timezone compatible...
                let date = new Date(isoDate);
                let day = date.getDate();
                let month = date.getMonth() + 1;
                let year = date.getFullYear();
                let hour = date.getHours();
                let min = date.getMinutes();
                month = ('00'+month).slice(-2);
                day = ('00'+day).slice(-2);
                hour = ('00'+hour).slice(-2);
                min = ('00'+min).slice(-2);
                const planDate = document.getElementById('planDate');
                planDate.value = `${year}-${month}-${day}`;
                planDate.dispatchEvent(new Event('change'));
                const planTime = document.getElementById('planTime');
                planTime.value = `${hour}:${min}`;
                planTime.dispatchEvent(new Event('change'));
            }, isoDate);
        }

        /**
         * @param {Date} date
         * @param {string[]} workflowNames
         */
        function addCalendarEvent(date, workflowNames) {
            console.log(`[E2E] Adding an event`, date.toLocaleString(), workflowNames);
            clearPlannedWorkflows();
            setDateAndTimeForEvent(date);
            addWorkflowsToEvent(workflowNames);
            const plannedItems = getPanelListItems(getPlannedTasksPanel());
            const expectedPlannedItems = workflowNames.map((workflowName, index) => `${index + 1}. ${workflowName}`);
            expect(plannedItems.map((item) => item.getText())).toEqual(expectedPlannedItems);
            getSaveEventButton().click();
        }

        /**
         * @param {number} index
         */
        function removePlannedEvent(index) {
            const plannedEventsTable = getPlannedEventsTable();
            const trs = plannedEventsTable.$$('tr');
            const tds = trs.get(index + 1).$$('td');
            const removeButton = tds.get(0).$('.glyphicon-remove');
            removeButton.click();
        }

        /**
         * @param {Date} expectedDate
         * @param {string[]} expectedWorkflowNames
         * @param {number} expectedEventCount
         * @param {number} expectedEventIndex
         */
        function checkCalendarEventPresent(expectedDate, expectedWorkflowNames, expectedEventCount, expectedEventIndex) {
            browser.wait(EC.not(EC.presenceOf(getNoPlannedEventsWarning())), 5000, "Expected that planned events warning is not present after adding an event");
            expect(getPlannedEventsText().isPresent()).toBe(true);
            const plannedEventsTable = getPlannedEventsTable();
            expect(plannedEventsTable.isDisplayed()).toBe(true);
            const trs = plannedEventsTable.$$('tr');
            expect(trs.count()).toEqual(expectedEventCount + 1);
            expect(trs.get(0).$$('th').map((th) => th.getText())).toEqual(["", "Datum", "Workflows"]);
            const tds = trs.get(expectedEventIndex + 1).$$('td');
            expect(tds.count()).toEqual(3);
            const removeButton = tds.get(0).$('.glyphicon-remove');
            expect(removeButton.isDisplayed()).toBe(true);
            expect(tds.get(1).getText()).toEqual(getBrowserDateLocaleString(expectedDate));
            expect(tds.get(2).$$('li').map((li) => li.getText())).toEqual(expectedWorkflowNames);
        }

        /**
         *
         * @returns {promise.Promise<number>}
         */
        function getPlannedEventsCount() {
            browser.wait(EC.not(EC.presenceOf(getNoPlannedEventsWarning())), 5000, "Expected that planned events warning is not present after adding an event");
            const plannedEventsTable = getPlannedEventsTable();
            const trs = plannedEventsTable.$$('tr');
            // Exclude th row
            return trs.count().then((count) => count - 1);
        }

        function clearPlannedWorkflows() {
            const plannedItems = getPanelListItems(getPlannedTasksPanel());
            plannedItems.count().then((plannedItemsCount) => {
                for (let i = 0; i < plannedItemsCount; ++i) {
                    getPanelListItems(getPlannedTasksPanel()).get(0).click();
                }
            });
        }

        function clearPlannedEvents() {
            const plannedEventsTable = getPlannedEventsTable();
            const trs = plannedEventsTable.$$('tr');
            trs.count().then((numRows) => {
                for (let i = 1; i < numRows; ++i) {
                    console.log("clear planned event", i);
                    removePlannedEvent(0);
                }
            });
        }

        function getCalendarEventOverlay() {
            return element(by.id('calendar-event-bar-overlay'));
        }

        /**
         *
         * @returns {ElementFinder}
         */
        function getCalendarEventOverlayHeading() {
            return getCalendarEventOverlay().$('.panel-heading');
        }

        describe('plannerView', function () {
            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile('singleTask.json');
                importTestfile('ifBlock.json');
                browser.get('index.html#!/planner');
            });

            afterAll(function() {
                clearCalendarDB();
                clearWebStorage();
            });

            describe('default view without interaction', function () {
                it('should render plannerView when user navigates to /planner', function () {
                    expect(getPageTitle()).toMatch(/Terminplanung/);
                });
                it('should prefill date field with today', function () {
                    const now = new Date();
                    expect(getPlanDateField().getAttribute('value')).toEqual(getISODateString(now));
                });
                it('should have empty time field by default', function () {
                    expect(getPlanTimeField().getAttribute('value')).toEqual("");
                });
                it('should have appropriate labels for date/time fields', function () {
                    const dateField = getPlanDateField();
                    const timeField = getPlanTimeField();
                    const dateLabel = element(by.cssContainingText("label", "Datum:"));
                    const timeLabel = element(by.cssContainingText("label", "Uhrzeit:"));
                    expect(dateLabel.isDisplayed()).toBe(true);
                    expect(dateLabel.getAttribute('for')).toEqual(dateField.getAttribute("id"));
                    expect(timeLabel.getAttribute('for')).toEqual(timeField.getAttribute("id"));
                });
                it('should have no workflows selected by default and should show message regarding that', function () {
                    const plannedTasksPanel = getPlannedTasksPanel();
                    expect(plannedTasksPanel.isDisplayed()).toBe(true);
                    expect(getPanelWarning(plannedTasksPanel).isDisplayed()).toBe(true);
                    expect(getPanelWarning(plannedTasksPanel).getText()).toEqual('Es wurden noch keine Workflows ausgewählt!');
                    expect(getPanelListItems(plannedTasksPanel).count()).toEqual(0);
                });
                it('should have available workflows listed in other panel', function () {
                    const availableTasksPanel = getAvailableTasksPanel();
                    const listItems = getPanelListItems(availableTasksPanel);
                    expect(listItems.count()).toBe(3);
                    expect(listItems.map((item) => item.getText())).toEqual(["Test Workflow", "Protractor::singleTask", "Protractor::ifBlock"]);
                });
                it('should have no planned events and should show a message regarding that', function() {
                    expect(getPlannedEventsElement().isPresent()).toBe(false);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(getPlannedEventsText().isPresent()).toBe(false);
                    expect(getPlannedEventsTable().isPresent()).toBe(false);
                });
            });
            describe('adding events', function () {
                afterEach(function () {
                    clearPlannedWorkflows();
                    clearPlannedEvents();
                });

                /**
                 * @param {string} modalText
                 */
                function expectModalWarningAndConfirm(modalText) {
                    const modal = getModal();
                    browser.wait(EC.presenceOf(modal), 2000, "Expected modal to be present");
                    expect(modal.isDisplayed()).toBe(true);
                    expect(getModalTitle(modal)).toEqual('Warnung');
                    expect(getModalText(modal)).toEqual(modalText);
                    modalOK(modal);
                }

                it('should allow adding events, if constraints are met (date/time in future, 1+ workflow(s) selected)', function () {
                    const date = new Date();
                    date.setHours(date.getHours() + 1);
                    date.setSeconds(0);
                    const workflowNames = ["Protractor::singleTask", "Protractor::ifBlock", "Protractor::singleTask"];
                    addCalendarEvent(date, workflowNames);
                    checkCalendarEventPresent(date, workflowNames, 1, 0);

                    const date2 = new Date(date.getTime());
                    date2.setMinutes(date2.getMinutes() + 15);
                    const workflowNames2 = ["Test Workflow"];
                    addCalendarEvent(date2, workflowNames2);
                    checkCalendarEventPresent(date, workflowNames, 2, 0);
                    checkCalendarEventPresent(date2, workflowNames2, 2, 1);

                    browser.get('index.html#!/planner');
                    checkCalendarEventPresent(date, workflowNames, 2, 0);
                    checkCalendarEventPresent(date2, workflowNames2, 2, 1);
                });

                it('should not allow adding an event and show modal, if date is not filled', function() {
                    getPlanDateField().clear();
                    getSaveEventButton().click();
                    const plannedEventsTable = getPlannedEventsTable();
                    expectModalWarningAndConfirm('Bitte gültiges Datum und Uhrzeit für den Termin eingeben!');
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });

                it('should not allow adding an event and show modal, if time is not filled', function() {
                    setDateAndTimeForEvent(new Date());
                    getPlanTimeField().clear();
                    getSaveEventButton().click();
                    const plannedEventsTable = getPlannedEventsTable();
                    expectModalWarningAndConfirm('Bitte gültiges Datum und Uhrzeit für den Termin eingeben!');
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });

                it('should not allow adding an event and show modal, if date is in the past', function() {
                    const date = new Date();
                    date.setDate(date.getDate() - 1);
                    date.setSeconds(0);
                    const workflowNames = ["Protractor::singleTask", "Protractor::ifBlock", "Protractor::singleTask"];
                    addCalendarEvent(date, workflowNames);
                    const plannedEventsTable = getPlannedEventsTable();
                    // Depending on previous form values, the form model value may either be null or with date in past
                    expectModalWarningAndConfirm(jasmine.stringMatching(/Datum\/Uhrzeit muss in der Zukunft liegen!|Bitte gültiges Datum und Uhrzeit für den Termin eingeben!/));
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });

                it('should not allow adding an event and show modal, if time is in the past', function() {
                    const date = new Date();
                    date.setMinutes(date.getMinutes() - 2);
                    date.setSeconds(0);
                    const workflowNames = ["Protractor::singleTask", "Protractor::ifBlock", "Protractor::singleTask"];
                    addCalendarEvent(date, workflowNames);
                    const plannedEventsTable = getPlannedEventsTable();
                    // Depending on previous form values, the form model value may either be null or with date in past
                    expectModalWarningAndConfirm(jasmine.stringMatching(/Datum\/Uhrzeit muss in der Zukunft liegen!|Bitte gültiges Datum und Uhrzeit für den Termin eingeben!/));
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });

                it('should not allow adding an event, if there are no workflows selected', function() {
                    const date = new Date();
                    date.setHours(date.getHours() + 1);
                    const workflowNames = [];
                    addCalendarEvent(date, workflowNames);
                    const plannedEventsTable = getPlannedEventsTable();
                    expectModalWarningAndConfirm('Bitte mindestens einen Workflow zum Termin hinzufügen!');
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });
            });
            describe('removal of events', function () {
                let testEvents = [];

                let originalTimeout;
                beforeEach(function () {
                    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
                    // Increase timeout, as we have some long running tests (timing)
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;
                });

                afterEach(function () {
                    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
                });


                beforeEach(function () {
                    testEvents = [];
                    clearCalendarDB();
                    browser.get('index.html#!/planner');

                    const date1 = new Date();
                    date1.setHours(date1.getHours() + 1);
                    date1.setSeconds(0);
                    const workflowNames1 = ["Protractor::singleTask", "Protractor::ifBlock", "Protractor::singleTask"];
                    addCalendarEvent(date1, workflowNames1);
                    checkCalendarEventPresent(date1, workflowNames1, 1, 0);
                    testEvents.push({
                        date: date1,
                        workflowNames: workflowNames1
                    });

                    const date2 = new Date();
                    // date2 is before date1
                    date2.setMinutes(date2.getMinutes() + 10);
                    date2.setSeconds(0);
                    const workflowNames2 = ["Protractor::ifBlock", "Protractor::singleTask"];
                    addCalendarEvent(date2, workflowNames2);
                    // events are ordered by date
                    checkCalendarEventPresent(date1, workflowNames1, 2, 1);
                    checkCalendarEventPresent(date2, workflowNames2, 2, 0);
                    testEvents.push({
                        date: date2,
                        workflowNames: workflowNames2
                    });

                    const date3 = new Date();
                    // date3 is after date1 and date2
                    date3.setHours(date3.getHours() + 2);
                    date3.setSeconds(0);
                    const workflowNames3 = ["Test Workflow", "Protractor::singleTask", "Protractor::singleTask"];
                    addCalendarEvent(date3, workflowNames3);
                    // events are ordered by date
                    checkCalendarEventPresent(date1, workflowNames1, 3, 1);
                    checkCalendarEventPresent(date2, workflowNames2, 3, 0);
                    checkCalendarEventPresent(date3, workflowNames3, 3, 2);
                    testEvents.push({
                        date: date3,
                        workflowNames: workflowNames3
                    });

                    testEvents.sort((ev1, ev2) => ev1.date.getTime() - ev2.date.getTime());
                });

                it('should allow removal of correct events', function () {
                    removePlannedEvent(0);
                    checkCalendarEventPresent(testEvents[1].date, testEvents[1].workflowNames, 2, 0);
                    checkCalendarEventPresent(testEvents[2].date, testEvents[2].workflowNames, 2, 1);
                    removePlannedEvent(1);
                    checkCalendarEventPresent(testEvents[1].date, testEvents[1].workflowNames, 1, 0);
                    removePlannedEvent(0);
                    const plannedEventsTable = getPlannedEventsTable();
                    browser.sleep(2000);
                    expect(getNoPlannedEventsWarning().isDisplayed()).toBe(true);
                    expect(plannedEventsTable.isPresent()).toBe(false);
                });
            });
        });

        describe('calendarEventComponent', function () {
            beforeAll(function () {
                browser.get('index.html#!/overview');
                importTestfile('singleTask.json');
                importTestfile('ifBlock.json');
                installMockedDateModule(null);
            });
            afterAll(function() {
                clearWebStorage();
            });
            afterAll(function() {
                uninstallMockedDateModule();
            })
            afterEach(function () {
                disableMockedDate();
            });

            const calendarEventOverlayTimeout = 2000;


            /**
             * @returns {ElementArrayFinder}
             */
            function getActiveEventElements() {
                return element.all(by.repeater("activeEvent in $ctrl.activeEvents"));
            }

            function getActiveEventByDescription(eventDescriptionOrRegex) {
                return getActiveEventElements().filter((activeEvent) => {
                    return getActiveEventDescription(activeEvent).then((description) => {
                        if (eventDescriptionOrRegex instanceof RegExp) {
                            return description.match(eventDescriptionOrRegex);
                        } else {
                            return description === eventDescriptionOrRegex;
                        }
                    })
                }).first();
            }

            /**
             *
             * @param {ElementFinder} activeEventElement
             * @returns {Promise<string>}
             */
            function getActiveEventDescription(activeEventElement) {
                return activeEventElement.$('.calendar-event-bar-workflow-name').getText();
            }

            /**
             *
             * @param {ElementFinder} activeEventElement
             * @returns {ElementFinder}
             */
            function getActiveEventAdditionalWorkflowsCountBadge(activeEventElement) {
                return activeEventElement.$('.calendar-event-bar-event-description .badge');
            }

            /**
             *
             * @param {Date} date
             * @returns {Promise<string>}
             */
            function getTimeStringForDate(date) {
                return browser.executeScript(function (isoDate) {
                    const date = new Date(isoDate);
                    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                }, date.toISOString());
            }

            /**
             *
             * @param {Date} date
             * @returns {promise.Promise<string>}
             */
            function getLocaleStringForDate(date) {
                return browser.executeScript(function (isoDate) {
                    const date = new Date(isoDate);
                    return date.toLocaleString();
                }, date.toISOString());
            }

            /**
             *
             * @param {ElementFinder} activeEventElement
             * @returns {ElementFinder}
             */
            function getActiveEventStartButton(activeEventElement) {
                return activeEventElement.$('button[title="Starten"]');
            }

            /**
             *
             * @param activeEventElement
             * @returns {ElementFinder}
             */
            function getActiveEventPostponeButton(activeEventElement) {
                return activeEventElement.$('button[title="Später"]');
            }

            /**
             *
             * @param activeEventElement
             * @returns {ElementFinder}
             */
            function getActiveEventDeleteButton(activeEventElement) {
                return activeEventElement.$('button[title="Löschen"]');
            }


            /**
             * Wait (timeout ms) for the calendar event overlay to show up
             * @param {number} timeout How long to browser.wait before timing out
             * @param {string | undefined} optMessageDetail Optional detail message if the wait times out
             * @returns {WebElementPromise}
             */
            function waitForCalendarEventOverlay(timeout, optMessageDetail) {
                optMessageDetail = optMessageDetail || "";
                return browser.wait(EC.visibilityOf(getCalendarEventOverlay()), timeout, `Event overlay should show up ${optMessageDetail}`);
            }

            /**
             * Changes the static postpone delay of calendar events to the requested option (by optionText).
             * Checks that the option value before is expectedValueBefore and after change expectedValueAfter.
             * Precondition: View should be settingsView
             * @param optionText text of the option to select
             * @param expectedValueBefore expected value as integer before (in ms)
             * @param expectedValueAfter expect value as integer after change (in ms)
             */
            function changeCalendarStaticPostponeDelay(optionText, expectedValueBefore, expectedValueAfter) {
                const selectCalendarStaticPostponeDelay = getCalendarStaticPostponeDelaySelect();
                expect(getSelectedOption(selectCalendarStaticPostponeDelay).getAttribute('value')).toBe(`number:${expectedValueBefore}`);
                getSelectOptionByText(selectCalendarStaticPostponeDelay, optionText).click();
                expect(getSelectedOption(selectCalendarStaticPostponeDelay).getAttribute('value')).toBe(`number:${expectedValueAfter}`);
            }

            describe('with mocked scheduler check interval', function () {
                let originalTimeout;
                const webCalendarSchedulerCheckInterval = 5000;
                const scheduleIntervalModuleName = 'mockedScheduleInterval';

                beforeAll(function() {
                    browser.addMockModule(scheduleIntervalModuleName, function(scheduleIntervalModuleName, webCalendarSchedulerCheckInterval) {
                        angular.module(scheduleIntervalModuleName, [])
                            .value('webCalendarSchedulerCheckInterval', webCalendarSchedulerCheckInterval);
                    }, scheduleIntervalModuleName, webCalendarSchedulerCheckInterval)
                });
                afterAll(function() {
                    browser.removeMockModule(scheduleIntervalModuleName)
                });

                describe('occurrence of events', function() {
                    beforeEach(function() {
                        browser.get('index.html#!/planner');
                    });
                    afterEach(function() {
                        clearCalendarDB();
                    });

                    function expectCalendarEventOverlayHeadingInFront() {
                        // Element clickable
                        browser.wait(EC.elementToBeClickable(getCalendarEventOverlayHeading()), 1000, "Event overlay heading should be clickable (=displayed on top)")
                        // Get element in front at location of the heading element
                        const elementAtLocationPromise = getCalendarEventOverlayHeading().getLocation().then((headingElementLocation) => {
                            return element(by.js("let {x, y} = arguments[0]; return document.elementFromPoint(x, y);", headingElementLocation))
                        });
                        // Element at that location is the panel-heading element
                        browser.wait(elementAtLocationPromise.then((elementAtLocation) =>{
                            expect(elementAtLocation.getAttribute("class")).toMatch(/\bpanel-heading\b/, "Element at location of calendarEventOverlayHeading should have class panel-heading (i.e. be the heading not covered by another element)");
                        }));
                    }

                    it('should show past calendar event with single workflow, when events are checked (at least every 30 seconds)', function () {
                        const date = new Date(2030, 2, 3, 4, 5);
                        getTimeStringForDate(date).then((dateTimeString) => {
                            const workflowNames = ['Protractor::ifBlock'];
                            installMockedDate(new Date(2030, 2, 3, 4, 4, 0));
                            addCalendarEvent(date, workflowNames);
                            browser.sleep(webCalendarSchedulerCheckInterval);
                            expect(getCalendarEventOverlay().isDisplayed()).toBe(false, "Event overlay should not be visible yet!");
                            installMockedDate(new Date(2030, 2, 3, 4, 5, 1));
                            waitForCalendarEventOverlay(webCalendarSchedulerCheckInterval);
                            expect(getCalendarEventOverlayHeading().getText()).toEqual("1 Anstehender Termin");
                            expectCalendarEventOverlayHeadingInFront();
                            const activeEvent1 = getActiveEventElements().get(0);
                            expect(getActiveEventDescription(activeEvent1)).toEqual(`${dateTimeString} Protractor::ifBlock`);
                            expect(getActiveEventAdditionalWorkflowsCountBadge(activeEvent1).isDisplayed()).toBe(false);
                        });
                    });

                    it('should add another event to the current events, if it occurs', function () {
                        const date1 = new Date(2021, 1, 2, 15, 11);
                        const date2 = new Date(2021, 1, 2, 15, 20);
                        Promise.all([getTimeStringForDate(date1), getTimeStringForDate(date2)]).then((timeStrings) => {
                            const [date1TimeString, date2TimeString] = timeStrings;
                            const workflowNames1 = ['Protractor::ifBlock'];
                            const workflowNames2 = ['Protractor::singleTask', 'Test Workflow'];
                            installMockedDate(new Date(2021, 1, 1, 1, 1, 1));
                            addCalendarEvent(date2, workflowNames2);
                            addCalendarEvent(date1, workflowNames1);
                            installMockedDate(date1);
                            waitForCalendarEventOverlay(webCalendarSchedulerCheckInterval);
                            const activeEvent1 = getActiveEventElements().get(0);
                            expect(getActiveEventDescription(activeEvent1)).toEqual(`${date1TimeString} Protractor::ifBlock`);
                            expect(getActiveEventElements().count()).toBe(1);
                            expect(getActiveEventAdditionalWorkflowsCountBadge(activeEvent1).isDisplayed()).toBe(false);
                            installMockedDate(date2);
                            const activeEvent2 = getActiveEventElements().get(1);
                            browser.wait(EC.presenceOf(activeEvent2), webCalendarSchedulerCheckInterval, "Second event should show up");
                            expect(getActiveEventAdditionalWorkflowsCountBadge(activeEvent2).isDisplayed()).toBe(true);
                            expect(getActiveEventAdditionalWorkflowsCountBadge(activeEvent2).getText()).toEqual("+1");

                            expect(getActiveEventByDescription(`${date1TimeString} Protractor::ifBlock`).isDisplayed()).toBe(true);
                            expect(getActiveEventByDescription(`${date2TimeString} Protractor::singleTask`).isDisplayed()).toBe(true);
                        });
                    });

                    it('should show event regardless of current view', function() {
                        const date = new Date(2030, 2, 3, 4, 5);
                        getTimeStringForDate(date).then((dateTimeString) => {
                            const workflowNames = ['Protractor::singleTask'];
                            installMockedDate(new Date(2030, 2, 3, 4, 4, 0));
                            addCalendarEvent(date, workflowNames);
                            installMockedDate(new Date(2030, 2, 3, 4, 5, 1));
                            waitForCalendarEventOverlay(webCalendarSchedulerCheckInterval);
                            const expectedEventDescription = `${dateTimeString} Protractor::singleTask`;
                            expect(getActiveEventElements().count()).toEqual(1);
                            expect(getActiveEventDescription(getActiveEventElements().get(0))).toEqual(expectedEventDescription);
                            const urls = ['#!/overview', '#!/scheduler', '#!/edit/1', '#!/start/1', '#!/settings', '#!/help'];
                            for (const [i, url] of urls.entries()) {
                                installMockedDateModuleAndLoadPage(new Date(2030, 2, 3, 4, 6 + i, 0), url);
                                // timeout is lower than scheduler interval, since check should occur before first check interval
                                waitForCalendarEventOverlay(2000, url);
                                expect(getActiveEventElements().count()).toEqual(1, `There should be exactly one active event (${url})`);
                                expect(getActiveEventDescription(getActiveEventElements().get(0))).toEqual(expectedEventDescription, `Expected different event description (${url})`);
                            }
                        });
                    });
                });

                describe('event actions', function() {
                    const event1Date = new Date(2030, 2, 3, 4, 5);
                    const event2Date = new Date(2030, 2, 3, 4, 10);
                    const event1WorkflowNames = ['Protractor::ifBlock'];
                    const event2WorkflowNames = ['Protractor::singleTask', 'Protractor::ifBlock'];
                    const postponeDelayDefault = 60000;
                    const postponeDelayDefaultLabel = '1 Minute';
                    const postponeDelay2 = 30 * 60 * 1000;
                    const postponeDelay2Label = '30 Minuten';

                    beforeEach(function() {
                        installMockedDateModuleAndLoadPage(new Date(2030, 2, 3, 4, 4, 0), 'index.html#!/planner');
                        addCalendarEvent(event1Date, event1WorkflowNames);
                        addCalendarEvent(event2Date, event2WorkflowNames);

                        installMockedDateModuleAndLoadPage(event2Date, '#!/overview');
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);
                    });

                    afterEach(function() {
                        clearCalendarDB();
                    });

                    it('should start execution of an event, when "Starten" is clicked', function() {
                        getActiveEventStartButton(getActiveEventByDescription(/Protractor::ifBlock/)).click();
                        expect(browser.getCurrentUrl()).toMatch(/#!\/scheduling\/[0-9a-f-]+/);
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Protractor::ifBlock/);

                        getActiveEventStartButton(getActiveEventByDescription(/Protractor::singleTask/)).click();
                        const modal = getPromptModal();
                        expect(getModalText(modal)).toMatch(/Ablaufplanung zu verlassen/);
                        modalAccept(modal);

                        expect(browser.getCurrentUrl()).toMatch(/#!\/scheduling\/[0-9a-f-]+/);
                        expect(getModal().isPresent()).toBe(false);
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Protractor::singleTask/);

                        automateWorkflow([
                            {expect: {taskText: 'Task 1'}, instruction: 'ok'},
                            {expect: {taskText: /ende/i}, instruction: 'click_label'},
                        ]);
                        expect(browser.getCurrentUrl()).toMatch(/#!\/scheduling\/[0-9a-f-]+/);
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Protractor::ifBlock/);
                    });

                    it('should postpone execution of an event, when "Später" is clicked (default delay)', function() {
                        const activeEvent1 = getActiveEventByDescription(/Protractor::ifBlock/);
                        const activeEvent2 = getActiveEventByDescription(/Protractor::singleTask/);
                        let now = event2Date.getTime();
                        const postponedDate = new Date(now + postponeDelayDefault);
                        // Check preconditions
                        expect(getActiveEventElements().count()).toBe(2);

                        // Postpone Protractor::singleTask (event2)
                        getActiveEventPostponeButton(activeEvent2).click();
                        expect(activeEvent2.isPresent()).toBe(false);
                        expect(getActiveEventElements().count()).toBe(1);

                        // After postponing, before actual postponed event happens
                        now = new Date(postponedDate.getTime() - 1);
                        installMockedDate(now);
                        browser.sleep(webCalendarSchedulerCheckInterval);
                        expect(getActiveEventElements().count()).toBe(1);

                        // When postponed event should occur
                        now = postponedDate;
                        installMockedDate(now);
                        browser.sleep(webCalendarSchedulerCheckInterval);
                        expect(getActiveEventElements().count()).toBe(2);
                        expect(activeEvent2.isPresent()).toBe(true);

                        // Check that still both events are scheduled (event2 postponed)
                        now = new Date(postponedDate.getTime());
                        installMockedDateModuleAndLoadPage(now, '#!/planner');
                        expect(getPlannedEventsCount()).toBe(2);
                        checkCalendarEventPresent(event1Date, event1WorkflowNames, 2, 0);
                        checkCalendarEventPresent(postponedDate, event2WorkflowNames, 2, 1);
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);

                        // Postpone event 1
                        const postponedDate2Event1 = new Date(now.getTime() + postponeDelayDefault);
                        getActiveEventPostponeButton(activeEvent1).click();
                        expect(activeEvent1.isPresent()).toBe(false);
                        expect(activeEvent2.isPresent()).toBe(true);

                        // Postpone event 2 (again)
                        // time needs to pass, otherwise order of events in planned events table is not clearly defined (order only by date)
                        now = new Date(now.getTime() + 1);
                        installMockedDate(now);
                        const postponedDate2Event2 = new Date(now.getTime() + postponeDelayDefault)
                        getActiveEventPostponeButton(activeEvent2).click();
                        expect(activeEvent1.isPresent()).toBe(false);
                        expect(activeEvent2.isPresent()).toBe(false);

                        // Should hide overlay, if all events are postponed
                        expect(getActiveEventElements().count()).toBe(0);
                        expect(getCalendarEventOverlay().isDisplayed()).toBe(false, "Expected overlay to hide after all events are postponed");

                        // Check that still both events are scheduled (both postponed)
                        // Note that dates are only checked to minute precision (since that is what is displayed in the table)
                        checkCalendarEventPresent(postponedDate2Event1, event1WorkflowNames, 2, 0);
                        checkCalendarEventPresent(postponedDate2Event2, event2WorkflowNames, 2, 1);
                    }, 60000);

                    it('should postpone execution of an event, when "Später" is clicked (30 minutes delay)', function() {
                        const activeEvent1 = getActiveEventByDescription(/Protractor::ifBlock/);
                        const activeEvent2 = getActiveEventByDescription(/Protractor::singleTask/);
                        let now = event2Date.getTime();
                        const postponedDate = new Date(now + postponeDelay2);

                        installMockedDateModuleAndLoadPage(event2Date, "#!/settings");
                        changeCalendarStaticPostponeDelay(postponeDelay2Label, postponeDelayDefault, postponeDelay2);

                        // Check preconditions
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);
                        expect(getActiveEventElements().count()).toBe(2);

                        // Postpone Protractor::singleTask (event2)
                        getActiveEventPostponeButton(activeEvent2).click();
                        expect(activeEvent2.isPresent()).toBe(false);
                        expect(getActiveEventElements().count()).toBe(1);

                        // After postponing, before actual postponed event happens
                        now = new Date(postponedDate.getTime() - 1);
                        installMockedDate(now);
                        browser.sleep(webCalendarSchedulerCheckInterval);
                        expect(getActiveEventElements().count()).toBe(1);

                        // When postponed event should occur
                        now = postponedDate;
                        installMockedDate(now);
                        browser.sleep(webCalendarSchedulerCheckInterval);
                        expect(getActiveEventElements().count()).toBe(2);
                        expect(activeEvent2.isPresent()).toBe(true);

                        // Check that still both events are scheduled (event2 postponed)
                        now = new Date(postponedDate.getTime());
                        installMockedDateModuleAndLoadPage(now, '#!/planner');
                        expect(getPlannedEventsCount()).toBe(2);
                        checkCalendarEventPresent(event1Date, event1WorkflowNames, 2, 0);
                        checkCalendarEventPresent(postponedDate, event2WorkflowNames, 2, 1);
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);

                        browser.get("#!/settings");
                        changeCalendarStaticPostponeDelay(postponeDelayDefaultLabel, postponeDelay2, postponeDelayDefault);
                    }, 60000);

                    it('should delete an event, when "Löschen" is clicked', function() {
                        const activeEvent1 = getActiveEventByDescription(/Protractor::singleTask/);
                        expect(getActiveEventElements().count()).toBe(2);
                        getActiveEventDeleteButton(activeEvent1).click();
                        expect(getActiveEventElements().count()).toBe(1);
                        expect(activeEvent1.isPresent()).toBe(false);
                        installMockedDateModuleAndLoadPage(new Date(event2Date.getTime() + postponeDelayDefault + 1), '#!/planner');
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);
                        expect(getActiveEventElements().count()).toBe(1);
                        expect(getPlannedEventsCount()).toBe(1);
                        checkCalendarEventPresent(event1Date, event1WorkflowNames, 1, 0);
                        const activeEvent2 = getActiveEventByDescription(/Protractor::ifBlock/);
                        getActiveEventDeleteButton(activeEvent2).click();
                        expect(getCalendarEventOverlay().isDisplayed()).toBe(false);
                        browser.wait(EC.visibilityOf(getNoPlannedEventsWarning()), 2000, "Expected message about no planned events");
                    });
                });

                describe('event execution', function() {
                    const event1Date = new Date(2030, 2, 3, 4, 5);
                    const event2Date = new Date(2030, 2, 3, 4, 10);
                    const event1WorkflowNames = ['Test Workflow'];
                    const event2WorkflowNames = ['Protractor::singleTask', 'Protractor::ifBlock'];

                    beforeEach(function() {
                        installMockedDateModuleAndLoadPage(new Date(2030, 2, 3, 4, 4, 0), 'index.html#!/planner');
                        addCalendarEvent(event1Date, event1WorkflowNames);
                        addCalendarEvent(event2Date, event2WorkflowNames);

                        installMockedDateModuleAndLoadPage(event2Date, '#!/overview');
                        waitForCalendarEventOverlay(calendarEventOverlayTimeout);
                    });

                    afterEach(function() {
                        clearCalendarDB();
                    });

                    it('should execute all workflows in an event in correct order, when "Starten" was clicked', function() {
                        // Start event 1 (Test Workflow)
                        getActiveEventStartButton(getActiveEventByDescription(/Test Workflow/)).click();
                        expect(browser.getCurrentUrl()).toMatch(/#!\/scheduling\/[0-9a-f-]+/);
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Test Workflow/);
                        automateWorkflow([
                            {expect: {taskText: /ende/i}, instruction: 'click_label'},
                        ]);
                        expect(browser.getCurrentUrl()).toMatch(/#!\/overview/, "Expected redirect to overview after event execution");

                        // Start Event 2 (Protractor::singleTask, Protractor::ifBlock)
                        getActiveEventStartButton(getActiveEventByDescription(/Protractor::singleTask/)).click();
                        expect(browser.getCurrentUrl()).toMatch(/#!\/scheduling\/[0-9a-f-]+/);
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Protractor::singleTask/);
                        automateWorkflow([
                            {expect: {taskText: 'Task 1'}, instruction: 'ok'},
                            {expect: {taskText: /ende/i}, instruction: 'click_label'},
                        ]);
                        // Second Workflow of Event 2
                        waitForExecutionComponentLoaded();
                        expect(element.all(by.css('execution-component h1')).first().getText()).toMatch(/Workflow[- ]Ausführung: Protractor::ifBlock/);
                        automateWorkflow([
                            {expect: {taskText: 'A1'}, instruction: 'ok'},
                            {expect: {taskText: 'Bedingung'}, instruction: 'yes'},
                            {expect: {taskText: 'B1'}, instruction: 'ok'},
                            {expect: {taskText: 'B2'}, instruction: 'ok'},
                            {expect: {taskText: 'D1'}, instruction: 'ok'},
                            {expect: {taskText: /ende/i}, instruction: 'click_label'},
                        ]);
                        expect(browser.getCurrentUrl()).toMatch(/#!\/overview/, "Expected redirect to overview after event execution");
                    });
                });

                it('should show missed events modal, if there are missed events', function() {
                    installMockedDateModuleAndLoadPage(new Date(2030, 1, 1), 'index.html#!/planner');
                    const event1Date = new Date(2030, 2, 2, 15, 0);
                    const event2Date = new Date(2030, 2, 2, 23, 59);
                    const event3Date = new Date(2030, 2, 3, 15, 0);
                    const event1WorkflowNames = ['Protractor::ifBlock'];
                    const event2WorkflowNames = ['Protractor::singleTask', 'Protractor::ifBlock'];
                    const event3WorkflowNames = ['Test Workflow'];
                    Promise.all([getLocaleStringForDate(event1Date), getLocaleStringForDate(event2Date)]).then((dateLocaleStrings) => {
                        const [date1LocaleString, date2LocaleString] = dateLocaleStrings;
                        addCalendarEvent(event1Date, event1WorkflowNames);
                        addCalendarEvent(event2Date, event2WorkflowNames);
                        addCalendarEvent(event3Date, event3WorkflowNames);
                        expect(getPlannedEventsCount()).toEqual(3);
                        installMockedDateModuleAndLoadPage(new Date(2030, 2, 3, 16, 10), 'index.html#!/planner');
                        const modal = getModal();
                        browser.wait(EC.visibilityOf(modal), 2000, "Expected modal to be displayed (missed events)");
                        expect(getModalTitle(modal)).toEqual("Verpasste Termine");
                        expect(getModalText(modal)).toMatch(/^Sie haben Termine verpasst:\n.*/);
                        // order by date ascending
                        const expectedItems = [
                            `${date1LocaleString}: Protractor::ifBlock`,
                            `${date2LocaleString}: Protractor::singleTask, Protractor::ifBlock`
                        ];
                        getModalText(modal).then(modalText => {
                            const actualItems = modalText.split("\n").slice(1);
                            expect(actualItems).toEqual(expectedItems);
                            modalOK(modal);
                            expect(modal.isPresent()).toBe(false);
                        });
                    });
                });
            });
        });
    });

    describe('helpView', function () {

        beforeEach(function () {
            browser.get('index.html#!/help');
        });

        it("should open help page when clicking help button in navigation", function () {
            browser.get('index.html');
            $$('#help-btn').first().click();
            expect(browser.getCurrentUrl()).toMatch(/#!\/help/);
        });

        it('should render helpView when user navigates to /help', function () {
            expect(getPageTitle()).toMatch(/Hilfebereich/);
            expect(browser.getCurrentUrl()).toMatch(/#!\/help/);
        });

        it("should open light box when pressing on image-preview", function () {
            $$('.img-thumbnail').first().click();
            var modal = getModal();
            expect(modal.isPresent()).toBe(true);

            modal.element(by.buttonText('×')).click();
            browser.wait(EC.not(EC.presenceOf(modal)));
            expect(browser.getCurrentUrl()).toMatch(/#!\/help/);
            expect(modal.isPresent()).toBe(false);
        });

        it("should switch to next image when pressing on next in lightbox", function () {
            $$('.img-thumbnail').first().click();
            var modal = getModal();
            browser.wait(EC.visibilityOf(modal), 3000);

            var title1 = $$('#image-caption').first().getText();
            var btnNext = modal.element(by.css('#btn-next'));
            browser.wait(EC.elementToBeClickable(btnNext), 2500);
            btnNext.click();

            var title2 = $$('#image-caption').first().getText();
            expect(title1).not.toEqual(title2);

            modal.element(by.buttonText('×')).click();
            browser.wait(EC.not(EC.presenceOf(modal)), 3000);
        });

        it("should switch to next image when pressing on preview in lightbox", function () {
            $$('.img-thumbnail').first().click();
            var modal = getModal();
            browser.wait(EC.visibilityOf(modal), 3000);

            var title1 = $$('#image-caption').first().getText();
            var btnPreview = modal.element(by.css('#btn-preview'));
            browser.wait(EC.elementToBeClickable(btnPreview), 2500);
            btnPreview.click();

            var title2 = $$('#image-caption').first().getText();
            expect(title1).not.toEqual(title2);

            modal.element(by.buttonText('×')).click();
            browser.wait(EC.not(EC.presenceOf(modal)), 3000);
        });
    });

    describe('settingsView', function() {
        beforeAll(function () {
            mockWebSpeechSynthesis();
            browser.get('index.html#!/settings');
        });
        function getSelectExecutionViewLayout() {
            return element(by.model('$ctrl.executionViewLayout'));
        }
        function getSelectContentAlignment() {
            return element(by.model('$ctrl.executionViewFlexContentAlignment'));
        }

        describe('toggleSwitches', function() {
            const waitTimeoutInMs = 1500;
            const TOGGLE_SWITCH_ATTRIBUTES = {
                ENABLED_BACKGROUND_COLOR: "rgb(92, 184, 92)",
                DISABLED_BACKGROUND_COLOR: "rgb(204, 204, 204)",
                SLIDER_TRANSFORM_RIGHT_POSITION: "matrix(1, 0, 0, 1, 28.6, 0)",
                SLIDER_TRANSFORM_LEFT_POSITION: "none"
            }

            const ttsEnabledInput = $('#chkTTSEnabled');
            const ttsSampleView = $('#ttsSample');

            function getTTSSettingsDiv() {
                return element(by.id('settings-tts'));
            }

            function getTTSToggleSwitch() {
                return getTTSSettingsDiv().element(by.tagName('toggle-switch'));
            }

            function getToggleSpan(toggleSwitch) {
                return toggleSwitch.element(by.tagName('span'));
            }

            function getTTSLabel() {
                return getTTSSettingsDiv().element(by.tagName('label'));
            }

            function getComputedStyleProperty(elem, property, pseudoElem) {
                return browser.executeScript('return window.getComputedStyle(arguments[0], arguments[2]).getPropertyValue(arguments[1])', elem, property, pseudoElem);
            }

            function getComputedStyle(htmlElement, property, pseudoElem) {
                return browser.wait(getComputedStyleProperty(htmlElement, property, pseudoElem)
                    .then((propertyValue) => {
                        return propertyValue;
                    }), 500, 'should fetch computedStyleProperty');
            }

            function toggleSwitchBGColorToBe(expectedBgColor) {
                return getComputedStyle(getToggleSpan(getTTSToggleSwitch()), 'background-color', null).then(function(propertyValue) {
                    return propertyValue === expectedBgColor;
                });
            };

            function toggleSwitchSliderToBe(expectedSliderPosition) {
                return getComputedStyle(getToggleSpan(getTTSToggleSwitch()), 'transform', ':before').then(function (propertyValue) {
                    return propertyValue === expectedSliderPosition;
                });
            };

            const toggleSwitchBGColorToBeEnabled = function() {
                return toggleSwitchBGColorToBe(TOGGLE_SWITCH_ATTRIBUTES.ENABLED_BACKGROUND_COLOR);
            };
            const toggleSwitchBGColorToBeDisabled = function() {
                return toggleSwitchBGColorToBe(TOGGLE_SWITCH_ATTRIBUTES.DISABLED_BACKGROUND_COLOR);
            };

            const toggleSwitchSliderToBeRight = function() {
                return toggleSwitchSliderToBe(TOGGLE_SWITCH_ATTRIBUTES.SLIDER_TRANSFORM_RIGHT_POSITION);
            };
            const toggleSwitchSliderToBeLeft = function() {
                return toggleSwitchSliderToBe(TOGGLE_SWITCH_ATTRIBUTES.SLIDER_TRANSFORM_LEFT_POSITION);
            };

            it('should toggle visibility of toggle-switch and TTS sampling elements, when clicked on toggle switch', function() {
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeDisabled,
                    toggleSwitchSliderToBeLeft,
                    EC.invisibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to be off and TTS Visuals to be not shown at first');

                getTTSToggleSwitch().click();
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeEnabled,
                    toggleSwitchSliderToBeRight,
                    EC.visibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to change visuals to on and TTS Visuals to be shown');

                getTTSToggleSwitch().click();
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeDisabled,
                    toggleSwitchSliderToBeLeft,
                    EC.invisibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to be off and TTS Visuals to be not shown after turning off again');
            });
            it('should toggle visibility of toggle-switch and TTS sampling elements, when clicked on label', function() {
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeDisabled,
                    toggleSwitchSliderToBeLeft,
                    EC.invisibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to be off and TTS Visuals to be not shown at first');

                getTTSLabel().click();
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeEnabled,
                    toggleSwitchSliderToBeRight,
                    EC.visibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to change visuals to on and TTS Visuals to be shown');

                getTTSLabel().click();
                browser.wait(EC.and(
                    toggleSwitchBGColorToBeDisabled,
                    toggleSwitchSliderToBeLeft,
                    EC.invisibilityOf(ttsSampleView)
                ), waitTimeoutInMs, 'Expect toggle-switch to be off and TTS Visuals to be not shown after turning off again');
            });
        });
        describe('tts enabled', function() {
            beforeAll(() => {setTTSEnabled(true)});
            afterAll(() => {setTTSEnabled(false)});

            it('ttsSpeed should be 3 by default', function() {
                var slider = getTTSSpeedSlider();
                browser.sleep(1000);
                expect(slider.getAttribute('value')).toBe('3');
            });
            it('ttsSpeed should be 1 when slider is moved to the leftmost position', function() {
                var slider = getTTSSpeedSlider();
                slider.click();
                slider.sendKeys(protractor.Key.ARROW_LEFT, protractor.Key.ARROW_LEFT, protractor.Key.ARROW_LEFT);
                expect(slider.getAttribute('value')).toBe('1');
            });
            it('ttsSpeed should be 5 when slider is moved to the rightmost position', function() {
                var slider = getTTSSpeedSlider();
                slider.click();
                slider.sendKeys(protractor.Key.ARROW_RIGHT, protractor.Key.ARROW_RIGHT, protractor.Key.ARROW_RIGHT);
                expect(slider.getAttribute('value')).toBe('5');
            });
            it('should remember changed slider settings across page reloads', function() {
                var slider = getTTSSpeedSlider();
                var chkTTSEnabled = element(by.id('chkTTSEnabled'));
                expect(chkTTSEnabled.getAttribute('checked')).toBeTruthy();
                slider.click();
                slider.sendKeys(protractor.Key.ARROW_RIGHT, protractor.Key.ARROW_RIGHT, protractor.Key.ARROW_RIGHT);
                expect(slider.getAttribute('value')).toBe('5');
                browser.refresh();
                expect(slider.getAttribute('value')).toBe('5');
            });
            it('should play a sound if button "Anhören" is clicked on', function() {
                var button = getAudioSampleButton();
                button.click();
                expect(mockedTTSGetLastSpokenTextsJoined()).not.toBeNull();
                mockedTTSClearSpoken();
            });
        });
        it('should render settingsView when user navigates to /settings', function () {
            expect(getPageTitle()).toMatch(/Einstellungen/);
        });
        it('ttsEnabled should be unchecked by default', function() {
            expect(element(by.id('chkTTSEnabled')).getAttribute('checked')).toBeFalsy();
        });
        it('should have default executionViewLayout by default', function() {
            var selectExecutionViewLayout = getSelectExecutionViewLayout();
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('default');
        });
        it('should remember changed settings across page reloads', function() {
            const ttsId = "chkTTSEnabled";
            const ttsToggleSwitch = getToggleSwitchByCheckBoxId(ttsId);
            var selectExecutionViewLayout = getSelectExecutionViewLayout();
            var selectContentAlignment = getSelectContentAlignment();
            expect(getToggleSwitchStatePromiseById(ttsId)).toBe(false);
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('default');
            ttsToggleSwitch.click();
            getSelectOptionByText(selectExecutionViewLayout, 'Flexible Ansicht').click();
            expect(getToggleSwitchStatePromiseById(ttsId)).toBe(true);
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('flex');
            expect(getSelectedOption(selectContentAlignment).getAttribute('value')).toBe('left');
            getSelectOptionByText(selectContentAlignment, 'Rechts').click();
            expect(getSelectedOption(selectContentAlignment).getAttribute('value')).toBe('right');
            browser.refresh();
            expect(getToggleSwitchStatePromiseById(ttsId)).toBe(true);
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('flex');
            expect(getSelectedOption(selectContentAlignment).getAttribute('value')).toBe('right');
            getSelectOptionByText(selectContentAlignment, 'Links').click();
            getSelectOptionByText(selectExecutionViewLayout, 'Standard-Ansicht').click();
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('default');
            ttsToggleSwitch.click();
            expect(getToggleSwitchStatePromiseById(ttsId)).toBe(false);
        });
        it('should show flexContentAlignment select only if executionViewLayout is flex', function() {
            var selectExecutionViewLayout = getSelectExecutionViewLayout();
            var selectContentAlignment = getSelectContentAlignment();
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('default');
            expect(selectContentAlignment.isPresent()).toBeFalsy();
            getSelectOptionByText(selectExecutionViewLayout, 'Flexible Ansicht').click();
            expect(getSelectedOption(selectExecutionViewLayout).getAttribute('value')).toBe('flex');
            expect(selectContentAlignment.isPresent()).toBeTruthy();
            getSelectOptionByText(selectExecutionViewLayout, 'Standard-Ansicht').click();
            expect(selectContentAlignment.isPresent()).toBeFalsy();
        });
        it('should have expected options for calendarEventStaticPostponeDelay', function() {
            const selectElement = getCalendarStaticPostponeDelaySelect();
            const options = selectElement.$$('option');
            expect(options.map((element) => element.getText())).toEqual([
                "1 Minute",
                "5 Minuten",
                "10 Minuten",
                "15 Minuten",
                "30 Minuten",
                "1 Stunde",
            ]);
        });
        it('should show branch and commit information in settings view', function () {
            expect(browser.driver.findElement(by.id("branch")).getText()).toBe("placeholder");
            expect(browser.driver.findElement(by.id("commit")).getText()).toBe("placeholder");
        });
        it('should show browser information in settings view', function () {
            expect(browser.driver.findElement(by.id("browser")).getText()).toContain("Chrome");
        });
        it('should show platform information in settings view', function () {
            expect(browser.driver.findElement(by.id("platform")).getText()).toBeDefined();
        });
        it('should show quota estimate in settings view', function() {
            let progress = $('#settings-quota quota-usage-bar progress');
            let progressLabel = $('#settings-quota quota-usage-bar');
            expect(progress.isPresent()).toBeTruthy();
            expect(progress.isDisplayed()).toBeTruthy();
            browser.wait(() => {
                return progress.getAttribute('value').then(value => value.match(/\d+/));
            }, 5000, "Expected quota progress element to have integer value");
            since("Quota show be displayed in human-readable units").
            expect(progressLabel.getText()).toMatch(/\d+(\.\d{1,2})? (bytes|[KMGT]iB) \/ \d+(\.\d{1,2})? (bytes|[KMGT]iB)/);
            since("progressBar should have some max > 1").
            expect(progress.getAttribute('max').then(parseInt)).toBeGreaterThan(1);
        });

        describe('gamification settings within settingsView', function() {

            beforeEach(function() {
                browser.get('index.html#!/settings');
            });

            function getGamificationToggleSwitch() {
                return element(by.id('chkGamificationEnabled'));
            }

            function getGamificationSettingsButton() {
                return element(by.id('gamificationSettings'));
            }

            beforeEach(function () {
                clearDB('gamificationDB');
                browser.get('index.html#!/settings');
            });

            afterAll(function () {
                settingsSetGamificationEnabled(false);
                clearDB('gamificationDB');
            });

            it('gamificationEnabled should be unchecked by default and expect gamification settings button to be not present', function() {
                expect(getGamificationToggleSwitch().getAttribute('checked')).toBe(null);
                expect(getGamificationSettingsButton().isDisplayed()).toBe(false);
            });
            it('should not show gamification[..]Views if gamificationEnabled is false', () => {
                browser.wait(EC.stalenessOf(getGamificationNavbarFromMenuBar()), 1000, 'navbar should not be visible if gamificationEnabled is false');
            });
            it('should show a settings button in settings view if gamificationEnabled is checked', function() {
                setGamificationEnabled(true);
                expect(getGamificationToggleSwitch().getAttribute('checked')).toBe("true");
                since("Button for GamificationSettingsView should be present").
                expect(getGamificationSettingsButton().isDisplayed()).toBe(true);
            });
            it('should redirect to gamificationSettingsView, if gamification settings button is clicked', function() {
                setGamificationEnabled(true);
                getGamificationSettingsButton().click();
                expect(browser.getCurrentUrl()).toMatch(/\/gamification-settings/);
            });
            it('should persist gamificationEnabled if page is reloaded', () => {
                setGamificationEnabled(true);
                browser.wait(EC.presenceOf(getGamificationSettingsButton()), 1000, 'settings button should be visible');
                browser.refresh();
                browser.wait(EC.presenceOf(getGamificationToggleSwitch()), 1000, 'settings button should still be visible');
                expect(getGamificationToggleSwitch().getAttribute('checked')).toBe("true");
                setGamificationEnabled(false);
                browser.wait(EC.presenceOf(getGamificationSettingsButton()), 1000, 'settings button should not be visible');
                browser.refresh();
                browser.wait(EC.presenceOf(getGamificationToggleSwitch()), 1000, 'settings button should still not be visible');
                expect(getGamificationToggleSwitch().getAttribute('checked')).toBe(null);
            });
            it('should not gain points if gamificationEnabled is false', function() {
                browser.get('index.html#!/overview');
                importTestfile("singleTask.json");

                browser.get('index.html#!/settings');
                setGamificationEnabled(true);
                waitForGamificationNavbarLoaded();
                const expectedPoints = getGamificationNavbarProgressBarPoints();
                setGamificationEnabled(false);

                // exec workflow
                browser.get('index.html#!/overview');
                getStartButton(getWorkflowsForName("Protractor::singleTask").first()).click();
                automateWorkflow([
                    {instruction: 'ok'},
                    {instruction: 'click_label'}
                ]);

                browser.get('index.html#!/settings');
                setGamificationEnabled(true);
                waitForGamificationNavbarLoaded();
                expect(getGamificationNavbarProgressBarPoints()).toEqual(expectedPoints);
            });
        });

        xdescribe('study mode', function() {
            afterEach(() => clearWebStorage());
            const settingsStudyModeDiv = $('div#settings-studyMode');
            const studyParticipateDiv = $('div#settings-study-participate');
            const studyReferenceForm = $('form[name=settingsStudyReferenceForm]');
            const studySelect = studyReferenceForm.$('select#studySelect');
            const studyReferenceText = studyReferenceForm.$('input#textStudyReference');
            const studyEnterButton = studyReferenceForm.element(by.buttonText('an Studie teilnehmen'));
            const studyReferenceInValidation = $('#settings-study-reference-validation');
            const studyReferenceInValidationProgress = studyReferenceInValidation.$('progress');
            const studyReferenceInValidationText = studyReferenceInValidation.element(by.cssContainingText('p', 'Bitte warten... Zugangsschlüssel wird geprüft'));
            const studyMissingReferenceText = studyReferenceForm.element(by.cssContainingText('p.help-block', 'Bitte den Zugangsschlüssel eingeben.'));
            const studyReferenceNotValid = studyReferenceForm.element(by.cssContainingText('span.help-block', 'Fehler: Entered key is not valid!'));
            const studyParticipationText = element(by.cssContainingText('p', /Achtung: Es werden für die Studie (.*) Nutzungsdaten erfasst und aufgezeichnet/));
            beforeEach(function() {
                mockStudyReferences();
            });
            afterAll(function() {
                unmockStudyReferences();
            });
            it('should show study participation if study mode is enabled', function() {
                setStudyMode(true);
                browser.get('index.html#!/settings');
                expect(settingsStudyModeDiv.isDisplayed()).toBe(true);
                expect(studyParticipationText.isDisplayed()).toBe(true);
                expect(studyParticipationText.getText()).toContain("ValidStudy");
                expect(studyParticipateDiv.isPresent()).toBe(false);
                expect(studyReferenceForm.isPresent()).toBe(false);
            });
            it('should not show study participation, but studyReference form, if study mode is disabled', function() {
                setStudyMode(false);
                browser.get('index.html#!/settings');
                expect(settingsStudyModeDiv.isPresent()).toBe(false);
                expect(studyParticipationText.isPresent()).toBe(false);
                expect(studyParticipateDiv.isPresent()).toBe(true);
                expect(studyReferenceForm.isPresent()).toBe(true);
            });
            it('should have study mode disabled by default', function() {
                browser.get('index.html#!/settings');
                expect(settingsStudyModeDiv.isPresent()).toBe(false);
                expect(studyParticipationText.isPresent()).toBe(false);
                expect(studyParticipateDiv.isPresent()).toBe(true);
                expect(studyReferenceForm.isPresent()).toBe(true);
            });

            describe('entering', function() {
                afterEach(() => clearWebStorage());

                function validateStudyReferenceAndCheckProgress() {
                    studyEnterButton.click();
                    browser.wait(EC.and(
                        EC.visibilityOf(studyReferenceInValidation),
                        EC.visibilityOf(studyReferenceInValidationProgress),
                        EC.visibilityOf(studyReferenceInValidationText)
                    ), 1000, "Expected in-progress element for studyReferenceValidation");
                    browser.wait(EC.stalenessOf(studyReferenceInValidation), 5000, "Expected in-progress element to hide after validation.");
                }

                it('should enter study mode with valid study and reference key', function() {
                    browser.get('index.html#!/settings');
                    expect(studySelect.isDisplayed()).toBe(true);
                    expect(studyReferenceText.isDisplayed()).toBe(true);
                    expect(studyReferenceText.getAttribute('type')).toEqual('password');
                    expect(studyEnterButton.isDisplayed()).toBe(true);
                    expect(studyReferenceInValidation.isPresent()).toBe(false);
                    since("By default there should be not study selected").
                    expect(getSelectedOption(studySelect).getText()).toBe('');
                    since("Enter study button should be disabled before form filling").
                    expect(studyEnterButton.isEnabled()).toBe(false);
                    studyReferenceText.sendKeys("xyz");
                    since("Enter study button should be disabled when only reference key is provided").
                    expect(studyEnterButton.isEnabled()).toBe(false);
                    studyReferenceText.clear();
                    since("Error message regarding missing reference key should be shown").
                    expect(studyMissingReferenceText.isDisplayed()).toBe(true);
                    getSelectOptionByText(studySelect, "Test Study").click();
                    since("Enter study button should be disabled before reference key is entered").
                    expect(studyEnterButton.isEnabled()).toBe(false);
                    studyReferenceText.sendKeys("aa");
                    since("Error message regarding missing reference key should be hidden").
                    expect(studyMissingReferenceText.isDisplayed()).toBe(false);
                    since("Enter study button should be enabled when both reference key and study are provided").
                    expect(studyEnterButton.isEnabled()).toBe(true);

                    validateStudyReferenceAndCheckProgress();


                    since("Study participation div should be hidden after entering the study").
                    expect(studyParticipateDiv.isPresent()).toBe(false);
                    since("Study settings div should be shown after entering the study").
                    expect(settingsStudyModeDiv.isDisplayed()).toBe(true);
                    since("Study participation text should be shown").
                    expect(studyParticipationText.isDisplayed()).toBe(true);
                    since("Study participation text should contain the study name").
                    expect(studyParticipationText.getText()).toContain("Test Study");
                });

                it('should inform about invalid reference keys', function() {
                    browser.get('index.html#!/settings');
                    getSelectOptionByText(studySelect, "Test Study").click();
                    studyReferenceText.sendKeys("abcdef");
                    since("Study reference not valid error should not be shown until validation").
                    expect(studyReferenceNotValid.isPresent()).toBe(false);

                    validateStudyReferenceAndCheckProgress();

                    since("Study reference not valid error should be shown").
                    expect(studyReferenceNotValid.isPresent()).toBe(true);
                    since("Study participation div should be still visible").
                    expect(studyParticipateDiv.isDisplayed()).toBe(true);
                    since("Study settings div should not be shown").
                    expect(settingsStudyModeDiv.isPresent()).toBe(false);
                    since("Study participation text should not be shown").
                    expect(studyParticipationText.isPresent()).toBe(false);
                });

            });
        });
        xdescribe('study export', function() {
            const studyDumpDiv = $('div#settings-study-dump');
            const studyInitializingDiv = $('div#settings-study-initializing');
            const studyInitializedDiv = $('div#settings-study-initialized');
            const studyNotInitializedDiv = $('div#settings-study-not-initialized');
            const passPrivateKey = $('input#passPrivateKey');
            const passPrivateKeyRepeat = $('input#passPrivateKeyRepeat');
            const pseudonym = $('#pseudonym');
            const exportPublicKey = element(by.buttonText('Public Key exportieren'));
            const exportStudyData = element(by.buttonText('Studiendaten exportieren'));
            const initStudy = element(by.buttonText('Studiendaten initialisieren'));
            const initProgress = studyInitializingDiv.$('progress');
            const exportProgress = studyInitializedDiv.$('progress');
            const exportInProgressText = studyInitializedDiv.element(by.cssContainingText('div', 'Export läuft...'));
            const errorsPassRequired = filterDisplayed(element.all(by.cssContainingText('p', 'Bitte Passwort eingeben.')));
            const errorsPassLength = filterDisplayed(element.all(by.cssContainingText('p', 'Das Passwort muss min. 8 Zeichen lang sein')));
            const errorsPassMatch = filterDisplayed(element.all(by.cssContainingText('p', 'Beide Passwörter müssen übereinstimmen.')));
            const errorsAll = filterDisplayed($$('.help-block'));
            const studyPassword = 'studp4$$';
            beforeEach(function() {
                mockStudyReferences();
                setStudyMode(true);
                browser.get('index.html#!/settings');
                browser.executeScript("arguments[0].scrollIntoView();", studyDumpDiv.getWebElement());
            });
            afterAll(function() {
                unmockStudyReferences();
                clearWebStorage();
            });
            it('should not show study dump div if study mode is disabled', function() {
                setStudyMode(false);
                browser.get('index.html#!/settings');
                expect(studyDumpDiv.isPresent()).toBe(false);
                expect(studyInitializingDiv.isPresent()).toBe(false);
                expect(studyInitializedDiv.isPresent()).toBe(false);
                expect(studyNotInitializedDiv.isPresent()).toBe(false);
                clearWebStorage();
            });
            it('should show only controls for study initialization at first visit', function() {
                expect(studyDumpDiv.isDisplayed()).toBe(true);
                expect(studyInitializingDiv.isPresent()).toBe(false);
                expect(studyInitializedDiv.isPresent()).toBe(false);
                expect(studyNotInitializedDiv.isDisplayed()).toBe(true);
                expect(passPrivateKey.isDisplayed()).toBe(true);
                expect(passPrivateKeyRepeat.isDisplayed()).toBe(true);
                expect(initStudy.isDisplayed()).toBe(true);
                expect(errorsAll.count()).toBe(0);
                expect(passPrivateKey.getAttribute('required')).toBe("true");
                expect(passPrivateKeyRepeat.getAttribute('required')).toBe("true");
            });
            it('should show an error if the password is not long enough', function() {
                expect(errorsAll.count()).toBe(0);
                expect(errorsPassLength.count()).toBe(0);
                passPrivateKey.sendKeys('a');
                expect(errorsAll.count()).toBe(1);
                expect(errorsPassLength.count()).toBe(1);
                passPrivateKey.sendKeys('234567');
                expect(errorsAll.count()).toBe(1);
                expect(errorsPassLength.count()).toBe(1);
                passPrivateKey.sendKeys('8');
                browser.wait(() => errorsPassLength.count().then((count) => count === 0), 1000, "Expected password length error not to be displayed");
                expect(errorsPassLength.count()).toBe(0);
                passPrivateKey.clear();
            });
            it('should show an error if the passwords were touched but are empty', function() {
                expect(errorsAll.count()).toBe(0);
                expect(errorsPassRequired.count()).toBe(0);
                passPrivateKey.sendKeys('a');
                passPrivateKeyRepeat.sendKeys('a');
                passPrivateKey.clear();
                expect(errorsPassRequired.count()).toBe(1);
                passPrivateKeyRepeat.clear();
                expect(errorsPassRequired.count()).toBe(2);
            });
            it('should show an error if the passwords do not match', function() {
                expect(errorsAll.count()).toBe(0);
                expect(errorsPassMatch.count()).toBe(0);
                passPrivateKey.sendKeys('12345678');
                passPrivateKeyRepeat.sendKeys('12345679');
                expect(errorsPassMatch.count()).toBe(2);
                passPrivateKey.clear();
                passPrivateKeyRepeat.clear();
            });
            it('should initialize study data if password constraints are met and button is pressed', function() {
                passPrivateKey.sendKeys(studyPassword);
                passPrivateKeyRepeat.sendKeys(studyPassword);
                browser.wait(EC.elementToBeClickable(initStudy), 2000, "Expected initStudy button to be clickable.");
                initStudy.click();
                // FIXME: progress div seems to hide too quickly
                // const keyGenElement = studyInitializingDiv.element(by.cssContainingText('p','Bitte warten... Schlüsselpaar wird generiert'));
                // browser.wait(
                //     EC.and(
                //         EC.not(EC.presenceOf(studyNotInitializedDiv)),
                //         EC.visibilityOf(studyInitializingDiv),
                //         EC.visibilityOf(initProgress),
                //         () => initProgress.getAttribute("position").then((position) => position === "-1"),
                //         EC.visibilityOf(keyGenElement)
                //     ), 2000, "Expected study initializED element to show and initializING element to hide");
                browser.wait(EC.visibilityOf(studyInitializedDiv), 30000, "Expected study to have been initialized");
                expect(studyInitializingDiv.isPresent()).toBe(false);
                expect(studyNotInitializedDiv.isPresent()).toBe(false);
            });
            describe('with study initialized', function() {
                beforeEach(function() {
                    expect(studyInitializedDiv.isDisplayed()).toBe(true);
                    expect(studyInitializingDiv.isPresent()).toBe(false);
                    expect(studyNotInitializedDiv.isPresent()).toBe(false);
                });
                it('should display required elements', function() {
                    expect(pseudonym.isDisplayed()).toBe(true);
                    expect(pseudonym.getText()).toMatch(/[0-9a-f]{16}/);
                    expect(exportPublicKey.isDisplayed()).toBe(true);
                    expect(passPrivateKey.isDisplayed()).toBe(true);
                    expect(exportStudyData.isDisplayed()).toBe(true);
                });
                it('should export public key', function() {
                    const fs = require('fs');
                    createCleanTemporaryFolder();
                    exportPublicKey.click();
                    const filenameRegex = /^publicKey-(.*)\.asc$/;
                    let filenames;
                    browser.wait(function () {
                        filenames = fs.readdirSync(downloadFolder).filter((filename) => filename.match(filenameRegex));
                        return filenames.length === 1;
                    }, 1000, `Timeout while waiting for a file matching ${filenameRegex} in ${downloadFolder}`);
                    pseudonym.getText().then((nym) => {
                        let exportFilename = `publicKey-${nym}.asc`;
                        expect(filenames[0]).toBe(exportFilename);
                        const content = fs.readFileSync(downloadFolder+'/'+exportFilename, {encoding: 'utf-8'});
                        expect(content.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')).toBe(true);
                        expect(content.endsWith('-----END PGP PUBLIC KEY BLOCK-----\r\n')).toBe(true);
                    });
                });
                it('should not export study data with invalid password', function() {
                    passPrivateKey.sendKeys('invalidPassword');
                    exportStudyData.click();
                    browser.wait(EC.textToBePresentInElement(studyInitializedDiv, 'Fehler: Incorrect key passphrase'), 5000, 'Expected error message regarding incorrect passphrase');
                    expect(exportStudyData.isDisplayed()).toBe(true);
                });
                xit('should export study data with correct password', function() {
                    const fs = require('fs');
                    createCleanTemporaryFolder();
                    passPrivateKey.clear();
                    passPrivateKey.sendKeys(studyPassword);
                    expect(exportInProgressText.isPresent()).toBe(false);
                    browser.wait(EC.elementToBeClickable(exportStudyData), 2000, "Expected export button to be clickable.");
                    exportStudyData.click();
                    browser.wait(EC.and(EC.visibilityOf(exportProgress), EC.visibilityOf(exportInProgressText)), 2000);
                    browser.wait(EC.and(EC.not(EC.presenceOf(exportProgress))), 10000, 'Expected export to be finished');
                    let filenames;
                    const filenameRegex = /^studyExport-(.*)\.pgp$/;
                    browser.wait(function () {
                        filenames = fs.readdirSync(downloadFolder).filter((filename) => filename.match(filenameRegex));
                        return filenames.length === 1;
                    }, 1000, `Timeout while waiting for a file matching ${filenameRegex} in ${downloadFolder}`);
                    pseudonym.getText().then((nym) => {
                        let exportFilename = `studyExport-${nym}.pgp`;
                        expect(filenames[0]).toBe(exportFilename);
                        const content = fs.readFileSync(downloadFolder+'/'+exportFilename, {encoding: 'utf-8'});
                        expect(content.startsWith('-----BEGIN PGP MESSAGE-----')).toBe(true);
                        expect(content.endsWith('-----END PGP MESSAGE-----\r\n')).toBe(true);
                    });
                });
            });
        });
    });

    describe('gamification', () => {

        function setPointsRecordingSettingTo(enabled) {
            setToggleSwitchByCheckboxId('pointsRecording', enabled);
        }

        function setPointsDisplaySettingTo(enabled) {
            setToggleSwitchByCheckboxId('pointsDisplay', enabled);
        }

        function getPointsRecordingStatePromise() {
            return getToggleSwitchStatePromiseById('pointsRecording');
        }
        function getPointsDisplayStatePromise() {
            return getToggleSwitchStatePromiseById('pointsDisplay');
        }

        describe('gamificationDashboardView', function () {
            const dashboardGlyphicon = $('div[id=gamification-settings-link]');
            const dashboardStatsDiv = $('div[id=dashboard-stats]');
            const dashboardStatsRecordingDisabledHint = $('p[id=dashboard-points-recording-disabled-hint]');
            const dashboardStatsRecordingDisabledHintText = 'Es werden aktuell keine neuen Punkte aufgezeichnet.';
            const dashboardGamificationDisabledHintText = 'Hier würden die Punkte und das Level angezeigt werden, aber diese sind ausgeblendet.';

            beforeEach(function() {
                browser.get('index.html#!/gamification');
            });

            it('should render placeholder dashboard for route `/gamification`', () => {
                expect(getPageTitle()).toMatch(/Gamification Übersicht/);
                browser.wait(EC.visibilityOf(dashboardStatsDiv.$('p')), 500, 'Placeholder text when pointsDisplay is disabled should have been visible');
                expect(dashboardStatsDiv.$('p').getText()).toMatch(dashboardGamificationDisabledHintText);
                expect(dashboardGlyphicon.isDisplayed()).toBe(true)
            });

            describe('with gamification enabled', () => {

                beforeAll(() => {
                    settingsSetGamificationEnabled(true);
                    clearDB('gamificationDB');
                });

                afterEach(() => clearDB('gamificationDB'));

                it('should show properties and match the values from navbar', () => {
                    expect(dashboardGlyphicon.isDisplayed()).toBe(true);
                    browser.wait(EC.stalenessOf(dashboardStatsRecordingDisabledHint), 500, 'Notice should not have been present when pointsRecording is enabled');
                    browser.wait(EC.visibilityOf(dashboardStatsDiv.$('div[id=dashboard-progress]')), 500, 'ProgressBar should have been visible');
                    expect(dashboardStatsDiv.$('label[for=dashboard-points]').getText()).toMatch('Punkte:');
                    expect(dashboardStatsDiv.$('p[id=dashboard-points]').getText()).toMatch('0');
                    expect(dashboardStatsDiv.$('label[for=dashboard-level]').getText()).toMatch('Level:');
                    expect(dashboardStatsDiv.$('p[id=dashboard-level]').getText()).toMatch(getGamificationNavbarLevel());
                    expect(dashboardStatsDiv.$('label[for=dashboard-progress]').getText()).toMatch('Fortschritt:');
                    expect(dashboardStatsDiv.$('div[id=dashboard-progress]').$('div').getAttribute('aria-valuenow')).toMatch(getGamificationNavbarProgressBarPoints());
                });
                it('should open gamificationSettingsView if glyphicon is clicked', () => {
                    dashboardGlyphicon.click();
                    expect(browser.getCurrentUrl()).toMatch(/gamification-settings/);
                });
                it('should show only placeholder text if pointsDisplay is false', () => {
                    browser.get('index.html#!/gamification-settings');
                    setPointsDisplaySettingTo(false);
                    browser.get('index.html#!/gamification');
                    browser.wait(EC.visibilityOf(dashboardStatsDiv.$('p')), 500, 'Placeholder text when pointsDisplay is disabled should have been visible');
                    expect(dashboardStatsDiv.$('p').getText()).toMatch(dashboardGamificationDisabledHintText);
                    browser.get('index.html#!/gamification-settings');
                });
                it('should show only info text if pointsRecording is false', () => {
                    browser.get('index.html#!/gamification-settings');
                    setPointsRecordingSettingTo(false);
                    browser.get('index.html#!/gamification');

                    browser.wait(EC.visibilityOf(dashboardStatsDiv.$('p[id=dashboard-points]')), 500, 'Dashboard Elements should be visible');
                    expect(dashboardStatsDiv.$('p[id=dashboard-points]').isDisplayed()).toBe(true);
                    expect(dashboardStatsDiv.$('p[id=dashboard-level]').isDisplayed()).toBe(true);
                    expect(dashboardStatsDiv.$('div[id=dashboard-progress]').isDisplayed()).toBe(true);
                    browser.wait(EC.visibilityOf(dashboardStatsRecordingDisabledHint), 500, 'Notice when pointsRecording is disabled should have been visible');
                    expect(dashboardStatsRecordingDisabledHint.getText()).toMatch(dashboardStatsRecordingDisabledHintText);

                    browser.get('index.html#!/gamification-settings');
                });
            });

        });

        describe('gamificationSettingsView', function () {
            function waitForGamificationPreviewLoaded() {
                browser.wait(EC.presenceOf(getGamificationPreviewElement()), 1000, "navbar preview should be visible");
            }

            function getGamificationPreviewElement() {
                return filterDisplayed(element.all(by.css('#style-preview'))).first();
            }

            function getGamificationChooserElement() {
                return filterDisplayed(element.all(by.tagName('image-thumbnail-chooser'))).first();
            }

            function getGamificationSelectedIconStyleSrc() {
                const chooserGrid = getGamificationChooserElement().all(by.css('.image-thumbnail-chooser-grid')).first();
                const selectedIconStyleDiv =
                    chooserGrid.all(by.tagName('div')).filter((divElem) => {
                    return divElem.getAttribute("aria-checked").then((ariaChecked) => {
                        return ariaChecked === "true";
                    });
                }).first();

                return selectedIconStyleDiv.all(by.tagName('img')).first().getAttribute('ng-src').then((ngSrc) => {
                    return ngSrc;
                });
            }

            function setGamificationSelectedIconStyleBySrc(wantedSrc) {
                const chooserGrid = getGamificationChooserElement().all(by.css('.image-thumbnail-chooser-grid')).first();
                const wantedIconStyle = chooserGrid.all(by.css('img')).filter((imgElement) => {
                    return imgElement.getAttribute('ng-src').then((ngSrc) => {
                        if (ngSrc === wantedSrc) {
                            return imgElement;
                        }
                    });
                });
                expect(wantedIconStyle.count()).toBe(1);
                wantedIconStyle.click();
            }

            beforeAll(function () {
                settingsSetGamificationEnabled(true);
            });

            beforeEach(function () {
                clearDB('gamificationDB');
                browser.get('index.html#!/gamification-settings');
            });

            afterAll(function () {
                settingsSetGamificationEnabled(false);
                clearDB('gamificationDB');
            });

            it('recording points should be checked by default if gamification is enabled', function () {
                waitForGamificationPreviewLoaded();
                browser.wait(() => getPointsRecordingStatePromise().then((result) => {return result === true}), 1500);
                expect(getPointsRecordingStatePromise()).toBe(true);

            });
            it('showing points should be checked by default if gamification is enabled', function () {
                waitForGamificationPreviewLoaded();
                browser.wait(() => getPointsDisplayStatePromise().then((result) => {return result === true}), 1500);
                expect(getPointsDisplayStatePromise()).toBe(true);
            });
            it('should have bi-star as default default iconStyle', function () {
                waitForGamificationPreviewLoaded();
                const gamificationIconStyleSvgPath = "components/gamification/assets/gamificationIcons.svg#"
                expect(getGamificationSelectedIconStyleSrc()).toEqual(gamificationIconStyleSvgPath + "bi-star");
            });
            it('navbar should have same values as navbar preview', function () {
                browser.get('index.html#!/overview');

                for (let i = 0; i < 2; i++) {
                    const workflow = getWorkflowsForName("Test Workflow").first();
                    getStartButton(workflow).click();
                    waitForExecutionComponentLoaded();
                    automateWorkflow([{instruction: 'click_label'}]);
                }

                browser.get('index.html#!/gamification-settings');
                waitForGamificationNavbarLoaded();
                waitForGamificationPreviewLoaded();

                const navbarPoints = getGamificationNavbarProgressBarPoints();
                const navbarLevel = getGamificationNavbarLevel();
                const navbarIconStyle = getGamificationNavbarIconStyleHref();

                const previewPoints = getGamificationNavbarProgressBarPoints(getGamificationPreviewElement());
                const previewLevel = getGamificationNavbarLevel(getGamificationPreviewElement());
                const previewIconStyle = getGamificationNavbarIconStyleHref(getGamificationPreviewElement());

                expect(navbarPoints).toBeDefined();
                expect(navbarLevel).toBeDefined();
                expect(navbarIconStyle).toBeDefined();
                expect(navbarPoints).not.toBeNull();
                expect(navbarLevel).not.toBeNull();
                expect(navbarIconStyle).not.toBeNull();

                expect(navbarPoints).toEqual(previewPoints);
                expect(navbarLevel).toEqual(previewLevel);
                expect(navbarIconStyle).toEqual(previewIconStyle);
            });
            it('should change the icon in preview and menu navbar if new icon is chosen', function () {
                const gamificationIconStyleSvgPath = "components/gamification/assets/gamificationIcons.svg#"
                const defaultIconStyleSrc = gamificationIconStyleSvgPath + "bi-star";
                const expectedIconStyleSrc = gamificationIconStyleSvgPath + "bi-suit-club";
                waitForGamificationPreviewLoaded();
                waitForGamificationNavbarLoaded();

                browser.wait(EC.visibilityOf(getGamificationChooserElement()), 1000, "iconStyleChooser should be visible");
                expect(getGamificationSelectedIconStyleSrc()).toBe(defaultIconStyleSrc);

                setGamificationSelectedIconStyleBySrc(expectedIconStyleSrc);
                expect(getGamificationSelectedIconStyleSrc()).toBe(expectedIconStyleSrc);

                const previewIconStyle = getGamificationNavbarIconStyleHref(getGamificationPreviewElement());
                const navbarIconStyle = getGamificationNavbarIconStyleHref();
                expect(previewIconStyle).toBe(expectedIconStyleSrc);
                expect(navbarIconStyle).toBe(expectedIconStyleSrc);
            });
            it('should show the preview of the gamification navbar element independent of the choice of recording and showing of points', function () {
                function expectPreviewToBeDisplayed() {
                    browser.wait(EC.visibilityOf(getGamificationPreviewElement()), 1000, "navbar preview should be visible");
                }

                waitForGamificationPreviewLoaded();

                // Case 1: "pointsRecording" on, "pointsDisplay" on
                setPointsRecordingSettingTo(true);
                setPointsDisplaySettingTo(true);
                expectPreviewToBeDisplayed();
                waitForGamificationNavbarLoaded();

                // Case 2: "pointsRecording" off, "pointsDisplay" on
                setPointsRecordingSettingTo(false);
                setPointsDisplaySettingTo(true);
                expectPreviewToBeDisplayed();
                waitForGamificationNavbarLoaded();

                //Case 3: "pointsRecording" on, "pointsDisplay" off
                setPointsRecordingSettingTo(true);
                setPointsDisplaySettingTo(false);
                expectPreviewToBeDisplayed();
                browser.wait(EC.stalenessOf(getGamificationNavbarFromMenuBar()), 1000, "navbar should not be visible");

                //Case 4: "pointsRecording" off, "pointsDisplay" off
                setPointsRecordingSettingTo(false);
                setPointsDisplaySettingTo(false);
                expectPreviewToBeDisplayed();
                browser.wait(EC.stalenessOf(getGamificationNavbarFromMenuBar()), 1000, "navbar should not be visible");
            });
            it('should toggle menu navbar if pointsDisplay is changed', function () {
                setPointsDisplaySettingTo(true);
                browser.wait(EC.visibilityOf(getGamificationNavbarLevelElement()), 1000, "gamificationNavbar should be visible");
                expect(getGamificationNavbarFromMenuBar().isDisplayed()).toBe(true);

                setPointsDisplaySettingTo(false);
                browser.wait(EC.invisibilityOf(getGamificationNavbarFromMenuBar()), 1000, "gamificationNavbar should not be visible");
                expect(getGamificationNavbarFromMenuBar().isPresent()).toBe(false);

                setPointsDisplaySettingTo(true);
                browser.wait(EC.visibilityOf(getGamificationNavbarLevelElement()), 1000, "gamificationNavbar should be visible");
                expect(getGamificationNavbarFromMenuBar().isDisplayed()).toBe(true);
            });
            it('should persist gamificationSettings upon page reload and gamificationEnabled toggle', function () {
                waitForGamificationPreviewLoaded();

                setPointsRecordingSettingTo(false);
                setPointsDisplaySettingTo(true);

                browser.refresh();
                waitForGamificationPreviewLoaded();
                expect(getPointsRecordingStatePromise()).toBe(false);
                expect(getPointsDisplayStatePromise()).toBe(true);

                setPointsRecordingSettingTo(true);
                setPointsDisplaySettingTo(false);

                browser.refresh();
                waitForGamificationPreviewLoaded();
                expect(getPointsRecordingStatePromise()).toBe(true);
                expect(getPointsDisplayStatePromise()).toBe(false);
                expect(getGamificationNavbarFromMenuBar().isPresent()).toBe(false);
            });
            it('should not gain points if pointsRecording is false', function () {
                waitForGamificationPreviewLoaded();
                setPointsRecordingSettingTo(false);

                expect(getGamificationNavbarProgressBarPoints()).toBe("0");

                browser.get('index.html#!/overview');

                const workflow = getWorkflowsForName("Test Workflow").first();
                getStartButton(workflow).click();
                waitForExecutionComponentLoaded();
                automateWorkflow([{instruction: 'click_label'}]);

                expect(getGamificationNavbarProgressBarPoints()).toBe("0");
            });
            it('should not change already collected points if pointsRecording is turned off', function () {
                waitForGamificationNavbarLoaded();
                expect(getGamificationNavbarProgressBarPoints()).toBe("0");

                browser.get('index.html#!/overview');

                const workflow = getWorkflowsForName("Test Workflow").first();
                getStartButton(workflow).click();
                waitForExecutionComponentLoaded();
                automateWorkflow([{instruction: 'click_label'}]);

                const pointsBefore = getGamificationNavbarProgressBarPoints();

                browser.get('index.html#!/gamification-settings');
                waitForGamificationPreviewLoaded();
                setPointsRecordingSettingTo(false);

                expect(getGamificationNavbarProgressBarPoints()).toBe(pointsBefore);
            });
            it('should still collect points if pointsRecording is on but pointsDisplay is off', function() {
                waitForGamificationNavbarLoaded();
                expect(getGamificationNavbarProgressBarPoints()).toBe("0");
                setPointsDisplaySettingTo(false);

                browser.get('index.html#!/overview');
                const workflow = getWorkflowsForName("Test Workflow").first();
                getStartButton(workflow).click();
                waitForExecutionComponentLoaded();

                automateWorkflow([{instruction: 'click_label'}]);

                browser.get('index.html#!/gamification-settings');
                setPointsDisplaySettingTo(true);
                waitForGamificationPreviewLoaded();
                waitForGamificationNavbarLoaded();

                expect(getGamificationNavbarProgressBarPoints()).toBe('15');
                expect(getGamificationNavbarProgressBarPoints(getGamificationPreviewElement())).toBe('15');
            });
        });
    });
});
