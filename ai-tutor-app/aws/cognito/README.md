# Cognito Configuration & Authentication

## Overview

AWS Cognito User Pool for authentication and user management.

## User Pool Details

**Pool Name**: `ai-tutor-{environment}`
**Pool ID**: `us-east-2_hs2u4CU6a` (development)
**Region**: `us-east-2`
**Account ID**: `975050334073`

## Authentication Flows

### 1. User Password Auth Flow
User provides email and password. Backend validates with Cognito.

```
User → POST /api/auth/login → Backend → Cognito
         { email, password }
                             ← JWT Token ←
```

### 2. Refresh Token Flow
Token expires, user uses refresh token to get new access token.

```
User → POST /api/auth/refresh → Backend → Cognito
         { refreshToken }
                             ← New JWT Token ←
```

### 3. Sign-up Flow (Pre-created Users)
Admin creates user → User activates account.

```
Admin → Create User in Cognito
              ↓
User receives temporary password
              ↓
User → POST /api/auth/activate → Backend → Cognito
         { password, code }
              ↓
Account activated, user can login
```

## Attributes

### Standard Attributes
- `email` (Required, Verified)
- `email_verified` (Boolean)

### Custom Attributes
- `custom:role` - User role (student, educator, admin)
- `custom:staff_number` - Staff/Educator number (max 9 chars)
- `custom:student_number` - Student ID (max 9 chars)
- `custom:department_id` - Department UUID
- `custom:campus_id` - Campus UUID

## Password Policy

**Minimum Length**: 8 characters  
**Required Elements**:
- Uppercase letter (A-Z)
- Lowercase letter (a-z)
- Number (0-9)
- Special symbol (!@#$%^&*)

**Example valid passwords**:
- `MyPassword123!`
- `Admin@Pass2024`
- `SecureP@ssw0rd`

## User Groups

### Admin
- Full system access
- User management
- Configuration changes

### Educators
- Module creation and management
- File uploads
- Student grade management
- Chat support

### Students
- Module enrollment
- File downloads
- Quiz completion
- Chat access

## Account Recovery

**Primary Method**: Verified Email
- User clicks "Forgot Password"
- Receives verification code via email
- Sets new password

**MFA (Optional)**: Software token MFA
- Time-based OTP (TOTP)
- User sets up authenticator app
- Required for sensitive operations

## Integration with Backend

### Cognito Service
File: `backend/src/services/cognito.service.ts`

Methods:
- `signUp()` - Create new user
- `signIn()` - Authenticate user
- `confirmSignUp()` - Verify email
- `changePassword()` - Update password
- `adminCreateUser()` - Admin user creation
- `forgotPassword()` - Password reset flow
- `verifyUserAttribute()` - Verify custom attributes

### JWT Tokens

**Access Token Structure**:
```json
{
  "sub": "cognito-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "custom:role": "student",
  "custom:student_number": "S12345",
  "cognito:username": "user@example.com",
  "aud": "client-id",
  "token_use": "access",
  "scope": "openid email profile",
  "auth_time": 1704067200,
  "exp": 1704070800,
  "iat": 1704067200,
  "iss": "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxxxxxx"
}
```

**Token Validity**:
- Access Token: 1 hour
- ID Token: 1 hour
- Refresh Token: 7 days

## User Management

### Create User (Admin)

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-2_hs2u4CU6a \
  --username john.doe@example.com \
  --message-action SUPPRESS \
  --temporary-password TempPass123! \
  --user-attributes \
    Name=email,Value=john.doe@example.com \
    Name=email_verified,Value=true \
    Name="custom:role",Value=student \
    Name="custom:student_number",Value=S98765 \
  --region us-east-2
```

### Set Permanent Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-2_hs2u4CU6a \
  --username john.doe@example.com \
  --password NewPassword123! \
  --permanent \
  --region us-east-2
```

### List Users

```bash
aws cognito-idp list-users \
  --user-pool-id us-east-2_hs2u4CU6a \
  --region us-east-2
```

### Delete User

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id us-east-2_hs2u4CU6a \
  --username john.doe@example.com \
  --region us-east-2
```

## Environment Variables

Backend needs:
```env
COGNITO_USER_POOL_ID=us-east-2_hs2u4CU6a
COGNITO_CLIENT_ID=abcd1234efgh5678ijkl
COGNITO_REGION=us-east-2
```

Frontend needs:
```env
VITE_COGNITO_USER_POOL_ID=us-east-2_hs2u4CU6a
VITE_COGNITO_CLIENT_ID=abcd1234efgh5678ijkl
VITE_COGNITO_REGION=us-east-2
VITE_COGNITO_DOMAIN=ai-tutor-development.auth.us-east-2.amazoncognito.com
```

## Frontend Integration

### Authenticate.js (Amplify/CLI)
```javascript
import { Auth } from 'aws-amplify';

Auth.configure({
  region: 'us-east-2',
  userPoolId: 'us-east-2_hs2u4CU6a',
  userPoolWebClientId: 'client-id'
});

// Sign in
const user = await Auth.signIn(email, password);
const token = (await Auth.currentSession()).getIdToken().getJwtToken();

// Sign up
await Auth.signUp({
  username: email,
  password: password,
  attributes: { email: email }
});

// Forgot password
await Auth.forgotPassword(email);
```

## Security Best Practices

1. **Never expose Client Secret** (we use public client)
2. **Use HTTPS only** for all authentication calls
3. **Store tokens securely** (httpOnly cookies for web)
4. **Implement CSRF protection** for state-changing operations
5. **Use short-lived tokens** (1 hour access token)
6. **Rotate refresh tokens** regularly
7. **Implement token refresh** before expiration
8. **Use MFA for sensitive operations** (optional)

## Troubleshooting

### User can't reset password
- Check user's email is verified in Cognito
- Verify recovery method is set to email
- Check email configuration

### Token validation fails
- Verify JWT_SECRET matches in backend
- Check token hasn't expired
- Verify issuer URL matches pool

### Custom attributes not appearing
- Confirm attribute is marked as "custom"
- Check attribute data type matches value
- Verify it's added to app client

### Sign-up with temporary password fails
- Check password meets policy requirements
- Verify user hasn't already confirmed signup
- Check account status

## Next Steps

1. Set up custom domain (optional)
2. Configure email verification templates
3. Set up MFA for sensitive operations
4. Create user groups for RBAC
5. Configure CloudTrail logging
6. Set up alarms for suspicious activity
7. Implement advanced security features
   - Adaptive authentication
   - Compromised credentials detection
   - Account takeover protection

## Resources

- [Cognito User Pool Documentation](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/userguide/)
- [Cognito API Reference](https://docs.aws.amazon.com/cognito-user-identity-provider/latest/APIReference/)
- [JWT Token Structure](https://docs.aws.amazon.com/cognito/latest/developerguide/tokens-verifying.html)
