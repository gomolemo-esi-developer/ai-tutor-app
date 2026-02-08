@echo off
REM AI Tutor Platform - AWS CloudFormation Deployment Script (Windows)
REM Usage: deployment.bat [environment] [action]
REM Examples:
REM   deployment.bat development create
REM   deployment.bat production update

setlocal enabledelayedexpansion

REM Configuration
set "TEMPLATE_FILE=%~dp0..\aitutor-complete.yaml"
set "AWS_ACCOUNT_ID=975050334073"
set "AWS_REGION=us-east-2"

REM Default values
if "%1"=="" (set ENVIRONMENT=development) else (set ENVIRONMENT=%1)
if "%2"=="" (set ACTION=create) else (set ACTION=%2)

REM Validate environment
if /i not "%ENVIRONMENT%"=="development" (
    if /i not "%ENVIRONMENT%"=="staging" (
        if /i not "%ENVIRONMENT%"=="production" (
            echo Error: Invalid environment: %ENVIRONMENT%
            echo Valid options: development, staging, production
            exit /b 1
        )
    )
)

REM Validate action
if /i not "%ACTION%"=="create" (
    if /i not "%ACTION%"=="update" (
        if /i not "%ACTION%"=="delete" (
            if /i not "%ACTION%"=="describe" (
                echo Error: Invalid action: %ACTION%
                echo Valid options: create, update, delete, describe
                exit /b 1
            )
        )
    )
)

echo.
echo ========================================
echo   AI Tutor Platform - CloudFormation
echo ========================================
echo.
echo Region:      %AWS_REGION%
echo Account ID:  %AWS_ACCOUNT_ID%
echo Environment: %ENVIRONMENT%
echo Action:      %ACTION%
echo.

REM Check AWS credentials
echo Checking AWS credentials...
aws sts get-caller-identity --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo Error: AWS credentials not configured
    exit /b 1
)
echo [OK] AWS credentials valid
echo.

REM Validate template
echo Validating CloudFormation template...
aws cloudformation validate-template ^
    --template-body file://%TEMPLATE_FILE% ^
    --region %AWS_REGION% >nul 2>&1
if errorlevel 1 (
    echo Error: Template validation failed
    exit /b 1
)
echo [OK] Template validation passed
echo.

REM Execute action
if /i "%ACTION%"=="create" (
    echo Creating CloudFormation stack: aitutor-%ENVIRONMENT%...
    aws cloudformation create-stack ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --template-body file://%TEMPLATE_FILE% ^
        --parameters ^
            ParameterKey=Environment,ParameterValue=%ENVIRONMENT% ^
            ParameterKey=AWSAccountId,ParameterValue=%AWS_ACCOUNT_ID% ^
        --capabilities CAPABILITY_NAMED_IAM ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack creation failed
        exit /b 1
    )
    
    echo [OK] Stack creation initiated
    echo Waiting for stack creation to complete (this may take 5-10 minutes)...
    
    aws cloudformation wait stack-create-complete ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack creation failed or timed out
        exit /b 1
    )
    
    echo [OK] Stack created successfully
    
) else if /i "%ACTION%"=="update" (
    echo Updating CloudFormation stack: aitutor-%ENVIRONMENT%...
    
    aws cloudformation describe-stacks ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION% >nul 2>&1
    
    if errorlevel 1 (
        echo Error: Stack does not exist: aitutor-%ENVIRONMENT%
        exit /b 1
    )
    
    aws cloudformation update-stack ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --template-body file://%TEMPLATE_FILE% ^
        --parameters ^
            ParameterKey=Environment,ParameterValue=%ENVIRONMENT% ^
            ParameterKey=AWSAccountId,ParameterValue=%AWS_ACCOUNT_ID% ^
        --capabilities CAPABILITY_NAMED_IAM ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack update failed
        exit /b 1
    )
    
    echo [OK] Stack update initiated
    echo Waiting for stack update to complete...
    
    aws cloudformation wait stack-update-complete ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack update failed or timed out
        exit /b 1
    )
    
    echo [OK] Stack updated successfully
    
) else if /i "%ACTION%"=="delete" (
    set /p confirm="Warning: About to delete stack aitutor-%ENVIRONMENT%. Continue? (yes/no): "
    
    if /i not "%confirm%"=="yes" (
        echo Deletion cancelled
        exit /b 0
    )
    
    echo Deleting CloudFormation stack: aitutor-%ENVIRONMENT%...
    
    aws cloudformation delete-stack ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack deletion failed
        exit /b 1
    )
    
    echo [OK] Stack deletion initiated
    echo Waiting for stack deletion to complete...
    
    aws cloudformation wait stack-delete-complete ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION%
    
    if errorlevel 1 (
        echo Error: Stack deletion failed or timed out
        exit /b 1
    )
    
    echo [OK] Stack deleted successfully
    
) else if /i "%ACTION%"=="describe" (
    echo Retrieving stack outputs...
    echo.
    aws cloudformation describe-stacks ^
        --stack-name aitutor-%ENVIRONMENT% ^
        --region %AWS_REGION% ^
        --query "Stacks[0].Outputs" ^
        --output table
    
    if errorlevel 1 (
        echo Error: Failed to retrieve stack outputs
        exit /b 1
    )
)

echo.
echo [OK] Operation completed successfully
echo.
endlocal
