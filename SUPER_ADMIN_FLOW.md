# Super Admin - Admin Invitation Flow & Structure

## Overview
This document explains how super admins can manage pending ADMIN user invitations in the Expense Tracker system.

## Flow Diagram

```
┌─────────────────┐
│  Super Admin    │
│  Invites Admin  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Create Admin User       │
│ - role: 'ADMIN'         │
│ - invitation: 'pending' │
│ - status: 'pending'     │
│ - inviteToken: <token>  │
│ - Email sent            │
└────────┬────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐          ┌────────────────────────┐
│ Admin receives   │          │ Super Admin Views      │
│ email with link  │          │ Pending Invitations    │
│                  │          │ GET /pending-invitations│
└────────┬─────────┘          └────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Admin Sets Password      │
│ POST /setup-password     │
│ - invitation: 'accepted' │
│ - inviteToken: cleared   │
│ - status: 'pending'      │
│ - challengeId: created   │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Super Admin Approves        │
│ POST /pending-invitations/  │
│ {userId}/accept             │
│ - status: 'active'          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Admin Completes MFA     │
│ Setup & Can Login       │
└─────────────────────────┘
```

## User States

### 1. **Initial Invitation State**
```javascript
{
  role: 'ADMIN',
  invitation: 'pending',    // Invitation status
  status: 'pending',        // Account status
  inviteToken: '<token>',   // Valid token
  inviteTokenExpiry: Date,  // 7 days from now
  password: '<temp-hash>'   // Temporary password
}
```

### 2. **After Admin Sets Password**
```javascript
{
  role: 'ADMIN',
  invitation: 'accepted',   // User has set password
  status: 'pending',        // Still pending super admin approval
  inviteToken: undefined,   // Token cleared
  inviteTokenExpiry: undefined,
  password: '<user-password-hash>',
  challengeId: '<id>'       // For MFA setup
}
```

### 3. **After Super Admin Approves**
```javascript
{
  role: 'ADMIN',
  invitation: 'accepted',   // Password set
  status: 'active',         // Super admin approved - can login
  password: '<user-password-hash>',
  challengeId: '<id>'       // For MFA setup
}
```

### 4. **After MFA Setup**
```javascript
{
  role: 'ADMIN',
  invitation: 'accepted',
  status: 'active',
  mfa_enabled: true,
  mfa_method: 'TOTP' or 'PASSKEY'
  // Admin can now login
}
```

## API Endpoints

### 1. Create Admin Invitation
**Endpoint:** `POST /api/v1/super-admin/create-admin`

