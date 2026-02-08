/**
 * Seed Script: Create Super Admin User
 * 
 * This script creates a super admin account that can:
 * - Add educators to the system
 * - Add students to the system
 * - Manage all system configuration
 * 
 * Usage:
 *   npx ts-node scripts/seed-super-admin.ts
 * 
 * After running, use these credentials to login to admin portal:
 *   Email: admin@university.edu
 *   Password: AdminPassword@123
 *   Role: super_admin
 */

import dotenv from 'dotenv';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Load .env file
dotenv.config();

// Config
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.AWS_COGNITO_USER_POOL_ID || 'us-east-1_XXXXXX';
const COGNITO_REGION = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-east-2';
const DYNAMODB_REGION = process.env.AWS_REGION || 'us-east-2';
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'aitutor_users';

const superAdminData = {
  email: 'admin@university.edu',
  password: 'AdminPassword@123',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super_admin',
};

async function seedSuperAdmin() {
  console.log('🔧 Starting Super Admin Seeding...\n');

  try {
    // 1. Create Cognito User
    console.log('1️⃣  Creating Cognito user...');
    const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

    const createUserCommand = new AdminCreateUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: superAdminData.email,
      MessageAction: 'SUPPRESS', // Don't send welcome email
      TemporaryPassword: 'TempPassword@123',
      UserAttributes: [
        { Name: 'email', Value: superAdminData.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: superAdminData.firstName },
        { Name: 'family_name', Value: superAdminData.lastName },
      ],
    });

    const createUserResponse = await cognitoClient.send(createUserCommand);
    const cognitoUserId = createUserResponse.User?.Username;

    if (!cognitoUserId) {
      throw new Error('Failed to create Cognito user');
    }

    console.log(`   ✅ Cognito user created: ${cognitoUserId}`);

    // 2. Set Permanent Password
    console.log('2️⃣  Setting permanent password...');
    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: superAdminData.email,
      Password: superAdminData.password,
      Permanent: true,
    });

    await cognitoClient.send(setPasswordCommand);
    console.log('   ✅ Password set successfully');

    // 3. Create DynamoDB User Record
    console.log('3️⃣  Creating DynamoDB user record...');
    const dynamoClient = new DynamoDBClient({ region: DYNAMODB_REGION });

    const timestamp = Date.now();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const userRecord = {
      pk: `USER#${userId}`,
      sk: 'PROFILE',
      userId,
      email: superAdminData.email,
      firstName: superAdminData.firstName,
      lastName: superAdminData.lastName,
      role: superAdminData.role,
      isActivated: true,
      registrationStatus: 'ACTIVATED',
      cognitoId: cognitoUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: 'system',
    };

    const putCommand = new PutItemCommand({
      TableName: USERS_TABLE,
      Item: marshall(userRecord),
    });

    await dynamoClient.send(putCommand);
    console.log(`   ✅ DynamoDB user record created`);

    // 4. Print Success Message
    console.log('\n✅ Super Admin Successfully Created!\n');
    console.log('━'.repeat(60));
    console.log('SUPER ADMIN CREDENTIALS');
    console.log('━'.repeat(60));
    console.log(`📧 Email:    ${superAdminData.email}`);
    console.log(`🔐 Password: ${superAdminData.password}`);
    console.log(`👤 Role:     ${superAdminData.role}`);
    console.log('━'.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Go to /auth');
    console.log('2. Click "Sign In"');
    console.log(`3. Enter: ${superAdminData.email}`);
    console.log(`4. Enter: ${superAdminData.password}`);
    console.log('5. Access admin portal at /admin/lecturers');
    console.log('6. Create educator and student records');
    console.log('7. Share staff/student numbers with educators/students');
    console.log('8. They can now activate their accounts via "Activate Pre-created"\n');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

// Run the script
seedSuperAdmin();
