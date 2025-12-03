export interface IScheduler {
  scheduleRecurring(
    name: string,
    intervalMs: number,
    fn: () => void | Promise<void>
  ): void;
  stop(name: string): void;
}