**Description:** Super admin invites a new admin user by email.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "name": "John Admin",        // optional
  "username": "johnadmin"      // optional
}
```

**Response:**
```json
{
  "message": "Admin invited successfully",
  "email": "admin@example.com"
}
```

**Creates user with:**
- `role: 'ADMIN'`
- `invitation: 'pending'`
- `status: 'pending'`
- Valid `inviteToken` (7 days expiry)

---

### 2. Get All Pending Admin Invitations
**Endpoint:** `GET /api/v1/super-admin/pending-invitations`

**Description:** Retrieve all admin users with pending invitations.

**Response:**
```json
{
  "message": "Pending admin invitations retrieved successfully",
  "count": 3,
  "data": [
    {
      "_id": "...",
      "email": "admin@example.com",
      "name": "John Admin",
      "username": "johnadmin",
      "role": "ADMIN",
      "invitation": "pending",
      "status": "pending",
      "invitedBy": "...",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Filters:**
- `role: 'ADMIN'`
- `invitation: 'pending'`

---

### 3. Get Specific Pending Admin Invitation
**Endpoint:** `GET /api/v1/super-admin/pending-invitations/:userId`

**Description:** Get detailed information about a specific pending admin invitation.

**Response:**
```json
{
  "message": "Pending admin invitation retrieved successfully",
  "data": {
    "_id": "...",
    "email": "admin@example.com",
    "name": "John Admin",
    "username": "johnadmin",
    "role": "ADMIN",
    "invitation": "pending",
    "status": "pending",
    "invitedBy": {
      "_id": "...",
      "name": "Super Admin Name",
      "email": "superadmin@example.com"
    },
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 4. Accept/Approve Pending Admin Invitation
**Endpoint:** `POST /api/v1/super-admin/pending-invitations/:userId/accept`

**Description:** Super admin approves a pending admin invitation, making the admin account active.

**Behavior:**
- If `invitation: 'pending'` → Admin hasn't set password yet (approves for future access)
- If `invitation: 'accepted'` → Admin has set password (activates account immediately)

**Response:**
```json
{
  "message": "Admin invitation approved successfully",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "John Admin",
    "username": "johnadmin",
    "role": "ADMIN",
    "status": "active",
    "invitation": "accepted",
    "hasPasswordSet": true
  }
}
```

**Updates:**
- `status: 'active'` (from 'pending')

---

### 5. Reject/Cancel Pending Admin Invitation
**Endpoint:** `POST /api/v1/super-admin/pending-invitations/:userId/reject`

**Description:** Super admin rejects a pending admin invitation, canceling it.

**Response:**
```json
{
  "message": "Admin invitation rejected successfully",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "status": "inactive",
    "invitation": "rejected"
  }
}
```

**Updates:**
- `invitation: 'rejected'`
- `status: 'inactive'`
- Clears `inviteToken` and `inviteTokenExpiry`

---

## Complete User Journey

### Step 1: Super Admin Invites Admin
```bash
POST /api/v1/super-admin/create-admin
Authorization: Bearer <super-admin-token>
Body: { "email": "admin@example.com" }
```
→ Admin receives email with invitation link

### Step 2: Admin Sets Password
```bash
POST /api/v1/users/setup-password
Body: { "token": "<invite-token>", "password": "SecurePass123!" }
```
→ `invitation: 'accepted'`, token cleared, `challengeId` created

### Step 3: Super Admin Views Pending Invitations
```bash
GET /api/v1/super-admin/pending-invitations
Authorization: Bearer <super-admin-token>
```
→ See all pending admin invitations

### Step 4: Super Admin Approves
```bash
POST /api/v1/super-admin/pending-invitations/{userId}/accept
Authorization: Bearer <super-admin-token>
```
→ `status: 'active'` - Admin can now login (after MFA setup)

### Step 5: Admin Completes MFA Setup
```bash
POST /api/v1/users/select-mfa-method
POST /api/v1/users/verify-mfa-setup
```
→ Admin completes MFA setup

### Step 6: Admin Can Login
```bash
POST /api/v1/users/login
Body: { "email": "admin@example.com", "password": "SecurePass123!" }
```
→ Admin logs in successfully

---

## Database Schema Reference

### User Model Fields (Relevant)
```javascript
{
  role: {
    type: String,
    enum: ['ADMIN', 'USER'],  // Always 'ADMIN' for admin invitations
    default: null
  },
  invitation: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    required: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: null
  },
  inviteToken: String,        // Token for password setup
  inviteTokenExpiry: Date,    // 7 days expiry
  invitedBy: String,          // ID of inviting super admin
  mfa_enabled: Boolean,
  mfa_method: String,         // 'TOTP' or 'PASSKEY'
  challengeId: String         // For MFA setup
}
```

---

## Security Considerations

1. **Authentication Required**: All super admin endpoints require valid JWT token
2. **Authorization**: Only super admins should access these endpoints (can add role check if needed)
3. **Token Expiry**: Invitation tokens expire after 7 days
4. **Password Requirements**: Users must set strong passwords
5. **MFA Required**: Admins must complete MFA setup before login

---

## Error Scenarios

### Expired Token
If admin tries to set password after 7 days:
```json
{
  "message": "Invalid or expired token"
}
```

### Already Accepted
If trying to approve already accepted invitation:
```json
{
  "message": "Pending admin invitation not found or already processed"
}
```

### Token Expired Before Approval
If super admin tries to approve but token expired:
```json
{
  "message": "Invitation token is expired or invalid. Admin must set their password first or you need to resend the invitation."
}
```

---

## Example Usage Flow

### Complete Example:
```javascript
// 1. Super Admin invites
POST /api/v1/super-admin/create-admin
→ User created: { invitation: 'pending', status: 'pending' }

// 2. Admin clicks email link and sets password
POST /api/v1/users/setup-password
→ User updated: { invitation: 'accepted', status: 'pending' }

// 3. Super Admin checks pending
GET /api/v1/super-admin/pending-invitations
→ Shows admin with invitation: 'accepted', status: 'pending'

// 4. Super Admin approves
POST /api/v1/super-admin/pending-invitations/{userId}/accept
→ User updated: { status: 'active' }

// 5. Admin sets up MFA
POST /api/v1/users/select-mfa-method
POST /api/v1/users/verify-mfa-setup
→ Admin can now login
```

---

## Files Structure

```
app/
├── controller/
│   └── superAdmin.controller.js     # All super admin functions
├── routes/
│   └── superAdmin.routes.js         # All super admin routes
├── models/
│   └── users.models.js              # User schema
└── middleware/
    └── auth.middleware.js           # JWT authentication

server.js                            # Route registration
```

---

## Summary

- **Invitation Flow**: Super admin invites → Admin sets password → Super admin approves → Admin completes MFA → Admin can login
- **Key States**: `invitation` tracks password setup, `status` tracks account activation
- **Super Admin Actions**: View pending, approve, or reject admin invitations
- **Security**: All endpoints require authentication, tokens expire after 7 days

