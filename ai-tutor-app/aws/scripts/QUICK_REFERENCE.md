# Quick Reference - Data Upload Commands

## One-Line Commands

### Development Environment
```bash
python upload_sample_data.py --environment development --region us-east-2
```

### Staging Environment
```bash
python upload_sample_data.py --environment staging --region us-east-2
```

### Production Environment
```bash
python upload_sample_data.py --environment production --region us-east-2
```

### Different AWS Region
```bash
python upload_sample_data.py --environment development --region eu-west-1
```

---

## Full Workflow

### 1. Setup (One time)
```bash
# Install AWS CLI
# (Download from https://aws.amazon.com/cli/)

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Key, Default region, Output format

# Install Python boto3
pip install boto3
```

### 2. Deploy Infrastructure (If not already deployed)
```bash
aws cloudformation deploy \
  --template-file aitutor-complete.yaml \
  --stack-name tutorverse-main \
  --parameter-overrides \
    EnvironmentName=development \
    RegionName=us-east-2 \
    AccountId=YOUR_AWS_ACCOUNT_ID \
    AdminEmail=admin@example.com \
    FrontendUrl=http://localhost:5173 \
  --capabilities CAPABILITY_NAMED_IAM
```

### 3. Upload Data
```bash
cd aws/scripts
python upload_sample_data.py --environment development
```

### 4. Verify Data Uploaded
```bash
# Check one table has data
aws dynamodb scan --table-name aitutor_students --region us-east-2

# Count records in a table
aws dynamodb scan \
  --table-name aitutor_students \
  --region us-east-2 \
  --select COUNT
```

### 5. Test Frontend
- Open http://localhost:5173
- Login as student or lecturer
- Navigate through all pages
- Verify all data displays correctly

---

## Verification Commands

### List All DynamoDB Tables
```bash
aws dynamodb list-tables --region us-east-2
```

### Scan a Table
```bash
aws dynamodb scan --table-name aitutor_students --region us-east-2
```

### Get a Specific Record
```bash
aws dynamodb get-item \
  --table-name aitutor_students \
  --key '{"studentId": {"S": "student-001"}}' \
  --region us-east-2
```

### Count Items in Table
```bash
aws dynamodb scan \
  --table-name aitutor_modules \
  --region us-east-2 \
  --select COUNT \
  --output text
```

### Get Item Count for All Tables
```bash
for table in aitutor_campuses aitutor_faculties aitutor_departments aitutor_users aitutor_lecturers aitutor_students aitutor_courses aitutor_modules aitutor_files aitutor_chat_sessions aitutor_chat_messages aitutor_quiz_results aitutor_summary_results aitutor_audit_logs; do
  count=$(aws dynamodb scan --table-name $table --region us-east-2 --select COUNT --output text)
  echo "$table: $count"
done
```

---

## Re-run Data Upload

**Safe to run multiple times** - overwrites with same data:
```bash
python upload_sample_data.py --environment development
```

If you need to clear data first:
```bash
# Warning: Deletes all data
aws dynamodb delete-table --table-name aitutor_students --region us-east-2

# Then recreate with CloudFormation or manually
```

---

## Environment Variables (Optional)

Set as environment variables to avoid command-line arguments:
```bash
export AWS_REGION=us-east-2
export TUTORVERSE_ENV=development

# Then run script without parameters
python upload_sample_data.py
```

---

## File Locations

```
From project root:

To run upload script:
cd aws/scripts
python upload_sample_data.py

To read schema:
cat ../DYNAMODB_SCHEMA.md

To read sample data:
cat ../SAMPLE_DATA.json

To read upload guide:
cat README_DATA_UPLOAD.md

To read summary:
cat ../../dix/DATA_UPLOAD_SUMMARY.md
```

---

## Troubleshooting Quick Fix

### Credentials not found
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

### Tables don't exist
```bash
aws dynamodb list-tables --region us-east-2
# If empty, deploy CloudFormation stack first
```

