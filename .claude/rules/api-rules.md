---
applies_to: ["src/**/*.controller.ts", "src/**/*.guard.ts", "src/**/*.dto.ts"]
---

# API Rules

## Route conventions
- RESTful: `GET /products`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`
- Prefix all routes with the module name (set in controller decorator)
- Return HTTP 201 for POST (creation), 200 for everything else

## DTOs
- Every request body has a DTO class in `dto/` with `class-validator` decorators
- Use `@IsString()`, `@IsNumber()`, `@IsMongoId()` etc. — never accept raw unvalidated input
- Enable global `ValidationPipe` in `main.ts`

## Auth on every protected route
```ts
@UseGuards(AuthGuard, RolesGuard)
@Roles('manager')
```
- Public routes get `@Public()` decorator (to skip AuthGuard)
- Never expose businessId as a route param for filtering — always read from JWT

## Error handling
- Throw NestJS built-in exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`
- Never throw raw `Error` objects from controllers or services

## businessId extraction
```ts
// In any controller method:
@CurrentUser() user: JwtPayload
// Then use: user.businessId
// NEVER: req.body.businessId or req.query.businessId
```
