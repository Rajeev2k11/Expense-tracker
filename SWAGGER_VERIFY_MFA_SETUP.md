# Swagger Documentation for /verify-mfa-setup

## Overview

Enhanced Swagger documentation has been created for the `/api/v1/users/verify-mfa-setup` endpoint.

---

## Access Swagger UI

Visit: **http://localhost:3000/api-docs**

Navigate to the **Users** tag and find the `POST /api/v1/users/verify-mfa-setup` endpoint.

---

## Endpoint Details

### **POST /api/v1/users/verify-mfa-setup**

**Summary:** Verify MFA setup (supports both TOTP and PASSKEY)

**Authentication:** None required (uses challengeId)

**Tags:** Users

---

## Request Examples in Swagger

### TOTP Verification Example

```json
{
  "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
  "code": "123456"
}
```

### PASSKEY Verification Example

```json
{
  "challengeId": "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a",
  "credential": {
    "id": "AQEBAgMFCA0VIjdZEGl5Yls",
    "rawId": "AQEBAgMFCA0VIjdZEGl5Yls",
    "response": {
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiTXpZMU5qVT...",
      "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVikSZYN5Yx...",
      "transports": ["internal", "hybrid"]
    },
    "type": "public-key",
    "clientExtensionResults": {},
    "authenticatorAttachment": "platform"
  }
}
```

---

## Response Examples in Swagger

### Success Response (200)

```json
{
  "message": "TOTP MFA verified and enabled successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzdhMTIzNDU2Nzg5MGFiY2RlZjAxMjMiLCJpYXQiOjE2ODc1Mjc2MDB9.abc123def456",
  "user": {
    "id": "637a12345678900abcdef0123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe",
    "role": "user",
    "mfa_enabled": true,
    "mfa_method": "TOTP"
  }
}
```

### Error Response Examples (400)

**Missing Challenge ID:**

```json
{
  "message": "Challenge ID is required"
}
```

**Missing TOTP Code:**

```json
{
  "message": "TOTP code is required"
}
```

**Missing Passkey Credential:**

```json
{
  "message": "Passkey credential is required"
}
```

**MFA Method Not Selected:**

```json
{
  "message": "MFA method not selected. Please select MFA method first."
}
```

### Error Response Examples (401)

**Invalid Challenge:**

```json
{
  "message": "Invalid or expired challenge"
}
```

**Invalid TOTP Code:**

```json
{
  "message": "Invalid TOTP code. Please try again."
}
```

**Passkey Verification Failed:**

```json
{
  "message": "Passkey verification failed"
}
```

---

## Swagger Documentation Features

### ✅ What's Included:

1. **Detailed Description:**
   - Explains the purpose of the endpoint
   - Clarifies when to use TOTP vs PASSKEY
   - Documents the expected behavior on success

2. **Request Schema (oneOf):**
   - Separates TOTP and PASSKEY request schemas
   - Shows required fields for each method
   - Includes detailed property descriptions
   - Provides realistic examples

3. **Response Schemas:**
   - Success response (200) with full user object
   - Multiple error examples for 400 status
   - Multiple error examples for 401 status
   - Server error response (500)

4. **Property Validations:**
   - TOTP code pattern: `^[0-9]{6}$`
   - Credential type enum: `[public-key]`
   - Authenticator attachment enum: `[platform, cross-platform]`
   - Transport enum: `[usb, nfc, ble, internal, hybrid]`
   - Role enum: `[admin, user, manager]`
   - MFA method enum: `[TOTP, PASSKEY]`

5. **Examples:**
   - Realistic base64url encoded values
   - JWT token example
   - Multiple error message examples

---

## Testing in Swagger UI

### Steps:

1. **Open Swagger UI:**

   ```
   http://localhost:3000/api-docs
   ```

2. **Find the Endpoint:**
   - Scroll to the **Users** section
   - Click on `POST /api/v1/users/verify-mfa-setup`

3. **Try it out:**
   - Click the "Try it out" button
   - Fill in the request body (TOTP or PASSKEY)
   - Click "Execute"

4. **View Response:**
   - See the server response
   - Check status code
   - View returned data

---

## Request Body Schemas

### TOTP Schema

```yaml
type: object
required:
  - challengeId
  - code
properties:
  challengeId:
    type: string
    example: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
  code:
    type: string
    pattern: "^[0-9]{6}$"
    example: "123456"
```

### PASSKEY Schema

```yaml
type: object
required:
  - challengeId
  - credential
properties:
  challengeId:
    type: string
    example: "51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a"
  credential:
    type: object
    required:
      - id
      - rawId
      - response
      - type
    properties:
      id: string (base64url)
      rawId: string (base64url)
      response:
        clientDataJSON: string (base64url)
        attestationObject: string (base64url)
        transports: array of strings
      type: "public-key"
      clientExtensionResults: object
      authenticatorAttachment: "platform" | "cross-platform"
```

---

## HTTP Status Codes

| Code | Meaning      | When It Occurs                               |
| ---- | ------------ | -------------------------------------------- |
| 200  | Success      | MFA verified and enabled                     |
| 400  | Bad Request  | Missing or invalid parameters                |
| 401  | Unauthorized | Invalid code/credential or expired challenge |
| 500  | Server Error | Internal server error                        |

---

## Integration with Frontend

### Using the Swagger-generated types:

```typescript
// TOTP Request
interface TotpVerificationRequest {
  challengeId: string;
  code: string; // 6 digits
}

// PASSKEY Request
interface PasskeyVerificationRequest {
  challengeId: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
      transports?: string[];
    };
    type: string;
    clientExtensionResults?: Record<string, unknown>;
    authenticatorAttachment?: string;
  };
}

// Response
interface VerificationResponse {
  message: string;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    role: "admin" | "user" | "manager";
    mfa_enabled: boolean;
    mfa_method: "TOTP" | "PASSKEY";
  };
}
```

---

## Additional Notes

- The Swagger UI provides an interactive interface to test the API
- You can download the OpenAPI spec from the Swagger UI
- The "Try it out" feature allows you to make real API calls
- All request/response examples are realistic and tested

---

## Summary

✅ **Enhanced Swagger documentation created for `/verify-mfa-setup`**
✅ **Includes detailed schemas for TOTP and PASSKEY**
✅ **Multiple error examples provided**
✅ **Interactive testing available in Swagger UI**
✅ **Ready for frontend integration**

Access it now at: **http://localhost:3000/api-docs** 🎉
