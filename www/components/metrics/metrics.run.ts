module rehagoal.metrics {
    const moduleName = 'rehagoal.metrics';
    angular.module(moduleName)
        .run(['$log', 'metricService', function($log: angular.ILogService, metricService: MetricRegistry) {
            /**
             *
             * # RecordPoints
             *
             *
             *
             * workflowStart:
             *                @description Execution of a workflow starts.
             *                @implementation Execution of the workflow starts in executionComponent, i.e. shortly after
             *                `workflowExecution.start()`. May currently happen independent of the view, i.e.
             *                both executionView and schedulingView are affected.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowEnd:
             *                @description Execution of the workflow has been successfully completed, i.e. the user has completed all
             *                required tasks.
             *                @implementation `workflowExecution.executionFinished` has changed to true.
             *                NOT: When the user clicks 'ENDE'.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowAbort:
             *                @description Execution of the workflow has been actively aborted, i.e. the workflow was
             *                not finished yet but the execution was cancelled.
             *                @implementation `workflowExecution.executionFinished = false` and the executionComponent
             *                is destroyed. This is not recorded if e.g. the app restarts or the site reloads.
             *                @assignment workflow, workflowVersion, execution
             *
             * notificationReminder:
             *                @description Notification would occur, independent of whether a modal is visible. This
             *                means that the user does not have to accept an old notification and that these kind of
             *                notifications are received in a regular interval unless the workflow has advanced or
             *                timers are reset (i.e. by confirming a modal).
             *                @implementation This is implemented by listening on the `executionTimerEvent`.
             *                @assignment workflow, workflowVersion, execution, task
             *
             * reminderAccept:
             *                @description The user has accepted the notification modal, i.e closed it using the OK
             *                button.
             *                @implementation This is implemented by listening on the
             *                `executionComponent.reminderConfirmed` event, which is broadcasted by `executionView`
             *                if the `infoModal` is confirmed.
             *                @assignment workflow, workflowVersion, execution, task
             *
             * blockAccept_withAcceptedReminder:
             *                @description The user has completed a block in the workflowExecution by an interaction
             *                (answering a question, completing a task in the main flow) and a reminder was accepted
             *                during this block.
             *                @implementation
             *                This includes the block types
             *                - `Conditional` (while/if blocks, when answering the question)
             *                - `Parallel` (when the block is left)
             *                - `Simple` (simple tasks, when the task is completed)
             *                NOT: `TimerSleepBlock`, miniTasks (inside `ParallelBlock`s)
             *                The implementation checks for the block types when leaving a block (`onLeave`).
             *                Furthermore `reminderAcceptedInCurrentBlock` in executionComponent is used to track
             *                notifications on `reminderAccept` and leaving blocks in `onLeave`.
             *                @assignment workflow, workflowVersion, execution, task
             *
             * scheduleStart:
             *                @description A schedule has been started.
             *                @implementation `startScheduler` has been called with `schedulerRunning` = `false` before
             *                the call.
             *                @assignment schedule
             *
             * scheduleAbort:
             *                @description A schedule has been actively aborted by the user.
             *                @implementation `stopScheduler` was called with `schedulerRunning = `true` and an
             *                `activeWorkflow` present. This can happen if
             *                - the user clicks the abort button of the schedulingView
             *                - the user leaves the scheduling view by navigating using single-page application navigation
             *                  (i.e. site does not reload and app is not closed)
             *                @assignment schedule
             *
             * scheduleStart_numInstancesWorkflow:
             *                @description  A schedule has been started (see `scheduleStart`).
             *                @value This records a value for the integer number of instances of the assigned workflow
             *                       in the scheduled workflow instances. In other words: For each workflow, the number
             *                       of scheduled instances is recorded.
             *                @implementation This is handled immediately before `schedulerRunning` changes from `false`
             *                to `true`, i.e. before `toggleScheduler`. For each workflow type in the scheduler, a
             *                separate value is recorded.
             *                @assignment schedule, workflow
             *
             * scheduleWorkflowEnd_numInstancesWorkflow:
             *                @description A workflow in a schedule has been finished successfully (see `workflowEnd`).
             *                @value This records a value for the integer number of successfully completed instances
             *                @implementation This is handled by the `onWorkflowFinish` event bound to the
             *                `executionComponent`. NOT: When the user clicks 'ENDE' (see `workflowEnd`).
             *                @assignment schedule, workflow
             *
             * scheduleEnd_numInstances:
             *                @description A schedule has been successfully completed,
             *                @implementation There are no scheduled workflow instances left and `scheduleRunning` will
             *                change from `true` to `false` immediately after this. This is checked in `nextSchedule`.
             *                @value This records a value for the integer number of instances completed (= scheduled) in
             *                this schedule.
             *                @assignment schedule
             *
             * workflowStart_ttsSpeed:
             *                @description A workflow has been started (see `workflowStart`) with TTS enabled.
             *                @value This records the speed setting of the text-to-speech (TTS) engine. This is a zero-
             *                based index with a maximum of 4, though this is currently not validated in the
             *                settingsService.
             *                @implementation value = `settingsService.currentTTSSpeedIndex`
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowEnd_withTTS:
             *                @description A workflow has been successfully completed (see `workflowEnd`) with
             *                text-to-speech enabled.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowAbort_withTTS:
             *                @description A workflow has been actively aborted by the user (see `workflowAbort`)
             *                with text-to-speech enabled.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowEnd_withoutTTS:
             *                @description A workflow has been successfully completed (see `workflowEnd`) with
             *                text-to-speech disabled.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowAbort_withoutTTS:
             *                @description A workflow has been actively aborted by the user (see `workflowAbort`) with
             *                text-to-speech disabled.
             *                @assignment workflow, workflowVersion, execution
             *
             * workflowAbort_task:
             *                @description A workflow has been actively aborted by the user (see `workflowAbort`).
             *                @value This records the integer id of the task which was active at the time the workflow
             *                was aborted.
             *                @assignment workflow, workflowVersion, execution
             *
             * taskStart_(+Image,-Text,-TTS)
             * taskStart_(+Image,+Text,-TTS)
             * taskStart_(-Image,+Text,-TTS)
             * taskStart_(+Image,-Text,+TTS)
             * taskStart_(+Image,+Text,+TTS)
             * taskStart_(-Image,+Text,+TTS):
             *                @description A (simple) task of a certain kind has started, i.e. is shown as active task
             *                to the user. This does not necessarily mean that the user has started working on it.
             *                The kind of task is described by flags (true/false) indicated by the record point:
             *                * Image: The task [has (+) / does not have (-)] an image.
             *                * Text: The task [has (+) / does not have (-)] a non-empty text (description).
             *                * TTS: The task [has (+) / does not have (-)] TTS enabled
             *                       (currently either enabled/disabled for the whole workflow).
             *                @assignment workflow, workflowVersion, execution, task
             *                @implementation This is recorded when a simple task block is entered.
             *
             * taskEnd_(+Image,-Text,-TTS)
             * taskEnd_(+Image,+Text,-TTS)
             * taskEnd_(-Image,+Text,-TTS)
             * taskEnd_(+Image,-Text,+TTS)
             * taskEnd_(+Image,+Text,+TTS)
             * taskEnd_(-Image,+Text,+TTS):
             *                @description A (simple) task of a certain kind has finished, i.e. was marked as done by
             *                the user. The kinds of task are explained in `taskStart_(...)`.
             *                @assignment workflow, workflowVersion, execution, task
             *                @implementation This is recorded when a simple task block is left.
             *
             * blockEnter:
             *                @description A block in the execution component of one of the following types is entered
             *                (became the current block): Simple Task, Question, Parallel, Sleep
             *                @assignment workflow, workflowVersion, execution, task
             *                @implementation This record point is recorded in the onBlockEntered function of executionComponent,
             *                which is a listener for the workflow execution onEntered event.
             *
             * blockLeave:
             *                @description A block in the execution component of one of the following types is being
             *                left (is the current block but is left): Simple Task, Question, Parallel, Sleep
             *                @assignment workflow, workflowVersion, execution, task
             *                @implementation This record point is recorded in the onLeaveBlock function of executionComponent,
             *                which is a listener for the workflow execution onLeave event.
             */


            $log.debug('Registering metrics...');
            let metricDefinitions: {[id: string]: MetricDefinition} = {
                m1: {
                    name: 'Anzahl Workflow-Ausführungen pro Workflow',
                    type: 'int',
                    recordPoints: ['workflowStart'],
                    constValue: 1,
                    assignment: ['workflow'],
                    snapshots: 1,
                    agg: {
                        operation: 'sum',
                        time: 'all',
                    }
                },
                m2: {
                    name: 'Anzahl Workflow-Ausführungen pro Workflow pro Woche',
                    type: 'int',
                    recordPoints: ['workflowStart'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: 'sum',
                        time: 'week',
                    }
                },
                m2a: {
                    name: 'Anzahl Workflow-Ausführungen pro Workflow pro Tag',
                    type: 'int',
                    recordPoints: ['workflowStart'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: 'sum',
                        time: 'day',
                    }
                },
                m3: {
                    name: 'Anzahl abgeschlossener Workflow-Ausführungen pro Workflow',
                    type: 'int',
                    recordPoints: ['workflowEnd'],
                    constValue: 1,
                    assignment: ['workflow'],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: 'all',
                    }
                },
                m4: {
                    name: 'Anzahl abgeschlossener Workflow-Ausführungen pro Workflow pro Woche',
                    type: 'int',
                    recordPoints: ['workflowEnd'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: 'sum',
                        time: 'week',
                    }
                },
                m4a: {
                    name: 'Anzahl abgeschlossener Workflow-Ausführungen pro Workflow pro Tag',
                    type: 'int',
                    recordPoints: ['workflowEnd'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: 'sum',
                        time: 'day',
                    }
                },
                m5: {
                    name: 'Anzahl (aktiv) abgebrochener Workflow-Ausführungen pro Workflow',
                    type: 'int',
                    recordPoints: ['workflowAbort'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: "all",
                    }
                },
                m6: {
                    name: 'Anzahl (aktiv) abgebrochener Workflow-Ausführungen pro Workflow pro Woche',
                    type: 'int',
                    recordPoints: ['workflowAbort'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: "sum",
                        time: "week",
                    }
                },
                m6a: {
                    name: 'Anzahl (aktiv) abgebrochener Workflow-Ausführungen pro Workflow pro Tag',
                    type: 'int',
                    recordPoints: ['workflowAbort'],
                    constValue: 1,
                    assignment: ["workflow"],
                    snapshots: "inf",
                    agg: {
                        operation: "sum",
                        time: "day",
                    }
                },
                m7: {
                    name: 'Zeit pro abgeschlossener Workflow-Ausführung',
                    type: 'duration',
                    durationAccuracy: [1, 's'],
                    recordStart:'workflowStart',
                    recordStop: 'workflowEnd',
                    clearIncompleteEvents: ['workflowAbort', 'workflowStart'],
                    handleIncomplete: "ignore",
                    assignment: ['workflow', 'execution'],
                    snapshots: "inf",
                },
                m8: {
                    name: 'Zeit pro (aktiv) abgebrochener Workflows-Ausführung',
                    type: 'duration',
                    durationAccuracy: [1, 's'],
                    recordStart:'workflowStart',
                    recordStop: 'workflowAbort',
                    clearIncompleteEvents: ['workflowEnd', 'workflowStart'],
                    handleIncomplete: "ignore",
                    assignment: ['workflow', 'execution'],
                    snapshots: "inf",
                },
                m9: {
                    name: 'Anzahl Erinnerungen pro Ausführung eines Workflows',
                    type: 'int',
                    constValue: 1,
                    recordPoints: ['notificationReminder'], //Wenn Handy-Notification kommt (nicht Dialog)
                    assignment: ['workflow', 'execution'],
                    snapshots: 1,
                    agg: {
                        operation: 'sum',
                        time: 'all',
                    }
                },
                // New metric as base for m9a and m9b
                m9c_private: {
                    name: 'Anzahl der Erinnerungen pro Task pro Ausführung eines Workflows',
                    type: 'int',
                    private: true,
                    constValueMap: {
                        'notificationReminder': 1,
                        'blockEnter': 0,
                    },
                    recordPoints: ['notificationReminder', 'blockEnter'],
                    deleteSnapshotsEvents: ['workflowEnd', 'workflowAbort'],
                    assignment: ['workflow', 'execution', 'task'], //Wenn Handy-Notification kommt (nicht Dialog)
                    snapshots: 1,
                    agg: {
                        operation: 'sum',
                        time: 'all',
                    }
                },
                /* TODO: Check if fixed:
                          This only counts tasks where a notification occurred. This means that tasks without a notification
                 *        are ignored, therefore the minimum is always >0. If we would change the recordPoints to e.g.
                 *        include `blockAccept`, this would not fully solve the problem, since if we get a notifcation
                 *        at some point, the minimum will again always be >0:
                 *          Min([]) => NaN
                 *          Min([1, 1, 2, 1]) => 1  // Tasks without reminders are excluded as there was no recordPoint
                 */
                m9a: {
                    name: 'Minimale Anzahl der Erinnerungen pro Task pro Ausführung eines Workflows',
                    type: 'meta',
                    metaReference: 'Anzahl der Erinnerungen pro Task pro Ausführung eines Workflows',
                    recordPoints: ['notificationReminder', 'blockLeave'], //Wenn Handy-Notification kommt (nicht Dialog)
                    assignment: ['workflow', 'execution'],
                    snapshots: 1,
                    agg: {
                        operation: 'min',
                        time: 'all',
                    }
                },
                // TODO: Check if fixed:
                //       For m9b the issue (see m9a) could be fixed by adding blockAccept as a recordPoint (and possibly
                //       changing the default return value for Min([]) to 0 instead of NaN? Otherwise recorded value
                //       will be null, which however could be mapped afterwards to 0.
                //       E.g. Max([]) => NaN; Max([1]) => 1. In this case it does not matter whether we ignore tasks
                //       without reminders, since we are always searching for the maximum.
                m9b: {
                    name: 'Maximale Anzahl der Erinnerungen pro Task pro Ausführung eines Workflows',
                    type: 'meta',
                    metaReference: 'Anzahl der Erinnerungen pro Task pro Ausführung eines Workflows',
                    recordPoints: ['notificationReminder', 'blockLeave'], //Wenn Handy-Notification kommt (nicht Dialog)
                    assignment: ['workflow', 'execution'],
                    snapshots: 1,
                    agg: {
                        operation: 'max',
                        time: 'all',
                    }
                },
                m10: {
                    // TODO: Change name? only within a task (block has not changed)
                    name:'Durchschnittliche Zeit zwischen Bestätigen letzter Erinnerung und Abhaken eines Tasks pro Ausführung eines Workflows',
                    type: 'duration',
                    exportOrder: true, // nur ein snapshot => reihenfolge der executions?
                    durationAccuracy: [1, 's'],
                    recordStart: 'reminderAccept',
                    recordStop: 'blockAccept_withAcceptedReminder', //(Fragen, Aufgaben, Komplette parallele Aufgaben, NICHT Warteblock)
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'execution'],
                    snapshots: 1,
                    agg: {
                        operation: "average",
                        durationAccuracy: [1, 's'],
                        time: "all"
                    }
                },
                m11_private: {
                    // TODO: Check if fixed: Ignores tasks without reminders
                    name: 'Anzahl der bestätigten Erinnerungen pro Task pro Ausführung eines Workflows',
                    private: true,
                    type: 'int',
                    constValueMap: {
                        'reminderAccept': 1,
                        'blockEnter': 0,
                    },
                    recordPoints: ['reminderAccept', 'blockEnter'], //(Fragen, Aufgaben, Komplette parallele Aufgaben, Warteblock)
                    deleteSnapshotsEvents: ['workflowEnd', 'workflowAbort'],
                    assignment: ['workflow', 'execution', 'task'],
                    snapshots: 'inf',
                    agg: {
                        operation: 'sum',
                        time: 'all'
                    }
                },
                m11: {
                    // TODO: Check if fixed: only counts tasks which had at least one reminder
                    name: 'Durchschnittliche Anzahl der bestätigten Erinnerungen pro Task pro Ausführung eines Workflows',
                    type: 'meta',
                    exportOrder: true, // nur ein snapshot => reihenfolge der executions?
                    metaReference: 'Anzahl der bestätigten Erinnerungen pro Task pro Ausführung eines Workflows',
                    recordPoints: ['reminderAccept', 'blockEnter'], //(Fragen, Aufgaben, Komplette parallele Aufgaben, Warteblock)
                    assignment: ['workflow', 'execution'],
                    snapshots: 1,
                    agg: {
                        operation: 'average',
                        time: 'all'
                    }
                },
                m12: {
                    name: 'Anzahl gestarteter Ablaufplanungen pro Woche',
                    type: 'int',
                    constValue: 1,
                    recordPoints: ['scheduleStart'],
                    assignment: [],
                    snapshots: "inf",
                    agg: {
                        operation: "sum",
                        time: "week"
                    }
                },
                m13: {
                    name: 'Anzahl (aktiv) abgebrochener Ablaufplanungen pro Woche',
                    type: 'int',
                    constValue: 1,
                    recordPoints: ['scheduleAbort'],
                    assignment: [],
                    snapshots: "inf",
                    agg: {
                        operation: "sum",
                        time: "week"
                    }
                },
                m14: {
                    name: 'Anzahl hinzugefügter Instanzen eines Workflows zu einer gestarteten Ablaufplanung',
                    type: 'int',
                    recordPoints: ['scheduleStart_numInstancesWorkflow'],
                    assignment: ["schedule", "workflow"],
                    snapshots: "inf",
                },
                m15: {
                    name: 'Anzahl abgeschlossener Instanzen eines Workflows in einer Ablaufplanung',
                    type: 'int',
                    recordPoints: ['scheduleWorkflowEnd_numInstancesWorkflow'],
                    assignment: ["schedule", "workflow"],
                    snapshots: 1,
                },
                m16: {
                    name: 'Anzahl der Workflow-Instanzen in der Ablaufplanung pro abgeschlossener Ablaufplanung',
                    type: 'int',
                    recordPoints: ['scheduleEnd_numInstances'],
                    assignment: ["schedule"],
                    snapshots: "inf",
                },
                m17: {
                    name: 'Durchschnittliche Geschwindigkeit der Sprachausgabe in Workflow-Ausführungen pro Patient',
                    type: 'float',
                    recordPoints: ['workflowStart_ttsSpeed'],
                    assignment: [],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m18: {
                    name: 'Anzahl abgeschlossener Workflow-Ausführungen mit aktivierter Sprachausgabe',
                    type: 'int',
                    recordPoints: ['workflowEnd_withTTS'],
                    constValue: 1,
                    assignment: [],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: 'all',
                    }
                },
                m19: {
                    name: 'Anzahl (aktiv) abgebrochener Workflow-Ausführungen mit aktivierter Sprachausgabe',
                    type: 'int',
                    recordPoints: ['workflowAbort_withTTS'],
                    constValue: 1,
                    assignment: [],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: 'all',
                    }
                },
                m20: {
                    name: 'Anzahl abgeschlossener Workflow-Ausführungen mit deaktivierter Sprachausgabe',
                    type: 'int',
                    recordPoints: ['workflowEnd_withoutTTS'],
                    constValue: 1,
                    assignment: [],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: 'all',
                    }
                },
                m21: {
                    name: 'Anzahl (aktiv) abgebrochener Workflow-Ausführungen mit deaktivierter Sprachausgabe',
                    type: 'int',
                    recordPoints: ['workflowAbort_withoutTTS'],
                    constValue: 1,
                    assignment: [],
                    snapshots: 1,
                    agg: {
                        operation: "sum",
                        time: 'all',
                    }
                },
                m22: {
                    name: 'Tasknummer bei der abgebrochen wurde pro abgebrochener Workflow-Ausführung',
                    type: 'int',
                    exportOrder: true,
                    recordPoints: ['workflowAbort_task'],
                    assignment: ['workflow', 'execution'],
                    snapshots: 'inf',
                },
                m23: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks mit Bildern ohne Text ohne TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(+Image,-Text,-TTS)',
                    recordStop: 'taskEnd_(+Image,-Text,-TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m24: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks mit Bildern und Text ohne TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(+Image,+Text,-TTS)',
                    recordStop: 'taskEnd_(+Image,+Text,-TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m25: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks ohne Bilder mit Text ohne TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(-Image,+Text,-TTS)',
                    recordStop: 'taskEnd_(-Image,+Text,-TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m26: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks mit Bildern ohne Text mit TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(+Image,-Text,+TTS)',
                    recordStop: 'taskEnd_(+Image,-Text,+TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m27: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks mit Bildern und Text mit TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(+Image,+Text,+TTS)',
                    recordStop: 'taskEnd_(+Image,+Text,+TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
                m28: {
                    name: 'Durchschnittliche Zeit zur Bearbeitung von Tasks ohne Bilder mit Text mit TTS pro Workflow-Version',
                    type: 'duration',
                    recordStart: 'taskStart_(-Image,+Text,+TTS)',
                    recordStop: 'taskEnd_(-Image,+Text,+TTS)',
                    clearIncompleteEvents: ['workflowEnd', 'workflowAbort'],
                    handleIncomplete: 'ignore',
                    assignment: ['workflow', 'workflowVersion'],
                    snapshots: 1,
                    agg: {
                        time: 'all',
                        operation: 'average',
                    }
                },
            };

            const origMetricNameToMetric = new Map<string, MetricDefinition>();

            // Build map of original metric names & update names
            for (const metricId in metricDefinitions) {
                if (metricDefinitions.hasOwnProperty(metricId)) {
                    const metricName = metricDefinitions[metricId].name;
                    if (origMetricNameToMetric.has(metricName)) {
                        throw new Error(`Found duplicate name for Metric '${metricName}'.`);
                    }
                    origMetricNameToMetric.set(metricName, metricDefinitions[metricId]);
                    // Prepend metric id before name
                    metricDefinitions[metricId].name = `[${metricId}] ${metricDefinitions[metricId].name}`;
                }
            }

            // Update names in metaReference fields & register metric
            for (const metricId in metricDefinitions) {
                if (metricDefinitions.hasOwnProperty(metricId)) {
                    const metricDefinition = metricDefinitions[metricId];
                    if (metricDefinition.type === 'meta') {
                        const referencedMetric = origMetricNameToMetric.get(metricDefinition.metaReference);
                        if (!referencedMetric) {
                            throw new Error(`Referenced metric '${metricDefinition.metaReference}' does not exist.`);
                        }
                        metricDefinition.metaReference = referencedMetric.name;
                    }
                    metricService.register(metricDefinitions[metricId]);
                }
            }
        }]);
}