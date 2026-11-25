# Security Specification — OtoSkor Firestore Rules

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every vehicle, legal document photo, and service record resides under `/users/{userId}/...` and MUST belong to `request.auth.uid == userId` with `ownerId == request.auth.uid`.
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Master Gate Relational Integrity**: Subcollections (`legalDocs`, `serviceRecords`) cannot be created unless the parent vehicle document exists and belongs to the authenticated user, and `vehicleId` matches the path `{vehicleId}`.
4. **Temporal & ID Integrity**: Every `create` requires `createdAt == request.time` (and `updatedAt == request.time` where applicable); every `update` preserves immutable fields (`ownerId`, `id`, `createdAt`) and sets `updatedAt == request.time`.
5. **Bounded Payload & Size Guards**: Every string has explicit `.size() <= MAX` limits; `imageDataUrl` is capped at 450,000 bytes; `redFlags` is capped at 20 strings; `checklistResponses` map is capped at 80 keys; `aiSettings` stores only non-secret model/provider preferences (no API keys/tokens); `newCarPrice` & `productionStatus` are strictly range- and enum-validated; all document IDs match `^[a-zA-Z0-9_\\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: `get` or `create` on `/users/uidA/vehicles/v1` with `auth == null`.
2. **Cross-Tenant Read/List**: User `uidB` attempting `get` or `list` on `/users/uidA/vehicles`.
3. **Cross-Tenant Write Spoofing**: User `uidB` creating `/users/uidA/vehicles/v1` with `ownerId: "uidB"`.
4. **OwnerId Hijack**: User `uidA` creating `/users/uidA/vehicles/v1` with `ownerId: "uidB"`.
5. **Unverified Email Write**: User `uidA` with `email_verified: false` creating a vehicle.
6. **Shadow Field Injection (Ghost Field)**: User `uidA` adding `{ isAdmin: true }` or `{ verifiedBypass: true }` in `create` or `update` payload.
7. **Immutable Field Mutation**: User `uidA` updating `createdAt` or `ownerId` or `id` on an existing vehicle.
8. **Timestamp Forgery**: User `uidA` sending a backdated client timestamp instead of `request.time` for `createdAt` or `updatedAt`.
9. **ID Poisoning**: Creating a document with an oversized (>128 chars) or invalid-character (`../hack`) `{vehicleId}`.
10. **Denial-of-Wallet Oversized String / Image**: Sending `notes` > 2000 chars or `imageDataUrl` > 450,000 chars.
11. **Orphaned Subcollection Write**: Creating `/users/uidA/vehicles/nonExistent/legalDocs/d1` when parent vehicle does not exist.
12. **Unbounded / Type-Poisoned Array**: Sending `redFlags` with > 20 entries or a non-string first element (`[12345]`).
