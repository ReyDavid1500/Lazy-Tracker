# lazyTracker

Multi-tenant SaaS inventory app for bakeries. Workers scan product photos → AI identifies product → worker enters stock count → manager gets low-stock alerts.

## Stack
- **Backend**: NestJS (TypeScript, modular architecture)
- **Database**: MongoDB via Mongoose
- **Auth**: JWT — payload shape: `{ userId, businessId, role }`
- **AI**: Claude API (vision) for product identification from photos
- **Mobile**: Expo React Native
- **Push notifications**: Expo Push API

## Multi-tenancy — critical rule
Every Mongoose document **must** have a `businessId` field.
Extract `businessId` from the JWT token via `@CurrentUser()` decorator — **never** from the request body or query params. This is the only guarantee of data isolation between businesses.

## Roles
- `worker` — can scan products, update stock counts
- `manager` — full inventory read access, receives low-stock push alerts

## Auth pattern
- `AuthGuard` validates JWT on every protected route
- `RolesGuard` + `@Roles('manager')` restricts manager-only endpoints
- Both guards live in `src/auth/guards/`

## Module structure
```
src/
├── auth/          # JWT strategy, guards, decorators
├── business/      # Business schema + CRUD
├── users/         # User schema + CRUD
├── products/      # Product schema + CRUD
├── stock/         # StockEntry schema, scan flow, low-stock logic
├── scan/          # Claude API vision integration (ScanService)
├── database/      # MongooseModule wiring
└── notifications/ # Expo Push Notifications
```

## Environment variables
See `.env.example` for required vars: `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `ANTHROPIC_API_KEY`.
