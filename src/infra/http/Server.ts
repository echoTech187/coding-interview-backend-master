import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { TodoService } from "../../core/TodoService";
import { IUserRepository } from "../../core/IUserRepository";

// A simple error handler middleware
// Unused parameters are prefixed with an underscore
function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);

  if (err.message === "User not found" || err.message === "Todo not found") {
    res.status(404).json({ error: err.message });
  } else if (err.message === "Title must be a non-empty string") {
    res.status(400).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export function createHttpServer(todoService: TodoService, userRepo: IUserRepository) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // --- Routes ---

  // POST /users
  app.post("/users", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required" });
      }
      const user = await userRepo.create({ email, name });
      res.status(201).json(user);
    } catch (error) {
      return next(error);
    }
  });

  // POST /todos
  app.post("/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, title, description, remindAt } = req.body;
      // Basic validation
      if (!userId || !title) {
        return res.status(400).json({ error: "userId and title are required" });
      }
      const todo = await todoService.createTodo({ userId, title, description, remindAt });
      res.status(201).json(todo);
    } catch (error) {
      return next(error);
    }
  });

  // GET /todos?userId=...
  app.get("/todos", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter is required" });
      }
      const todos = await todoService.getTodosByUser(userId);
      res.status(200).json(todos);
    } catch (error) {
      return next(error);
    }
  });

  // PATCH /todos/:id/complete
  app.patch("/todos/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const todo = await todoService.completeTodo(id);
      res.status(200).json(todo);
    } catch (error) {
      return next(error);
    }
  });

  // Health check
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).send("Todo Reminder Service is running.");
  });
  
  // Register the error handler
  app.use(errorHandler);

  return app;
}
