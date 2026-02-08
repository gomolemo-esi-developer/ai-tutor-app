# TutorVerse DynamoDB Schema Documentation

## Overview
TutorVerse uses 14 DynamoDB tables for a complete educational platform. All tables use pay-per-request billing and have point-in-time recovery enabled.

## Tables Structure

### 1. **aitutor_users** (Core Identity)
Stores user account information for all roles.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| userId | String | HASH | Unique user identifier (UUID) |
| email | String | GSI | User email address (unique) |
| createdAt | Number | GSI | Timestamp when user was created |
| firstName | String | - | User's first name |
| lastName | String | - | User's last name |
| role | String | - | User role: admin, educator, student |
| status | String | - | active, inactive, suspended |
| isActive | Boolean | - | Account activation status |
| lastLogin | Number | - | Last login timestamp |
| campusId | String | - | Associated campus ID |
| departmentId | String | - | Associated department ID |

**Indexes:**
- email-index (Global)
- createdAt-index (Global)

---

### 2. **aitutor_lecturers** (Educator Profile)
Stores educator/lecturer information.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| lecturerId | String | HASH | Unique lecturer identifier (UUID) |
| userId | String | GSI | Reference to user record |
| staffNumber | String | GSI | Unique staff/badge number |
| firstName | String | - | Lecturer's first name |
| lastName | String | - | Lecturer's last name |
| email | String | - | Work email address |
| departmentId | String | GSI | Associated department |
| qualifications | String | - | Academic qualifications |
| specialization | String | - | Area of expertise |
| officeLocation | String | - | Office/room number |
| phone | String | - | Contact phone |
| status | String | - | active, inactive, on_leave |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- userId-index (Global)
- staffNumber-index (Global)
- departmentId-index (Global)

---

### 3. **aitutor_students** (Student Profile)
Stores student information and enrollment data.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| studentId | String | HASH | Unique student identifier (UUID) |
| userId | String | GSI | Reference to user record |
| studentNumber | String | GSI | Unique student ID/matriculation number |
| firstName | String | - | Student's first name |
| lastName | String | - | Student's last name |
| email | String | - | Student email address |
| departmentId | String | GSI | Associated department |
| enrollmentYear | Number | - | Year of enrollment |
| status | String | - | active, graduated, suspended, inactive |
| gpa | Number | - | Current GPA |
| phone | String | - | Contact phone |
| dateOfBirth | String | - | DOB in YYYY-MM-DD format |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- userId-index (Global)
- studentNumber-index (Global)
- departmentId-index (Global)

---

### 4. **aitutor_modules** (Course Module)
Stores course modules/subjects.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| moduleId | String | HASH | Unique module identifier (UUID) |
| courseId | String | GSI | Associated course ID |
| moduleCode | String | - | Module code (e.g., CS101) |
| moduleName | String | - | Module/course name |
| description | String | - | Course description |
| credits | Number | - | Credit units |
| semesterOffered | String | - | Which semester (1, 2, 3) |
| lecturerId | String | - | Lecturer teaching this module |
| status | String | - | active, archived, draft |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- courseId-index (Global)

---

### 5. **aitutor_files** (Module Files/Resources)
Stores file metadata and S3 references.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| fileId | String | HASH | Unique file identifier (UUID) |
| moduleId | String | GSI | Associated module ID |
| fileName | String | - | Original file name |
| fileType | String | - | File MIME type (pdf, docx, etc.) |
| fileSize | Number | - | File size in bytes |
| s3Key | String | - | S3 object key/path |
| s3Bucket | String | - | S3 bucket name |
| uploadedBy | String | - | User ID who uploaded |
| uploadedAt | Number | - | Upload timestamp |
| description | String | - | File description |
| isPublished | Boolean | - | Visible to students |
| downloadCount | Number | - | Number of downloads |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- moduleId-index (Global)

---

### 6. **aitutor_departments** (Department)
Stores department information.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| departmentId | String | HASH | Unique department ID (UUID) |
| facultyId | String | GSI | Associated faculty ID |
| departmentName | String | - | Department name |
| departmentCode | String | - | Abbreviation (e.g., CS, ENG) |
| description | String | - | Department description |
| headOfDepartment | String | - | HOD user ID |
| phone | String | - | Department phone |
| email | String | - | Department email |
| location | String | - | Campus location |
| status | String | - | active, inactive |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- facultyId-index (Global)

