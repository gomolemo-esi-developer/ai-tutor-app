#!/bin/bash

# AI Tutor Platform - AWS CloudFormation Deployment Script
# Usage: ./deployment.sh [environment] [action]
# Examples:
#   ./deployment.sh development create
#   ./deployment.sh production update
#   ./deployment.sh development delete

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/../aitutor-complete.yaml"
AWS_ACCOUNT_ID="975050334073"
AWS_REGION="us-east-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_banner() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  AI Tutor Platform - CloudFormation${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

validate_environment() {
    if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Valid options: development, staging, production"
        exit 1
    fi
    print_success "Environment: $ENVIRONMENT"
}

validate_action() {
    if [[ ! "$ACTION" =~ ^(create|update|delete|describe)$ ]]; then
        print_error "Invalid action: $ACTION"
        echo "Valid options: create, update, delete, describe"
        exit 1
    fi
    print_success "Action: $ACTION"
}

validate_template() {
    print_info "Validating CloudFormation template..."
    if aws cloudformation validate-template \
        --template-body "file://${TEMPLATE_FILE}" \
        --region "$AWS_REGION" > /dev/null 2>&1; then
        print_success "Template validation passed"
    else
        print_error "Template validation failed"
        exit 1
    fi
}

check_aws_credentials() {
    print_info "Checking AWS credentials..."
    if ! aws sts get-caller-identity --region "$AWS_REGION" > /dev/null 2>&1; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    print_success "AWS credentials valid"
}

create_stack() {
    print_info "Creating CloudFormation stack: aitutor-$ENVIRONMENT"
    
    aws cloudformation create-stack \
        --stack-name "aitutor-$ENVIRONMENT" \
        --template-body "file://${TEMPLATE_FILE}" \
        --parameters \
            "ParameterKey=Environment,ParameterValue=$ENVIRONMENT" \
            "ParameterKey=AWSAccountId,ParameterValue=$AWS_ACCOUNT_ID" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    print_success "Stack creation initiated"
    print_info "Stack name: aitutor-$ENVIRONMENT"
    print_info "Waiting for stack creation to complete (this may take 5-10 minutes)..."
    
    if aws cloudformation wait stack-create-complete \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION"; then
        print_success "Stack created successfully"
        describe_stack
    else
        print_error "Stack creation failed or timed out"
        exit 1
    fi
}

update_stack() {
    print_info "Updating CloudFormation stack: aitutor-$ENVIRONMENT"
    
    if ! aws cloudformation describe-stacks \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION" > /dev/null 2>&1; then
        print_error "Stack does not exist: aitutor-$ENVIRONMENT"
        exit 1
    fi
    
    aws cloudformation update-stack \
        --stack-name "aitutor-$ENVIRONMENT" \
        --template-body "file://${TEMPLATE_FILE}" \
        --parameters \
            "ParameterKey=Environment,ParameterValue=$ENVIRONMENT" \
            "ParameterKey=AWSAccountId,ParameterValue=$AWS_ACCOUNT_ID" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    print_success "Stack update initiated"
    print_info "Waiting for stack update to complete..."
    
    if aws cloudformation wait stack-update-complete \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION"; then
        print_success "Stack updated successfully"
        describe_stack
    else
        print_error "Stack update failed or timed out"
        exit 1
    fi
}

delete_stack() {
    print_warning "About to delete stack: aitutor-$ENVIRONMENT"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_warning "Deletion cancelled"
        return
    fi
    
    print_info "Deleting CloudFormation stack: aitutor-$ENVIRONMENT"
    
    aws cloudformation delete-stack \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION"
    
    print_success "Stack deletion initiated"
    print_info "Waiting for stack deletion to complete..."
    
    if aws cloudformation wait stack-delete-complete \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION"; then
        print_success "Stack deleted successfully"
    else
        print_error "Stack deletion failed or timed out"
        exit 1
    fi
}

describe_stack() {
    print_info "Retrieving stack outputs..."
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs' \
        --output table)
    
    echo ""
    echo "$OUTPUTS"
    echo ""
    print_success "Stack outputs retrieved"
}

get_stack_events() {
    print_info "Retrieving recent stack events..."
    
    aws cloudformation describe-stack-events \
        --stack-name "aitutor-$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'StackEvents[0:10]' \
        --output table
}

# Main script
main() {
    ENVIRONMENT="${1:-development}"
    ACTION="${2:-create}"
    
    print_banner
    print_info "Region: $AWS_REGION"
    print_info "Account ID: $AWS_ACCOUNT_ID"
    echo ""
    
    validate_environment
    validate_action
    check_aws_credentials
    validate_template
    
    echo ""
    case "$ACTION" in
        create)
            create_stack
            ;;
        update)
            update_stack
            ;;
        delete)
            delete_stack
            ;;
        describe)
            describe_stack
            ;;
    esac
    
    print_success "Operation completed successfully"
}

# Run main function
main "$@"
