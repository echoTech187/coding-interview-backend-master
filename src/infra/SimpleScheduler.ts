import { IScheduler } from "../core/IScheduler";

export class SimpleScheduler implements IScheduler {
  private intervals = new Map<string, NodeJS.Timeout>();

  scheduleRecurring(
    name: string,
    intervalMs: number,
    fn: () => void | Promise<void>
  ): void {
    // If a task with the same name already exists, stop it before starting a new one.
    if (this.intervals.has(name)) {
      this.stop(name);
    }

    const interval = setInterval(() => {
      try {
        console.log(`[Scheduler] Running task: ${name}`);
        const result = fn();
        // If the function returns a promise, attach a catch block to handle async errors.
        if (result && typeof result.catch === "function") {
          result.catch((error) => {
            console.error(`[Scheduler] Error in async task '${name}':`, error);
          });
        }
      } catch (error) {
        // Handle synchronous errors in the task function.
        console.error(`[Scheduler] Error in sync task '${name}':`, error);
      }
    }, intervalMs);

    this.intervals.set(name, interval);
  }

  stop(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      console.log(`[Scheduler] Stopped task: ${name}`);
    }
  }

  stopAll(): void {
    for (const name of this.intervals.keys()) {
      this.stop(name);
    }
  }
}
