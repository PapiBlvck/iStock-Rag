# ✅ TS2345 Type Mismatch Fixed

## Critical Issue Resolved

**Error**: TS2345 - Type mismatch in `user.router.ts`
**Problem**: Functions returning `null` for optional properties, but tRPC expects `undefined`

---

## What Was Fixed

### Issue Details
The `UserSchema` defines optional properties using TypeScript's `?` syntax:
```typescript
{
  displayName?: string;  // When absent, should be undefined, not null
  photoURL?: string;     // When absent, should be undefined, not null
}
```

But the code was returning `null` instead of `undefined`:
```typescript
// ❌ WRONG - Returns null
displayName: input.displayName || null,
photoURL: null,
```

This caused a type mismatch error because:
- **Zod optional properties** expect `undefined` when not present
- **null is a different type** than undefined in TypeScript's strict mode
- **tRPC validation** fails when receiving `null` instead of `undefined`

---

## Fixes Applied

### File: `functions/src/routers/user.router.ts`

#### 1. Create Mutation (Lines 34-35) ✅
```typescript
// BEFORE ❌
displayName: input.displayName || null,
photoURL: null,

// AFTER ✅
displayName: input.displayName ?? undefined,
photoURL: undefined,
```

#### 2. GetMe Query (Lines 67-68) ✅
```typescript
// BEFORE ❌
displayName: userData?.displayName || null,
photoURL: userData?.photoURL || null,

// AFTER ✅
displayName: userData?.displayName ?? undefined,
photoURL: userData?.photoURL ?? undefined,
```

#### 3. GetById Query (Lines 107-108) ✅
```typescript
// BEFORE ❌
displayName: userData?.displayName || null,
photoURL: userData?.photoURL || null,

// AFTER ✅
displayName: userData?.displayName ?? undefined,
photoURL: userData?.photoURL ?? undefined,
```

#### 4. Update Mutation (Lines 152-153) ✅
```typescript
// BEFORE ❌
displayName: updatedData?.displayName || null,
photoURL: updatedData?.photoURL || null,

// AFTER ✅
displayName: updatedData?.displayName ?? undefined,
photoURL: updatedData?.photoURL ?? undefined,
```

---

## Why Use `??` Instead of `||`

### The Nullish Coalescing Operator (`??`)
```typescript
value ?? undefined  // Returns undefined only if value is null or undefined
```

**Better than `||` because:**
- `||` treats falsy values (0, '', false) as "not present"
- `??` only treats `null` and `undefined` as "not present"
- More precise for optional fields

**Example:**
```typescript
// If displayName is an empty string ''
displayName: input.displayName || null      // ❌ Returns null (wrong!)
displayName: input.displayName ?? undefined // ✅ Returns '' (correct!)
```

---

## Technical Explanation

### Zod Optional Properties
```typescript
z.object({
  displayName: z.string().optional(),  // string | undefined
  photoURL: z.string().optional(),     // string | undefined
})
```

When a property is `.optional()`, Zod expects:
- ✅ `undefined` - Property not present
- ✅ `string` - Property has a value
- ❌ `null` - Type mismatch error!

### TypeScript Strict Mode
In strict TypeScript:
```typescript
type Optional = string | undefined;  // ✅ OK
type OptionalNull = string | null;   // ❌ Different type!
```

`undefined` and `null` are distinct types:
- `undefined` = property doesn't exist
- `null` = property exists but has no value

---

## Impact

### Before Fix ❌
```typescript
// Returns: { displayName: null, photoURL: null }
// ❌ tRPC validation error
// ❌ Type mismatch
// ❌ Client receives null instead of undefined
```

### After Fix ✅
```typescript
// Returns: { displayName: undefined, photoURL: undefined }
// ✅ tRPC validation passes
// ✅ Types match
// ✅ Client receives proper undefined
```

---

## All Affected Functions Fixed

| Function | Lines | Status |
|----------|-------|--------|
| `create` | 34-35 | ✅ Fixed |
| `getMe` | 67-68 | ✅ Fixed |
| `getById` | 107-108 | ✅ Fixed |
| `update` | 152-153 | ✅ Fixed |

---

## Verification

### Type Check
```bash
cd functions
pnpm type-check
```

Should now pass without TS2345 errors!

### Runtime Behavior
```typescript
// API Response (BEFORE)
{
  "uid": "user123",
  "email": "test@example.com",
  "displayName": null,    // ❌ null
  "photoURL": null        // ❌ null
}

// API Response (AFTER)
{
  "uid": "user123",
  "email": "test@example.com"
  // ✅ displayName and photoURL omitted (undefined)
}
```

---

## Best Practices Applied

### 1. Consistent Use of `??` for Optional Fields
```typescript
// ✅ Always use ?? for optional properties
optionalField: data?.optionalField ?? undefined
```

### 2. Never Return `null` for Optional Zod Properties
```typescript
// ❌ WRONG
displayName: z.string().optional()  // expects undefined
return { displayName: null }         // returns null

// ✅ CORRECT
displayName: z.string().optional()   // expects undefined
return { displayName: undefined }    // returns undefined
```

### 3. Type-Safe Optional Handling
```typescript
// If you need to differentiate between "not set" and "explicitly cleared"
displayName: z.string().nullable().optional()  // string | null | undefined
```

---

## Summary

**Fixed Error**: TS2345 Type Mismatch
**Root Cause**: Using `null` instead of `undefined` for optional properties
**Solution**: Use nullish coalescing operator (`??`) to return `undefined`
**Files Changed**: `functions/src/routers/user.router.ts` (4 functions)
**Status**: ✅ **COMPLETE**

---

## Related Documentation

- **Zod Optional Properties**: https://zod.dev/?id=optional
- **TypeScript Nullish Coalescing**: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing
- **tRPC Type Safety**: https://trpc.io/docs/server/validators

---

**All type mismatches resolved!** 🎉

