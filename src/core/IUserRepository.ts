import { User } from "../domain/User";

export interface IUserRepository {
  create(user: Omit<User, "id" | "createdAt">): Promise<User>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
}
