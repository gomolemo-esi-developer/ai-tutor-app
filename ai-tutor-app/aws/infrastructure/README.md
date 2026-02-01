# AWS Infrastructure for AI Tutor Platform

## Overview

This directory contains CloudFormation templates and deployment scripts for the AI Tutor educational platform.

## Files

- `aitutor-complete.yaml` - Complete CloudFormation template with all AWS resources
- `deployment.sh` - Bash deployment script
- `deployment.bat` - Windows batch deployment script
- `cleanup.sh` / `cleanup.bat` - Resource cleanup scripts

## Infrastructure Components

### 1. Cognito
- User Pool: `ai-tutor-{environment}`
- Client: `aitutor-{environment}`
- Custom attributes: role, staff_number, student_number, department_id, campus_id

### 2. DynamoDB Tables
- `aitutor_users` - User accounts
- `aitutor_educators` - Educator profiles
- `aitutor_students` - Student profiles
- `aitutor_modules` - Course modules
- `aitutor_files` - File metadata
- `aitutor_departments` - Departments
- `aitutor_campuses` - Campuses
- `aitutor_courses` - Courses
- `aitutor_faculties` - Faculties
- `aitutor_chat_sessions` - Chat sessions
- `aitutor_chat_messages` - Chat messages
- `aitutor_audit_logs` - Audit trail

### 3. S3
- Bucket: `aitutor-files-{environment}-{account-id}`
- Versioning: Enabled
- Encryption: AES256
- CORS: Enabled for localhost development

### 4. Lambda Functions
- `aitutor-{environment}-auth-login` - Authentication
- `aitutor-{environment}-educators-create` - Educator creation
- `aitutor-{environment}-files-upload-presigned` - Presigned URL generation

### 5. API Gateway
- HTTP API with CORS configuration
- Stages: development, staging, production

### 6. IAM
- Lambda execution role with policies for DynamoDB, S3, Cognito, CloudWatch

### 7. SNS & CloudWatch
- Notification topic for alerts
- Log group for centralized logging

## Deployment

### Prerequisites
- AWS CLI configured with credentials
- CloudFormation access
- Appropriate IAM permissions

### Deploy CloudFormation Stack

```bash
# Development
aws cloudformation create-stack \
  --stack-name aitutor-development \
  --template-body file://aitutor-complete.yaml \
  --parameters ParameterKey=Environment,ParameterValue=development \
  --capabilities CAPABILITY_NAMED_IAM

# Production
aws cloudformation create-stack \
  --stack-name aitutor-production \
  --template-body file://aitutor-complete.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_NAMED_IAM
```

### Get Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name aitutor-development \
  --query 'Stacks[0].Outputs' \
  --output table
```

### Update Stack

```bash
aws cloudformation update-stack \
  --stack-name aitutor-development \
  --template-body file://aitutor-complete.yaml \
  --parameters ParameterKey=Environment,ParameterValue=development \
  --capabilities CAPABILITY_NAMED_IAM
```

### Delete Stack

```bash
aws cloudformation delete-stack --stack-name aitutor-development
```

## Environment Variables

After deployment, update `.env` files with CloudFormation outputs:

```bash
COGNITO_USER_POOL_ID=us-east-2_xxxxx
COGNITO_CLIENT_ID=xxxxx
S3_BUCKET=aitutor-files-development-975050334073
API_GATEWAY_ENDPOINT=https://xxxxx.execute-api.us-east-2.amazonaws.com/development
SNS_TOPIC_ARN=arn:aws:sns:us-east-2:975050334073:aitutor-development-notifications
```

## Monitoring

### CloudWatch Logs
```bash
# View recent logs
aws logs tail /aws/aitutor/development --follow
```

### DynamoDB
```bash
# List tables
aws dynamodb list-tables --region us-east-2

# Scan table
aws dynamodb scan --table-name aitutor_users --region us-east-2
```

### S3
```bash
# List bucket contents
aws s3 ls s3://aitutor-files-development-975050334073 --recursive
```

## Cost Optimization

### DynamoDB
- Uses `PAY_PER_REQUEST` billing mode (on-demand)
- Automatic scaling not needed for on-demand
- Point-in-time recovery enabled for production

### S3
- Versioning enabled for data protection
- Lifecycle policy deletes old versions after 90 days
- Server-side encryption at no extra cost

### Lambda
- Placeholder functions use minimal resources
- Implement actual code as needed

## Security

- S3 bucket has public access blocked
- Cognito enforces strong password policy
- IAM roles follow least-privilege principle
- DynamoDB streams for audit trail
- Encryption enabled for all services

## Troubleshooting

### Stack Creation Fails
- Check IAM permissions
- Verify CloudFormation template syntax
- Review CloudFormation events in console

### DynamoDB Throttling
- Switch to on-demand billing if needed
- Implement exponential backoff in applications

### Lambda Execution Errors
- Check CloudWatch logs: `/aws/lambda/aitutor-{environment}-*`
- Verify IAM role permissions
- Check Lambda timeout settings

## Support

For issues or questions, consult the main architecture document or AWS documentation.