### Python boto3 not installed
```bash
pip install boto3
```

### Permission denied on script
```bash
chmod +x upload_sample_data.py
# Or run with: python3 upload_sample_data.py
```

### Clear specific table (careful!)
```bash
# Scan and delete all items
aws dynamodb scan --table-name aitutor_students --region us-east-2 | \
jq -r '.Items[] | .studentId.S' | \
xargs -I {} aws dynamodb delete-item \
  --table-name aitutor_students \
  --key '{"studentId": {"S": "{}"}}'
```

---

## Data Validation Checklist

After running script, verify:

```bash
# 1. Data exists
aws dynamodb scan --table-name aitutor_students --region us-east-2 --select COUNT

# 2. Sample record structure
aws dynamodb scan --table-name aitutor_students --region us-east-2 --max-items 1

# 3. No null/empty fields in sample
# Manually inspect output - should see:
# - firstName, lastName, email (not empty)
# - departmentId, studentNumber (not null)
# - status should be "active"
```

---

## Common Data Checks

### Verify Student Records
```bash
aws dynamodb query \
  --table-name aitutor_students \
  --index-name departmentId-index \
  --key-condition-expression "departmentId = :id" \
  --expression-attribute-values '{":id": {"S": "uuid-dept-001"}}' \
  --region us-east-2
```

### Verify Module Under Course
```bash
aws dynamodb query \
  --table-name aitutor_modules \
  --index-name courseId-index \
  --key-condition-expression "courseId = :id" \
  --expression-attribute-values '{":id": {"S": "uuid-course-001"}}' \
  --region us-east-2
```

### Check File S3 References
```bash
aws dynamodb scan \
  --table-name aitutor_files \
  --projection-expression "fileName,s3Bucket,s3Key" \
  --region us-east-2
```

---

## Script Output Explained

```
✓ Campus uploaded successfully
  ✓ = Data successfully inserted
  Campus = Table name
  uuid = Unique ID

✗ Error message
  ✗ = Failed to insert
  Followed by specific error from AWS

Uploaded X items
  Total count inserted in batch
```

---

## AWS CLI Configuration Examples

### Set Default Region
```bash
aws configure set region us-east-2
```

### Use Different AWS Profile
```bash
AWS_PROFILE=tutorverse python upload_sample_data.py

# Or set in AWS credentials file:
# ~/.aws/credentials
# [tutorverse]
# aws_access_key_id = AKIA...
# aws_secret_access_key = ...
```

### Temporary Credentials (STS)
```bash
aws sts get-session-token --duration-seconds 3600

# Use output to set:
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...

python upload_sample_data.py
```

---

## Performance Notes

- Script runs in ~30-60 seconds for ~100 records
- Uses batch operations (25 items per batch)
- Safe to interrupt and re-run
- Pay-per-request billing - no costs concerns
- Logs each operation to console

---

## Getting Help

```bash
# Script help
python upload_sample_data.py --help

# Check AWS connection
aws sts get-caller-identity

# Check table exists
aws dynamodb describe-table --table-name aitutor_students --region us-east-2

# View CloudWatch logs if Lambda errors
aws logs tail /aws/lambda/tutorverse-auth-login-development --follow
```

---

## Useful Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Run upload script
alias upload-tutorverse="cd ~/path/to/project/aws/scripts && python upload_sample_data.py"

# Check DynamoDB tables
alias list-tables="aws dynamodb list-tables --region us-east-2"

# Scan students table
alias scan-students="aws dynamodb scan --table-name aitutor_students --region us-east-2"

# Get item count
alias count-students="aws dynamodb scan --table-name aitutor_students --region us-east-2 --select COUNT"
```

---

## Next Steps

1. ✓ Read DYNAMODB_SCHEMA.md for table structures
2. ✓ Read README_DATA_UPLOAD.md for detailed guide  
3. ✓ Run: `python upload_sample_data.py --environment development`
4. ✓ Verify: Open frontend and check data displays
5. ✓ Customize: Edit script to add your own data

