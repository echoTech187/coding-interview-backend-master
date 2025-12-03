import { User } from "../domain/User";
import { IUserRepository } from "../core/IUserRepository";
import { randomUUID } from "crypto";

// Helper to deep copy a user object
const deepCopy = (user: User): User => {
  const copy = { ...user };
  copy.createdAt = new Date(user.createdAt.getTime());
  return copy;
};

export class InMemoryUserRepository implements IUserRepository {
  private users: User[] = [];

  async create(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    const user: User = {
      ...userData,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.users.push(user);
    return deepCopy(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return null;
    }
    return deepCopy(user);
  }

  async findAll(): Promise<User[]> {
    return this.users.map(deepCopy);
  }
}
