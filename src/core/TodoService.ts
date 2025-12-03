import { Todo } from "../domain/Todo";
import { ITodoRepository } from "./ITodoRepository";
import { IUserRepository } from "./IUserRepository";

interface CreateTodoData {
  userId: string;
  title: string;
  description?: string;
  remindAt?: string | Date;
}

export class TodoService {
  constructor(
    private todoRepo: ITodoRepository,
    private userRepo: IUserRepository
  ) {}

  async createTodo(data: CreateTodoData): Promise<Todo> {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error("Title must be a non-empty string");
    }

    const user = await this.userRepo.findById(data.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const todo = await this.todoRepo.create({
      userId: data.userId,
      title: data.title,
      description: data.description,
      status: "PENDING",
      remindAt: data.remindAt ? new Date(data.remindAt) : undefined,
    });

    return todo;
  }

  async completeTodo(todoId: string): Promise<Todo> {
    const todo = await this.todoRepo.findById(todoId);

    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.status === "DONE") {
      return todo;
    }

    const updated = await this.todoRepo.update(todoId, {
      status: "DONE",
    });

    if (!updated) {
      // This case should be rare if findById passed, but it's good practice
      throw new Error("Todo not found during update");
    }

    return updated;
  }

  async getTodosByUser(userId: string): Promise<Todo[]> {
    return this.todoRepo.findByUserId(userId);
  }

  async processReminders(): Promise<void> {
    const now = new Date();
    const dueTodos = await this.todoRepo.findDueReminders(now);

    for (const todo of dueTodos) {
      await this.todoRepo.update(todo.id, {
        status: "REMINDER_DUE",
      });
    }
  }
}
