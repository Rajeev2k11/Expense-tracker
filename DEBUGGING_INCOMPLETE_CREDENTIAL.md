# Debugging "Incomplete credential data received" Error

## Error Details

**Error Message:** `{"message":"Incomplete credential data received"}`

**Location:** `verifyMfaSetup` controller function (line 412)

**Cause:** The `@simplewebauthn/server` library's `verifyRegistrationResponse` function couldn't extract `credentialID` or `credentialPublicKey` from the credential object.

---

## Debugging Steps

### Step 1: Check Server Logs

With the enhanced logging added, check your server console for these logs:

```
Received credential: { ... }
Expected challenge: ...
Expected origin: ...
Expected RP ID: ...
Verification result: { verified: true/false, hasRegistrationInfo: true/false }
Extracted credential data: { hasCredentialID: ..., credentialIDLength: ..., ... }
```

### Step 2: Common Issues and Solutions

#### ❌ Issue 1: Missing or Incorrect Credential Format

**Problem:** The credential object is not properly formatted

**Solution:** Ensure your frontend sends the credential in this EXACT format:

```json
{
  "challengeId": "your_challenge_id",
  "credential": {
    "id": "base64url_string",
    "rawId": "base64url_string",
    "response": {
      "clientDataJSON": "base64url_string",
      "attestationObject": "base64url_string",
      "transports": ["internal", "hybrid"]
    },
    "type": "public-key",
    "clientExtensionResults": {},
    "authenticatorAttachment": "platform"
  }
}
```

**Frontend Check:**

```typescript
// Make sure you're converting to base64url, NOT base64
const uint8ArrayToBase64url = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // IMPORTANT: Replace characters for base64url format
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};
```

#### ❌ Issue 2: Challenge Mismatch

**Problem:** The challenge in the credential doesn't match the stored challenge

**Check Server Logs For:**

```
Expected challenge: ABC123...
```

**Solution:**

1. Ensure you're using the same `challengeId` that was returned from `/select-mfa-method`
2. Don't regenerate or modify the challenge
3. The challenge is stored in `user.webauthn_challenge` on the server

#### ❌ Issue 3: Origin or RP ID Mismatch

**Problem:** The origin or RP ID in the credential doesn't match server expectations

**Check Server Logs For:**

```
Expected origin: http://localhost:3000
Expected RP ID: localhost
```

**Solution:**

1. Check your `.env` file:
   ```
   FRONTEND_APP_URL=http://localhost:3000
   RPID=localhost
   ```
2. Ensure frontend and backend are on the same domain
3. For HTTPS, use proper domain names

#### ❌ Issue 4: Malformed Base64url Encoding

**Problem:** The credential contains standard base64 instead of base64url

**Difference:**

- **Base64:** Uses `+`, `/`, and `=`
- **Base64url:** Uses `-`, `_`, and NO padding

**Solution:** Use the conversion function above

#### ❌ Issue 5: Missing Required Fields

**Problem:** Credential is missing required fields

**Required Fields:**

- `id` (string)
- `rawId` (base64url string)
- `response.clientDataJSON` (base64url string)
- `response.attestationObject` (base64url string)
- `type` (must be "public-key")

**Check:**

```javascript
console.log("Credential validation:", {
  hasId: !!credential.id,
  hasRawId: !!credential.rawId,
  hasClientDataJSON: !!credential.response?.clientDataJSON,
  hasAttestationObject: !!credential.response?.attestationObject,
  type: credential.type,
});
```

---

## Test Your Credential Format

### Use this checklist:

```javascript
// Frontend - Before sending to server
const credentialForServer = {
  id: credential.id, // ✓ String
  rawId: uint8ArrayToBase64url(
    // ✓ Base64url
    new Uint8Array(credential.rawId),
  ),
  response: {
    clientDataJSON: uint8ArrayToBase64url(
      // ✓ Base64url
      new Uint8Array(response.clientDataJSON),
    ),
    attestationObject: uint8ArrayToBase64url(
      // ✓ Base64url
      new Uint8Array(response.attestationObject),
    ),
    transports: response.getTransports?.() || [], // ✓ Array of strings
  },
  type: credential.type, // ✓ "public-key"
  clientExtensionResults: credential.getClientExtensionResults(), // ✓ Object
  authenticatorAttachment: credential.authenticatorAttachment || undefined, // ✓ String or undefined
};

// Verify the structure
console.log("Credential ready to send:", {
  id: credentialForServer.id.substring(0, 20) + "...",
  rawIdLength: credentialForServer.rawId.length,
  clientDataJSONLength: credentialForServer.response.clientDataJSON.length,
  attestationObjectLength:
    credentialForServer.response.attestationObject.length,
  type: credentialForServer.type,
});
```

---

## Quick Test with cURL

Test your credential format directly:

```bash
curl -X POST http://localhost:3000/api/v1/users/verify-mfa-setup \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "YOUR_CHALLENGE_ID",
    "credential": {
      "id": "TEST_ID",
      "rawId": "TEST_RAW_ID",
      "response": {
        "clientDataJSON": "TEST_CLIENT_DATA",
        "attestationObject": "TEST_ATTESTATION",
        "transports": ["internal"]
      },
      "type": "public-key",
      "clientExtensionResults": {},
      "authenticatorAttachment": "platform"
    }
  }'
```

---

## Expected Server Logs (Success)

When everything works correctly, you should see:

```
Received credential: {
  "id": "...",
  "rawId": "...",
  "response": {
    "clientDataJSON": "...",
    "attestationObject": "...",
    "transports": ["internal", "hybrid"]
  },
  "type": "public-key",
  "clientExtensionResults": {},
  "authenticatorAttachment": "platform"
}
Expected challenge: 51d91f1ce3b8b60562b2f1c2da6a004f528da5fa8d09e04a
Expected origin: http://localhost:3000
Expected RP ID: localhost
Verification result: { verified: true, hasRegistrationInfo: true }
Extracted credential data: {
  hasCredentialID: true,
  credentialIDLength: 64,
  hasCredentialPublicKey: true,
  credentialPublicKeyLength: 77,
  counter: 0
}
Passkey credential saved successfully
```

---

## Common Frontend Issues

### Issue: Using `ArrayBuffer` instead of `Uint8Array`

❌ **Wrong:**

```typescript
const rawId = bufferToBase64url(credential.rawId); // ArrayBuffer
```

✅ **Correct:**

```typescript
const rawId = uint8ArrayToBase64url(new Uint8Array(credential.rawId));
```

### Issue: Not converting response fields

❌ **Wrong:**

```typescript
response: {
  clientDataJSON: response.clientDataJSON,  // Still ArrayBuffer!
  attestationObject: response.attestationObject  // Still ArrayBuffer!
}
```

✅ **Correct:**

```typescript
response: {
  clientDataJSON: uint8ArrayToBase64url(new Uint8Array(response.clientDataJSON)),
  attestationObject: uint8ArrayToBase64url(new Uint8Array(response.attestationObject))
}
```

---

## Next Steps

1. **Check server console logs** - Look for the debug output
2. **Verify credential format** - Use the checklist above
3. **Test conversion functions** - Ensure base64url encoding is correct
4. **Check environment variables** - Verify FRONTEND_APP_URL and RPID
5. **Share the logs** - If still stuck, share the server console output

---

## Need More Help?

If you're still getting the error, please provide:

1. ✅ Server console logs (the debug output)
2. ✅ Frontend credential object (before sending to server)
3. ✅ Environment variables (FRONTEND_APP_URL, RPID)
4. ✅ Browser being used
5. ✅ Operating system

This will help diagnose the exact issue!
