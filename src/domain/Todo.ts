export type TodoStatus = "PENDING" | "DONE" | "REMINDER_DUE";

export interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
  remindAt?: Date;
}
