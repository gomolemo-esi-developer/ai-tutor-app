# Removal Plan: firstName & lastName from System

## Overview
Complete removal of `firstName` and `lastName` fields from the entire system (frontend, backend, API, database).

## 1. FRONTEND CHANGES

### Auth.tsx (Registration Form)
**Remove:**
- Lines 24-25: State declarations (`firstName`, `lastName`)
- Lines 470-481: First Name input field
- Lines 501-512: Last Name input field
- Lines 132-133, 168-169: firstName/lastName in register call
- Lines 250-251: Reset in toggle handler

**Update:**
- Line 382: Heading text "Create Account" → stays same
- Registration will only have: Email, Password, Student Number

### AuthContext.tsx
**Remove from User interface (lines 11-12):**
```typescript
firstName?: string;
lastName?: string;
```

**Update in RegisterData interface (lines 17-18):**
```typescript
// Remove:
firstName: string;
lastName: string;
```

**Update mock users (lines 50-66):**
- Remove firstName/lastName from mock user objects
- Use email as identifier

### Types (types/index.ts)
**Remove from all interfaces:**
- StudentProfile: Remove firstName, lastName (lines 31-32)
- EducatorProfile: Remove firstName, lastName (lines 50-51)
- User: Remove firstName, lastName (lines 14-15)
- Other user-related types

### Profile Component (pages/common/Profile.tsx)
**Remove:**
- Lines 120-123: fullName construction from firstName/lastName
- If profile displays name, remove or adjust

### LeftSidebar (components/layout/LeftSidebar.tsx)
**Remove:**
- Lines 71-73: fullName construction
- Any display of user name using firstName/lastName

### FileUploadModal (components/educator/FileUploadModal.tsx)
**Remove:**
- Lines 147-150: Author name construction
- Lines 469-470: Display name logic
- Replace with email or remove author field

### Mock Data (data/mockData.ts)
**Remove:**
- Lines 138-139, 146-147: Educator firstName/lastName
- Lines 158-159, 167-168: Student firstName/lastName

### Admin Pages
**EducatorForm.tsx:**
- Remove lines 9-10: firstName, lastName in interface
- Remove lines 47-48: State initialization
- Remove lines 115-116: Form value setting
- Remove lines 152-153: Field names array
- Remove lines 225-226: API payload

**StudentForm.tsx:**
- Remove lines 11-12: firstName, lastName in interface
- Remove lines 56-57: State initialization
- Remove lines 119-120: Form value setting
- Remove lines 155-156: Field names array
- Remove lines 212-213: API payload

**Lecturers.tsx:**
- Remove lines 17-18: firstName, lastName in interface
- Remove lines 87-88: Form value initialization
- Remove lines 90-91: Name/surname mapping
- Update line 170: Display (currently shows firstName/lastName)
- Update lines 314-315: Name/surname mapping
- Update line 333: Delete confirmation message

**Students.tsx:**
- Remove lines 48-49: firstName, lastName in interface
- Remove lines 107-108: Form value initialization
- Remove lines 113-114: Name/surname mapping
- Update line 196: Column key
- Update line 200: Display rendering
- Update lines 338-339: Search filter logic

---

## 2. BACKEND CHANGES

### Type Definitions (models/types.ts)
**Remove from all interfaces:**
- User interface (lines 9-10)
- AuthResponse interface (lines 33-34)
- QuickBypassRecord interface (lines 57-58)

### Validation Schemas (models/schemas.ts)
**Remove:**
- registerSchema: firstName, lastName (lines 15-16)
- loginSchema: firstName, lastName (lines 33-34)
- registrationActivationSchema: firstName, lastName (lines 70-71)
- registerActivationSchema: firstName, lastName (lines 89-90)

### Auth Service (services/auth.service.ts)
**Update registerUser function:**
- Remove parameters: firstName, lastName (lines 43-44)
- Remove Cognito attributes (lines 59-60): given_name, family_name
- Update function signature to not accept these params

**Update loginUser function:**
- Remove firstName/lastName from return object (lines 218-219)

**Update EmailService call (line 132):**
- Currently: `EmailService.sendVerificationCode(email, firstName, code)`
- Update to: `EmailService.sendVerificationCode(email, code)`

### Quick Bypass Service (services/quick-bypass.service.ts)
**Remove:**
- Lines 147-148: firstName, lastName in response
- Lines 378-379: firstName, lastName in return
- Update all response objects to exclude these fields

### Email Service (services/email.service.ts)
**Update sendVerificationCode (lines 27-79):**
- Remove firstName parameter
- Change greeting from "Hello ${firstName}" → "Hello,"

