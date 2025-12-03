# Todo Reminder Service – Backend Exercise (TypeScript)

## Overview

You are given a minimal TypeScript codebase for a small **Todo Reminder Service**.

Conceptually:

- Users can create todos.
- Each todo belongs to a user.
- Todos can have an optional `remindAt` time.
- A background job periodically scans for due todos and marks them as `REMINDER_DUE` (instead of sending emails).

The current implementation is **incomplete** and contains **intentional bugs and design issues**.

Your tasks are to:

1. Implement a small HTTP API (you choose the framework).
2. Fix and improve the existing core logic.
3. Make the reminder processing safe and robust.
4. Ensure all provided tests pass.
5. Document the main issues you found and the decisions you made.

You **may use AI tools** (ChatGPT, Copilot, etc.), but we will ask detailed questions about your code and your reasoning in a follow-up interview.

---

## Tech Requirements

- **Language:** TypeScript
- **Runtime:** You are free to choose: Node.js, Bun, Deno, etc.
- **Package Manager** You are free to choose: npm, yarn, pnpm, etc.
- **Framework & Libraries:** You are free to choose:
  - HTTP framework: e.g. Express, Koa, Fastify, Hono, or a minimal custom server.
  - Database / persistence: in-memory, file-based, SQLite, Postgres, etc.
  - ORM / query builder (optional): e.g. Prisma, Drizzle, Knex, or raw SQL.

The starter code is intentionally **framework-agnostic** and **database-agnostic**. You are expected to wire in whichever stack you prefer.

---

## Project Structure (High-Level)

You will see something similar to:

```text
.
├─ src/
│  ├─ domain/
│  │  ├─ Todo.ts          # Todo types
│  │  └─ User.ts          # User types
│  ├─ core/
│  │  ├─ ITodoRepository.ts
│  │  ├─ IUserRepository.ts
│  │  ├─ IScheduler.ts
│  │  └─ TodoService.ts   # Business logic (contains some issues)
│  ├─ infra/
│  │  ├─ InMemoryTodoRepository.ts   # Buggy on purpose
│  │  ├─ InMemoryUserRepository.ts   # May be incomplete / naive
│  │  ├─ SimpleScheduler.ts          # Naive background job scheduler
│  │  └─ HttpServerShell.ts          # Minimal HTTP abstraction (optional to use)
│  └─ app/
│     └─ main.ts           # Application wiring entrypoint
├─ test/
│  └─ TodoService.test.ts  # Tests you must pass
├─ package.json
├─ jest.config.js
└─ tsconfig.json
```

- Files in `domain/` and `core/` define the **contracts and business logic**.
- Files in `infra/` provide **default, intentionally naive** implementations.
- `app/main.ts` is where you **bootstrap** the application.

You **should not change** the domain models or interface contracts in `domain/` and `core/` (unless explicitly necessary and you can justify it). Everything else can be refactored/improved.

---

## Domain Summary

### User

```ts
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
```

### Todo

```ts
type TodoStatus = "PENDING" | "DONE" | "REMINDER_DUE";

interface Todo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
  remindAt?: Date | null;
}
```

### Reminder Behavior

- `PENDING` + `remindAt <= now` → should become `REMINDER_DUE` when processed.
- `DONE` todos should **not** be affected by reminder processing.
- Reminder processing is run periodically by a scheduler.

---

## Your Tasks

_for this example we use npm, but you are free to choose your own package manager_

### 1. Setup & Run Tests

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests:

   ```bash
   npm test
   ```

At the start, tests may **fail** due to bugs or incomplete logic.
Your goal is to make them **all pass** without changing the tests.

> ✅ You **must not modify** any files under `test/`.
> ✅ Your final submission should pass `npm test` successfully.

---

### 2. Implement the HTTP API

Implement a minimal REST API using a framework of your choice, wired to `TodoService`:

Required endpoints (suggested shape):

- `POST /users`

  - Request body: `{ "email": string, "name": string }`
  - Response: created `User` object.

- `POST /todos`

  - Request body: `{ "userId": string, "title": string, "description"?: string, "remindAt"?: string ISO date }`
  - Response: created `Todo` object.

- `GET /todos?userId=...`

  - Response: array of `Todo` objects for that user.

- `PATCH /todos/:id/complete`

  - Marks a todo as `DONE`.
  - Response: updated `Todo`.

Expectations:

- You decide how to implement `HttpServer`:

  - You can implement `HttpServer` from `HttpServerShell.ts` on top of Express/Koa/Fastify/etc.
  - Or you can bypass the shell and wire the framework directly in `app/main.ts`.

- You should handle:

  - Parsing and validating request bodies.
  - Converting `remindAt` from string to `Date`.
  - Meaningful HTTP status codes (e.g. `400`, `404`, `201`, `200`, etc.).
  - Returning JSON responses.

We will look at:

- How clearly routes are organized.
- How you structure controllers/handlers versus business logic.
- How errors are surfaced to clients.

---

### 3. Fix & Improve Core Logic

