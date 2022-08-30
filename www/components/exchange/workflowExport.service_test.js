"use strict";

describe('service: WorkflowExportService', function() {
    var workflowExportService;
    var mockImageService, mockWorkflowService, $q, $rootScope, hashFile, readFileAsText;

    beforeEach(module('rehagoal.exchange', function ($provide) {
        mockImageService = jasmine.createSpyObj('imageService', [
            'getWorkflowImagesForIds',
            'loadImageHashToDataUriMap'
        ]);
        mockWorkflowService = jasmine.createSpyObj('workflowService', [
            'getWorkflowById',
            'getVersion'
        ]);
        $provide.value('imageService', mockImageService);
        $provide.value('workflowService', mockWorkflowService);
    }));

    beforeEach(function() {
        installPromiseMatchers({
            flushHttpBackend: false,
            flushInterval: false,
            flushTimeout: false
        });
    });

    beforeEach(inject(function (_workflowExportService_, _$q_, _$rootScope_, _hashFile_, _readFileAsText_) {
        workflowExportService = _workflowExportService_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        hashFile = _hashFile_;
        readFileAsText = _readFileAsText_;
    }));

    describe('properties and methods', function () {
        it('should be defined', function () {
            expect(workflowExportService).toBeDefined();
        });
        it('should have a method getSerializedWorkflows', function () {
            expect(workflowExportService.getSerializedWorkflows).toBeDefined();
        });
    });
    describe('behaviour and functions', function () {
        var imgName = 'imageName';
        var imgHash = 'imageHash';
        var imageMap = {1: [{name: imgName, hash: imgHash}]};
        var dataMap = {imageHash: 'data'};
        var workflow1 = {id: 1, name: 'workflowName'};
        var workflow2 = {id: 2, name: 'workflow2'};
        var workflowIds = [workflow1.id, workflow2.id];
        var version = 1;

        describe('getSerializedWorkflows functionality', function () {
            var expectedSerializedWorkflows;

            beforeEach(function () {
                expectedSerializedWorkflows = {
                    version: version,
                    workflows: [workflow1],
                    images: dataMap
                };

                spyOn(angular, 'toJson').and.callThrough();
                mockWorkflowService.getWorkflowById.and.returnValue(workflow1);
                mockWorkflowService.getVersion.and.returnValue(version);
            });
            it('should check that the blob constructor is used to mitigate cordova-plugin-file issues', function (done) {
                var blobSpy = spyOn(window, "Blob");
                mockImageService.getWorkflowImagesForIds.and.returnValue(Promise.resolve(imageMap));
                mockImageService.loadImageHashToDataUriMap.and.returnValue(Promise.resolve(dataMap));
                workflowExportService.getSerializedWorkflows([workflow1.id]).then(function () {
                    expect(blobSpy).toHaveBeenCalled();
                    done();
                });
            });
            it('should return a new blob file for the serialized workflows', function () {
                mockImageService.getWorkflowImagesForIds.and.returnValue($q.resolve(imageMap));
                mockImageService.loadImageHashToDataUriMap.and.returnValue($q.resolve(dataMap));

                var promise = workflowExportService.getSerializedWorkflows([workflow1.id]);
                expect(promise).toBePromise();
                expect(promise).toBeResolvedWith(jasmine.any(Blob));
                expect(mockImageService.getWorkflowImagesForIds).toHaveBeenCalledWith([workflow1.id]);
                expect(mockImageService.loadImageHashToDataUriMap).toHaveBeenCalledWith(imageMap);
                expect(mockWorkflowService.getWorkflowById).toHaveBeenCalledWith(workflow1.id);
                workflow1.images = {imageName: imgHash};
                expect(angular.toJson).toHaveBeenCalledWith(expectedSerializedWorkflows);
            });
            it('should generate a blob with expected hash containing the serialized workflows', function (done) {
                mockImageService.getWorkflowImagesForIds.and.returnValue(Promise.resolve(imageMap));
                mockImageService.loadImageHashToDataUriMap.and.returnValue(Promise.resolve(dataMap));
                workflow1.images = {imageName: imgHash};
                var workflowJson = angular.toJson(expectedSerializedWorkflows);
                var expectedBlob = new Blob([workflowJson], {type: "application/json;charset=utf-8;"});
                hashFile(expectedBlob).then(function (expectedHash) {
                    workflowExportService.getSerializedWorkflows([workflow1.id]).then(hashFile).then(function (blobHash) {
                        expect(blobHash).toEqual(expectedHash);
                        done();
                    });
                });
            });
            it('should return a blob with type json', function(done) {
                mockImageService.getWorkflowImagesForIds.and.returnValue(Promise.resolve(imageMap));
                mockImageService.loadImageHashToDataUriMap.and.returnValue(Promise.resolve(dataMap));
                workflowExportService.getSerializedWorkflows([workflow1.id]).then(function (blob) {
                    expect(blob).toBeDefined();
                    expect(blob.type).toBeDefined();
                    expect(blob.type).toEqual("application/json;charset=utf-8;");
                    done();
                });
            });
            it('should return a new blob file containing no serialized images', function (done) {
                expectedSerializedWorkflows.images = {};
                workflow1.images = {};
                var expectedResult = angular.toJson(expectedSerializedWorkflows);
                mockImageService.getWorkflowImagesForIds.and.returnValue(Promise.resolve({1: []}));
                mockImageService.loadImageHashToDataUriMap.and.returnValue(Promise.resolve({}));
                workflowExportService.getSerializedWorkflows([workflow1.id]).then(readFileAsText).then(function (content) {
                   expect(content).toEqual(expectedResult);
                   done();
                });
            });
            it('should reject the serialization if no workflow could be found for given ids', function () {
               mockImageService.getWorkflowImagesForIds.and.returnValue($q.reject());
               expect(workflowExportService.getSerializedWorkflows([])).toBeRejected();
               expect(workflowExportService.getSerializedWorkflows(null)).toBeRejected();
               expect(workflowExportService.getSerializedWorkflows()).toBeRejected();
            });
            it('should get all workflows from workflowService if the provided workflow id contains images', function () {
                mockImageService.getWorkflowImagesForIds.and.returnValue($q.resolve({1: [{}], 2: [{}]}));
                mockWorkflowService.getWorkflowById.and.returnValues(workflow1, workflow2);
                mockImageService.loadImageHashToDataUriMap.and.returnValue($q.reject());

                var promise = workflowExportService.getSerializedWorkflows(workflowIds);
                expect(promise).toBeRejected();

                expect(mockWorkflowService.getWorkflowById).not.toHaveBeenCalledWith(0);
                expect(mockWorkflowService.getWorkflowById).toHaveBeenCalledWith(workflowIds[0]);
                expect(mockWorkflowService.getWorkflowById).toHaveBeenCalledWith(workflowIds[1]);
            });
            it('should reject the promise if an error occurred during getWorkflowByID', function (done) {
                mockImageService.getWorkflowImagesForIds.and.returnValue(Promise.resolve(imageMap));
                mockWorkflowService.getWorkflowById.and.returnValue(null);
                workflowExportService.getSerializedWorkflows([workflow1.id]).then(function () {
                    fail('expected promise to be rejected');
                    done();
                }, function (reason) {
                    expect(reason).toEqual('Workflow could not been loaded');
                    done();
                });
            });
        });
    });
});
