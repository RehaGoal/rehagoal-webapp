"use strict";
describe('rehagoal.restClientConfig', function () {
    var REST_API;

    beforeEach(module('rehagoal.restClientConfig'));

    beforeEach(inject(function (_REST_API_) {
        REST_API = _REST_API_;
    }));

    describe('configuration', function() {
        describe('definitions', function() {
            it('should have BASE_URL defined', function() {
                expect(REST_API.BASE_URL).toBeDefined();
            });
            it('should have TOKEN_AUTH_URL defined', function() {
                expect(REST_API.TOKEN_AUTH_URL).toBeDefined();
            });
            it('should have TOKEN_VERIFY_URL defined', function() {
                expect(REST_API.TOKEN_VERIFY_URL).toBeDefined();
            });
            it('should have TOKEN_REFRESH_URL defined', function() {
                expect(REST_API.TOKEN_REFRESH_URL).toBeDefined();
            });
        });
        describe('security', function() {
            it('BASE_URL should be HTTPS', function() {
                expect(REST_API.BASE_URL).toMatch(/^https:\/\//);
            });
            it('TOKEN_AUTH_URL should be HTTPS', function() {
                expect(REST_API.TOKEN_AUTH_URL).toMatch(/^https:\/\//);
            });
            it('TOKEN_VERIFY_URL should be HTTPS', function() {
                expect(REST_API.TOKEN_VERIFY_URL).toMatch(/^https:\/\//);
            });
            it('TOKEN_REFRESH_URL should be HTTPS', function() {
                expect(REST_API.TOKEN_REFRESH_URL).toMatch(/^https:\/\//);
            });
        });
    });
});