**Update sendWelcomeEmail (lines 148-198):**
- Remove firstName parameter
- Change greeting

**Update sendQuickLinkEmail (lines 263-287):**
- Remove firstName parameter
- Change greeting

### Lambda Handlers

**register.ts:**
- Remove lines 24-25: Input firstName, lastName
- Remove lines 37-38, 69-70, 97-98, 112-113: firstName/lastName in responses
- Update input validation

**register-activation.ts:**
- Remove lines 26-27: Example firstName, lastName in comments
- Remove lines 60-61: Input firstName, lastName
- Remove lines 81-82, 154-155, 163-164: firstName/lastName in responses
- Update validation and activation logic

**login.ts:**
- Update response to not include firstName/lastName

**student/profile.ts:**
- Remove lines 116-117: firstName, lastName from response
- Update comment (line 6)

**educator/profile.ts:**
- Remove lines 95-96: firstName, lastName from response
- Update comment (line 6)
- Line 434: Remove name construction logic

**admin/students.ts:**
- Remove lines 23-24: firstName, lastName from response
- Remove lines 79-80: Input firstName, lastName

**admin/lecturers.ts:**
- Remove lines 23-24: firstName, lastName from response
- Remove lines 77-78: Input firstName, lastName

**educator/portal-files.ts:**
- Update line 434: Remove firstName/lastName name construction
- Replace with email or static identifier

---

## 3. DATABASE SCHEMA CHANGES

### Cognito User Attributes
- Remove `given_name` attribute
- Remove `family_name` attribute
- Only keep: email, password (and any other essential attributes)

### DynamoDB Tables
**Users table:** Remove firstName, lastName columns if they exist

**Students table:** Remove firstName, lastName if stored separately

**Educators table:** Remove firstName, lastName if stored separately

---

## 4. API ENDPOINT CHANGES

### POST /api/auth/register
**Before:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student"
}
```

**After:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "role": "student"
}
```

### POST /api/auth/register-activation
**Before:**
```json
{
  "email": "educator@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "staffNumber": "E001",
  "role": "educator"
}
```

**After:**
```json
{
  "email": "educator@example.com",
  "password": "password123",
  "staffNumber": "E001",
  "role": "educator"
}
```

### POST /api/auth/login
**Response:**
```json
{
  "accessToken": "jwt...",
  "user": {
    "userId": "...",
    "email": "user@example.com",
    "role": "student"
    // Remove: firstName, lastName
  }
}
```

### GET /student/profile
**Response:**
```json
{
  "studentNumber": "S001",
  "email": "student@example.com",
  // Remove: firstName, lastName
}
```

### GET /educator/profile
**Response:**
```json
{
  "staffNumber": "E001",
  "email": "educator@example.com",
  // Remove: firstName, lastName
}
```

---

## 5. IMPLEMENTATION STRATEGY

### Phase 1: Backend Changes
1. Update type definitions (models/types.ts)
2. Update validation schemas (models/schemas.ts)
3. Update AuthService
4. Update QuickBypassService
5. Update EmailService
6. Update all Lambda handlers
7. Update database schema (if needed)

### Phase 2: Frontend Changes
1. Update AuthContext
2. Update types (types/index.ts)
3. Remove from Auth.tsx form
4. Update admin pages (EducatorForm, StudentForm, Lecturers, Students)
5. Update components (Profile, LeftSidebar, FileUploadModal)
6. Update mock data and services

### Phase 3: Testing
- Test student registration
- Test educator activation
- Test quick login
- Test profile pages
- Test admin pages
- Verify API responses

---

## 6. AFFECTED USER FLOWS

### Student Registration
- **Before:** Email → Password → FirstName → LastName → Verify Email
- **After:** Email → Password → Verify Email

### Educator Activation
- **Before:** Email → Password → FirstName → LastName → Staff Number → Verify Email
- **After:** Email → Password → Staff Number → Verify Email

### Quick Login
- **Before:** Staff Number (firstName/lastName in response)
- **After:** Staff Number (no name in response)

### Profile Display
- **Before:** Shows "John Doe" (firstName lastName)
- **After:** Shows "student@example.com" or role identifier

---

## 7. SEARCH & REPLACE HELPERS

### Quick finds:
```
firstName
lastName
given_name (in Cognito)
family_name (in Cognito)
fullName
first name
last name
```

### Verify complete removal:
All instances should be removed from:
- Frontend components
- Backend services
- Lambda handlers
- Type definitions
- Validation schemas
- Mock data

