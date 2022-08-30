declare module rehagoal.workflow {
    import TimeBase = rehagoal.utilities.TimeBase;

    interface IExecutionCountdownService {
        startCountdown(time: number, time_base: TimeBase): void
        stopCountdown(): void
        setCountdownCallback(callback: (time: number) => void): void
    }
}
