import { TodoService } from "../src/core/TodoService";
import { InMemoryTodoRepository } from "../src/infra/InMemoryTodoRepository";
import { InMemoryUserRepository } from "../src/infra/InMemoryUserRepository";
import { User } from "../src/domain/User";

describe("TodoService", () => {
  let todoService: TodoService;
  let todoRepo: InMemoryTodoRepository;
  let userRepo: InMemoryUserRepository;
  let testUser: User;

  beforeEach(async () => {
    todoRepo = new InMemoryTodoRepository();
    userRepo = new InMemoryUserRepository();
    todoService = new TodoService(todoRepo, userRepo);

    // Create a test user
    testUser = await userRepo.create({
      email: "test@example.com",
      name: "Test User",
    });
  });

  describe("createTodo - happy path", () => {
    it("should create a todo with valid data", async () => {
      const todoData = {
        userId: testUser.id,
        title: "Buy groceries",
        description: "Milk, eggs, bread",
      };

      const todo = await todoService.createTodo(todoData);

      expect(todo).toBeDefined();
      expect(todo.id).toBeDefined();
      expect(todo.userId).toBe(testUser.id);
      expect(todo.title).toBe("Buy groceries");
      expect(todo.description).toBe("Milk, eggs, bread");
      expect(todo.status).toBe("PENDING");
      expect(todo.createdAt).toBeInstanceOf(Date);
      expect(todo.updatedAt).toBeInstanceOf(Date);
    });

    it("should create a todo with reminder date", async () => {
      const remindAt = new Date(Date.now() + 3600000); // 1 hour from now
      const todoData = {
        userId: testUser.id,
        title: "Call dentist",
        remindAt: remindAt.toISOString(),
      };

      const todo = await todoService.createTodo(todoData);

      expect(todo.remindAt).toBeDefined();
      expect(todo.remindAt?.getTime()).toBe(remindAt.getTime());
    });
  });

  describe("createTodo - edge cases", () => {
    it("should reject todo with empty title", async () => {
      const todoData = {
        userId: testUser.id,
        title: "",
        description: "This should fail",
      };

      await expect(todoService.createTodo(todoData)).rejects.toThrow();
    });

    it("should reject todo with whitespace-only title", async () => {
      const todoData = {
        userId: testUser.id,
        title: "   ",
        description: "This should also fail",
      };

      await expect(todoService.createTodo(todoData)).rejects.toThrow();
    });

    it("should reject todo for non-existent user", async () => {
      const todoData = {
        userId: "non-existent-user-id",
        title: "This should fail",
        description: "User does not exist",
      };

      await expect(todoService.createTodo(todoData)).rejects.toThrow();
    });
  });

  describe("completeTodo - happy path", () => {
    it("should mark a pending todo as done", async () => {
      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Task to complete",
      });

      const completed = await todoService.completeTodo(todo.id);

      expect(completed.status).toBe("DONE");
      expect(completed.updatedAt.getTime()).toBeGreaterThan(
        todo.updatedAt.getTime()
      );
    });

    it("should be idempotent when completing already done todo", async () => {
      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Task to complete",
      });

      const completed1 = await todoService.completeTodo(todo.id);
      const completed2 = await todoService.completeTodo(todo.id);

      expect(completed2.status).toBe("DONE");
      expect(completed2.id).toBe(completed1.id);
    });
  });

  describe("processReminders - happy path", () => {
    it("should mark due reminders as REMINDER_DUE", async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Overdue task",
        remindAt: pastDate.toISOString(),
      });

      await todoService.processReminders();

      const todos = await todoService.getTodosByUser(testUser.id);
      const processedTodo = todos.find((t) => t.id === todo.id);

      expect(processedTodo?.status).toBe("REMINDER_DUE");
    });

    it("should not process future reminders", async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Future task",
        remindAt: futureDate.toISOString(),
      });

      await todoService.processReminders();

      const todos = await todoService.getTodosByUser(testUser.id);
      const processedTodo = todos.find((t) => t.id === todo.id);

      expect(processedTodo?.status).toBe("PENDING");
    });
  });

  describe("processReminders - edge cases", () => {
    it("should ignore DONE todos when processing reminders", async () => {
      const pastDate = new Date(Date.now() - 3600000);

      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Completed task with past reminder",
        remindAt: pastDate.toISOString(),
      });

      await todoService.completeTodo(todo.id);
      await todoService.processReminders();

      const todos = await todoService.getTodosByUser(testUser.id);
      const processedTodo = todos.find((t) => t.id === todo.id);

      // Should remain DONE, not changed to REMINDER_DUE
      expect(processedTodo?.status).toBe("DONE");
    });

    it("should be idempotent - processing reminders multiple times", async () => {
      const pastDate = new Date(Date.now() - 3600000);

      const todo = await todoService.createTodo({
        userId: testUser.id,
        title: "Task with reminder",
        remindAt: pastDate.toISOString(),
      });

      await todoService.processReminders();
      const todos1 = await todoService.getTodosByUser(testUser.id);
      const todo1 = todos1.find((t) => t.id === todo.id);

      await todoService.processReminders();
      const todos2 = await todoService.getTodosByUser(testUser.id);
      const todo2 = todos2.find((t) => t.id === todo.id);

      // Should be the same after multiple processings
      expect(todo2?.status).toBe("REMINDER_DUE");
      expect(todo2?.status).toBe(todo1?.status);
    });
  });

  describe("getTodosByUser - happy path", () => {
    it("should return all todos for a user", async () => {
      await todoService.createTodo({
        userId: testUser.id,
        title: "Task 1",
      });

      await todoService.createTodo({
        userId: testUser.id,
        title: "Task 2",
      });

      const todos = await todoService.getTodosByUser(testUser.id);

      expect(todos).toHaveLength(2);
      expect(todos.every((t) => t.userId === testUser.id)).toBe(true);
    });

    it("should return empty array for user with no todos", async () => {
      const anotherUser = await userRepo.create({
        email: "another@example.com",
        name: "Another User",
      });

      const todos = await todoService.getTodosByUser(anotherUser.id);

      expect(todos).toHaveLength(0);
    });
  });
});
