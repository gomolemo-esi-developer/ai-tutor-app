#!/usr/bin/env node

/**
 * Phase 1B: Create Cognito Users Script
 * 
 * This script creates pre-loaded users in Cognito and DynamoDB:
 * - 1 Admin user (with temporary password)
 * - Sample Educators (with temporary password)
 * - Sample Students (with temporary password)
 * 
 * These users receive a temporary password via email, then must call
 * the /auth/activate endpoint to set their permanent password.
 * 
 * Usage:
 *   npm install aws-sdk uuid
 *   node phase1b-create-users.js --env development
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const args = process.argv.slice(2);
const environment = args.find(arg => arg.startsWith('--env'))?.split('=')[1] || 'development';

const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'us-east-2' });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

// User Pool ID - REPLACE WITH YOUR ACTUAL POOL ID
// Get this from CloudFormation output or AWS Console
const COGNITO_USER_POOL_ID = (process.env.COGNITO_USER_POOL_ID || 'us-east-2_hbVS78uWO').trim();
const USERS_TABLE = 'aitutor_users';
const LECTURERS_TABLE = 'aitutor_lecturers';
const STUDENTS_TABLE = 'aitutor_students';

// Sample users to create
const USERS_TO_CREATE = [
  // Admin User
  {
    type: 'ADMIN',
    email: 'admin@university.edu',
    firstName: 'Admin',
    lastName: 'User',
    tempPassword: 'AdminTemp123!'
  },
  // Educators
  {
    type: 'EDUCATOR',
    email: 'john.smith@university.edu',
    firstName: 'John',
    lastName: 'Smith',
    staffNumber: 'E001',
    tempPassword: 'EduTemp123!'
  },
  {
    type: 'EDUCATOR',
    email: 'jane.doe@university.edu',
    firstName: 'Jane',
    lastName: 'Doe',
    staffNumber: 'E002',
    tempPassword: 'EduTemp123!'
  },
  // Students
  {
    type: 'STUDENT',
    email: 'student1@student.university.edu',
    firstName: 'Student',
    lastName: 'One',
    studentNumber: 'S001',
    tempPassword: 'StuTemp123!'
  },
  {
    type: 'STUDENT',
    email: 'student2@student.university.edu',
    firstName: 'Student',
    lastName: 'Two',
    studentNumber: 'S002',
    tempPassword: 'StuTemp123!'
  }
];

async function createCognitoUser(email, firstName, lastName, tempPassword, role, customAttributes) {
  const params = {
    UserPoolId: COGNITO_USER_POOL_ID,
    Username: email,
    MessageAction: 'SUPPRESS', // Don't send Cognito welcome email (we'll send custom email)
    TemporaryPassword: tempPassword,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'false' },
      { Name: 'given_name', Value: firstName },
      { Name: 'family_name', Value: lastName }
    ]
  };

  // Add custom attributes if provided
  if (customAttributes) {
    if (customAttributes.staffNumber) {
      params.UserAttributes.push({
        Name: 'custom:staff_num',
        Value: customAttributes.staffNumber
      });
    }
    if (customAttributes.studentNumber) {
      params.UserAttributes.push({
        Name: 'custom:student_num',
        Value: customAttributes.studentNumber
      });
    }
    if (customAttributes.departmentId) {
      params.UserAttributes.push({
        Name: 'custom:department_id',
        Value: customAttributes.departmentId
      });
    }
    if (customAttributes.campusId) {
      params.UserAttributes.push({
        Name: 'custom:campus_id',
        Value: customAttributes.campusId
      });
    }
  }

  try {
    const response = await cognito.adminCreateUser(params).promise();
    console.log(`  ✅ Created Cognito user: ${email}`);
    return response.User.Username; // This is the Cognito Sub
  } catch (error) {
    if (error.code === 'UsernameExistsException') {
      console.log(`  ⚠️  User already exists: ${email}`);
      return email;
    }
    throw error;
  }
}

async function createUserInDynamoDB(userId, email, firstName, lastName, role, cognitoUsername) {
  const now = Math.floor(Date.now() / 1000);

  const userItem = {
    id: userId,
    userId,
    email,
    firstName,
    lastName,
    role,
    status: 'pending', // Not active until password is set
    cognitoUsername,
    createdAt: now,
    updatedAt: now
  };

  try {
    await dynamodb
      .put({
        TableName: USERS_TABLE,
        Item: userItem
      })
      .promise();
    console.log(`  ✅ Created user in DynamoDB: ${userId}`);
    return userId;
  } catch (error) {
    console.error(`  ❌ Failed to create user in DynamoDB:`, error);
    throw error;
  }
}

async function createLecturerProfile(userId, email, firstName, lastName, staffNumber) {
  const now = Math.floor(Date.now() / 1000);

  const lecturerId = uuidv4();
  const lecturerItem = {
    id: lecturerId,
    lecturerId,
    userId,
    email,
    firstName,
    lastName,
    staffNumber,
    departmentId: '', // To be assigned via admin portal in Phase 2
    campusId: '', // To be assigned via admin portal in Phase 2
    moduleIds: [],
    registrationStatus: 'pending_activation',
    createdAt: now,
    updatedAt: now
  };

  try {
    await dynamodb
      .put({
        TableName: LECTURERS_TABLE,
        Item: lecturerItem
      })
      .promise();
    console.log(`  ✅ Created educator profile: ${lecturerItem.lecturerId}`);
  } catch (error) {
    console.error(`  ❌ Failed to create educator profile:`, error);
    throw error;
  }
}

async function createStudentProfile(userId, email, firstName, lastName, studentNumber) {
  const now = Math.floor(Date.now() / 1000);

  const studentId = uuidv4();
  const studentItem = {
    id: studentId,
    studentId,
    userId,
    email,
    firstName,
    lastName,
    studentNumber,
    departmentId: '', // To be assigned via admin portal in Phase 2
    campusId: '', // To be assigned via admin portal in Phase 2
    moduleIds: [],
    academicYear: '2024-2025',
    registrationStatus: 'pending_activation',
    createdAt: now,
    updatedAt: now
  };

  try {
    await dynamodb
      .put({
        TableName: STUDENTS_TABLE,
        Item: studentItem
      })
      .promise();
    console.log(`  ✅ Created student profile: ${studentItem.studentId}`);
  } catch (error) {
    console.error(`  ❌ Failed to create student profile:`, error);
    throw error;
  }
}

async function createUser(userSpec) {
  console.log(`\n👤 Creating ${userSpec.type.toLowerCase()}: ${userSpec.email}`);

  const userId = uuidv4();

  try {
    // 1. Create in Cognito (without custom attributes for now)
    const cognitoUsername = await createCognitoUser(
      userSpec.email,
      userSpec.firstName,
      userSpec.lastName,
      userSpec.tempPassword,
      userSpec.type,
      null  // skip custom attributes to avoid schema issues
    );

    // 2. Create in DynamoDB Users table
    await createUserInDynamoDB(
      userId,
      userSpec.email,
      userSpec.firstName,
      userSpec.lastName,
      userSpec.type,
      cognitoUsername
    );

    // 3. Create role-specific profile
    if (userSpec.type === 'EDUCATOR') {
      await createLecturerProfile(
        userId,
        userSpec.email,
        userSpec.firstName,
        userSpec.lastName,
        userSpec.staffNumber
      );
    } else if (userSpec.type === 'STUDENT') {
      await createStudentProfile(
        userId,
        userSpec.email,
        userSpec.firstName,
        userSpec.lastName,
        userSpec.studentNumber
      );
    }

    console.log(`  📧 Temp password: ${userSpec.tempPassword}`);
    console.log(`  🔗 User must call: POST /auth/activate`);
    console.log(`     Body: { "email": "${userSpec.email}", "tempPassword": "${userSpec.tempPassword}", "newPassword": "..." }`);

  } catch (error) {
    console.error(`  ❌ Error creating user:`, error.message);
  }
}

async function runUserCreation() {
  try {
    console.log(`\n🚀 Phase 1B: Create Cognito Users (${environment})\n`);
    console.log(`Region: us-east-2`);
    console.log(`User Pool ID: ${COGNITO_USER_POOL_ID}`);

    if (!process.env.COGNITO_USER_POOL_ID) {
      console.warn('\n⚠️  WARNING: COGNITO_USER_POOL_ID environment variable not set!');
      console.warn('   Set it with: export COGNITO_USER_POOL_ID=us-east-2_xxxxx');
      console.warn('   You can find it in CloudFormation outputs\n');
      return;
    }

    for (const user of USERS_TO_CREATE) {
      await createUser(user);
    }

    console.log('\n✨ User creation complete!\n');
    console.log('📋 Summary:');
    console.log(`   Created ${USERS_TO_CREATE.length} users`);
    console.log('   - 1 Admin');
    console.log('   - 2 Educators');
    console.log('   - 2 Students');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Wait for temporary password emails');
    console.log('   2. Call POST /auth/activate with email + tempPassword + newPassword');
    console.log('   3. Users can then login with email + password\n');

  } catch (error) {
    console.error('\n❌ User creation failed:', error);
    process.exit(1);
  }
}

runUserCreation();
