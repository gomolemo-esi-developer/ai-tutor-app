# AI Tutor Authentication System - Workflow & User Flows

## System Overview

The AI Tutor system has **three user roles**, each with distinct authentication flows, permissions, and functionality:

1. **Student** - Learners accessing course content
2. **Educator** - Teachers managing course materials
3. **Admin** - System administrators managing the entire platform

---

## 1. STUDENT WORKFLOW

### Entry Point
- User lands on `/auth` page
- Selects **"Student"** role
- Chooses between **New Account** or **Login**

### Registration Flow (New Student)
```
Register Form → Email & Password → First/Last Name
                ↓
        Backend Verification
                ↓
    Email Verification Code Sent
                ↓
    Student Enters Code on Verify Page
                ↓
         JWT Token Generated
                ↓
      Stored in localStorage
```

**API Endpoints:**
- `POST /api/auth/register` - Register new account
- `POST /api/auth/verify-email` - Verify email with code
- Generates JWT token → Stored locally → AuthContext updated

### Login Flow (Existing Student)
```
Login Form → Email & Password
                ↓
      Backend Authentication
                ↓
      Email Verification Code Sent
                ↓
    Student Enters Code on Verify Page
                ↓
         JWT Token Generated
```

**API Endpoints:**
- `POST /api/auth/login` - Authenticate credentials
- `POST /api/auth/verify-email` - Verify code

### Post-Authentication
Once logged in:
- **Route:** `/modules`
- **Dashboard Access:**
  - 📚 **View Modules** - Browse available courses
  - 💬 **Chat with AI Tutor** - Ask questions, get AI responses
  - 🧩 **Module Content** - View course materials, lessons
  - 📝 **Take Quizzes** - Complete assessments
  - 📊 **View Results** - See quiz performance
  - 📄 **Module Summaries** - Get AI-generated study summaries
  - 👤 **Profile Settings** - Update personal info

### Protected Routes
```
/modules                    - List all modules
/modules/:moduleCode        - View module content
/modules/:moduleCode/quiz   - Take quiz
/chat                       - AI chat interface
/profile                    - User profile
```

### Session Management
- JWT token stored in `localStorage`
- Token included in all API requests (via apiClient)
- Logout clears token and redirects to `/auth`

---

## 2. EDUCATOR WORKFLOW

### Entry Point
- User lands on `/auth` page
- Selects **"Educator"** role
- Has **TWO options:**

### Option A: Activate Pre-created Account
- Admin creates educator account in advance
- Educator activates it using **Staff Number**

```
Activation Form → Email, Password, Staff Number
                ↓
    Link Pre-created Record to Credentials
                ↓
        Email Verification Code Sent
                ↓
    Educator Enters Code on Verify Page
                ↓
         JWT Token Generated
```

**API Endpoint:** `POST /api/auth/register-activation`

### Option B: Quick Login (Demo/Fast Access)
- Quick button for testing
- Enter **Staff Number**
- Generate instant access link
- No email verification needed

```
Quick Login Modal → Enter Staff Number
                ↓
POST /api/auth/quick-link-existing
                ↓
    Generate Unique Access Link
                ↓
    Redirect to Link → Instant Login
```

**API Endpoint:** `POST /api/auth/quick-link-existing`

### Post-Authentication
Once logged in:
- **Route:** `/files`
- **Dashboard Access:**
  - 📁 **Manage Modules** - View assigned courses
  - 📤 **Upload Files** - Add course materials, PDFs, videos
  - 👥 **View Students** - See enrolled students
  - 📝 **Create Assignments** - Add quizzes and tasks
  - 📊 **View Analytics** - Monitor student progress
  - 👤 **Profile Settings** - Update educator info

### Protected Routes
```
/files                      - List educator's modules
/files/:moduleCode          - Upload/manage files for module
/profile                    - Educator profile
```

### Key Features
- **Staff Number Integration** - Links to pre-created accounts
- **File Management** - Upload and organize course materials
- **Student Tracking** - Monitor which students are enrolled
- **Assessment Tools** - Create quizzes and assignments

---

## 3. ADMIN WORKFLOW

### Entry Point
- User lands on `/auth` page
- Selects **"Admin"** role
- Uses **Login Only** (no registration)

```
Login Form → Email & Password
                ↓
      Backend Authentication
                ↓
    Email Verification Code Sent
                ↓
    Admin Enters Code on Verify Page
                ↓
         JWT Token Generated
```

**API Endpoint:** `POST /api/auth/login`

### Post-Authentication
Once logged in:
- **Route:** `/admin/lecturers` (default landing)
- **Dashboard Access:**

#### User Management
- 👨‍🏫 **Manage Lecturers** (`/admin/lecturers`)
  - Add new educators
  - View educator accounts
  - Edit educator details
  - Delete educators
  - Generate staff numbers for pre-creation

- 👨‍🎓 **Manage Students** (`/admin/students`)
  - Add new students
  - View student accounts
  - Edit student details
  - Delete students
  - Generate student numbers for bulk registration

#### Academic Management
- 📚 **Module Management** (`/admin/modules`)
  - Create/edit/delete modules
  - Assign modules to courses
  - Set module prerequisites
  - Configure module properties

- 📖 **Courses** (`/admin/courses`)
  - Create courses
  - Manage course structure
  - Assign modules to courses
  - Set course durations

- 🏢 **Faculty** (`/admin/faculty`)
  - Manage faculties/colleges
  - Organize departments under faculties
  - View faculty overview

- 🔧 **Departments** (`/admin/departments`)
  - Create departments
  - Assign to faculties
  - Configure department settings

- 🏫 **Campus** (`/admin/campus`)
  - Manage campus locations
  - Configure campus settings

