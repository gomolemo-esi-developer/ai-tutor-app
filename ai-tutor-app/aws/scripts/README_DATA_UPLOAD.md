# TutorVerse DynamoDB Data Upload Guide

## Quick Start

This guide explains how to upload comprehensive sample data to all 14 DynamoDB tables in the TutorVerse platform.

---

## Prerequisites

1. **AWS Credentials**: Configure AWS CLI with appropriate credentials
   ```bash
   aws configure
   ```

2. **Python 3.8+** with boto3 installed:
   ```bash
   pip install boto3
   ```

3. **DynamoDB Tables**: All 14 tables must exist (created by CloudFormation)
   ```
   aitutor_campuses
   aitutor_faculties
   aitutor_departments
   aitutor_users
   aitutor_lecturers
   aitutor_students
   aitutor_courses
   aitutor_modules
   aitutor_files
   aitutor_chat_sessions
   aitutor_chat_messages
   aitutor_quiz_results
   aitutor_summary_results
   aitutor_audit_logs
   ```

---

## Usage

### Basic Upload (Development)
```bash
python upload_sample_data.py
```

### Upload to Specific Environment
```bash
python upload_sample_data.py --environment staging --region us-east-2
```

### Available Options
```bash
python upload_sample_data.py --help

Options:
  --region REGION              AWS region (default: us-east-2)
  --environment ENV            Deployment environment: development, staging, production
                               (default: development)
```

### Examples
```bash
# Upload to development in us-east-2
python upload_sample_data.py --environment development --region us-east-2

# Upload to production in eu-west-1
python upload_sample_data.py --environment production --region eu-west-1

# Upload to staging (default region)
python upload_sample_data.py --environment staging
```

---

## What Gets Uploaded

The script populates all 14 tables with realistic sample data:

### 1. **Organizational Hierarchy** (4 tables)
- **Campuses**: 2 campuses (Main, Satellite)
- **Faculties**: 3 faculties (Science, Humanities, Engineering)
- **Departments**: 4 departments (CS, Math, English, Civil Engineering)
- **Courses**: 4 degree programs

### 2. **User Management** (4 tables)
- **Users**: 8 users (1 admin, 3 lecturers, 4 students)
- **Lecturers**: 3 lecturer profiles
- **Students**: 4 student profiles with GPA
- **Modules**: 7 course modules across departments

### 3. **Academic Content** (1 table)
- **Files**: 6 course materials with proper S3 references

### 4. **AI Features** (4 tables)
- **Chat Sessions**: 4 active/closed tutoring sessions
- **Chat Messages**: 7 student-AI conversation messages
- **Quiz Results**: 3 quiz attempts with scores and feedback
- **Summary Results**: 3 content summaries

### 5. **System & Audit** (2 tables)
- **Audit Logs**: 4 action audit trail entries
- Other system metadata

**Total Records Uploaded**: ~100+ records across all tables

---

## Data Characteristics

### ✓ What's Included
- Full referential integrity (all foreign keys exist)
- Proper timestamps in milliseconds
- Valid status values for each entity
- Realistic names and codes
- Complete S3 bucket references
- TTL expiration dates (7-30 days)
- Meaningful content (not dummy data)

### ✗ What's NOT Included
- Empty fields (all required fields populated)
- "N/A" or "null" strings
- Invalid dates or future timestamps
- Inconsistent naming patterns
- Orphaned references

### Field Mapping Examples
```json
// CORRECT - All fields populated properly
{
  "userId": "student-001",
  "email": "alice.johnson@tutorverse.edu",
  "firstName": "Alice",
  "lastName": "Johnson",
  "role": "student",
  "status": "active",
  "isActive": true,
  "departmentId": "uuid-dept-001"
}

// WRONG - Empty fields, inconsistent format
{
  "userId": "student-001",
  "email": "",              // ✗ Empty
  "firstName": "Alice",
  "lastName": "",           // ✗ Empty
  "role": "student",
  "status": "N/A",          // ✗ Invalid status
  "isActive": "true",       // ✗ Should be boolean
  "departmentId": null      // ✗ Null reference
}
```

---

## Frontend Display Verification

After upload, verify data displays correctly on frontend:

### Students Tab
- [ ] Student names show (not "N/A" or empty)
- [ ] Student numbers display
- [ ] Department names visible
- [ ] Status shows "active"
- [ ] GPA displays (3.85, etc.)

### Lecturers Tab
- [ ] Lecturer names visible
- [ ] Staff numbers shown
- [ ] Departments populated
- [ ] Qualifications display
- [ ] Office locations visible

### Modules Tab
- [ ] Module names display
- [ ] Module codes shown (CS101, etc.)
- [ ] Credit values visible
- [ ] Lecturer names appear
- [ ] Course associations show

