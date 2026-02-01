# Deploy AI Features Stack to AWS
# This script deploys the separate AI features CloudFormation stack

# Configuration
$stackName = "tutorverse-ai-features-production"
$templateFile = "aitutor-ai-features-stack.yaml"
$paramsFile = "ai-features-params.json"
$region = "us-east-2"
$environment = "production"

# Colors for output
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Red = [System.ConsoleColor]::Red
$Cyan = [System.ConsoleColor]::Cyan

Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "TutorVerse AI Features Deployment" -ForegroundColor $Cyan
Write-Host "========================================`n" -ForegroundColor $Cyan

# Step 1: Verify files exist
Write-Host "Step 1: Verifying files..." -ForegroundColor $Yellow

if (-not (Test-Path $templateFile)) {
    Write-Host "❌ Template file not found: $templateFile" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ Template found: $templateFile" -ForegroundColor $Green

if (-not (Test-Path $paramsFile)) {
    Write-Host "❌ Parameters file not found: $paramsFile" -ForegroundColor $Red
    Write-Host "Create ai-features-params.json first!" -ForegroundColor $Yellow
    exit 1
}
Write-Host "✅ Parameters found: $paramsFile" -ForegroundColor $Green

# Step 2: Validate parameters
Write-Host "`nStep 2: Validating parameters..." -ForegroundColor $Yellow

$params = Get-Content $paramsFile | ConvertFrom-Json
$required = @("EnvironmentName", "RegionName", "AccountId", "ApiGatewayId", "ApiGatewayRootId")
$missing = @()

foreach ($param in $required) {
    $value = $params | Where-Object { $_.ParameterKey -eq $param } | Select-Object -ExpandProperty ParameterValue
    if (-not $value -or $value -eq "GET_FROM_AWS_CONSOLE") {
        $missing += $param
        Write-Host "❌ Missing/placeholder: $param" -ForegroundColor $Red
    } else {
        Write-Host "✅ $param = $value" -ForegroundColor $Green
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`n❌ Missing required parameters: $($missing -join ', ')" -ForegroundColor $Red
    Write-Host "Please update $paramsFile and try again" -ForegroundColor $Yellow
    exit 1
}

# Step 3: Confirm deployment
Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "Deployment Details:" -ForegroundColor $Cyan
Write-Host "  Stack Name: $stackName" -ForegroundColor $Cyan
Write-Host "  Template: $templateFile" -ForegroundColor $Cyan
Write-Host "  Environment: $environment" -ForegroundColor $Cyan
Write-Host "  Region: $region" -ForegroundColor $Cyan
Write-Host "========================================`n" -ForegroundColor $Cyan

$confirmation = Read-Host "Proceed with deployment? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor $Yellow
    exit 0
}

# Step 4: Deploy
Write-Host "`nStep 4: Deploying CloudFormation stack..." -ForegroundColor $Yellow
Write-Host "This may take 5-10 minutes...`n" -ForegroundColor $Cyan

try {
    aws cloudformation create-stack `
        --stack-name $stackName `
        --template-body file://$templateFile `
        --parameters file://$paramsFile `
        --region $region `
        --capabilities CAPABILITY_NAMED_IAM `
        --tags Key=Environment,Value=$environment Key=ManagedBy,Value=CloudFormation

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stack creation initiated" -ForegroundColor $Green
        Write-Host "Stack ID: " -ForegroundColor $Cyan -NoNewline
        # Get the stack ID
        $stackId = aws cloudformation describe-stacks `
            --stack-name $stackName `
            --region $region `
            --query 'Stacks[0].StackId' `
            --output text
        Write-Host $stackId -ForegroundColor $Green
    } else {
        Write-Host "❌ Deployment failed" -ForegroundColor $Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor $Red
    exit 1
}

# Step 5: Monitor deployment
Write-Host "`nStep 5: Monitoring deployment status..." -ForegroundColor $Yellow

$maxAttempts = 60  # 30 minutes (60 * 30 seconds)
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $status = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --region $region `
        --query 'Stacks[0].StackStatus' `
        --output text

    Write-Host "Status: $status" -ForegroundColor $Cyan

    if ($status -eq "CREATE_COMPLETE") {
        Write-Host "✅ Stack deployed successfully!" -ForegroundColor $Green
        break
    }
    elseif ($status -like "*FAILED*" -or $status -like "*ROLLBACK*") {
        Write-Host "❌ Deployment failed with status: $status" -ForegroundColor $Red
        Write-Host "Check CloudFormation console for details" -ForegroundColor $Yellow
        exit 1
    }

    $attempt++
    if ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 30
        Write-Host "Waiting... (attempt $attempt/$maxAttempts)" -ForegroundColor $Yellow
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host "❌ Deployment timeout (waited 30 minutes)" -ForegroundColor $Red
    exit 1
}

# Step 6: Get outputs
Write-Host "`nStep 6: Retrieving stack outputs..." -ForegroundColor $Yellow

$outputs = aws cloudformation describe-stacks `
    --stack-name $stackName `
    --region $region `
    --query 'Stacks[0].Outputs' `
    --output json | ConvertFrom-Json

Write-Host "`n========================================" -ForegroundColor $Green
Write-Host "Deployment Complete!" -ForegroundColor $Green
Write-Host "========================================`n" -ForegroundColor $Green

Write-Host "Stack Outputs:" -ForegroundColor $Cyan
foreach ($output in $outputs) {
    Write-Host "$($output.OutputKey):" -ForegroundColor $Cyan
    Write-Host "  $($output.OutputValue)" -ForegroundColor $Green
}

# Step 7: Next steps
Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "Next Steps:" -ForegroundColor $Cyan
Write-Host "========================================`n" -ForegroundColor $Cyan

$apiEndpoint = $outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" } | Select-Object -ExpandProperty OutputValue

Write-Host "1. Update frontend .env file:" -ForegroundColor $Yellow
Write-Host "   REACT_APP_API_URL=$apiEndpoint`n" -ForegroundColor $Green

Write-Host "2. Test API endpoints:" -ForegroundColor $Yellow
Write-Host "   curl -X GET $apiEndpoint/api/chat`n" -ForegroundColor $Green

Write-Host "3. Run integration tests:" -ForegroundColor $Yellow
Write-Host "   npm run test:integration`n" -ForegroundColor $Green

Write-Host "4. Monitor CloudWatch logs:" -ForegroundColor $Yellow
Write-Host "   AWS CloudWatch → Log Groups`n" -ForegroundColor $Green

Write-Host "✅ Deployment script completed successfully!" -ForegroundColor $Green
Write-Host ""
