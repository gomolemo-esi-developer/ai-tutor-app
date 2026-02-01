#!/usr/bin/env node

/**
 * Script to create aitutor_verification_codes table
 * Run: node create-verification-codes-table.js
 */

const AWS = require('aws-sdk');
require('dotenv').config();

const dynamodb = new AWS.DynamoDB({
  region: process.env.AWS_REGION || 'us-east-2',
});

const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'aitutor';
const TABLE_NAME = `${TABLE_PREFIX}_verification_codes`;

const params = {
  TableName: TABLE_NAME,
  KeySchema: [
    {
      AttributeName: 'pk',
      KeyType: 'HASH', // Partition key (e.g., VERIFY#email or RESET#email)
    },
    {
      AttributeName: 'sk',
      KeyType: 'RANGE', // Sort key (e.g., CODE)
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'pk',
      AttributeType: 'S',
    },
    {
      AttributeName: 'sk',
      AttributeType: 'S',
    },
    {
      AttributeName: 'email',
      AttributeType: 'S',
    },
  ],
  BillingMode: 'PAY_PER_REQUEST', // On-demand
  GlobalSecondaryIndexes: [
    {
      IndexName: 'email-index',
      KeySchema: [
        {
          AttributeName: 'email',
          KeyType: 'HASH',
        },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],
  StreamSpecification: {
    StreamViewType: 'NEW_AND_OLD_IMAGES',
    StreamEnabled: true,
  },
  Tags: [
    {
      Key: 'Application',
      Value: 'TutorVerse',
    },
    {
      Key: 'Purpose',
      Value: 'Email and Password Verification',
    },
  ],
};

async function createTable() {
  try {
    console.log(`Creating table: ${TABLE_NAME}`);
    console.log('Parameters:', JSON.stringify(params, null, 2));

    const result = await dynamodb.createTable(params).promise();

    console.log('\n✅ Table created successfully!');
    console.log('Table ARN:', result.TableDescription.TableArn);
    console.log('Table Status:', result.TableDescription.TableStatus);

    // Wait for table to be active
    console.log('\nWaiting for table to become ACTIVE...');
    await dynamodb.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
    console.log('✅ Table is now ACTIVE and ready to use!');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log(`✅ Table ${TABLE_NAME} already exists`);
    } else {
      console.error('❌ Error creating table:', error.message);
      process.exit(1);
    }
  }
}

createTable();
