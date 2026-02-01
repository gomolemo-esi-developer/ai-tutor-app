# TutorVerse Backend

Production-grade Node.js backend for TutorVerse educational platform, built on AWS Lambda with TypeScript.

## Overview

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Architecture**: Serverless (AWS Lambda)
- **Database**: AWS DynamoDB
- **Storage**: AWS S3
- **Auth**: AWS Cognito + JWT
- **API**: REST (AWS API Gateway)

## Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- DynamoDB Local (for local development)
- Docker (optional, for DynamoDB Local)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AWS credentials and API keys
```

### Local Development

```bash
# Start DynamoDB Local
docker run -d -p 8000:8000 amazon/dynamodb-local

# Run tests
npm test

# Run dev server (Express)
npm run dev

# Run local Lambda environment
npm run dev:local
```

### Deployment

```bash
# Build TypeScript
npm run build

# Deploy to AWS
npm run deploy

# Or manually via CloudFormation
aws cloudformation update-stack \
  --stack-name aitutor-dev \
  --template-body file://../aws/aitutor-complete.yaml \
  --region us-east-2
```

## Project Structure

```
backend/
├── src/
│   ├── lambda/              # AWS Lambda handlers (12 functions)
│   ├── services/            # Business logic layer
│   ├── models/              # TypeScript types & Zod schemas
│   ├── middleware/          # Express middleware
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   └── app.ts               # Express app setup
├── tests/                   # Test files
├── scripts/                 # Deployment & utility scripts
└── config/                  # TypeScript & Jest config
```

## Lambda Functions

| Function | Endpoints | Purpose |
|----------|-----------|---------|
| `auth-handler` | 7 | User registration, login, tokens |
| `admin-handler` | 25+ | Admin CRUD operations |
| `educator-handler` | 6 | Educator file & module management |
| `student-handler` | 12 | Student content access & AI features |
| `ai-handler` | 4 | Quiz, summary, chat generation |

## API Endpoints

All endpoints return standardized JSON responses:

### Authentication
```bash
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /auth/user
PUT    /auth/profile
POST   /auth/change-password
```

### Admin
```bash
GET    /admin/lecturers         # List lecturers
POST   /admin/lecturers         # Create lecturer
GET    /admin/lecturers/{id}    # Get lecturer
PUT    /admin/lecturers/{id}    # Update lecturer
DELETE /admin/lecturers/{id}    # Delete lecturer
POST   /admin/lecturers/bulk-import

# Similar patterns for students, modules, departments, faculties, courses, campuses
```

### Educator
```bash
GET    /educator/modules
GET    /educator/modules/{id}
PUT    /educator/modules/{id}/publish
POST   /educator/modules/{id}/files
GET    /educator/modules/{id}/files
DELETE /educator/modules/{id}/files/{fileId}
```

### Student
```bash
GET    /student/modules
GET    /student/modules/{id}
GET    /student/modules/{id}/files
GET    /student/files/{fileId}
```

### AI Features
```bash
POST   /student/ai/quiz
POST   /student/ai/summary
POST   /student/ai/chat/session
POST   /student/ai/chat/message
GET    /student/ai/chat/{sessionId}/history
DELETE /student/ai/chat/{sessionId}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* response payload */ },
  "timestamp": 1704067200000
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* validation errors */ },
  "timestamp": 1704067200000
}
```

## Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Invalid or missing JWT |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage

# Run specific test file
npm test -- tests/integration/auth.test.ts
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `AWS_REGION`: AWS region (us-east-2)
- `ENVIRONMENT`: dev, staging, production
- `DYNAMODB_TABLE_PREFIX`: Table name prefix (aitutor)
- `S3_BUCKET`: File storage bucket
- `COGNITO_USER_POOL_ID`: Cognito user pool ID
- `JWT_SECRET`: Secret for JWT signing
- `AI_API_KEY`: Claude/OpenAI API key

## Database

All data stored in **AWS DynamoDB** with 12 tables:
- `aitutor_users`
- `aitutor_lecturers`
- `aitutor_students`
- `aitutor_modules`
- `aitutor_files`
- `aitutor_departments`
- `aitutor_faculties`
- `aitutor_courses`
- `aitutor_campuses`
- `aitutor_chat_sessions`
- `aitutor_chat_messages`
- `aitutor_audit_logs`

See `docs-i/architecture/5. DATABASE_SCHEMA.md` for full schema details.

## Security

- **Authentication**: AWS Cognito + JWT tokens
- **Authorization**: Role-based access control (ADMIN, EDUCATOR, STUDENT)
- **Encryption**: AES-256 at rest, TLS 1.2+ in transit
- **Input Validation**: Zod schemas on all endpoints
- **Rate Limiting**: 1000 req/hour per user
- **Audit Logging**: All actions logged with timestamps

## Deployment Checklist

- [ ] Environment variables configured (.env)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] AWS credentials configured
- [ ] DynamoDB tables exist (via CloudFormation)
- [ ] S3 buckets configured
- [ ] Cognito user pool created
- [ ] Lambda execution role has correct permissions

## Monitoring

CloudWatch logs and metrics configured in CloudFormation:
- Lambda error rates
- DynamoDB throttling
- API Gateway errors
- Function duration/cold starts
- Custom application metrics

View in AWS Console or via CLI:
```bash
aws logs tail /aws/lambda/auth-handler --follow
```

## Troubleshooting

### DynamoDB Connection Error
```bash
# Ensure DynamoDB Local is running
docker ps | grep dynamodb

# Or connect to AWS
unset DYNAMODB_ENDPOINT
```

### Lambda Timeout
- Increase timeout in CloudFormation (max 15 minutes)
- Optimize database queries
- Use pagination for large datasets

### JWT Token Invalid
- Verify token hasn't expired
- Check COGNITO_USER_POOL_ID matches
- Ensure JWT_SECRET hasn't changed

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test: `npm test`
3. Lint code: `npm run lint`
4. Format code: `npm run format`
5. Commit with clear message
6. Push and create pull request

## Documentation

- **Architecture**: See `BACKEND_PLAN.md` in project root
- **API Spec**: See `docs-i/architecture/6. API_ENDPOINTS.md`
- **Database**: See `docs-i/architecture/5. DATABASE_SCHEMA.md`
- **Infrastructure**: See `docs-i/architecture/8. AWS_INFRASTRUCTURE.md`

## Support

For issues or questions:
1. Check existing issues in GitHub
2. Review documentation files
3. Check CloudWatch logs in AWS Console
4. Contact development team

## License

MIT
