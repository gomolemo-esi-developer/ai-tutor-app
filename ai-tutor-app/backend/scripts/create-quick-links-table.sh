#!/bin/bash

# Quick Links Table Creation Script for DynamoDB
# Creates the QUICK_LINKS table for instant access link storage
# Region: us-east-2

TABLE_PREFIX=${DYNAMODB_TABLE_PREFIX:-tutorverse}
TABLE_NAME="${TABLE_PREFIX}_quick_links"
REGION="us-east-2"

echo "Creating DynamoDB table: $TABLE_NAME"
echo "Region: $REGION"

aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=quickLinkId,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=tokenHash,AttributeType=S \
  --key-schema AttributeName=quickLinkId,KeyType=HASH \
  --global-secondary-indexes \
    "IndexName=email-tokenHash-index,KeySchema=[{AttributeName=email,KeyType=HASH},{AttributeName=tokenHash,KeyType=RANGE}],Projection={ProjectionType=ALL},BillingMode=PAY_PER_REQUEST" \
  --ttl-specification Enabled=true,AttributeName=expiresAt \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

if [ $? -eq 0 ]; then
  echo "✅ Table created successfully: $TABLE_NAME"
  echo ""
  echo "Waiting for table to be active..."
  aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
  
  echo "✅ Table is now active!"
  echo ""
  echo "Quick Links Table Configuration:"
  echo "- Table Name: $TABLE_NAME"
  echo "- Primary Key: quickLinkId (String)"
  echo "- TTL Field: expiresAt (auto-deletes after 15 minutes)"
  echo "- GSI: email-tokenHash-index (for lookups by email + token)"
  echo "- Region: $REGION"
  echo "- Billing Mode: PAY_PER_REQUEST (on-demand)"
else
  echo "❌ Failed to create table. Possible reasons:"
  echo "- Table already exists"
  echo "- Invalid AWS credentials"
  echo "- Network connectivity issue"
  exit 1
fi
