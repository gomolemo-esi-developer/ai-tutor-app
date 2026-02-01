#!/usr/bin/env node

/**
 * Phase 1B: Seed Data Script
 * 
 * This script populates reference data (Campuses, Faculties, Departments, Courses, Modules)
 * into DynamoDB before Phase 2 (Admin Portal) implementation.
 * 
 * Usage:
 *   npm install aws-sdk uuid
 *   node phase1b-seed-data.js --env development
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const environment = args.find(arg => arg.startsWith('--env'))?.split('=')[1] || 'development';

const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'us-east-2' });

// Reference Data
const SEED_DATA = {
  campuses: [
    {
      id: uuidv4(),
      campusId: uuidv4(),
      code: 'MAIN',
      name: 'Main Campus',
      city: 'New York',
      country: 'USA',
      coordinates: '40.7128,-74.0060',
      establishedYear: 1990,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    }
  ],
  faculties: [
    {
      id: uuidv4(),
      facultyId: uuidv4(),
      code: 'ENG',
      name: 'Faculty of Engineering',
      deanName: 'Dr. John Smith',
      email: 'engineering@university.edu',
      phone: '+1234567890',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    }
  ],
  departments: [],
  courses: [],
  modules: []
};

// Generate departments for each faculty/campus combo
function generateDepartments() {
  const departmentsList = [
    { code: 'CS', name: 'Computer Science' },
    { code: 'CE', name: 'Civil Engineering' },
    { code: 'ME', name: 'Mechanical Engineering' },
    { code: 'EE', name: 'Electrical Engineering' }
  ];

  return departmentsList.map(dept => ({
    id: uuidv4(),
    departmentId: uuidv4(),
    departmentCode: dept.code,
    name: dept.name,
    facultyId: SEED_DATA.faculties[0].facultyId,
    campusId: SEED_DATA.campuses[0].campusId,
    headOfDepartmentName: 'Dr. Jane Doe',
    email: `${dept.code.toLowerCase()}@university.edu`,
    phone: '+1234567890',
    location: `Building A, Floor ${Math.floor(Math.random() * 5) + 1}`,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000)
  }));
}

// Generate courses
function generateCourses(departments) {
  const coursesList = [];
  departments.forEach(dept => {
    coursesList.push({
      id: uuidv4(),
      courseId: uuidv4(),
      courseCode: `${dept.departmentCode}100`,
      name: `Bachelor of Science in ${dept.name}`,
      description: `4-year degree program in ${dept.name}`,
      departmentId: dept.departmentId,
      duration: 4,
      credits: 120,
      status: 'active',
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000)
    });
  });
  return coursesList;
}

// Generate modules for each course
function generateModules(courses) {
  const modulesList = [];
  const moduleTemplates = [
    { code: '101', name: 'Introduction to Programming', credits: 3 },
    { code: '102', name: 'Data Structures', credits: 3 },
    { code: '201', name: 'Algorithms', credits: 4 },
    { code: '202', name: 'Database Systems', credits: 3 },
    { code: '301', name: 'Advanced Topics', credits: 4 }
  ];

  courses.forEach(course => {
    moduleTemplates.forEach(template => {
      modulesList.push({
        id: uuidv4(),
        moduleId: uuidv4(),
        moduleCode: `${course.courseCode.substring(0, 2)}${template.code}`,
        moduleName: template.name,
        description: `Module: ${template.name}`,
        courseId: course.courseId,
        departmentId: course.departmentId,
        credits: template.credits,
        semester: parseInt(template.code.charAt(0)),
        status: 'active',
        lecturerIds: [], // Will be assigned in Phase 2 when admin creates lecturers
        enrollmentLimit: 50,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000)
      });
    });
  });
  return modulesList;
}

async function seedTable(tableName, items) {
  console.log(`\n📝 Seeding ${tableName} with ${items.length} items...`);

  for (let i = 0; i < items.length; i++) {
    try {
      await dynamodb
        .put({
          TableName: tableName,
          Item: items[i]
        })
        .promise();
    } catch (error) {
      console.error(`  ❌ Error inserting item ${i + 1}:`, error.message);
      throw error;
    }
  }

  console.log(`  ✅ Successfully inserted ${items.length} items`);
}

async function runSeed() {
  try {
    console.log(`\n🚀 Starting Phase 1B Seed Data Script (${environment})\n`);
    console.log('Region: us-east-2');

    // Generate all data
    console.log('\n📊 Generating reference data...');
    SEED_DATA.departments = generateDepartments();
    SEED_DATA.courses = generateCourses(SEED_DATA.departments);
    SEED_DATA.modules = generateModules(SEED_DATA.courses);

    console.log(`  ✅ Generated ${SEED_DATA.campuses.length} campus`);
    console.log(`  ✅ Generated ${SEED_DATA.faculties.length} faculty`);
    console.log(`  ✅ Generated ${SEED_DATA.departments.length} departments`);
    console.log(`  ✅ Generated ${SEED_DATA.courses.length} courses`);
    console.log(`  ✅ Generated ${SEED_DATA.modules.length} modules`);

    // Seed tables
    await seedTable('aitutor_campuses', SEED_DATA.campuses);
    await seedTable('aitutor_faculties', SEED_DATA.faculties);
    await seedTable('aitutor_departments', SEED_DATA.departments);
    await seedTable('aitutor_courses', SEED_DATA.courses);
    await seedTable('aitutor_modules', SEED_DATA.modules);

    console.log('\n✨ Phase 1B Seed complete!\n');
    console.log('📋 Summary:');
    console.log(`   - Campuses: ${SEED_DATA.campuses.length}`);
    console.log(`   - Faculties: ${SEED_DATA.faculties.length}`);
    console.log(`   - Departments: ${SEED_DATA.departments.length}`);
    console.log(`   - Courses: ${SEED_DATA.courses.length}`);
    console.log(`   - Modules: ${SEED_DATA.modules.length}`);
    console.log('\n🎯 Next Step: Run phase1b-create-users.js to create Cognito users\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeed();
