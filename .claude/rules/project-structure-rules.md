---
description: This file describes the project structure and coding standards for the project.
globs: 
  - "**/*.ts"
  - "**/*.js"
alwaysApply: true
---

### Core Principles

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
  - Avoid using any.
  - Create necessary types.
- Use JSDoc to document public classes and methods.
- Leave blank lines before and after of if/for/foreach blocks or sentences that takes 2 or more lines, otherwise don't leave blank lines.
- Avoid using type assertion (as unknown, as Type); declare variable type.
- One export per file.
- Use absolute imports with path aliases (@app, @common, @config, etc.)
- Follow the monorepo structure for all new code
- Use barrel exports (index.ts)
- Don't document the dtos or controllers with documentation annotations

### Package Manager

- **ALWAYS use `npm`.**
- This is a Yarn workspaces monorepo project
- The agent is only allowed to:
  - Install dependencies by running `npm install` (no additional arguments)
  - Execute scripts declared in `package.json` using `npm run <script> <additional-arguments>`
- Do NOT use `npm add`, `npm remove`, or any other npm commands
- All package modifications must be done through scripts defined in package.json

### Nomenclature

- Use PascalCase for:
  - Classes
  - Types
  - Enums
  - Decorators
- Use camelCase for:
  - Variables
  - Functions
  - Methods
  - Properties
- Use kebab-case for:
  - File names
  - Folder names
- Use SNAKE_CASE for:
  - Constants (e.g., CURRENT_PROVIDER, ALLOWED_CHARGE_ORDER_ENTITY_TYPES)
  - Environment variables (e.g., MONGO_URL, DATABASE_URL)

## File Structure

```
        ├── src/
        │   ├── modules/
        │   │   └── [module-name]/
        │   │       ├── controllers/
        │   │       │    ├── __tests__/
        │   │       │    ├── __fixtures__/
        │   │       ├── services/
        │   │       │    ├── __tests__/
        │   │       │    ├── __fixtures__/
        │   │       ├── repositories/
        │   │       │    ├── __tests__/
        │   │       │    ├── __fixtures__/
        │   │       ├── entities/
        │   │       └── module.ts
        │   └── app.module.ts
        └── package.json
```

- Implement custom providers when needed

### Functions

- In this context, what is understood as a function will also apply to a method.
- Write short functions with a single purpose. Less than 20 instructions.
- Name functions with a verb and something else.
  - If it returns a boolean, use isX or hasX, canX, etc.
  - If it doesn't return anything, use executeX or saveX, etc.
- Avoid nesting blocks by:
  - Early checks and returns.
  - Extraction to utility functions.
- Use higher-order functions (map, filter, reduce, etc.) to avoid function nesting.
  - Use arrow functions for simple functions (less than 3 instructions).
  - Use named functions for non-simple functions.
- Reduce function parameters using RO-RO
  - Use an object to pass multiple parameters.
  - Use an object to return results.
  - Declare necessary types for input arguments and output.
- Use a single level of abstraction.
- Use dependency injection for service dependencies
- Avoid using constructor logic, prefer initialization methods
- Use async/await consistently over Promises
- Handle errors using custom exception filters

### Data

- Don't abuse primitive types and encapsulate data in composite types.
- Avoid data validations in functions and use classes with internal validation.
- Prefer immutability for data.
  - Use readonly for data that doesn't change.
  - Use as const for literals that don't change.

### Classes

- Follow SOLID principles.
- Always Follow DRY principles.
- Prefer composition over inheritance.
- Use types instead of interfaces for all type definitions
  - Types are more flexible and support union types more naturally
  - Types can be used to create utility types
  - Interfaces should be avoided in favor of types
- Declare abstracts to define common setup between child classes
- Write small classes with a single purpose.
  - Less than 200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.
- Use @Injectable() decorator for all services
- Follow the naming convention: [Name][Type] (e.g., UserService, AuthGuard)
- Use class-validator decorators for DTO validation
- Method visibility and organization:
  - Use '#' prefix for private methods and properties (e.g., #calculateTotal())
  - Use standard naming (no prefix) for public methods (e.g., getUser())
  - Private methods should appear after public methods in the class definition

### DTO Structure & Shared Resources

#### DTO Guidelines

- Use class-validator decorators for validation
- Follow folder structure strictly:
  - `common/`: Shared DTO models
  - `request/`: Input/Request DTOs
  - `response/`: Output/Response DTOs

#### DTO Decorator Rules

- **`@IsOptional()` must always be the first decorator** on optional fields:

  ```typescript
  // ✅
  @IsOptional()
  @IsString()
  field?: string;
  // ❌
  @IsString()
  @IsOptional()
  field?: string;
  ```

- **All required scalar fields need `@IsDefined()`** — `@IsNumber()`, `@IsDate()`, `@IsIn()`, `@IsBoolean()`, and `@IsString()` silently skip validation when `skipMissingProperties: true` is active; `@IsDefined()` enforces presence regardless:

  ```typescript
  @IsDefined()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDefined()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDefined()
  @IsIn(ALLOWED_VALUES)
  status: Status;
  ```

- **Required strings must pair `@IsString()` with `@IsNotEmpty()`** — `@IsString()` alone allows empty strings `""`:

  ```typescript
  @IsString()
  @IsNotEmpty()
  field: string;
  ```

- **Use `@IsDto` from `@lib/utils/decorators` for all nested DTO fields** — never use the manual stack `@IsDefined()` / `@IsOptional()` / `@ValidateNested()` / `@Type()` for nested DTOs:

  ```typescript
  import { IsDto } from '@lib/utils/decorators';

  // required nested object
  @IsDto(() => NestedDto)
  field: NestedDto;

  // optional nested object — null is treated as absent (same as omitting the field)
  @IsDto(() => NestedDto, { optional: true })
  field?: NestedDto | null;
  ```

  Add `@Expose()` explicitly only when the parent is deserialized with `plainToInstance` + `excludeExtraneousValues: true`.

- **Required arrays of nested objects** — pair `@IsDto` with `@IsArray()` (and `@ArrayMinSize(1)` when empty arrays are invalid):

  ```typescript
  @IsArray()
  @ArrayMinSize(1) // prevents [] — @ValidateNested evaluates trivially true on empty arrays
  @IsDto(() => ItemDto, { each: true }) // @IsDefined() is applied internally — rejects undefined
  items: ItemDto[];
  ```

### Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context.
  - Otherwise, use a global handler.

#### 12. Environment Variables

- Add all environment variables to both dev-task-definition.json and prod-task-definition.json files in the .aws folder
- Use static values for non-sensitive configuration
- Use AWS Secrets Manager for sensitive data
- Document all environment variables in README.md
- Follow the naming convention:
  - Static values: UPPERCASE_WITH_UNDERSCORE
  - Secrets: /project/environment/service/SECRET_NAME