The existing implementation in `TodoService` and the in-memory repositories has deliberate issues.

Examples (not a complete list):

- Generic error messages like `"Not found"` with no context.
- Lack of input validation (e.g. empty `title`).
- Inconsistent update behavior in repositories.
- Todo reminder logic that doesn't properly check `status` or `remindAt`.
- Potential `id` collisions or misuse of equality operators (`==` vs `===`).
- Weak type usage (`any`).

You should:

1. Improve **error handling** in `TodoService`:

   - Prefer explicit error types/messages or at least clearly distinguish "user not found" vs "todo not found".

2. Add **basic validation** for todo creation:

   - `title` must be non-empty (not just whitespace).
   - `userId` must refer to an existing user.

3. Fix the **in-memory repository behavior**, such as:

   - Reasonable ID generation.
   - Correct use of `===`.
   - `update` should not silently create new entities on unknown IDs.
   - `findDueReminders` should filter only `PENDING` todos with `remindAt <= now`.

4. Make reasonable, small design improvements without over-engineering:

   - Use proper TypeScript types instead of `any`.
   - Avoid leaking internal mutable arrays from repositories.

You are free to introduce new internal helper functions, error classes, or small abstractions if they improve clarity.

---

### 4. Background Reminder Processing

A naive scheduler is provided via `IScheduler` and `SimpleScheduler`.

Your goals:

1. Ensure that the scheduler is actually configured and running:

   - E.g. from `app/main.ts`, schedule a recurring task that calls `TodoService.processReminders(new Date())` every N seconds.

2. Make `TodoService.processReminders` behavior correct:

   - Only todos with:

     - `status === "PENDING"`, and
     - `remindAt` defined, and
     - `remindAt <= now`
       are updated to `REMINDER_DUE`.

   - Calling `processReminders` multiple times should be **idempotent enough**:

     - Already `REMINDER_DUE` todos should not flip back or cause inconsistent behavior.

3. Improve `SimpleScheduler` robustness:

   - Avoid creating multiple intervals for the same task name.
   - Handle errors inside the scheduled function (e.g. try/catch and logging), to avoid crashing the process.
   - Reasonable cleanup or behaviour when `scheduleRecurring` is called twice with the same name.

You do **not** need to build a full-featured job queue; just make it safe and predictable for this exercise.

---

### 5. Optional Improvements (Nice to Have)

These are **optional**, but good opportunities to show your thinking:

- Add **soft delete** for todos (e.g. a `deletedAt` field) and make listing ignore deleted items.
- Add **pagination** to `GET /todos` (e.g. `limit` and `offset` query params).
- Add **structured logging** around reminder processing (start, end, errors, number of processed todos).
- Make it easy to swap out the repository implementation (e.g. in-memory vs database-backed) using dependency injection or simple factories.
- Add input validation using a library (e.g. zod, yup) if you prefer.

If you implement any of these, briefly mention them in your notes.

---

## Tests & Expectations

- We provide a test file in `test/` (e.g. `TodoService.test.ts`).
- These tests focus on the **business behavior** of `TodoService` and the reminder logic.
- Your changes in `src/` must result in **all tests passing**:

  ```bash
  npm test
  ```

Rules:

- ❌ Do **not** modify tests in `test/`.
- ✅ You may change or completely replace implementations in `src/infra` and `src/app`.
- ✅ You may refactor `TodoService` as long as its external behavior remains compatible with tests.
- If you believe a test is incorrect or too restrictive, you can mention this in your notes, but still aim to make it pass.

---

## Deliverables

When you're done, please provide:

1. Your updated codebase (e.g. Git repo link or archive).
2. A short `NOTES.md` in the project root that includes:

   - **Summary of the main bugs/issues** you found in the starter code.
   - **How you fixed them**.
   - **Which framework/database (if any) you chose and why**.
   - Any **optional improvements** you implemented.
   - Anything you would improve further if you had more time.

3. You are allowed to use AI Assistants to help you write `NOTES.md`.

---

## How We'll Discuss This in the Interview

In the follow-up conversation, we will not quiz you on syntax. Instead, expect questions like:

- What were the **2–3 most serious issues** in the original code, and why?
- Why did you choose this particular **HTTP framework** and, if applicable, **database approach**?
- How does your **reminder processing** work? What happens if it fails halfway through?
- How would this service behave under **10× more load**? What would you change first?
- If we wanted to move the scheduler into a **separate process or service**, how would you approach that?
- If we wanted to replace the **in-memory repository** with a real database, what parts of your design make that easier or harder?

It's okay if you used AI assistants. What matters to us is that you:

- Understand the code you submit.
- Can explain your design and trade-offs.
- Can reason about correctness, edge cases, and future changes.

---

## Time Expectations

This exercise is scoped to be completable in a few hours, though you may take more if you wish to polish it.

If you have to choose, prioritize:

1. Correct behavior & passing tests.
2. Reasonable structure and error handling.
3. Clean, readable TypeScript.

---

**Good luck, and have fun building!**
