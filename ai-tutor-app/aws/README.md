# AWS Infrastructure & Deployment

## Architecture Overview

This folder contains AWS infrastructure configuration via CloudFormation.

```
aws/
├── aitutor-complete.yaml          # ✅ SINGLE SOURCE OF TRUTH - CloudFormation template
├── deploy-lambda-functions.sh     # Deployment script
├── cognito/                        # Cognito user pool configuration
├── dynamodb/                       # DynamoDB table schemas
├── infrastructure/                 # Supporting infrastructure utilities
└── scripts/                        # Utility scripts
```

---

## Important: Lambda Code Location

**⚠️ Lambda functions are NOT in this folder.**

All Lambda function implementations are in **`../backend/src/lambda/`** (TypeScript).

### Lambda Deployment Flow
```
backend/src/lambda/
  ↓ (TypeScript compiled to JavaScript)
backend/dist/
  ↓ (npm run deploy)
AWS Lambda (via CloudFormation)
```

**DO NOT** look for Lambda code in `aws/lambda/` - it does not exist.

---

## CloudFormation Deployment

### Prerequisites
- AWS CLI configured
- AWS credentials with CloudFormation, Lambda, DynamoDB, S3 permissions

### Deploy Infrastructure

```bash
# From aws/ directory
aws cloudformation deploy \
  --template-file aitutor-complete.yaml \
  --stack-name aitutor-dev \
  --parameter-overrides \
    Environment=development \
    Region=us-east-2 \
  --capabilities CAPABILITY_NAMED_IAM
```

### Update Stack

```bash
aws cloudformation update-stack \
  --template-body file://aitutor-complete.yaml \
  --stack-name aitutor-dev \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## Lambda Deployment

After CloudFormation creates the stack, deploy Lambda functions:

```bash
# From backend/ directory
cd ../backend
npm install
npm run build
npm run deploy
```

This:
1. Compiles TypeScript to JavaScript
2. Packages Lambda functions
3. Uploads to S3
4. Updates Lambda functions via AWS CLI

---

## Single Source of Truth

**`aitutor-complete.yaml`** is the authoritative CloudFormation template containing:
- AWS Cognito user pool configuration
- DynamoDB table definitions (12 tables)
- S3 bucket setup
- API Gateway REST API
- Lambda function references
- IAM roles and policies
- CloudWatch logs and alarms

---

## Configuration Files

### `cognito/`
Cognito user pool configuration details and custom attributes setup.

### `dynamodb/`
DynamoDB table schemas and Global Secondary Index definitions.

### `infrastructure/`
Supporting infrastructure configurations (SNS, CloudWatch, VPC settings).

### `scripts/`
Utility scripts for validation and deployment helpers.

---

## Environment Variables

Lambda environment variables are set in `aitutor-complete.yaml` under Lambda function definitions:

```yaml
Environment:
  Variables:
    ENVIRONMENT: ${Environment}
    DYNAMODB_TABLE_PREFIX: aitutor
    S3_BUCKET: aitutor-files-${Environment}-${AWS::AccountId}
    COGNITO_USER_POOL_ID: ${CognitoUserPool}
    COGNITO_CLIENT_ID: ${CognitoAppClient}
    # ... more variables
```

To modify Lambda env vars:
1. Edit `aitutor-complete.yaml`
2. Deploy: `aws cloudformation update-stack ...`

---

## Troubleshooting

### CloudFormation Validation
```bash
aws cloudformation validate-template --template-body file://aitutor-complete.yaml
```

### View Stack Status
```bash
aws cloudformation describe-stacks --stack-name aitutor-dev
```

### View Stack Events
```bash
aws cloudformation describe-stack-events --stack-name aitutor-dev
```

### View Lambda Logs
```bash
aws logs tail /aws/lambda/auth-handler --follow
aws logs tail /aws/lambda/admin-handler --follow
# etc.
```

---

## Deleted Files

The following files have been removed (they were redundant):
- ❌ `aitutor-infra-only.yaml` - partial infrastructure (use aitutor-complete.yaml instead)
- ❌ `authorization-update.yaml` - outdated authorization patches (merged into aitutor-complete.yaml)
- ❌ `lambda/` - old JavaScript Lambda functions (use backend/src/lambda instead)

---

## Next Steps

1. **Review** `aitutor-complete.yaml` for any environment-specific changes
2. **Configure** AWS credentials: `aws configure`
3. **Deploy infrastructure**: Run CloudFormation deploy command above
4. **Deploy Lambda**: Run `npm run deploy` from `backend/` directory
5. **Verify**: Test endpoints via API Gateway

---

## Documentation

For detailed information see:
- `../docs-i/architecture/8. AWS_INFRASTRUCTURE.md` - Complete AWS setup guide
- `../docs-i/architecture/5. DATABASE_SCHEMA.md` - DynamoDB schema details
- `../backend/README.md` - Lambda function implementation guide
- `../backend/API_MAPPING.md` - Complete API endpoint specification

---

**Last Updated**: January 2026  
**Status**: Consolidated - backend/src/lambda is the single source for Lambda code
