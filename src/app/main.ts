import { InMemoryUserRepository } from "../infra/InMemoryUserRepository";
import { InMemoryTodoRepository } from "../infra/InMemoryTodoRepository";
import { SimpleScheduler } from "../infra/SimpleScheduler";
import { TodoService } from "../core/TodoService";
import { createHttpServer } from "../infra/http/Server";

async function bootstrap() {
  // 1. Instantiate dependencies
  const userRepo = new InMemoryUserRepository();
  const todoRepo = new InMemoryTodoRepository();
  const scheduler = new SimpleScheduler();
  const todoService = new TodoService(todoRepo, userRepo);

  // 2. Schedule background job for reminders
  const reminderIntervalMs = 15000; // 15 seconds
  scheduler.scheduleRecurring("process-due-reminders", reminderIntervalMs, () =>
    todoService.processReminders()
  );

  // 3. Create and start HTTP server
  const app = createHttpServer(todoService, userRepo);
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`🚀 HTTP server listening on http://localhost:${port}`);
    console.log(`📝 API endpoints are now available.`);
    console.log(`⏰ Reminder processing job scheduled to run every ${reminderIntervalMs / 1000} seconds.`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    scheduler.stopAll();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Fatal error during application bootstrap:", error);
  process.exit(1);
});
