'use strict';

describe('GalleryController', function () {
    var $componentController, $log, scope;

    beforeEach(module('rehagoal.galleryhelp'));
    beforeEach(inject(function ($controller) {
        $componentController = function() {
            return $controller('GalleryController', {
                '$scope': scope
            });
        };
    }));

    beforeEach(inject(function (_$log_) {
        $log = _$log_;
    }));


    afterEach(function () {
        $log.info.logs.forEach(function (x) {
            console.info(x);
        });
    });

    describe('galleryhelp controller', function () {

        it('controller should be defined', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl).toBeDefined();
        }));

        it('controller should have a property "imagesOverview"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.imagesOverview).toBeDefined();
        }));

        it('controller should have a property "imagesEditView"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.imagesEditView).toBeDefined();
        }));

        it('controller should have a property "imagesExecutionView"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.imagesExecutionView).toBeDefined();
        }));

        it('controller should have a method "openLightboxOverview"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.openLightboxOverview).toBeDefined();
        }));

        it('controller should have a method "openLightboxEditView"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.openLightboxEditView).toBeDefined();
        }));

        it('controller should have a method "openLightboxExecutionView"', inject(function () {
            var galleryViewCtrl = $componentController();
            expect(galleryViewCtrl.openLightboxExecutionView).toBeDefined();
        }));
    });
});