---

### 7. **aitutor_faculties** (Faculty)
Stores faculty/college information.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| facultyId | String | HASH | Unique faculty ID (UUID) |
| facultyName | String | - | Faculty name |
| facultyCode | String | - | Faculty code |
| description | String | - | Faculty description |
| dean | String | - | Dean user ID |
| phone | String | - | Faculty phone |
| email | String | - | Faculty email |
| status | String | - | active, inactive |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

---

### 8. **aitutor_courses** (Course/Program)
Stores course/program information.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| courseId | String | HASH | Unique course ID (UUID) |
| departmentId | String | GSI | Associated department |
| courseName | String | - | Course/program name |
| courseCode | String | - | Course code (e.g., CS_BSC) |
| description | String | - | Course description |
| duration | Number | - | Program duration in years |
| level | String | - | Degree level (100, 200, 300, 400) |
| totalCredits | Number | - | Total credits for program |
| startDate | String | - | Program start date |
| coordinator | String | - | Program coordinator user ID |
| status | String | - | active, inactive, archived |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- departmentId-index (Global)

---

### 9. **aitutor_campuses** (Campus/Location)
Stores campus information.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| campusId | String | HASH | Unique campus ID (UUID) |
| campusName | String | - | Campus name |
| campusCode | String | - | Campus code |
| location | String | - | Physical location/address |
| city | String | - | City name |
| state | String | - | State/Province |
| country | String | - | Country |
| phone | String | - | Campus phone |
| email | String | - | Campus email |
| principal | String | - | Principal/rector user ID |
| status | String | - | active, inactive |
| createdAt | Number | - | Creation timestamp |
| updatedAt | Number | - | Last update timestamp |

---

### 10. **aitutor_chat_sessions** (AI Chat Sessions)
Stores AI tutoring chat sessions.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| sessionId | String | HASH | Unique session ID (UUID) |
| studentId | String | GSI (RANGE) | Associated student |
| moduleId | String | - | Module being studied |
| createdAt | Number | GSI (RANGE) | Session start time |
| expiresAt | Number | - | TTL expiration (7 days) |
| topic | String | - | Chat topic/subject |
| messageCount | Number | - | Number of messages |
| status | String | - | active, closed, archived |
| lastMessageAt | Number | - | Last message timestamp |
| updatedAt | Number | - | Last update timestamp |

**Indexes:**
- studentId-createdAt (Global, sorted by date)

**TTL:** expiresAt (7 days retention)

---

### 11. **aitutor_chat_messages** (Chat Message History)
Stores individual chat messages.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| messageId | String | HASH | Unique message ID (UUID) |
| sessionId | String | GSI | Associated session |
| role | String | - | "student" or "ai" |
| content | String | - | Message text |
| timestamp | Number | - | Message timestamp |
| expiresAt | Number | - | TTL expiration |
| metadata | Map | - | Additional data |
| createdAt | Number | - | Creation timestamp |

**Indexes:**
- sessionId-index (Global)

**TTL:** expiresAt (7 days retention)

---

### 12. **aitutor_audit_logs** (System Audit Trail)
Stores all system actions for compliance and debugging.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| logId | String | HASH | Unique log ID (UUID) |
| userId | String | GSI (RANGE) | User who performed action |
| timestamp | Number | GSI (RANGE) | When action occurred |
| ttl | Number | - | TTL expiration |
| action | String | - | Action performed (create, update, delete) |
| entityType | String | - | Entity type (user, module, file, etc.) |
| entityId | String | - | ID of entity affected |
| oldValues | Map | - | Previous values |
| newValues | Map | - | Updated values |
| ipAddress | String | - | Source IP |
| userAgent | String | - | Browser/client info |

**Indexes:**
- userId-timestamp (Global, sorted by date)

**TTL:** ttl (30 days retention)

---

