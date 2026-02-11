# Passkey (PASSKEY) MFA Login Flow

## Problem
When using PASSKEY MFA, you cannot use `/api/v1/users/verify-login-mfa`. You must use the dedicated passkey authentication endpoints instead.

## Why?
The `verify-login-mfa` endpoint only supports **TOTP** MFA. For **PASSKEY** MFA, you need to use separate endpoints because passkey authentication works differently (using WebAuthn API).

---

## Correct Passkey Login Flow

### Step 1: Login with Email and Password

```bash
POST /api/v1/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "YourPassword"
}
```

**Response:**
```json
{
  "message": "Password is correct. Please verify MFA.",
  "mfa_method": "PASSKEY",
  "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
}
```

**Note:** The `challengeId` is returned but **not used** for passkey authentication. The passkey endpoints generate their own challenge.

---

### Step 2: Generate Passkey Authentication Options

**Endpoint:** `POST /api/v1/users/passkey-auth-options`

```bash
POST /api/v1/users/passkey-auth-options
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Authentication options generated",
  "options": {
    "challenge": "base64-encoded-challenge",
    "timeout": 60000,
    "rpId": "localhost",
    "allowCredentials": [
      {
        "id": "...",
        "type": "public-key",
        "transports": ["internal", "hybrid"]
      }
    ],
    "userVerification": "preferred"
  }
}
```

---

### Step 3: Use WebAuthn API in Browser

In your frontend application, use the WebAuthn API with the options from Step 2:

```javascript
// Use navigator.credentials.get() with the options
const credential = await navigator.credentials.get({
  publicKey: options  // options from Step 2
});
```

---

### Step 4: Verify Passkey Authentication

**Endpoint:** `POST /api/v1/users/passkey-auth-verify`

```bash
POST /api/v1/users/passkey-auth-verify
Content-Type: application/json

{
  "email": "user@example.com",
  "credential": {
    "id": "AQEBAgMFCA0VIjdZEGl5Yls",
    "rawId": "AQEBAgMFCA0VIjdZEGl5Yls",
    "response": {
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi...",
      "authenticatorData": "...",
      "signature": "...",
      "userHandle": "..."
    },
    "type": "public-key"
  }
}
```

**Response:**
```json
{
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

✅ **Success!** You now have a JWT token for authenticated requests.

---

## Complete Flow Diagram

```
┌─────────────────────┐
│  1. Login Request   │
│  POST /login        │
│  (email + password) │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────┐
│ Response:                │
│ - mfa_method: "PASSKEY"  │
│ - challengeId (not used) │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────┐
│  2. Get Auth Options         │
│  POST /passkey-auth-options  │
│  (email)                     │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Response:                    │
│ - options (WebAuthn options) │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  3. Browser: Use WebAuthn    │
│  navigator.credentials.get() │
│  (with options)              │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  4. Verify Passkey           │
│  POST /passkey-auth-verify   │
│  (email + credential)        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Response:                    │
│ - token (JWT)                │
│ - user info                  │
└──────────────────────────────┘
```

---

## Endpoint Summary

| Endpoint | Purpose | MFA Method |
|----------|---------|------------|
| `POST /api/v1/users/login` | Initial login | Returns MFA method |
| `POST /api/v1/users/verify-login-mfa` | ✅ **TOTP only** | TOTP |
| `POST /api/v1/users/passkey-auth-options` | ✅ **PASSKEY** - Get auth options | PASSKEY |
| `POST /api/v1/users/passkey-auth-verify` | ✅ **PASSKEY** - Verify authentication | PASSKEY |

---

## Important Notes

1. **DO NOT use `/verify-login-mfa` for PASSKEY MFA**
   - This endpoint only works for TOTP
   - You will get error: "Please use passkey authentication endpoints for PASSKEY MFA"

2. **Use the passkey endpoints instead:**
   - `/passkey-auth-options` - Get authentication options
   - `/passkey-auth-verify` - Verify the passkey credential

3. **Passkey authentication requires:**
   - Browser with WebAuthn support
   - Frontend integration with `navigator.credentials.get()`
   - Cannot be tested with simple cURL requests (needs browser)

4. **The `challengeId` from login is not used:**
   - The passkey endpoints generate their own challenge
   - The `challengeId` from login response can be ignored for PASSKEY

---

## Error Message Explanation

If you see this error:
```json
{
  "message": "Please use passkey authentication endpoints for PASSKEY MFA"
}
```

**It means:**
- You're trying to use `/verify-login-mfa` with PASSKEY MFA
- You need to use `/passkey-auth-options` and `/passkey-auth-verify` instead

---

## Example Frontend Integration (JavaScript)

```javascript
// Step 1: Login
const loginResponse = await fetch('/api/v1/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { mfa_method, challengeId } = await loginResponse.json();

if (mfa_method === 'PASSKEY') {
  // Step 2: Get passkey auth options
  const optionsResponse = await fetch('/api/v1/users/passkey-auth-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const { options } = await optionsResponse.json();
  
  // Step 3: Get credential from browser
  const credential = await navigator.credentials.get({
    publicKey: options
  });
  
  // Step 4: Verify passkey
  const verifyResponse = await fetch('/api/v1/users/passkey-auth-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      credential: {
        id: credential.id,
        rawId: arrayBufferToBase64(credential.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
          authenticatorData: arrayBufferToBase64(credential.response.authenticatorData),
          signature: arrayBufferToBase64(credential.response.signature),
          userHandle: arrayBufferToBase64(credential.response.userHandle)
        },
        type: credential.type
      }
    })
  });
  
  const { token, user } = await verifyResponse.json();
  // Use token for authenticated requests
}
```

---

## Summary

✅ **For PASSKEY MFA:**
1. Login with email/password
2. Use `/passkey-auth-options` to get WebAuthn options
3. Use browser WebAuthn API to get credential
4. Use `/passkey-auth-verify` to verify and get token

❌ **Do NOT use `/verify-login-mfa` for PASSKEY MFA**

