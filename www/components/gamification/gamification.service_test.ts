module rehagoal.gamification {
    import GamificationStatsEntry = rehagoal.database.GamificationStatsEntry;
    import GamificationDB = rehagoal.database.GamificationDB;
    import assertUnreachable = rehagoal.utilities.assertUnreachable;
    import expectThrowsAsync = rehagoal.testUtilities.expectThrowsAsync;

    describe('rehagoal.gamification', () => {
        let gamificationService: IGamificationService;
        let $rootScope: angular.IRootScopeService;
        let mockGamificationDatabaseService: jasmine.SpyObj<GamificationDB>;
        let mockGamificationSettingsService: jasmine.SpyObj<GamificationSettingsService>;
        const GamificationPointsBaseMultiplier = 25;
        const defaultStats: GamificationStats = {
            points: 0,
            level: 1,
            levelBorder: {minPoints: 0, maxPoints: GamificationPointsBaseMultiplier}
        };

        beforeEach(angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
            mockGamificationDatabaseService = jasmine.createSpyObj('gamificationDBService', [
                'getStats',
                'updateStats'
            ]);
            mockGamificationDatabaseService.getStats.and.returnValue(Promise.resolve({
                points: defaultStats.points,
                level: defaultStats.level
            }));
            mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                'isPointsRecordingEnabled',
                'isPointsDisplayEnabled',
                'getIconStyle',
                'getDifficulty'
            ]);
            $provide.value('gamificationDBService', mockGamificationDatabaseService);
            $provide.value('gamificationSettingsService', mockGamificationSettingsService);
        }));

        describe('gamificationService with valid points', () => {

            beforeEach(inject((_gamificationService_: IGamificationService,
                               _$rootScope_: angular.IRootScopeService) => {
                gamificationService = _gamificationService_;
                $rootScope = _$rootScope_;
            }));

            it('getStats: should return default gamification statistics object consisting of points, level, and levelBorders, when no previous gamification events happened', async (done: DoneFn) => {
                expect(gamificationService.getStats).toBeDefined();
                expect(await gamificationService.getStats()).toEqual(defaultStats);
                done();
            });

            describe('handling of gamification events', () => {

                it('should process GamificationEvents successfully when handleGamificationEvent is called with any GamificationEventType', async (done: DoneFn) => {
                    for (const handleEvent in GamificationEventType) {
                        await tryOrFailAsync(() => gamificationService.handleGamificationEvent(GamificationEventType[handleEvent]));
                    }
                    done();
                });
                it('should reject an event that is invalid / not allowed for processing', async (done: DoneFn) => {
                    await expectThrowsAsync(() => gamificationService.handleGamificationEvent("taskdone" as GamificationEventType), /line of code should never execute/);
                    await expectThrowsAsync(() => gamificationService.handleGamificationEvent(null as unknown as GamificationEventType), /line of code should never execute/);
                    done();
                });

                describe('with PointEvents', () => {
                    let rootScopeBroadcastSpy: jasmine.Spy;
                    const pointsTaskDone: number = 1;
                    const pointsWorkflowStart: number = 5;
                    const pointsWorkflowFinish: number = 10;
                    let dbPointStats: GamificationStatsEntry;

                    beforeEach(() => {
                        dbPointStats = {points: defaultStats.points, level: defaultStats.level};
                        mockGamificationDatabaseService.getStats.and.callFake(() => Promise.resolve<GamificationStatsEntry>({
                            points: dbPointStats.points,
                            level: dbPointStats.level
                        }));
                        mockGamificationDatabaseService.updateStats.and.callFake(async (statsFunction: (oldStats: GamificationStatsEntry) => Promise<GamificationStatsEntry>) => {
                            const newStats = statsFunction({points: dbPointStats.points, level: dbPointStats.level});
                            dbPointStats = await newStats;
                            return Promise.resolve<GamificationStatsEntry>({
                                points: dbPointStats.points,
                                level: dbPointStats.level
                            });
                        });
                        mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(true);
                        rootScopeBroadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();
                    });

                    async function executePointsEventAndGetExpectedPoints(event: GamificationEventType): Promise<number> {
                        let expectedPoints: number = dbPointStats.points;

                        switch (event) {
                            case GamificationEventType.TASK_DONE:
                                expectedPoints += pointsTaskDone;
                                break;
                            case GamificationEventType.WORKFLOW_START:
                                expectedPoints += pointsWorkflowStart;
                                break;
                            case GamificationEventType.WORKFLOW_FINISH:
                                expectedPoints += pointsWorkflowFinish;
                                break;
                            default:
                                assertUnreachable(event);
                        }

                        await gamificationService.handleGamificationEvent(event);
                        const actualStats: GamificationStats = await gamificationService.getStats();
                        expect(mockGamificationDatabaseService.updateStats).toHaveBeenCalled();
                        expect(actualStats.points).toEqual(expectedPoints);
                        return expectedPoints;
                    }

                    it('should not add points if the gamification feature is disabled within the settingsService', async (done: DoneFn) => {
                        mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(false);
                        await gamificationService.handleGamificationEvent(GamificationEventType.TASK_DONE);
                        await gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_START);
                        await gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_FINISH);
                        expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT);
                        expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_LEVEL_UP_EVENT);
                        done();
                    });
                    it('should add points for event: TASK_DONE', async (done: DoneFn) => {
                        const points = await executePointsEventAndGetExpectedPoints(GamificationEventType.TASK_DONE);
                        const stats: GamificationStats = {
                            points: points,
                            level: dbPointStats.level,
                            levelBorder: defaultStats.levelBorder
                        };
                        expect(await gamificationService.getStats()).toEqual(stats);
                        expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: points} as GamificationStatsPoints);
                        done();
                    });
                    it('should add points for event: WORKFLOW_START', async (done: DoneFn) => {
                        const points = await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_START);
                        const stats: GamificationStats = {
                            points: points,
                            level: dbPointStats.level,
                            levelBorder: defaultStats.levelBorder
                        };
                        expect(await gamificationService.getStats()).toEqual(stats);
                        expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: points} as GamificationStatsPoints);
                        done();
                    });
                    it('should add points for event: WORKFLOW_FINISH', async (done: DoneFn) => {
                        const points = await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                        const stats: GamificationStats = {
                            points: points,
                            level: dbPointStats.level,
                            levelBorder: defaultStats.levelBorder
                        };
                        expect(await gamificationService.getStats()).toEqual(stats);
                        expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: points} as GamificationStatsPoints);
                        done();
                    });
                    describe('gamificationService with valid overwritten points', () => {

                        it('should broadcast only `GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT` when level has not changed', async (done: DoneFn) => {
                            const points = await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            const stats: GamificationStats = {
                                points: points,
                                level: dbPointStats.level,
                                levelBorder: defaultStats.levelBorder
                            };
                            expect(await gamificationService.getStats()).toEqual(stats);
                            expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: points} as GamificationStatsPoints);
                            expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, jasmine.anything());
                            done();
                        });
                        it('should increase the level if LevelProgressBorders have been reached', async (done: DoneFn) => {
                            // simple level up - points: 20 -> 30, lvl 1 -> 2
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_START);
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_START);

                            let expectedPoints = await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            let expectedStats: GamificationStats = {
                                points: expectedPoints,
                                level: dbPointStats.level,
                                levelBorder: {
                                    minPoints: GamificationPointsBaseMultiplier + 1,
                                    maxPoints: GamificationPointsBaseMultiplier * 2
                                }
                            };
                            expect(await gamificationService.getStats()).toEqual(expectedStats);
                            expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: expectedPoints} as GamificationStatsPoints);
                            expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_LEVEL_UP_EVENT, {
                                level: expectedStats.level,
                                levelBorder: expectedStats.levelBorder
                            } as GamificationStatsLevelWithBorder);

                            // increase level significantly
                            for (let i = 0; i < 10; i++) {
                                await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            }
                            expect(await gamificationService.getStats()).toEqual({
                                points: 130,
                                level: 6,
                                levelBorder: {minPoints: 126, maxPoints: 150}
                            });
                            done();
                        });
                        it('should not decrease the level if progress has been adjusted (e.g. difficulty)', async (done: DoneFn) => {
                            dbPointStats = {points: 24, level: 2};
                            expect(await gamificationService.getStats()).toEqual({
                                points: 24,
                                level: 2,
                                levelBorder: {minPoints: 26, maxPoints: 50}
                            });
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.TASK_DONE);
                            expect(await gamificationService.getStats()).toEqual({
                                points: 25,
                                level: 2,
                                levelBorder: {minPoints: 26, maxPoints: 50}
                            });
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.TASK_DONE);
                            expect(await gamificationService.getStats()).toEqual({
                                points: 26,
                                level: 2,
                                levelBorder: {minPoints: 26, maxPoints: 50}
                            });
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_START);
                            await executePointsEventAndGetExpectedPoints(GamificationEventType.WORKFLOW_FINISH);
                            expect(await gamificationService.getStats()).toEqual({
                                points: 51,
                                level: 3,
                                levelBorder: {minPoints: 51, maxPoints: 75}
                            });
                            done();
                        });
                    });
                });
            });
        });
        describe('gamificationService with invalid points', () => {
            let rootScopeBroadcastSpy: jasmine.Spy;
            let dbPointStats: GamificationStatsEntry;

            beforeEach(angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
                mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                    'isPointsRecordingEnabled'
                ]);
                $provide.value('gamificationSettingsService', mockGamificationSettingsService);
                $provide.value('gamificationPointsEventMapping', {
                    [GamificationEventType.TASK_DONE]: 0,
                    [GamificationEventType.WORKFLOW_START]: Number.NaN,
                    [GamificationEventType.WORKFLOW_FINISH]: -0.5
                });
            }));

            beforeEach(inject((_gamificationService_: IGamificationService,
                               _$rootScope_: angular.IRootScopeService) => {
                gamificationService = _gamificationService_;
                $rootScope = _$rootScope_;
                rootScopeBroadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();
                mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(true);
                dbPointStats = {points: defaultStats.points, level: defaultStats.level};
            }));

            it('should skip adding points for zero', async (done: DoneFn) => {
                await expectThrowsAsync(() => gamificationService.handleGamificationEvent(GamificationEventType.TASK_DONE), /Points must be greater than zero/);
                expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT);
                done();
            });
            it('should skip adding points for NaN', async (done: DoneFn) => {
                await expectThrowsAsync(() => gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_START), /Points has to be a valid number/);
                expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT);
                done();
            });
            it('should skip adding points for negative points', async (done: DoneFn) => {
                await expectThrowsAsync(() => gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_FINISH), /Points must be greater than zero/);
                expect(rootScopeBroadcastSpy).not.toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT);
                done();
            });
        });

        describe('gamificationService with valid overwritten points', () => {
            let rootScopeBroadcastSpy: jasmine.Spy;
            let dbPointStats: GamificationStatsEntry;

            beforeEach(angular.mock.module('rehagoal.gamification', ($provide: angular.auto.IProvideService) => {
                mockGamificationSettingsService = jasmine.createSpyObj('gamificationSettingsService', [
                    'isPointsRecordingEnabled'
                ]);
                $provide.value('gamificationSettingsService', mockGamificationSettingsService);
                $provide.value('gamificationPointsEventMapping', {
                    [GamificationEventType.TASK_DONE]: 10,
                    [GamificationEventType.WORKFLOW_START]: 100,
                    [GamificationEventType.WORKFLOW_FINISH]: 250,
                });
            }));

            beforeEach(inject((_gamificationService_: IGamificationService,
                               _$rootScope_: angular.IRootScopeService) => {
                gamificationService = _gamificationService_;
                $rootScope = _$rootScope_;
                rootScopeBroadcastSpy = spyOn($rootScope, '$broadcast').and.callThrough();
                mockGamificationSettingsService.isPointsRecordingEnabled.and.returnValue(true);
                dbPointStats = {points: defaultStats.points, level: defaultStats.level};
                mockGamificationDatabaseService.getStats.and.callFake(() => Promise.resolve<GamificationStatsEntry>({
                    points: dbPointStats.points,
                    level: dbPointStats.level
                }));
                mockGamificationDatabaseService.updateStats.and.callFake(async (statsFunction: (oldStats: GamificationStatsEntry) => Promise<GamificationStatsEntry>) => {
                    const newStats = statsFunction({points: dbPointStats.points, level: dbPointStats.level});
                    dbPointStats = await newStats;
                    return Promise.resolve<GamificationStatsEntry>({
                        points: dbPointStats.points,
                        level: dbPointStats.level
                    });
                });
            }));

            it('should add points for event: TASK_DONE', async (done: DoneFn) => {
                await gamificationService.handleGamificationEvent(GamificationEventType.TASK_DONE);
                expect(await gamificationService.getStats()).toEqual(jasmine.objectContaining({
                    points: 10,
                }));
                expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: 10} as GamificationStatsPoints);
                done();
            });
            it('should add points for event: WORKFLOW_START', async (done: DoneFn) => {
                await gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_START);
                expect(await gamificationService.getStats()).toEqual(jasmine.objectContaining({
                    points: 100,
                }));
                expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: 100} as GamificationStatsPoints);
                done();
            });
            it('should add points for event: WORKFLOW_FINISH', async (done: DoneFn) => {
                await gamificationService.handleGamificationEvent(GamificationEventType.WORKFLOW_FINISH);
                expect(await gamificationService.getStats()).toEqual(jasmine.objectContaining({
                    points: 250
                }));
                expect(rootScopeBroadcastSpy).toHaveBeenCalledWith(GAMIFICATION_UPDATE_POINTS_INCREASED_EVENT, {points: 250} as GamificationStatsPoints);
                done();
            });
        });
    });
}
