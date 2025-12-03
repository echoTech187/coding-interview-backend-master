import { Todo } from "../domain/Todo";

export interface ITodoRepository {
  create(todo: Omit<Todo, "id" | "createdAt" | "updatedAt">): Promise<Todo>;
  update(
    id: string,
    updates: Partial<Omit<Todo, "id" | "userId" | "createdAt">>
  ): Promise<Todo | null>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string): Promise<Todo[]>;
  findDueReminders(currentTime: Date): Promise<Todo[]>;
}
