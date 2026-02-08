# Node.js Data Upload Script - Usage Guide

## Quick Start

```bash
# Install dependencies (if not already installed)
npm install

# Upload data to development environment
npm run upload-data

# Upload to staging
npm run upload-data:staging

# Upload to production
npm run upload-data:prod
```

## Direct Command Usage

```bash
# Development (default)
node upload-sample-data.js --environment development --region us-east-2

# Staging
node upload-sample-data.js --environment staging --region us-east-2

# Production
node upload-sample-data.js --environment production --region us-east-2

# Different region
node upload-sample-data.js --environment development --region eu-west-1
```

## Prerequisites

1. **AWS Credentials Configured**
   ```bash
   aws configure
   ```

2. **Node.js 18+** installed
   ```bash
   node --version
   ```

3. **Dependencies installed**
   ```bash
   npm install
   # or if using the existing package.json
   npm install aws-sdk uuid
   ```

## Files

### Primary Script
- **upload-sample-data.js** - Main Node.js script (ready to use)
- **upload-sample-data.ts** - TypeScript version (for type safety)

### Run via npm
- Uses scripts defined in package.json
- Commands: `npm run upload-data*`

## What Gets Uploaded

14 DynamoDB tables with 50+ interconnected records:
- Campuses (2)
- Faculties (3)
- Departments (4)
- Users (8: admin, lecturers, students)
- Lecturers (3)
- Students (4)
- Courses (4)
- Modules (7)
- Files (6)
- Chat Sessions (4)
- Chat Messages (7)
- Quiz Results (3)
- Summary Results (3)
- Audit Logs (4)

## Execution Time

Approximately 1-2 minutes to upload all data.

## Output Example

```
============================================================
TutorVerse DynamoDB Sample Data Upload
Environment: development
Region: us-east-2
============================================================

[1/14] Uploading Campuses...
✓ campuses: uuid-1
✓ campuses: uuid-2
Uploaded 2 campuses

[2/14] Uploading Faculties...
✓ faculties: uuid-3
...continues...

[14/14] Uploading Audit Logs...
Uploaded 4 audit log entries

============================================================
✓ All data uploaded successfully!
============================================================

Summary:
  Campuses: 2
  Faculties: 3
  Departments: 4
  Users: 8
  Lecturers: 3
  Students: 4
  Courses: 4
  Modules: 7
  Files: 6
  Chat Sessions: 4
  Chat Messages: 7
  Quiz Results: 3
  Summaries: 3
  Audit Logs: 4

✓ Ready to use on frontend!
```

## Troubleshooting

### Error: "NoCredentialsError"
```bash
aws configure
# Enter your AWS credentials
```

### Error: "Table not found"
Deploy CloudFormation stack first:
```bash
aws cloudformation deploy \
  --template-file aitutor-complete.yaml \
  --stack-name tutorverse-stack
```

### Error: "Cannot find module 'aws-sdk'"
```bash
npm install aws-sdk uuid
```

### Error: "EACCES: permission denied"
```bash
# Make script executable
chmod +x upload-sample-data.js

# Or use node directly
node upload-sample-data.js
```

## Environment Variables

You can set environment variables instead of command-line arguments:

```bash
export AWS_REGION=us-east-2
export TUTORVERSE_ENV=development

node upload-sample-data.js
```

## Verify Upload

After running the script, verify data in DynamoDB:

```bash
# List tables
aws dynamodb list-tables --region us-east-2

# Scan a table
aws dynamodb scan --table-name aitutor_students --region us-east-2

# Count records
aws dynamodb scan \
  --table-name aitutor_students \
  --region us-east-2 \
  --select COUNT
```

## TypeScript Version

To use the TypeScript version:

```bash
# Install ts-node if not already installed
npm install --save-dev ts-node typescript

# Run TypeScript version
npx ts-node upload-sample-data.ts --environment development
```

## Customization

Edit the data in `upload-sample-data.js`:

```javascript
async uploadStudents(departments) {
  const students = [
    {
      studentId: this.generateId(),
      userId: 'student-005',
      studentNumber: 'STU005',
      firstName: 'Eve',     // ← Change name
      lastName: 'Taylor',
      email: 'eve.taylor@tutorverse.edu',
      // ... rest of fields
    }
  ];
  // ...
}
```

Then re-run the script to add the new data.

## Data Quality

All uploaded data includes:
- ✓ No empty fields
- ✓ No "N/A" values
- ✓ Proper data types
- ✓ Valid UUIDs and timestamps
- ✓ Proper relationships between tables
- ✓ Frontend-ready attribute names

## Performance Notes

- Batch size: 25 items per batch
- Execution time: ~60-120 seconds
- Uses DocumentClient for easier JSON-like operations
- Safe to run multiple times (overwrites with same data)

## Next Steps

1. Run the script: `npm run upload-data`
2. Verify data uploaded: `aws dynamodb scan --table-name aitutor_students`
3. Open frontend: http://localhost:5173
4. Check that all data displays correctly (no "N/A", no empty fields)

