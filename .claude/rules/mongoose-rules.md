---
applies_to: ["src/**/*.schema.ts", "src/**/*.repository.ts"]
---

# Mongoose / Schema Rules

## Every schema must have businessId
```ts
@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Business', required: true, index: true })
businessId: Types.ObjectId;
```
No exceptions. This is the multi-tenancy boundary.

## Schema file structure
```ts
@Schema({ timestamps: true })
export class Product extends Document { ... }

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ businessId: 1, sku: 1 }, { unique: true });
```

## Always filter by businessId in queries
```ts
// Good
this.productModel.find({ businessId: user.businessId, ...filters })
// Bad — leaks data across businesses
this.productModel.find({ sku: 'ABC' })
```

## Timestamps
- Always use `{ timestamps: true }` in `@Schema()` — gives `createdAt` / `updatedAt` for free

## Soft deletes
- Add `isActive: boolean` (default `true`) instead of hard-deleting records
- Filter `{ isActive: true }` in all list queries
