"use strict";
describe('rehagoal.restClient', function () {
    var REST_API, Restangular, authService;
    var errorInterceptor, responseInterceptor;

    beforeEach(module('rehagoal.restClient', function($provide) {
        $provide.value('Restangular', {
            setBaseUrl: jasmine.createSpy('setBaseUrl'),
            setRequestSuffix: jasmine.createSpy('setRequestSuffix'),
            setErrorInterceptor: jasmine.createSpy('setErrorInterceptor').and.callFake(function(interceptor) {
                errorInterceptor = interceptor;
            }),
            addResponseInterceptor: jasmine.createSpy('addResponseInterceptor').and.callFake(function(interceptor) {
                responseInterceptor = interceptor;
            })
        });
        $provide.value('authService', {
            logoutWithError: jasmine.createSpy('logoutWithError'),
            requestUserLogin: jasmine.createSpy('requestUserLogin')
        });
    }));
    beforeEach(inject(function (_REST_API_, _Restangular_, _authService_) {
        REST_API = _REST_API_;
        Restangular = _Restangular_;
        authService = _authService_;
    }));

    describe('restClient startup', function() {
        it('should call setBaseUrl with BASE_URL', function() {
            expect(Restangular.setBaseUrl).toHaveBeenCalledWith(REST_API.BASE_URL);
        });
        it('should call setRequestSuffix with "/"', function() {
            expect(Restangular.setRequestSuffix).toHaveBeenCalledWith('/');
        });
        it('should set an error interceptor', function() {
            expect(Restangular.setErrorInterceptor).toHaveBeenCalled();
            expect(errorInterceptor).toBeDefined();
        });
        it('should add a response interceptor', function() {
            expect(Restangular.addResponseInterceptor).toHaveBeenCalled();
            expect(responseInterceptor).toBeDefined();
        });
    });
    describe('errorInterceptor', function() {
        it('should logout the user and request login, if response code is 403', function() {
            expect(errorInterceptor({status: 403}, null, null)).toBe(true);
            expect(authService.logoutWithError).toHaveBeenCalled();
            expect(authService.requestUserLogin).toHaveBeenCalled();
        });
        it('should not do anything for other response codes', function() {
            expect(errorInterceptor({status: 404}, null, null)).toBe(true);
            expect(errorInterceptor({status: 500}, null, null)).toBe(true);
            expect(errorInterceptor({status: 400}, null, null)).toBe(true);
            expect(errorInterceptor({status: 401}, null, null)).toBe(true);
            expect(authService.logoutWithError).not.toHaveBeenCalled();
            expect(authService.requestUserLogin).not.toHaveBeenCalled();
        });
    });
    describe('responseInterceptor', function() {
        it('should handle pagination data for getList operation', function() {
            var dataInput = {
                results: ['a', 'b', {c: 'c'}],
                count: 3,
                previous: null,
                next: null
            };
            var extractedData = responseInterceptor(dataInput, 'getList', null, null, null, null);
            expect(extractedData.hasOwnProperty('count')).toBe(true);
            expect(extractedData.count).toBe(3);
            expect(extractedData.hasOwnProperty('next')).toBe(true);
            expect(extractedData.next).toBe(null);
            expect(extractedData.hasOwnProperty('previous')).toBe(true);
            expect(extractedData.previous).toBe(null);
            expect(extractedData[0]).toBe('a');
            expect(extractedData[1]).toBe('b');
            expect(extractedData[2]).toEqual({c: 'c'});
        });
        it('should forward data if operation is not getList', function() {
            var dataInput = {
                results: ['a', 'b', {c: 'c'}]
            };
            var extractedData = responseInterceptor(dataInput, 'get', null, null, null, null);
            expect(extractedData).toBe(dataInput);
        });
    });
});
