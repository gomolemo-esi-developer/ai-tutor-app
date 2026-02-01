/**
 * DynamoDB Seeding Script
 * Populates DynamoDB tables with realistic test data
 * 
 * Usage: npx ts-node scripts/seed-dynamodb.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SeedData {
  departments: Record<string, any>[];
  faculties: Record<string, any>[];
  campuses: Record<string, any>[];
  courses: Record<string, any>[];
  modules: Record<string, any>[];
  lecturers: Record<string, any>[];
  students: Record<string, any>[];
}

// Helper to generate UUID-like IDs
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Seed data structure
const seedData: SeedData = {
  departments: [
    {
      departmentId: 'dept-001',
      name: 'Computer Science',
      code: 'CS',
      facultyId: 'fac-001',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      departmentId: 'dept-002',
      name: 'Information Technology',
      code: 'IT',
      facultyId: 'fac-001',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      departmentId: 'dept-003',
      name: 'Business Administration',
      code: 'BA',
      facultyId: 'fac-002',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      departmentId: 'dept-004',
      name: 'Engineering',
      code: 'ENG',
      facultyId: 'fac-001',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  faculties: [
    {
      facultyId: 'fac-001',
      name: 'Faculty of Science & Engineering',
      code: 'FSE',
      description: 'Science and Engineering programs',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      facultyId: 'fac-002',
      name: 'Faculty of Commerce',
      code: 'FC',
      description: 'Business and Commerce programs',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  campuses: [
    {
      campusId: 'camp-001',
      name: 'Main Campus',
      code: 'MAIN',
      address: '123 University Avenue',
      city: 'Boston',
      phone: '617-555-0001',
      email: 'main@university.edu',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      campusId: 'camp-002',
      name: 'Downtown Campus',
      code: 'DT',
      address: '456 City Center',
      city: 'Boston',
      phone: '617-555-0002',
      email: 'downtown@university.edu',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  courses: [
    {
      courseId: 'course-001',
      name: 'Bachelor of Science in Computer Science',
      code: 'BSCS',
      departmentId: 'dept-001',
      facultyId: 'fac-001',
      description: 'Comprehensive 4-year program in computer science',
      duration: 4,
      credits: 120,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      courseId: 'course-002',
      name: 'Bachelor of Business Administration',
      code: 'BBA',
      departmentId: 'dept-003',
      facultyId: 'fac-002',
      description: 'Business administration program',
      duration: 4,
      credits: 120,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      courseId: 'course-003',
      name: 'Bachelor of Technology in IT',
      code: 'BTech',
      departmentId: 'dept-002',
      facultyId: 'fac-001',
      description: 'IT and technology focused program',
      duration: 3,
      credits: 90,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  modules: [
    {
      moduleId: 'mod-001',
      name: 'Data Structures',
      code: 'CS101',
      departmentId: 'dept-001',
      courseId: 'course-001',
      description: 'Fundamental data structures and algorithms',
      credits: 3,
      semester: 1,
      academicYear: '2024-2025',
      lecturerIds: ['lect-001', 'lect-002'],
      studentCount: 45,
      fileCount: 12,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      moduleId: 'mod-002',
      name: 'Database Systems',
      code: 'CS201',
      departmentId: 'dept-001',
      courseId: 'course-001',
      description: 'Relational databases and SQL',
      credits: 3,
      semester: 2,
      academicYear: '2024-2025',
      lecturerIds: ['lect-001'],
      studentCount: 42,
      fileCount: 15,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      moduleId: 'mod-003',
      name: 'Web Development',
      code: 'CS301',
      departmentId: 'dept-001',
      courseId: 'course-001',
      description: 'Modern web technologies and frameworks',
      credits: 4,
      semester: 1,
      academicYear: '2024-2025',
      lecturerIds: ['lect-002'],
      studentCount: 50,
      fileCount: 18,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      moduleId: 'mod-004',
      name: 'Business Management',
      code: 'BA101',
      departmentId: 'dept-003',
      courseId: 'course-002',
      description: 'Principles of business management',
      credits: 3,
      semester: 1,
      academicYear: '2024-2025',
      lecturerIds: ['lect-003'],
      studentCount: 60,
      fileCount: 8,
      isActive: true,
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  lecturers: [
    {
      lecturerId: 'lect-001',
      userId: 'user-lect-001',
      email: 'john.doe@university.edu',
      firstName: 'John',
      lastName: 'Doe',
      staffNumber: 'L001',
      departmentId: 'dept-001',
      campusId: 'camp-001',
      moduleIds: ['mod-001', 'mod-002'],
      registrationStatus: 'ACTIVE',
      phone: '617-555-0100',
      officeLocation: 'Building A, Room 201',
      bio: 'Senior Lecturer in Computer Science with 10+ years experience',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      lecturerId: 'lect-002',
      userId: 'user-lect-002',
      email: 'sarah.smith@university.edu',
      firstName: 'Sarah',
      lastName: 'Smith',
      staffNumber: 'L002',
      departmentId: 'dept-001',
      campusId: 'camp-001',
      moduleIds: ['mod-001', 'mod-003'],
      registrationStatus: 'ACTIVE',
      phone: '617-555-0101',
      officeLocation: 'Building A, Room 202',
      bio: 'Lecturer specializing in web technologies',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      lecturerId: 'lect-003',
      userId: 'user-lect-003',
      email: 'michael.johnson@university.edu',
      firstName: 'Michael',
      lastName: 'Johnson',
      staffNumber: 'L003',
      departmentId: 'dept-003',
      campusId: 'camp-001',
      moduleIds: ['mod-004'],
      registrationStatus: 'ACTIVE',
      phone: '617-555-0102',
      officeLocation: 'Building B, Room 301',
      bio: 'Professor of Business Administration',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],

  students: [
    {
      studentId: 'stud-001',
      userId: 'user-stud-001',
      email: 'jane.smith@student.university.edu',
      firstName: 'Jane',
      lastName: 'Smith',
      studentNumber: 'S001',
      departmentId: 'dept-001',
      campusId: 'camp-001',
      moduleIds: ['mod-001', 'mod-003'],
      enrollmentYear: 2023,
      registrationStatus: 'ACTIVE',
      phone: '617-555-0201',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      studentId: 'stud-002',
      userId: 'user-stud-002',
      email: 'robert.brown@student.university.edu',
      firstName: 'Robert',
      lastName: 'Brown',
      studentNumber: 'S002',
      departmentId: 'dept-001',
      campusId: 'camp-001',
      moduleIds: ['mod-002', 'mod-003'],
      enrollmentYear: 2023,
      registrationStatus: 'ACTIVE',
      phone: '617-555-0202',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      studentId: 'stud-003',
      userId: 'user-stud-003',
      email: 'emily.davis@student.university.edu',
      firstName: 'Emily',
      lastName: 'Davis',
      studentNumber: 'S003',
      departmentId: 'dept-001',
      campusId: 'camp-002',
      moduleIds: ['mod-001', 'mod-002'],
      enrollmentYear: 2024,
      registrationStatus: 'ACTIVE',
      phone: '617-555-0203',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
    {
      studentId: 'stud-004',
      userId: 'user-stud-004',
      email: 'william.wilson@student.university.edu',
      firstName: 'William',
      lastName: 'Wilson',
      studentNumber: 'S004',
      departmentId: 'dept-003',
      campusId: 'camp-001',
      moduleIds: ['mod-004'],
      enrollmentYear: 2024,
      registrationStatus: 'ACTIVE',
      phone: '617-555-0204',
      createdAt: Date.now(),
      createdBy: 'admin-001',
      updatedAt: Date.now(),
    },
  ],
};

async function seedDatabase() {
  const dynamodbEndpoint = process.env.DYNAMODB_ENDPOINT;
  const region = process.env.AWS_REGION || 'us-east-2';

  console.log('\n🌱 Starting DynamoDB seeding...');
  console.log(`📍 Endpoint: ${dynamodbEndpoint || 'AWS Default'}`);
  console.log(`🌍 Region: ${region}\n`);

  const clientConfig: any = {
    region,
  };

  if (dynamodbEndpoint) {
    clientConfig.endpoint = dynamodbEndpoint;
  }

  const client = new DynamoDBClient(clientConfig);
  const docClient = DynamoDBDocumentClient.from(client);

  const tablePrefix = process.env.DYNAMODB_TABLE_PREFIX || 'aitutor';

  const tables = {
    DEPARTMENTS: `${tablePrefix}_departments`,
    FACULTIES: `${tablePrefix}_faculties`,
    CAMPUSES: `${tablePrefix}_campuses`,
    COURSES: `${tablePrefix}_courses`,
    MODULES: `${tablePrefix}_modules`,
    LECTURERS: `${tablePrefix}_lecturers`,
    STUDENTS: `${tablePrefix}_students`,
  };

  let totalInserted = 0;

  try {
    // Seed Faculties
    console.log('📚 Seeding Faculties...');
    for (const faculty of seedData.faculties) {
      await docClient.send(
        new PutCommand({
          TableName: tables.FACULTIES,
          Item: faculty,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.faculties.length} faculties inserted\n`);

    // Seed Departments
    console.log('🏢 Seeding Departments...');
    for (const department of seedData.departments) {
      await docClient.send(
        new PutCommand({
          TableName: tables.DEPARTMENTS,
          Item: department,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.departments.length} departments inserted\n`);

    // Seed Campuses
    console.log('🏛️  Seeding Campuses...');
    for (const campus of seedData.campuses) {
      await docClient.send(
        new PutCommand({
          TableName: tables.CAMPUSES,
          Item: campus,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.campuses.length} campuses inserted\n`);

    // Seed Courses
    console.log('📖 Seeding Courses...');
    for (const course of seedData.courses) {
      await docClient.send(
        new PutCommand({
          TableName: tables.COURSES,
          Item: course,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.courses.length} courses inserted\n`);

    // Seed Modules
    console.log('📝 Seeding Modules...');
    for (const module of seedData.modules) {
      await docClient.send(
        new PutCommand({
          TableName: tables.MODULES,
          Item: module,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.modules.length} modules inserted\n`);

    // Seed Lecturers
    console.log('👨‍🏫 Seeding Lecturers...');
    for (const lecturer of seedData.lecturers) {
      await docClient.send(
        new PutCommand({
          TableName: tables.LECTURERS,
          Item: lecturer,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.lecturers.length} lecturers inserted\n`);

    // Seed Students
    console.log('👨‍🎓 Seeding Students...');
    for (const student of seedData.students) {
      await docClient.send(
        new PutCommand({
          TableName: tables.STUDENTS,
          Item: student,
        })
      );
      totalInserted++;
    }
    console.log(`✅ ${seedData.students.length} students inserted\n`);

    console.log('═══════════════════════════════════════');
    console.log(`✨ Seeding Complete!`);
    console.log(`═══════════════════════════════════════`);
    console.log(`📊 Total items inserted: ${totalInserted}`);
    console.log(`📍 Faculties: ${seedData.faculties.length}`);
    console.log(`📍 Departments: ${seedData.departments.length}`);
    console.log(`📍 Campuses: ${seedData.campuses.length}`);
    console.log(`📍 Courses: ${seedData.courses.length}`);
    console.log(`📍 Modules: ${seedData.modules.length}`);
    console.log(`📍 Lecturers: ${seedData.lecturers.length}`);
    console.log(`📍 Students: ${seedData.students.length}`);
    console.log(`═══════════════════════════════════════\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error seeding database:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    console.error('\n⚠️  Make sure:');
    console.error('1. DynamoDB Local is running (if using DYNAMODB_ENDPOINT)');
    console.error('2. Tables exist in DynamoDB');
    console.error('3. AWS credentials are configured');
    console.error('4. Environment variables are set correctly\n');
    process.exit(1);
  }
}

seedDatabase();
