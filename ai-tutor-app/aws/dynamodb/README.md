# DynamoDB Schema & Configuration

## Overview

DynamoDB tables for the AI Tutor platform with schema design, indexes, and access patterns.

## Tables

### 1. aitutor_users
Primary user accounts for all roles (Admin, Educator, Student).

**Key Schema**:
- PK: `userId` (String)

**GSI (Global Secondary Indexes)**:
- `email-index`: PK=`email`

**Attributes**:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student|educator|admin",
  "passwordHash": "bcrypt_hash",
  "status": "active|inactive|suspended",
  "createdAt": 1704067200,
  "updatedAt": 1704067200,
  "lastLogin": 1704067200,
  "cognito_id": "cognito_sub"
}
```

**TTL**: None (persistent)

### 2. aitutor_educators
Educator profile information.

**Key Schema**:
- PK: `educatorId` (String)

**GSI**:
- `userId-index`: PK=`userId`

**Attributes**:
```json
{
  "educatorId": "uuid",
  "userId": "uuid",
  "staffNumber": "E12345",
  "department_id": "uuid",
  "campus_id": "uuid",
  "qualification": "PhD Computer Science",
  "specialization": ["AI", "ML", "Web Development"],
  "bio": "Brief bio",
  "officeHours": "Mon-Wed 2-4 PM",
  "modules": ["moduleId1", "moduleId2"],
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 3. aitutor_students
Student profile information.

**Key Schema**:
- PK: `studentId` (String)

**GSI**:
- `userId-index`: PK=`userId`

**Attributes**:
```json
{
  "studentId": "uuid",
  "userId": "uuid",
  "studentNumber": "S98765",
  "department_id": "uuid",
  "campus_id": "uuid",
  "enrolledModules": ["moduleId1", "moduleId2"],
  "academicYear": "2023-2024",
  "gpa": 3.85,
  "status": "active|on_leave|graduated",
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 4. aitutor_modules
Course modules.

**Key Schema**:
- PK: `moduleId` (String)

**GSI**:
- `courseId-index`: PK=`courseId`

**Attributes**:
```json
{
  "moduleId": "uuid",
  "courseId": "uuid",
  "code": "CS201",
  "name": "Advanced Algorithms",
  "description": "Study of algorithms and complexity analysis",
  "educatorId": "uuid",
  "credits": 3,
  "semester": 2,
  "status": "active|archived|draft",
  "files": ["fileId1", "fileId2"],
  "enrollmentLimit": 50,
  "enrolledCount": 45,
  "createdAt": 1704067200,
  "updatedAt": 1704067200,
  "startDate": 1704067200,
  "endDate": 1704672000
}
```

### 5. aitutor_files
File metadata and tracking.

**Key Schema**:
- PK: `fileId` (String)

**GSI**:
- `moduleId-index`: PK=`moduleId`
- `uploaderId-index`: PK=`uploaderId`

**Attributes**:
```json
{
  "fileId": "uuid",
  "moduleId": "uuid",
  "fileName": "lecture-notes.pdf",
  "fileType": "pdf",
  "fileSize": 2097152,
  "s3Key": "educators/{userId}/uploads/{moduleId}/{fileId}",
  "uploaderId": "uuid",
  "accessLevel": "public|restricted|private",
  "status": "pending_upload|uploaded|infected|ready",
  "virusScanStatus": "clean|infected|pending",
  "ragProcessed": false,
  "downloadCount": 23,
  "createdAt": 1704067200,
  "updatedAt": 1704067200,
  "expiresAt": null
}
```

### 6. aitutor_departments
Department reference data.

**Key Schema**:
- PK: `departmentId` (String)

**Attributes**:
```json
{
  "departmentId": "uuid",
  "code": "CS",
  "name": "Computer Science",
  "faculty_id": "uuid",
  "campus_id": "uuid",
  "headOfDepartment": "uuid",
  "email": "cs@university.edu",
  "phone": "+1234567890",
  "location": "Building A, Floor 3",
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 7. aitutor_campuses
Campus reference data.

**Key Schema**:
- PK: `campusId` (String)

**Attributes**:
```json
{
  "campusId": "uuid",
  "code": "MAIN",
  "name": "Main Campus",
  "city": "New York",
  "country": "USA",
  "coordinates": "40.7128,-74.0060",
  "establishedYear": 1990,
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 8. aitutor_courses
Course definitions.

**Key Schema**:
- PK: `courseId` (String)

**GSI**:
- `departmentId-index`: PK=`departmentId`

**Attributes**:
```json
{
  "courseId": "uuid",
  "code": "CSXX",
  "name": "Computer Science Degree",
  "description": "Bachelor of Science in Computer Science",
  "department_id": "uuid",
  "duration": 4,
  "credits": 120,
  "modules": ["moduleId1", "moduleId2"],
  "status": "active|discontinued",
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 9. aitutor_faculties
Faculty reference data.

**Key Schema**:
- PK: `facultyId` (String)

**Attributes**:
```json
{
  "facultyId": "uuid",
  "name": "Faculty of Engineering",
  "deanId": "uuid",
  "departments": ["deptId1", "deptId2"],
  "email": "engineering@university.edu",
  "phone": "+1234567890",
  "createdAt": 1704067200,
  "updatedAt": 1704067200
}
```

### 10. aitutor_chat_sessions
Chat session records.

**Key Schema**:
- PK: `sessionId` (String)

**GSI**:
- `userId-index`: PK=`userId`

**Attributes**:
```json
{
  "sessionId": "uuid",
  "userId": "uuid",
  "moduleId": "uuid",
  "title": "Questions about Module 5",
  "startTime": 1704067200,
  "endTime": null,
  "messageCount": 12,
  "status": "active|archived|resolved",
  "metadata": {"context": "learning_support"},
  "createdAt": 1704067200,
  "expiresAt": 1704153600
}
```

**TTL**: `expiresAt` (30 days)

### 11. aitutor_chat_messages
Chat message history.

**Key Schema**:
- PK: `sessionId` (String)
- SK: `messageId` (String)

**Attributes**:
```json
{
  "sessionId": "uuid",
  "messageId": "uuid",
  "userId": "uuid",
  "role": "user|assistant|system",
  "content": "Your message here",
  "tokens": 150,
  "embedding": [0.123, 0.456, ...],
  "metadata": {"source": "user_input"},
  "timestamp": 1704067200,
  "createdAt": 1704067200
}
```

### 12. aitutor_audit_logs
Audit trail for compliance.

**Key Schema**:
- PK: `logId` (String)

**GSI**:
- `userId-timestamp-index`: PK=`userId`, SK=`timestamp`

**Attributes**:
```json
{
  "logId": "uuid",
  "userId": "uuid",
  "action": "FILE_UPLOADED|USER_CREATED|GRADE_UPDATED",
  "resource": "fileId|userId|moduleId",
  "resourceType": "file|user|module",
  "changes": {
    "before": {"status": "inactive"},
    "after": {"status": "active"}
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "status": "success|failure",
  "errorMessage": null,
  "timestamp": 1704067200,
  "createdAt": 1704067200,
  "expiresAt": 1735689600
}
```

**TTL**: `expiresAt` (1 year)

## Access Patterns

### User Lookups
- Get user by userId (Primary key)
- Get user by email (GSI: email-index)

### Module Management
- Get module by moduleId (Primary key)
- Get all modules for course (GSI: courseId-index)

### File Management
- Get file by fileId (Primary key)
- List files by module (GSI: moduleId-index)
- List user uploads (GSI: uploaderId-index)

### Audit Trail
- Get all logs for user (GSI: userId-timestamp-index)
- Most recent actions (reverse sort on timestamp)

## Billing

**Billing Mode**: PAY_PER_REQUEST (on-demand)

No need to provision capacity - automatically scales.

Estimated costs:
- Read: $0.25 per million
- Write: $1.25 per million
- Storage: $0.25 per GB per month

## Backup & Recovery

**Automatic Backups**: Enabled (PITR)
- Recovery window: 35 days
- Recovery point time: 5 minutes

**Manual Backups**: Available through AWS Console

## Streams

**DynamoDB Streams**: Enabled on all tables
- View Type: NEW_AND_OLD_IMAGES
- Used for: Lambda triggers, replicas, analytics

## Performance Optimization

### Indexes
- Use sparse indexes (don't index every attribute)
- Limit GSI to needed attributes only
- Monitor index usage in CloudWatch

### Queries
- Use partition key where possible
- Avoid full table scans
- Batch operations for bulk changes
- Use projection expressions to reduce data transfer

### Throttling Prevention
- Use on-demand billing
- Implement exponential backoff
- Cache frequently accessed items
- Distribute traffic across keys

## Monitoring

### CloudWatch Metrics
- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors
- SystemErrors

### Alarms to Set
- High throttling rate
- Elevated error rate
- Elevated latency

## Next Steps

1. Import schema into DynamoDB
2. Create test data
3. Implement service layer methods
4. Add validation rules
5. Set up monitoring dashboards
6. Configure backup policies
