#!/bin/bash

# Deploy Lambda functions for TutorVerse
# This script creates all 18 Lambda functions and deploys code from S3

REGION="us-east-2"
ROLE_ARN="arn:aws:iam::975050334073:role/tutorverse-lambda-development"
S3_BUCKET="tutorverse-lambda-code-975050334073"
S3_KEY="lambda-code.zip"
ENVIRONMENT="development"

echo "Creating Lambda functions for TutorVerse..."
echo "Region: $REGION"
echo "Role: $ROLE_ARN"
echo "S3: s3://$S3_BUCKET/$S3_KEY"
echo ""

# Function to create Lambda function
create_lambda() {
  local name=$1
  local handler=$2
  local description=$3
  
  echo -n "Creating $name... "
  
  aws lambda create-function \
    --function-name "$name" \
    --runtime nodejs18.x \
    --role "$ROLE_ARN" \
    --handler "$handler" \
    --code S3Bucket=$S3_BUCKET,S3Key=$S3_KEY \
    --timeout 30 \
    --memory-size 256 \
    --region $REGION \
    --environment Variables="{ENVIRONMENT=$ENVIRONMENT,REGION=$REGION}" \
    --description "$description" \
    --output json > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "OK"
  else
    echo "FAILED or EXISTS"
  fi
}

# Auth functions
create_lambda "tutorverse-auth-register-$ENVIRONMENT" "dist/lambda/auth/register.handler" "User registration handler"
create_lambda "tutorverse-auth-login-$ENVIRONMENT" "dist/lambda/auth/login.handler" "User login handler"
create_lambda "tutorverse-auth-refresh-$ENVIRONMENT" "dist/lambda/auth/refresh.handler" "Token refresh handler"

# Admin functions
create_lambda "tutorverse-admin-lecturers-$ENVIRONMENT" "dist/lambda/admin/lecturers.handler" "Lecturers management"
create_lambda "tutorverse-admin-students-$ENVIRONMENT" "dist/lambda/admin/students.handler" "Students management"
create_lambda "tutorverse-admin-modules-$ENVIRONMENT" "dist/lambda/admin/modules.handler" "Modules management"
create_lambda "tutorverse-admin-departments-$ENVIRONMENT" "dist/lambda/admin/departments.handler" "Departments management"
create_lambda "tutorverse-admin-faculties-$ENVIRONMENT" "dist/lambda/admin/faculties.handler" "Faculties management"
create_lambda "tutorverse-admin-courses-$ENVIRONMENT" "dist/lambda/admin/courses.handler" "Courses management"
create_lambda "tutorverse-admin-campuses-$ENVIRONMENT" "dist/lambda/admin/campuses.handler" "Campuses management"
create_lambda "tutorverse-admin-files-$ENVIRONMENT" "dist/lambda/admin/files.handler" "Files management"
create_lambda "tutorverse-admin-audit-logs-$ENVIRONMENT" "dist/lambda/admin/audit-logs.handler" "Audit logs"

# Educator functions
create_lambda "tutorverse-educator-modules-$ENVIRONMENT" "dist/lambda/educator/modules.handler" "Educator modules"
create_lambda "tutorverse-educator-upload-$ENVIRONMENT" "dist/lambda/educator/upload.handler" "Educator file upload"

# Student functions
create_lambda "tutorverse-student-modules-$ENVIRONMENT" "dist/lambda/student/modules.handler" "Student modules"

# AI functions
create_lambda "tutorverse-ai-quiz-$ENVIRONMENT" "dist/lambda/ai/quiz.handler" "AI quiz generation"
create_lambda "tutorverse-ai-summary-$ENVIRONMENT" "dist/lambda/ai/summary.handler" "AI summary generation"
create_lambda "tutorverse-ai-chat-$ENVIRONMENT" "dist/lambda/ai/chat.handler" "AI chat assistant"

echo ""
echo "Lambda function deployment complete!"
echo ""
echo "Verify deployment:"
echo "aws lambda list-functions --region $REGION --query 'Functions[?starts_with(FunctionName, \`tutorverse-\`)].[FunctionName]' --output table"
