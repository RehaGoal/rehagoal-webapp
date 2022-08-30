"use strict";
const TOKEN_VALID = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IiIsInVzZXJuYW1lIjoiZGVtbyIsInVzZXJfaWQiOjMsImV4cCI6MTQ5MTIwNTgyMX0.sDfuhwkNfvuZs9WzDjo-cdxd13_kQZ4pmUEpFlm4KUA";
const TOKEN_INVALID = "";

describe('rehagoal.auth', function () {
    var $rootScope, $httpBackend, $http, $window, webStorage, REST_API;
    const authTokenStorageKey = 'authToken';

    beforeEach(module('rehagoal.auth'));

    beforeEach(inject(function ( _$rootScope_, _$httpBackend_, _$http_, _$window_, _webStorage_, _REST_API_) {
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        $http = _$http_;
        webStorage = _webStorage_;
        $window = _$window_;

        REST_API = _REST_API_;

        $httpBackend.whenPOST(REST_API.TOKEN_AUTH_URL).respond({token: TOKEN_VALID});
        $httpBackend.whenPOST(REST_API.TOKEN_REFRESH_URL).respond({token: TOKEN_VALID});
        $httpBackend.whenPOST(REST_API.TOKEN_VERIFY_URL).respond({token: TOKEN_VALID});
    }));

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('service: authentication', function() {
        var authService;

        function test_setUserLoggedIn() {
            authService.authToken = TOKEN_VALID;
            authService.userLoggedIn = true;
        }
        function test_isUserLoggedIn() {
            return authService.userLoggedIn && authService.authToken !== null;
        }
        function test_flushHTTPRequests() {
            $httpBackend.flush();
        }

        afterEach(function() {
            $window.localStorage.clear();
        });

        describe('properties and methods', function () {
            beforeEach(inject(function ( _authService_) {
                authService = _authService_;
            }));

            it('should have a private property authToken, default: null', function () {
                expect(authService.authToken).toBeDefined();
                expect(authService.authToken).toBe(null);
            });
            it('should have a private property userLoggedIn, default: false', function () {
                expect(authService.userLoggedIn).toBeDefined();
                expect(authService.userLoggedIn).toBeFalsy();
            });
            it('should have a method login', function () {
                expect(authService.login).toBeDefined();
            });
            it('should have a method logoutWithError and no return value', function () {
                expect(authService.logoutWithError).toBeDefined();
            });
            it('should have a method logout and no return value', function () {
                expect(authService.logout).toBeDefined();
            });
            it('should have a method refreshToken', function () {
                expect(authService.refreshToken).toBeDefined();
            });
            it('should have a method isUserLoggedIn and returns a boolean, default: false', function () {
                expect(authService.isUserLoggedIn).toBeDefined();
                expect(authService.isUserLoggedIn()).toBeFalsy();
            });
            it('should have a method requestUserLogin and no return value', function () {
                expect(authService.requestUserLogin).toBeDefined();
            });
            it('should have a method verifyToken', function () {
                expect(authService.verifyToken).toBeDefined();
            });
            it('should have a method setToken and no return value', function () {
                expect(authService.setToken).toBeDefined();
            });
            it('should have a method handleHTTPPostRequest', function () {
                expect(authService.handleHTTPPostRequest).toBeDefined();
            });
        });

        describe('behaviour and functions', function () {
            beforeEach(inject(function ( _authService_) {
                authService = _authService_;
            }));

            beforeEach(function () {
                spyOn(authService, 'handleHTTPPostRequest').and.callThrough();
                spyOn(authService, 'setToken').and.callThrough();
                spyOn(authService, 'logout').and.callThrough();
            });
            it('should set the user logged in with VALID token response', function () {
                expect(test_isUserLoggedIn()).toBeFalsy();
                authService.login('user', 'pass');
                test_flushHTTPRequests();
                expect(authService.handleHTTPPostRequest).toHaveBeenCalledWith(REST_API.TOKEN_AUTH_URL, {
                    username: 'user',
                    password: 'pass'
                });
                expect(authService.setToken).toHaveBeenCalledWith(TOKEN_VALID);
                expect(test_isUserLoggedIn()).toBeTruthy();
                expect($http.defaults.headers.common.Authorization).toEqual('Bearer ' + TOKEN_VALID);
            });
            it('should NOT set the user logged in with INVALID token response', function () {
                // Return http error page
                $httpBackend.expect("POST", REST_API.TOKEN_AUTH_URL).respond(400);

                expect(test_isUserLoggedIn()).toBeFalsy();
                authService.login('user', 'pass')
                    .then(function() {
                        fail('login should reject if HTTP response is 400');
                    })
                    .catch(function(err) {
                        expect(err).toMatch(/^Server responded with an error \(400\)\.$/);
                    });
                test_flushHTTPRequests();
                expect(authService.handleHTTPPostRequest).toHaveBeenCalledWith(REST_API.TOKEN_AUTH_URL, {
                    username: 'user',
                    password: 'pass'
                });
                expect(authService.logout).toHaveBeenCalled();
                expect(test_isUserLoggedIn()).toBeFalsy();
                expect($http.defaults.headers.common.Authorization).toBeUndefined();
            });
            it('should reset a session if logout is called', function () {
                spyOn(webStorage, 'remove');
                test_setUserLoggedIn();
                expect(test_isUserLoggedIn()).toBeTruthy();
                expect(authService.authToken).toEqual(TOKEN_VALID);

                authService.logout();
                expect(webStorage.remove).toHaveBeenCalledWith(authTokenStorageKey);
                expect(test_isUserLoggedIn()).toBeFalsy();
                expect($http.defaults.headers.common.Authorization).toBeUndefined();
            });
            it('should reset a session with an error broadcast if logoutWithError is called', function () {
                var err = 'some error';
                spyOn($rootScope, '$broadcast');
                test_setUserLoggedIn();
                authService.logoutWithError(err);
                expect(authService.logout).toHaveBeenCalled();
                expect(test_isUserLoggedIn()).toBeFalsy();
                expect($rootScope.$broadcast).toHaveBeenCalled();
            });
            it('should refresh a token if refreshToken is called', function () {
                var requestData = {
                    token: TOKEN_VALID
                };
                authService.refreshToken(TOKEN_VALID);
                test_flushHTTPRequests();
                expect(authService.handleHTTPPostRequest).toHaveBeenCalledWith(REST_API.TOKEN_REFRESH_URL, requestData);
            });
            it('should verify a token if verifyToken is called', function () {
                var requestData = {
                    token: TOKEN_VALID
                };
                authService.verifyToken(TOKEN_VALID);
                test_flushHTTPRequests();
                expect(authService.handleHTTPPostRequest).toHaveBeenCalledWith(REST_API.TOKEN_VERIFY_URL, requestData);
            });
            it('should check if isUserLoggedIn returns the correct argument', function () {
                expect(authService.isUserLoggedIn()).toEqual(authService.userLoggedIn);
                test_setUserLoggedIn();
                expect(authService.isUserLoggedIn()).toEqual(authService.userLoggedIn);
            });
            it('should check if a broadcast with deferred is send after requestUserLogin is called', function () {
                var myDeferred;
                const eventType = 'loginModal.openModalEvent';
                spyOn($rootScope, '$broadcast').and.callFake(function(event, deferred) {
                    if (event === eventType) {
                        myDeferred = deferred;
                    }
                });
                var promise = authService.requestUserLogin();
                expect($rootScope.$broadcast).toHaveBeenCalledWith(eventType, jasmine.anything());
                expect(myDeferred).toBeDefined();
                expect(promise).toBeDefined();
                expect(promise).toBe(myDeferred.promise);
            });
            it('should set a token with setToken and store it to the webStorage', function () {
                var tokenList = [
                    TOKEN_VALID,
                    TOKEN_INVALID
                ];
                spyOn(webStorage, 'set');
                for (var token in tokenList) {
                    authService.setToken(token);
                    expect(webStorage.set).toHaveBeenCalledWith("authToken", token);
                    expect(authService.authToken).toEqual(token);
                }
            });
        });

        describe('constructor', function() {
            it('should load token from webStorage, if valid', function() {
                spyOn(webStorage, 'has').and.callFake(function(key) {
                    return key === "authToken";
                });
                spyOn(webStorage, 'get').and.callFake(function(key) {
                    if (key === "authToken") {
                        return TOKEN_VALID;
                    }
                });
                spyOn(webStorage, 'remove');
                var tokenData = {
                    token: TOKEN_VALID
                };
                $httpBackend.expect("POST", REST_API.TOKEN_VERIFY_URL, tokenData).respond(200, tokenData);
                inject(function ( _authService_) {
                    authService = _authService_;
                });
                spyOn(authService, 'setToken');
                expect(webStorage.has).toHaveBeenCalledWith(authTokenStorageKey);
                expect(webStorage.get).toHaveBeenCalledWith(authTokenStorageKey);
                test_flushHTTPRequests();
                expect(authService.setToken).toHaveBeenCalledWith(TOKEN_VALID);
                expect(webStorage.remove).not.toHaveBeenCalled();
            });
            it('should delete token from webStorage, if invalid', function() {
                spyOn(webStorage, 'has').and.callFake(function(key) {
                    return key === authTokenStorageKey;
                });
                spyOn(webStorage, 'get').and.callFake(function(key) {
                    if (key === authTokenStorageKey) {
                        return TOKEN_INVALID;
                    }
                });
                spyOn(webStorage, 'remove');
                var tokenData = {
                    token: TOKEN_INVALID
                };
                $httpBackend.expect("POST", REST_API.TOKEN_VERIFY_URL, tokenData).respond(400, tokenData);
                inject(function ( _authService_) {
                    authService = _authService_;
                });

                spyOn(authService, 'setToken');

                expect(webStorage.has).toHaveBeenCalledWith(authTokenStorageKey);
                expect(webStorage.get).toHaveBeenCalledWith(authTokenStorageKey);
                test_flushHTTPRequests();
                expect(authService.setToken).not.toHaveBeenCalledWith(TOKEN_INVALID);
                expect(webStorage.remove).toHaveBeenCalledWith(authTokenStorageKey);
            });
            it('should not set a token, if webStorage does not have a token stored', function() {
                spyOn(webStorage, 'has').and.returnValue(false);
                spyOn(webStorage, 'get');
                spyOn(webStorage, 'remove');
                inject(function ( _authService_) {
                    authService = _authService_;
                });
                spyOn(authService, 'setToken');

                expect(webStorage.has).toHaveBeenCalledWith(authTokenStorageKey);
                expect(webStorage.get).not.toHaveBeenCalledWith(authTokenStorageKey);
                expect(authService.setToken).not.toHaveBeenCalledWith(TOKEN_INVALID);
                expect(webStorage.remove).not.toHaveBeenCalledWith(authTokenStorageKey);
            });
        });
    });
});
