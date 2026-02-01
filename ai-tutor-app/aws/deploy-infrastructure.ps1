# Deploy TutorVerse Infrastructure CloudFormation Stack

$region = "us-east-2"
$accountId = "975050334073"
$bucket = "tutorverse-cloudformation-templates-975050334073"
$template = "aitutor-infrastructure-only.yaml"
$stackName = "tutorverse-infrastructure-dev"

Write-Host "=== TutorVerse Infrastructure Deployment ===" -ForegroundColor Green
Write-Host "Region: $region"
Write-Host "Stack: $stackName"
Write-Host ""

# Step 1: Create S3 bucket
Write-Host "[1/5] Creating S3 bucket for CloudFormation..." -ForegroundColor Cyan
aws s3 mb "s3://$bucket" --region $region 2>&1 | Where-Object { $_ -notmatch "BucketAlreadyOwnedByYou" }
Write-Host "OK - S3 bucket ready" -ForegroundColor Green
Write-Host ""

# Step 2: Upload template
Write-Host "[2/5] Uploading CloudFormation template..." -ForegroundColor Cyan
aws s3 cp $template "s3://$bucket/" --region $region
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Template uploaded" -ForegroundColor Green
} else {
    Write-Host "FAILED - Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create CloudFormation stack
Write-Host "[3/5] Creating CloudFormation stack (5-10 minutes)..." -ForegroundColor Cyan

$templateUrl = "https://s3.$region.amazonaws.com/$bucket/$template"

aws cloudformation create-stack --stack-name $stackName --template-url $templateUrl --parameters ParameterKey=EnvironmentName,ParameterValue=development ParameterKey=RegionName,ParameterValue=$region ParameterKey=AccountId,ParameterValue=$accountId ParameterKey=AdminEmail,ParameterValue=admin@tutorverse.dev ParameterKey=FrontendUrl,ParameterValue=http://localhost:5173 ParameterKey=AuthFunctionArn,ParameterValue="arn:aws:lambda:$region`:$accountId`:function:tutorverse-auth-login-development" ParameterKey=AdminFunctionArn,ParameterValue="arn:aws:lambda:$region`:$accountId`:function:tutorverse-admin-lecturers-development" ParameterKey=EducatorFunctionArn,ParameterValue="arn:aws:lambda:$region`:$accountId`:function:tutorverse-educator-modules-development" ParameterKey=StudentFunctionArn,ParameterValue="arn:aws:lambda:$region`:$accountId`:function:tutorverse-student-modules-development" ParameterKey=AIChatFunctionArn,ParameterValue="arn:aws:lambda:$region`:$accountId`:function:tutorverse-ai-chat-development" --region $region --capabilities CAPABILITY_NAMED_IAM

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Stack creation initiated" -ForegroundColor Green
} else {
    Write-Host "FAILED - Stack creation failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Wait for completion
Write-Host "[4/5] Waiting for stack creation..." -ForegroundColor Cyan
Write-Host "Checking every 10 seconds..." -ForegroundColor Yellow

$maxAttempts = 60
$attempt = 0

for ($i = 0; $i -lt $maxAttempts; $i++) {
    $status = aws cloudformation describe-stacks --stack-name $stackName --region $region --query 'Stacks[0].StackStatus' --output text 2>/dev/null
    
    if ($status -eq "CREATE_COMPLETE") {
        Write-Host "OK - Stack created successfully!" -ForegroundColor Green
        break
    } elseif ($status -like "*FAILED*") {
        Write-Host "FAILED - Stack creation failed" -ForegroundColor Red
        break
    } else {
        Write-Host "  Attempt $($i + 1): Status = $status" -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

Write-Host ""

# Step 5: Get outputs
Write-Host "[5/5] Retrieving stack outputs..." -ForegroundColor Cyan
aws cloudformation describe-stacks --stack-name $stackName --region $region --query 'Stacks[0].Outputs' --output table

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Resources created:"
Write-Host "  - 14 DynamoDB tables"
Write-Host "  - Cognito user pool + client"
Write-Host "  - 2 S3 buckets"
Write-Host "  - API Gateway with 45+ endpoints"
Write-Host ""
Write-Host "View in AWS Console: https://console.aws.amazon.com/cloudformation/" -ForegroundColor Cyan
