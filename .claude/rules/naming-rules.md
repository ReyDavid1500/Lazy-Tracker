---
description: semantic naming — identifiers must match the value, status, or effect they actually produce
globs: 
  - "**/*.ts"
alwaysApply: true
---

# Naming Rules — Semantic Alignment

**An identifier must mirror the canonical domain term of the value, status, or effect it manipulates — not a paraphrase, synonym, or UX-facing alias.**

## 1. Methods That Write a Specific Value

When a method writes a literal/enum value to a field, its name MUST contain that value's canonical term as it appears in the entity or enum.

```ts
// ❌ name uses a synonym of the persisted value
markAsApproved(id: string) { ... { status: Status.Verified } }

// ✅ name mirrors the persisted value
markAsVerified(id: string) { ... { status: Status.Verified } }
```

If UX or partner-facing terminology differs from the persisted term, do the translation **explicitly at the boundary** (mapper, controller, adapter). Never let a service method's name carry the translated term silently.

## 2. Status / Enum / Event Consistency

A single domain concept uses the **same word at every layer**: entity field, enum member, repository method, service method, event payload, gateway client. Introducing a synonym at any layer is a bug.

- Events are past-tense of the transition they announce, using the canonical term: `RequirementVerified`, not `RequirementApproved` if the persisted status is `Verified`.
- Repository helpers that filter by a status share the term: `findVerifiedDeals()`, not `findApprovedDeals()`.

## 3. Variables Match Content, Not Intent

Name a variable for **what it is**, not for what the caller intends to do with it.

```ts
// ❌ describes downstream intent
const dealsToNotify = await repo.findVerified();

// ✅ describes content; intent lives at the call site
const verifiedDeals = await repo.findVerified();
```

## 4. Names To Avoid

Replace with something specific to the domain:

- `data`, `info`, `result`, `response`, `value`, `temp`, `aux`, `obj`
- `Helper`, `Manager`, `Util` as the **only** suffix on a class
- `handle`, `process`, `execute`, `do` as the **only** verb on a method

Narrow exceptions: `result` inside a ≤ 5-line block; `item` as a loop variable when no more meaningful name exists.

## Review Checklist

- [ ] Every method that writes a status/enum: does its name contain the canonical term of that value?
- [ ] Same domain concept across entity, enum, event, repository, service: same word?
- [ ] Every variable named for what it holds, not for downstream intent?
- [ ] No `data` / `info` / `Helper` / `Manager` left as the only descriptor?
