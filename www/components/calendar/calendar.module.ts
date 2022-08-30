module rehagoal.calendar {
    const moduleName = 'rehagoal.calendar';

    export interface CalendarEvent {
        uuid: string,
        date: Date,
        workflowIDs: number[]
    }

    angular.module(moduleName, ['rehagoal.utilities', 'rehagoal.database', 'rehagoal.workflow', 'ngCordova', 'ui.bootstrap', 'angular-web-notification']);
}
