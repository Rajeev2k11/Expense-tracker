# Bootstrap Super Admin - Initial Setup Guide

## Problem

To create an admin via the super admin endpoint, you need authentication (a JWT token). But to get a token, you need to be a user first. This creates a bootstrap problem.

## Solution

A special **unprotected bootstrap endpoint** that allows creating the first super admin without authentication.

---

## Step-by-Step Bootstrap Process

### Step 1: Check if Super Admin Exists

**Endpoint:** `GET /api/v1/super-admin/bootstrap/check`

```bash
curl http://localhost:3000/api/v1/super-admin/bootstrap/check
```

**Response:**

```json
{
  "exists": false,
  "message": "No super admin found. Bootstrap endpoint available.",
  "requiresBootstrap": true
}
```

---

### Step 2: Create First Super Admin

**Endpoint:** `POST /api/v1/super-admin/bootstrap/create`

**No authentication required** - This is the bootstrap endpoint.

#### Option A: Without Secret Key (Basic)

If you haven't set `BOOTSTRAP_SECRET_KEY` environment variable:

```bash
curl -X POST http://localhost:3000/api/v1/super-admin/bootstrap/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Option B: With Secret Key (Recommended for Production)

1. **Set environment variable:**

```bash
# In your .env file
BOOTSTRAP_SECRET_KEY=your-secret-bootstrap-key-here
```

2. **Create super admin:**

```bash
curl -X POST http://localhost:3000/api/v1/super-admin/bootstrap/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "SecurePassword123!",
    "secretKey": "your-secret-bootstrap-key-here"
  }'
```

**Response:**

```json
{
  "message": "First super admin created successfully. Please setup MFA.",
  "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
  "user": {
    "id": "673abc123def456789012345",
    "name": "Super Admin",
    "username": "superadmin",
    "email": "superadmin@example.com",
    "role": "ADMIN",
    "status": "active"
  },
  "note": "Use the challengeId to setup MFA before logging in."
}
```

---

### Step 3: Setup MFA for Super Admin

The super admin needs to setup MFA before they can login.

#### 3.1 Select MFA Method

```bash
curl -X POST http://localhost:3000/api/v1/users/select-mfa-method \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
    "mfaMethod": "TOTP"
  }'
```

#### 3.2 Verify MFA Setup

```bash
curl -X POST http://localhost:3000/api/v1/users/verify-mfa-setup \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
    "code": "123456"
  }'
```

---

### Step 4: Login and Get Token

After MFA is setup, the super admin can login:

```bash
curl -X POST http://localhost:3000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "673abc123def456789012345",
    "email": "superadmin@example.com",
    "name": "Super Admin",
    "username": "superadmin",
    "role": "ADMIN"
  }
}
```

---

### Step 5: Use Token to Invite More Admins

Now you can use the token to invite other admins:

```bash
curl -X POST http://localhost:3000/api/v1/super-admin/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "email": "admin@example.com",
    "name": "John Admin",
    "username": "johnadmin"
  }'
```

---

## Security Features

### 1. **Bootstrap Endpoint Protection**

- If `BOOTSTRAP_SECRET_KEY` is **NOT set** in environment:
  - Works only if no super admin exists
  - Once a super admin exists, this endpoint is blocked
- If `BOOTSTRAP_SECRET_KEY` **IS set**:
  - Always requires the secret key to work
  - Allows creating additional super admins if needed (with secret)

### 2. **Validation**

- Checks if email already exists
- Checks if username already exists
- Validates all required fields
- Hashes password before storing

### 3. **User Creation**

- Creates user with `role: 'ADMIN'`
- Sets `status: 'active'` immediately
- Sets `invitation: 'accepted'`
- Creates `challengeId` for MFA setup

---

## Environment Variable Setup

Add to your `.env` file:

```env
# Optional: Bootstrap secret key for additional security
# If not set, bootstrap only works when no super admin exists
BOOTSTRAP_SECRET_KEY=your-secret-key-change-in-production

# Other required variables
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
RESEND_API_KEY=your-resend-api-key
FRONTEND_APP_URL=http://localhost:5173
```

---

## Complete Bootstrap Flow

```
1. Check if super admin exists
   GET /api/v1/super-admin/bootstrap/check

2. Create first super admin (no auth needed)
   POST /api/v1/super-admin/bootstrap/create

3. Setup MFA for super admin
   POST /api/v1/users/select-mfa-method
   POST /api/v1/users/verify-mfa-setup

4. Login as super admin
   POST /api/v1/users/login
   → Get JWT token

5. Use token to invite more admins
   POST /api/v1/super-admin/create-admin
   (with Authorization header)
```

---

## Error Scenarios

### Super Admin Already Exists

If you try to bootstrap when a super admin already exists (and no secret is set):

```json
{
  "message": "Super admin already exists. Use authenticated endpoints to create more admins."
}
```

**Solution:** Use the authenticated endpoint with a valid token.

---

### Invalid Secret Key

If `BOOTSTRAP_SECRET_KEY` is set but you provide wrong secret:

```json
{
  "message": "Invalid bootstrap secret key"
}
```

**Solution:** Check your `.env` file and provide the correct secret.

---

### Email/Username Already Exists

```json
{
  "message": "User with this email already exists"
}
```

or

```json
{
  "message": "Username is already taken"
}
```

**Solution:** Use a different email/username.

---

## Production Recommendations

1. **Always set `BOOTSTRAP_SECRET_KEY`** in production
2. **Use a strong, random secret key**
3. **Remove or restrict bootstrap endpoint** after initial setup (can be done via middleware)
4. **Keep the secret key secure** - don't commit it to version control
5. **Document who has access** to the bootstrap secret

---

## Summary

- ✅ **Bootstrap endpoint** creates first super admin without authentication
- ✅ **Optional secret key** for additional security
- ✅ **Once created**, use authenticated endpoints for other admins
- ✅ **MFA required** before login
- ✅ **Production ready** with proper security measures