### 13. **aitutor_quiz_results** (AI Quiz Results)
Stores quiz generation and submission results.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| quizId | String | HASH | Unique quiz ID (UUID) |
| studentId | String | GSI | Student who took quiz |
| moduleId | String | - | Module quiz is for |
| expiresAt | Number | - | TTL expiration |
| questions | List | - | Quiz questions (JSON) |
| answers | List | - | Student answers |
| score | Number | - | Quiz score (0-100) |
| totalQuestions | Number | - | Number of questions |
| correctAnswers | Number | - | Correct answer count |
| generatedAt | Number | - | Quiz generation time |
| submittedAt | Number | - | Submission timestamp |
| duration | Number | - | Time spent (seconds) |
| feedback | String | - | AI-generated feedback |
| status | String | - | draft, submitted, graded |

**Indexes:**
- studentId-index (Global)

**TTL:** expiresAt (30 days retention)

---

### 14. **aitutor_summary_results** (Content Summaries)
Stores AI-generated content summaries.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| summaryId | String | HASH | Unique summary ID (UUID) |
| studentId | String | GSI | Student who requested |
| moduleId | String | - | Module being summarized |
| fileId | String | - | Source file ID |
| expiresAt | Number | - | TTL expiration |
| originalContent | String | - | Original text/content |
| summaryText | String | - | AI-generated summary |
| summaryLength | String | - | Short, medium, long |
| keyPoints | List | - | Key points extracted |
| generatedAt | Number | - | Generation timestamp |
| regenerationCount | Number | - | Times regenerated |
| rating | Number | - | User rating (1-5) |
| feedback | String | - | User feedback |
| status | String | - | active, archived |

**Indexes:**
- studentId-index (Global)

**TTL:** expiresAt (30 days retention)

---

## Key Design Patterns

### 1. **Naming Conventions**
- All table names prefixed with `aitutor_`
- All IDs are UUIDs
- Timestamps are milliseconds since epoch (Number)
- Boolean fields are explicit

### 2. **Required Attributes for Every Record**
- **Primary Key**: Unique identifier (ID)
- **createdAt**: Record creation timestamp
- **updatedAt**: Last modification timestamp (optional but recommended)

### 3. **GSI Strategy**
- Email queries → email-index
- User lookups → userId-index
- Department filtering → departmentId-index
- Time-based queries → timestamp with RANGE key

### 4. **TTL Strategy**
- Chat data: 7 days
- Audit logs: 30 days
- Quiz/Summary results: 30 days
- Set on expiresAt or ttl attribute

### 5. **Status Values**
- Users: `active`, `inactive`, `suspended`
- Lecturers: `active`, `inactive`, `on_leave`
- Students: `active`, `graduated`, `suspended`, `inactive`
- Modules/Courses: `active`, `inactive`, `archived`, `draft`
- Files: Published flag (Boolean)
- Chat: `active`, `closed`, `archived`
- Quiz: `draft`, `submitted`, `graded`

---

## Data Relationships

```
Campus
  └─ Faculty (facultyId)
      └─ Department (departmentId)
          ├─ Lecturers (lecturerId → departmentId)
          ├─ Students (studentId → departmentId)
          └─ Courses (courseId → departmentId)
              └─ Modules (moduleId → courseId)
                  ├─ Files (fileId → moduleId)
                  ├─ ChatSessions (sessionId → studentId + moduleId)
                  │   └─ ChatMessages (messageId → sessionId)
                  ├─ QuizResults (quizId → studentId + moduleId)
                  └─ SummaryResults (summaryId → studentId + moduleId)

Users
  ├─ Lecturer records (lecturerId → userId)
  └─ Student records (studentId → userId)

AuditLogs (logs all changes to above)
```

---

## Best Practices for Data Upload

1. **Generate Proper IDs**: Use UUID v4 for all ID fields
2. **Timestamp Accuracy**: Use current milliseconds for createdAt/updatedAt
3. **Referential Integrity**: Ensure FKs reference existing records
4. **Status Validation**: Use only valid status values from schema
5. **Required Fields**: Always populate name, code, and status fields
6. **Error Handling**: Batch writes should handle partial failures
7. **Empty Fields**: Never store empty strings or "N/A" - use null or omit
8. **Boolean Handling**: Use true/false, never strings
9. **Numeric Fields**: Use Number type, not string
10. **Timestamps**: Always milliseconds, never ISO strings for dates in DynamoDB