- 🎯 **College Hub** (`/admin/college-hub`)
  - Central configuration
  - System-wide settings
  - Integration settings

#### Content Management
- 📁 **Admin Files** (`/admin/files`)
  - Manage system files
  - Archive/backup content
  - Content organization

### Protected Routes
```
/admin/lecturers            - Manage educators
/admin/students             - Manage learners
/admin/modules              - Manage courses/modules
/admin/courses              - Manage course structure
/admin/faculty              - Manage faculties
/admin/departments          - Manage departments
/admin/campus               - Manage campus
/admin/college-hub          - System configuration
/admin/files                - Manage system files
```

### Admin Capabilities
- ✅ Full system access (both admin and super_admin roles supported)
- ✅ CRUD operations on all entities
- ✅ User creation and management
- ✅ Academic structure configuration
- ✅ Permissions and role assignment
- ✅ System monitoring and analytics
- ✅ Bulk operations (student/educator import)

---

## Authentication Architecture

### Tech Stack
- **Frontend:** React + TypeScript (React Router for navigation)
- **Backend:** AWS Lambda + Amazon Cognito + DynamoDB
- **Auth Method:** JWT Tokens
- **Validation:** Zod schemas

### Context Management
```typescript
// AuthContext provides:
{
  user: {
    userId: string;
    email: string;
    role: 'student' | 'educator' | 'admin' | 'super_admin';
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  };
  token: string | null;
  isAuthenticated: boolean;
  selectedRole: UserRole | null;
  
  // Methods
  login(email, password): Promise<boolean>;
  register(data): Promise<boolean>;
  logout(): Promise<void>;
  verifyEmail(email, code): Promise<boolean>;
  changePassword(oldPassword, newPassword): Promise<void>;
  hasRole(role): boolean;
}
```

### Route Protection Mechanism
1. **ProtectedRoute** - Generic guard checking authentication + role
2. **StudentRouteGuard** - Ensures role === 'student'
3. **EducatorRouteGuard** - Ensures role === 'educator'
4. **ProtectedRoute with roles** - For admin routes

### Token Flow
```
1. User authenticates → Backend generates JWT
2. JWT stored in localStorage
3. API Client reads token from localStorage
4. All requests include: Authorization: Bearer {token}
5. Backend validates JWT on each request
6. Logout clears token and user state
```

---

## Security Features

✅ **JWT-based Authentication**
- Tokens stored securely in localStorage
- Token included in request headers
- Backend validates on each request

✅ **Email Verification**
- Verification code sent to email
- User must verify before account is active
- Prevents fake email registrations

✅ **Role-Based Access Control (RBAC)**
- Three distinct roles with different permissions
- Routes protected by role verification
- Admin can only access admin routes, etc.

✅ **Password Management**
- Passwords stored securely (hashed backend)
- Change password functionality
- Password reset via email

✅ **Session Management**
- Auto-logout on token expiry
- Clear localStorage on logout
- Persistent sessions (restored from localStorage)

---

## User Journey Flowchart

```
┌─────────────────────────────────────┐
│   Landing Page (Index)              │
│   - Browse features                 │
│   - Call to Action → Auth Page      │
└────────────────┬────────────────────┘
                 │
        ┌────────▼────────┐
        │   Auth Page     │
        │ (Role Selection)│
        └────────┬────────┘
                 │
        ┌────────┴────────┬─────────────┐
        │                 │             │
      ┌─▼─┐           ┌───▼──┐      ┌──▼──┐
      │STU│           │EDUC  │      │ADMIN│
      └─┬─┘           └───┬──┘      └──┬──┘
        │                 │            │
    ┌───┴─────┐      ┌────┴────┐   ┌──┴──┐
    │          │      │         │   │     │
  ┌─▼─┐    ┌──▼──┐ ┌─▼──┐ ┌───▼─┐│LOGIN│
  │NEW│    │LOGIN│ │NEW │ │ACTI-││     │
  │   │    │     │ │    │ │VATE ││     │
  └─┬─┘    └──┬──┘ └─┬──┘ └───┬─┘└──┬──┘
    │         │      │        │    │
    └─┬───────┴─┬────┴─┬──────┘    │
      │         │      │           │
      │    ┌────▼──────▼────┐      │
      │    │  Email Verify  │      │
      │    │  Enter Code    │      │
      │    └────┬───────────┘      │
      │         │                  │
      └──────┬──┴──────────────────┘
             │
         ┌───▼────────────────────┐
         │  JWT Token Generated   │
         │  Store in localStorage │
         │  AuthContext Updated   │
         └───┬────────────────────┘
             │
       ┌─────┴────────┬──────────────┬──────────┐
       │              │              │          │
    ┌──▼──┐      ┌────▼───┐    ┌────▼─┐    ┌──▼──────┐
    │STUDENT     │EDUCATOR│    │ADMIN │    │COMMON   │
    │Dashboard   │Dashboard   │Dashboard   │Profile  │
    │ /modules   │ /files   │  │/admin/*   │/profile │
    │ /chat      │          │  │           │         │
    │ /quiz      │          │  │           │         │
    └────────────┴──────────┴──┴──────┴────┴─────────┘
```

---

## Summary Table

| Aspect | Student | Educator | Admin |
|--------|---------|----------|-------|
| **Registration** | Yes (New) | No | No |
| **Activation** | No | Yes (Pre-created) | No |
| **Quick Login** | No | Yes | No |
| **Primary Route** | `/modules` | `/files` | `/admin/lecturers` |
| **Key Function** | Learn & Take Quizzes | Create & Upload Content | Manage System |
| **Entity Management** | View assigned content | Manage own modules | Manage all entities |
| **Email Verification** | Required | Required | Required |
| **Password** | Self-set | Self-set | Set during registration |