### Files Section
- [ ] File names visible
- [ ] File sizes shown
- [ ] Upload dates display
- [ ] Download counts appear
- [ ] Published flag shows

### Chat/AI Features
- [ ] Chat sessions list shows
- [ ] Message history displays
- [ ] Quiz scores visible
- [ ] Summary text appears
- [ ] Ratings and feedback show

---

## Customizing Data

### Edit Student Data
```python
# In upload_sample_data.py, find upload_students() method
students = [
    {
        'studentId': self.generate_id(),
        'userId': 'student-001',
        'studentNumber': 'STU001',
        'firstName': 'Alice',        # ← Change name
        'lastName': 'Johnson',
        'email': 'alice.johnson@tutorverse.edu',
        'departmentId': departments[0]['departmentId'],
        'enrollmentYear': 2022,
        'status': 'active',
        'gpa': 3.85,                 # ← Change GPA
        # ... rest of fields
    }
]
```

### Add More Data
```python
# Add additional student
{
    'studentId': self.generate_id(),
    'userId': 'student-005',
    'studentNumber': 'STU005',
    'firstName': 'Eve',
    'lastName': 'Taylor',
    'email': 'eve.taylor@tutorverse.edu',
    'departmentId': departments[3]['departmentId'],
    'enrollmentYear': 2023,
    'status': 'active',
    'gpa': 3.72,
    'phone': '+234 1 900 0005',
    'dateOfBirth': '2003-07-18',
    'createdAt': self.get_timestamp(days_ago=150),
    'updatedAt': self.get_timestamp(),
}
```

### Change Environment Name
```bash
# For staging bucket naming
python upload_sample_data.py --environment staging

# Script will use: aitutor-files-staging-123456789
```

---

## Troubleshooting

### Error: "NoCredentialsError"
**Problem**: AWS credentials not configured
```bash
# Solution
aws configure
# Enter: Access Key ID, Secret Access Key, Default region, Default output format
```

### Error: "ResourceNotFoundException: Requested resource not found"
**Problem**: DynamoDB tables don't exist yet
```bash
# Solution - Deploy infrastructure first
cd ..
aws cloudformation deploy \
  --template-file aitutor-complete.yaml \
  --stack-name tutorverse-stack \
  --parameter-overrides \
    EnvironmentName=development \
    RegionName=us-east-2 \
    AccountId=123456789012 \
    AdminEmail=admin@example.com
```

### Error: "AccessDenied" on DynamoDB
**Problem**: IAM role doesn't have DynamoDB permissions
```bash
# Solution - Check IAM policy includes:
# - dynamodb:PutItem
# - dynamodb:BatchWriteItem
# - dynamodb:GetItem
```

### Error: "Batch error in table_name"
**Problem**: One item in batch failed
**Solution**: Check CloudWatch logs for details, ensure all IDs are valid UUIDs

### Data Not Showing on Frontend
**Problem**: Empty fields or wrong attribute names
**Verification**:
1. Check table has data: `aws dynamodb scan --table-name aitutor_students`
2. Verify attribute names match frontend expectations
3. Check for empty strings vs. null values
4. Verify status values are valid

---

## Reference Files

Three comprehensive files provided:

1. **DYNAMODB_SCHEMA.md**
   - Complete schema documentation
   - Attribute descriptions
   - Key design patterns
   - Table relationships

2. **SAMPLE_DATA.json**
   - Reference format for all tables
   - Example record structure
   - Proper field types
   - Valid value examples

3. **upload_sample_data.py** (this script)
   - Automated data upload
   - Batch operations
   - Error handling
   - Full data relationships

---

## Performance Notes

- **Batch Size**: 25 items (optimized for DynamoDB)
- **Upload Time**: ~10-30 seconds for ~100 records
- **Concurrent Operations**: Safe with pay-per-request billing
- **Idempotent**: Safe to run multiple times (overwrites with same data)

---

## After Upload Verification Checklist

- [ ] Admin can login
- [ ] Student profile shows all data
- [ ] Module list displays correctly
- [ ] Files appear under modules
- [ ] Chat history shows messages
- [ ] Quiz scores display
- [ ] Summary text appears
- [ ] No "N/A" values in any field
- [ ] No empty fields where data should exist
- [ ] All names and codes display correctly
- [ ] Timestamps format correctly
- [ ] Download counts visible

---

## Support

For issues or questions:
1. Check DYNAMODB_SCHEMA.md for attribute definitions
2. Review SAMPLE_DATA.json for format examples
3. Check CloudWatch logs for Lambda errors
4. Verify DynamoDB table exists: `aws dynamodb list-tables`

