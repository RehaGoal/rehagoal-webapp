'use strict';

describe('Settings module', function () {
    var $componentController, $rootScope, $q, storageManager;
    var storageSpy;
    var $window;
    beforeEach(module('rehagoal.utilities'));
    beforeEach(module('rehagoal.settings'));

    beforeEach(module(function($provide) {
        $provide.decorator('$window', function($delegate) {
            storageSpy = spyOnProperty($delegate.navigator, 'storage', 'get').and.callThrough();
            return $delegate;
        });
    }));

    beforeEach(inject(function (_$componentController_, _$rootScope_, _$q_, _$window_) {
        $componentController = _$componentController_;
        $rootScope = _$rootScope_;
        $q = _$q_;
        // Inject $window to make sure that storageSpy is initialized properly.
        $window = _$window_;
    }));

    describe('quotaUsageBar controller', function () {
        var $scope;
        var ctrl;

        beforeEach(function () {
            $scope = $rootScope.$new();
        });

        describe('properties and methods', function () {
            beforeEach(function() {
                ctrl = $componentController('quotaUsageBar', {$scope: $scope}, {});
            });
            it('should have a public method "updateQuotaEstimate"', function() {
                expect(ctrl.updateQuotaEstimate).toBeDefined();
                expect(ctrl.updateQuotaEstimate).toEqual(jasmine.any(Function));
            });
        });

        describe('functional behaviour', function() {
            beforeEach(function() {
                storageSpy.and.callThrough();
                inject(function (_storageManager_) {
                    storageManager = _storageManager_;
                });
            });
            it('should update quota estimate in the constructor', function() {
                var usage = 123;
                var quota = 1000;
                var estimate = {usage: usage, quota: quota};
                spyOn(storageManager, 'estimate').and.callFake(function() {
                    return $q.resolve(estimate);
                });
                ctrl = $componentController('quotaUsageBar', {$scope: $scope}, {});
                $rootScope.$apply();
                expect(storageManager.estimate).toHaveBeenCalled();
                expect(ctrl.usage).toBe(usage);
                expect(ctrl.quota).toBe(quota);
                expect(ctrl.supported).toBe(true);
            });
            it('should update quota estimate when calling updateQuoteEstimate', function() {
                spyOn(storageManager, 'estimate');
                var usage1 = 123;
                var quota1 = 1000;
                var estimate = {usage: usage1, quota: quota1};
                storageManager.estimate.and.returnValue($q.resolve(estimate));
                ctrl = $componentController('quotaUsageBar', {$scope: $scope}, {});
                $rootScope.$apply();
                expect(storageManager.estimate).toHaveBeenCalled();
                expect(ctrl.usage).toBe(usage1);
                expect(ctrl.quota).toBe(quota1);
                expect(ctrl.supported).toBe(true);

                var usage2 = 42;
                var quota2 = 980;
                estimate = {usage: usage2, quota: quota2};
                storageManager.estimate.and.returnValue($q.resolve(estimate));
                ctrl.updateQuotaEstimate();
                expect(ctrl.usage).toBe(usage1);
                expect(ctrl.quota).toBe(quota1);
                expect(ctrl.supported).toBe(true);
                $rootScope.$apply();
                expect(ctrl.usage).toBe(usage2);
                expect(ctrl.quota).toBe(quota2);
                expect(ctrl.supported).toBe(true);
            });
        });
        describe('fallback handling', function() {
            beforeEach(function() {
                storageSpy.and.stub();
            });
            it('should use fallback values, if storage manager is not available', function() {
                ctrl = $componentController('quotaUsageBar', {$scope: $scope}, {});
                expect(ctrl.usage).toBe(-1);
                expect(ctrl.quota).toBe(-1);
                expect(ctrl.supported).toBe(false);
            });
        });
    });
});
