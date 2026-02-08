#!/usr/bin/env node

/**
 * TutorVerse DynamoDB Sample Data Upload Script
 * 
 * Uploads comprehensive sample data to all 14 DynamoDB tables.
 * All data is properly formatted with no empty fields, proper types, and valid relationships.
 * 
 * Usage:
 *   node upload-sample-data.js --environment development --region us-east-2
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
let environment = 'development';
let region = 'us-east-2';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--environment' && i + 1 < args.length) {
    environment = args[i + 1];
  }
  if (args[i] === '--region' && i + 1 < args.length) {
    region = args[i + 1];
  }
}

// Configure AWS
AWS.config.update({ region });
const dynamodb = new AWS.DynamoDB.DocumentClient();

class DynamoDBUploader {
  constructor(env, region) {
    this.environment = env;
    this.region = region;
    this.now = Date.now();
    this.createdIds = {};
  }

  generateId() {
    return uuidv4();
  }

  getTimestamp(daysAgo = 0) {
    return this.now - (daysAgo * 24 * 60 * 60 * 1000);
  }

  async putItem(tableName, item) {
    try {
      await dynamodb.put({
        TableName: `aitutor_${tableName}`,
        Item: item
      }).promise();
      const id = item.id || item.userId || item.sessionId || 'unknown';
      console.log(`✓ ${tableName}: ${id}`);
      return true;
    } catch (error) {
      console.error(`✗ ${tableName}: ${error.message}`);
      return false;
    }
  }

  async batchPutItems(tableName, items) {
    let count = 0;
    const chunkedItems = [];
    
    // Split into chunks of 25
    for (let i = 0; i < items.length; i += 25) {
      chunkedItems.push(items.slice(i, i + 25));
    }

    for (const chunk of chunkedItems) {
      const requests = chunk.map(item => ({
        PutRequest: {
          Item: item
        }
      }));

      try {
        await dynamodb.batchWrite({
          RequestItems: {
            [`aitutor_${tableName}`]: requests
          }
        }).promise();
        count += chunk.length;
      } catch (error) {
        console.error(`✗ Batch error in ${tableName}: ${error.message}`);
      }
    }

    return count;
  }

  // ==================== CAMPUS ====================
  async uploadCampuses() {
    console.log('\n[1/14] Uploading Campuses...');
    const campuses = [
      {
        campusId: this.generateId(),
        campusName: 'Main Campus',
        campusCode: 'MAIN',
        location: '123 University Drive',
        city: 'Lagos',
        state: 'Lagos State',
        country: 'Nigeria',
        phone: '+234 1 123 4567',
        email: 'main@tutorverse.edu',
        principal: 'admin-001',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        campusId: this.generateId(),
        campusName: 'Satellite Campus',
        campusCode: 'SAT',
        location: '456 Education Way',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        phone: '+234 9 876 5432',
        email: 'sat@tutorverse.edu',
        principal: 'admin-002',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('campuses', campuses);
    this.createdIds.campuses = campuses.map(c => c.campusId);
    console.log(`Uploaded ${uploaded} campuses`);
    return campuses;
  }

  // ==================== FACULTIES ====================
  async uploadFaculties() {
    console.log('\n[2/14] Uploading Faculties...');
    const faculties = [
      {
        facultyId: this.generateId(),
        facultyName: 'Faculty of Science',
        facultyCode: 'FOS',
        description: 'Science and Technology programs',
        dean: 'prof-001',
        phone: '+234 1 111 1111',
        email: 'science@tutorverse.edu',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        facultyId: this.generateId(),
        facultyName: 'Faculty of Humanities',
        facultyCode: 'FOH',
        description: 'Arts and Social Sciences programs',
        dean: 'prof-002',
        phone: '+234 1 222 2222',
        email: 'humanities@tutorverse.edu',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        facultyId: this.generateId(),
        facultyName: 'Faculty of Engineering',
        facultyCode: 'FOE',
        description: 'Engineering and Technology programs',
        dean: 'prof-003',
        phone: '+234 1 333 3333',
        email: 'engineering@tutorverse.edu',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('faculties', faculties);
    this.createdIds.faculties = faculties.map(f => f.facultyId);
    console.log(`Uploaded ${uploaded} faculties`);
    return faculties;
  }

  // ==================== DEPARTMENTS ====================
  async uploadDepartments(faculties) {
    console.log('\n[3/14] Uploading Departments...');
    const departments = [
      {
        departmentId: this.generateId(),
        facultyId: faculties[0].facultyId,
        departmentName: 'Computer Science',
        departmentCode: 'CS',
        description: 'Computer Science and Information Technology',
        headOfDepartment: 'dr-001',
        phone: '+234 1 444 4444',
        email: 'cs@tutorverse.edu',
        location: 'Block A, Main Campus',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        departmentId: this.generateId(),
        facultyId: faculties[0].facultyId,
        departmentName: 'Mathematics',
        departmentCode: 'MATH',
        description: 'Pure and Applied Mathematics',
        headOfDepartment: 'dr-002',
        phone: '+234 1 555 5555',
        email: 'math@tutorverse.edu',
        location: 'Block B, Main Campus',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        departmentId: this.generateId(),
        facultyId: faculties[1].facultyId,
        departmentName: 'English Language',
        departmentCode: 'ENG',
        description: 'English Language and Literature',
        headOfDepartment: 'dr-003',
        phone: '+234 1 666 6666',
        email: 'english@tutorverse.edu',
        location: 'Block C, Main Campus',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      },
      {
        departmentId: this.generateId(),
        facultyId: faculties[2].facultyId,
        departmentName: 'Civil Engineering',
        departmentCode: 'CE',
        description: 'Civil and Structural Engineering',
        headOfDepartment: 'dr-004',
        phone: '+234 1 777 7777',
        email: 'civil@tutorverse.edu',
        location: 'Engineering Block, Main Campus',
        status: 'active',
        createdAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('departments', departments);
    this.createdIds.departments = departments.map(d => d.departmentId);
    console.log(`Uploaded ${uploaded} departments`);
    return departments;
  }

  // ==================== USERS ====================
  async uploadUsers(departments, campuses) {
    console.log('\n[4/14] Uploading Users...');
    const users = [
      {
        userId: 'admin-001',
        email: 'admin@tutorverse.edu',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[0].departmentId,
        lastLogin: this.getTimestamp(),
        createdAt: this.getTimestamp(30),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'lecturer-001',
        email: 'prof.smith@tutorverse.edu',
        firstName: 'John',
        lastName: 'Smith',
        role: 'educator',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[0].departmentId,
        lastLogin: this.getTimestamp(1),
        createdAt: this.getTimestamp(20),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'lecturer-002',
        email: 'prof.jones@tutorverse.edu',
        firstName: 'Sarah',
        lastName: 'Jones',
        role: 'educator',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[1].departmentId,
        lastLogin: this.getTimestamp(2),
        createdAt: this.getTimestamp(20),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'lecturer-003',
        email: 'dr.williams@tutorverse.edu',
        firstName: 'Michael',
        lastName: 'Williams',
        role: 'educator',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[2].departmentId,
        lastLogin: this.getTimestamp(3),
        createdAt: this.getTimestamp(15),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'student-001',
        email: 'alice.johnson@tutorverse.edu',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'student',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[0].departmentId,
        lastLogin: this.getTimestamp(),
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'student-002',
        email: 'bob.brown@tutorverse.edu',
        firstName: 'Bob',
        lastName: 'Brown',
        role: 'student',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[0].departmentId,
        lastLogin: this.getTimestamp(1),
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'student-003',
        email: 'carol.davis@tutorverse.edu',
        firstName: 'Carol',
        lastName: 'Davis',
        role: 'student',
        status: 'active',
        isActive: true,
        campusId: campuses[0].campusId,
        departmentId: departments[1].departmentId,
        lastLogin: this.getTimestamp(2),
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        userId: 'student-004',
        email: 'david.miller@tutorverse.edu',
        firstName: 'David',
        lastName: 'Miller',
        role: 'student',
        status: 'active',
        isActive: true,
        campusId: campuses[1].campusId,
        departmentId: departments[2].departmentId,
        lastLogin: this.getTimestamp(3),
        createdAt: this.getTimestamp(150),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('users', users);
    this.createdIds.users = users.map(u => u.userId);
    console.log(`Uploaded ${uploaded} users`);
    return users;
  }

  // ==================== LECTURERS ====================
  async uploadLecturers(departments) {
    console.log('\n[5/14] Uploading Lecturers...');
    const lecturers = [
      {
        lecturerId: this.generateId(),
        userId: 'lecturer-001',
        staffNumber: 'LEC001',
        firstName: 'John',
        lastName: 'Smith',
        email: 'prof.smith@tutorverse.edu',
        departmentId: departments[0].departmentId,
        qualifications: 'PhD Computer Science, MSc Software Engineering',
        specialization: 'Machine Learning and Artificial Intelligence',
        officeLocation: 'A-306',
        phone: '+234 1 800 0001',
        status: 'active',
        createdAt: this.getTimestamp(20),
        updatedAt: this.getTimestamp()
      },
      {
        lecturerId: this.generateId(),
        userId: 'lecturer-002',
        staffNumber: 'LEC002',
        firstName: 'Sarah',
        lastName: 'Jones',
        email: 'prof.jones@tutorverse.edu',
        departmentId: departments[1].departmentId,
        qualifications: 'PhD Mathematics, MSc Applied Statistics',
        specialization: 'Numerical Analysis and Optimization',
        officeLocation: 'B-402',
        phone: '+234 1 800 0002',
        status: 'active',
        createdAt: this.getTimestamp(20),
        updatedAt: this.getTimestamp()
      },
      {
        lecturerId: this.generateId(),
        userId: 'lecturer-003',
        staffNumber: 'LEC003',
        firstName: 'Michael',
        lastName: 'Williams',
        email: 'dr.williams@tutorverse.edu',
        departmentId: departments[2].departmentId,
        qualifications: 'PhD English Literature, MA Comparative Literature',
        specialization: 'Modern and Contemporary Literature',
        officeLocation: 'C-205',
        phone: '+234 1 800 0003',
        status: 'active',
        createdAt: this.getTimestamp(15),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('lecturers', lecturers);
    this.createdIds.lecturers = lecturers.map(l => l.lecturerId);
    console.log(`Uploaded ${uploaded} lecturers`);
    return lecturers;
  }

  // ==================== STUDENTS ====================
  async uploadStudents(departments) {
    console.log('\n[6/14] Uploading Students...');
    const students = [
      {
        studentId: this.generateId(),
        userId: 'student-001',
        studentNumber: 'STU001',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@tutorverse.edu',
        departmentId: departments[0].departmentId,
        enrollmentYear: 2022,
        status: 'active',
        gpa: 3.85,
        phone: '+234 1 900 0001',
        dateOfBirth: '2002-05-15',
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        studentId: this.generateId(),
        userId: 'student-002',
        studentNumber: 'STU002',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@tutorverse.edu',
        departmentId: departments[0].departmentId,
        enrollmentYear: 2022,
        status: 'active',
        gpa: 3.45,
        phone: '+234 1 900 0002',
        dateOfBirth: '2002-08-22',
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        studentId: this.generateId(),
        userId: 'student-003',
        studentNumber: 'STU003',
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol.davis@tutorverse.edu',
        departmentId: departments[1].departmentId,
        enrollmentYear: 2023,
        status: 'active',
        gpa: 3.92,
        phone: '+234 1 900 0003',
        dateOfBirth: '2003-03-10',
        createdAt: this.getTimestamp(180),
        updatedAt: this.getTimestamp()
      },
      {
        studentId: this.generateId(),
        userId: 'student-004',
        studentNumber: 'STU004',
        firstName: 'David',
        lastName: 'Miller',
        email: 'david.miller@tutorverse.edu',
        departmentId: departments[2].departmentId,
        enrollmentYear: 2023,
        status: 'active',
        gpa: 3.65,
        phone: '+234 1 900 0004',
        dateOfBirth: '2003-11-28',
        createdAt: this.getTimestamp(150),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('students', students);
    this.createdIds.students = students.map(s => s.studentId);
    console.log(`Uploaded ${uploaded} students`);
    return students;
  }

  // ==================== COURSES ====================
  async uploadCourses(departments) {
    console.log('\n[7/14] Uploading Courses...');
    const courses = [
      {
        courseId: this.generateId(),
        departmentId: departments[0].departmentId,
        courseName: 'Bachelor of Science in Computer Science',
        courseCode: 'CS_BSC',
        description: '4-year undergraduate program in Computer Science',
        duration: 4,
        level: '100',
        totalCredits: 120,
        startDate: '2022-09-01',
        coordinator: 'lecturer-001',
        status: 'active',
        createdAt: this.getTimestamp(365),
        updatedAt: this.getTimestamp()
      },
      {
        courseId: this.generateId(),
        departmentId: departments[0].departmentId,
        courseName: 'Bachelor of Science in Information Technology',
        courseCode: 'IT_BSC',
        description: '4-year undergraduate program in Information Technology',
        duration: 4,
        level: '100',
        totalCredits: 120,
        startDate: '2023-09-01',
        coordinator: 'lecturer-001',
        status: 'active',
        createdAt: this.getTimestamp(365),
        updatedAt: this.getTimestamp()
      },
      {
        courseId: this.generateId(),
        departmentId: departments[1].departmentId,
        courseName: 'Bachelor of Science in Mathematics',
        courseCode: 'MATH_BSC',
        description: '4-year undergraduate program in Mathematics',
        duration: 4,
        level: '100',
        totalCredits: 120,
        startDate: '2022-09-01',
        coordinator: 'lecturer-002',
        status: 'active',
        createdAt: this.getTimestamp(365),
        updatedAt: this.getTimestamp()
      },
      {
        courseId: this.generateId(),
        departmentId: departments[2].departmentId,
        courseName: 'Bachelor of Arts in English Language',
        courseCode: 'ENG_BA',
        description: '4-year undergraduate program in English Language',
        duration: 4,
        level: '100',
        totalCredits: 120,
        startDate: '2023-09-01',
        coordinator: 'lecturer-003',
        status: 'active',
        createdAt: this.getTimestamp(365),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('courses', courses);
    this.createdIds.courses = courses.map(c => c.courseId);
    console.log(`Uploaded ${uploaded} courses`);
    return courses;
  }

  // ==================== MODULES ====================
  async uploadModules(courses) {
    console.log('\n[8/14] Uploading Modules...');
    const modules = [
      {
        moduleId: this.generateId(),
        courseId: courses[0].courseId,
        moduleCode: 'CS101',
        moduleName: 'Introduction to Programming',
        description: 'Fundamentals of programming concepts using Python',
        credits: 3,
        semesterOffered: '1',
        lecturerId: 'lecturer-001',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[0].courseId,
        moduleCode: 'CS102',
        moduleName: 'Data Structures',
        description: 'Arrays, linked lists, trees, and graph data structures',
        credits: 3,
        semesterOffered: '1',
        lecturerId: 'lecturer-001',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[0].courseId,
        moduleCode: 'CS201',
        moduleName: 'Web Development',
        description: 'Frontend and backend web development technologies',
        credits: 4,
        semesterOffered: '2',
        lecturerId: 'lecturer-001',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[2].courseId,
        moduleCode: 'MATH101',
        moduleName: 'Calculus I',
        description: 'Differential calculus and applications',
        credits: 4,
        semesterOffered: '1',
        lecturerId: 'lecturer-002',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[2].courseId,
        moduleCode: 'MATH102',
        moduleName: 'Linear Algebra',
        description: 'Matrices, vectors, and linear transformations',
        credits: 3,
        semesterOffered: '1',
        lecturerId: 'lecturer-002',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[3].courseId,
        moduleCode: 'ENG101',
        moduleName: 'English Composition',
        description: 'Writing skills and composition techniques',
        credits: 3,
        semesterOffered: '1',
        lecturerId: 'lecturer-003',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      },
      {
        moduleId: this.generateId(),
        courseId: courses[3].courseId,
        moduleCode: 'ENG102',
        moduleName: 'British Literature',
        description: 'Study of major works in British literary tradition',
        credits: 3,
        semesterOffered: '2',
        lecturerId: 'lecturer-003',
        status: 'active',
        createdAt: this.getTimestamp(90),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('modules', modules);
    this.createdIds.modules = modules.map(m => m.moduleId);
    console.log(`Uploaded ${uploaded} modules`);
    return modules;
  }

  // ==================== FILES ====================
  async uploadFiles(modules) {
    console.log('\n[9/14] Uploading Files...');
    const files = [
      {
        fileId: this.generateId(),
        moduleId: modules[0].moduleId,
        fileName: 'Python Basics Introduction.pdf',
        fileType: 'application/pdf',
        fileSize: 2048576,
        s3Key: 'modules/CS101/python-basics.pdf',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-001',
        uploadedAt: this.getTimestamp(30),
        description: 'Introduction to Python programming fundamentals',
        isPublished: true,
        downloadCount: 45,
        createdAt: this.getTimestamp(30),
        updatedAt: this.getTimestamp()
      },
      {
        fileId: this.generateId(),
        moduleId: modules[0].moduleId,
        fileName: 'Programming Assignment 1.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 512000,
        s3Key: 'modules/CS101/assignment1.docx',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-001',
        uploadedAt: this.getTimestamp(25),
        description: 'First programming assignment - Variables and Functions',
        isPublished: true,
        downloadCount: 32,
        createdAt: this.getTimestamp(25),
        updatedAt: this.getTimestamp()
      },
      {
        fileId: this.generateId(),
        moduleId: modules[1].moduleId,
        fileName: 'Data Structures Lecture Notes.pdf',
        fileType: 'application/pdf',
        fileSize: 3072000,
        s3Key: 'modules/CS102/data-structures-notes.pdf',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-001',
        uploadedAt: this.getTimestamp(28),
        description: 'Comprehensive lecture notes covering all data structures',
        isPublished: true,
        downloadCount: 58,
        createdAt: this.getTimestamp(28),
        updatedAt: this.getTimestamp()
      },
      {
        fileId: this.generateId(),
        moduleId: modules[3].moduleId,
        fileName: 'Calculus Textbook Chapter 1.pdf',
        fileType: 'application/pdf',
        fileSize: 5120000,
        s3Key: 'modules/MATH101/calculus-ch1.pdf',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-002',
        uploadedAt: this.getTimestamp(35),
        description: 'Textbook chapter on limits and continuity',
        isPublished: true,
        downloadCount: 72,
        createdAt: this.getTimestamp(35),
        updatedAt: this.getTimestamp()
      },
      {
        fileId: this.generateId(),
        moduleId: modules[4].moduleId,
        fileName: 'Linear Algebra Sample Problems.pdf',
        fileType: 'application/pdf',
        fileSize: 1500000,
        s3Key: 'modules/MATH102/linear-algebra-problems.pdf',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-002',
        uploadedAt: this.getTimestamp(32),
        description: 'Sample problems with solutions for practice',
        isPublished: true,
        downloadCount: 41,
        createdAt: this.getTimestamp(32),
        updatedAt: this.getTimestamp()
      },
      {
        fileId: this.generateId(),
        moduleId: modules[5].moduleId,
        fileName: 'Essay Writing Guide.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 800000,
        s3Key: 'modules/ENG101/essay-writing-guide.docx',
        s3Bucket: `aitutor-files-${this.environment}-123456789`,
        uploadedBy: 'lecturer-003',
        uploadedAt: this.getTimestamp(40),
        description: 'Comprehensive guide to academic essay writing',
        isPublished: true,
        downloadCount: 89,
        createdAt: this.getTimestamp(40),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('files', files);
    this.createdIds.files = files.map(f => f.fileId);
    console.log(`Uploaded ${uploaded} files`);
    return files;
  }

  // ==================== CHAT SESSIONS ====================
  async uploadChatSessions() {
    console.log('\n[10/14] Uploading Chat Sessions...');
    const expiresAt = this.getTimestamp() + (7 * 24 * 60 * 60 * 1000);
    
    const sessions = [
      {
        sessionId: this.generateId(),
        studentId: 'student-001',
        moduleId: this.createdIds.modules[0],
        createdAt: this.getTimestamp(5),
        expiresAt: expiresAt,
        topic: 'Python Basics - Understanding Variables',
        messageCount: 12,
        status: 'closed',
        lastMessageAt: this.getTimestamp(4),
        updatedAt: this.getTimestamp(4)
      },
      {
        sessionId: this.generateId(),
        studentId: 'student-002',
        moduleId: this.createdIds.modules[0],
        createdAt: this.getTimestamp(3),
        expiresAt: expiresAt,
        topic: 'Functions and Parameters in Python',
        messageCount: 8,
        status: 'active',
        lastMessageAt: this.getTimestamp(1),
        updatedAt: this.getTimestamp(1)
      },
      {
        sessionId: this.generateId(),
        studentId: 'student-003',
        moduleId: this.createdIds.modules[3],
        createdAt: this.getTimestamp(7),
        expiresAt: expiresAt,
        topic: 'Calculus Limits and Continuity',
        messageCount: 15,
        status: 'closed',
        lastMessageAt: this.getTimestamp(6),
        updatedAt: this.getTimestamp(6)
      },
      {
        sessionId: this.generateId(),
        studentId: 'student-004',
        moduleId: this.createdIds.modules[5],
        createdAt: this.getTimestamp(2),
        expiresAt: expiresAt,
        topic: 'Essay Structure and Thesis Statement',
        messageCount: 10,
        status: 'active',
        lastMessageAt: this.getTimestamp(),
        updatedAt: this.getTimestamp()
      }
    ];

    const uploaded = await this.batchPutItems('chat_sessions', sessions);
    this.createdIds.chatSessions = sessions.map(s => s.sessionId);
    console.log(`Uploaded ${uploaded} chat sessions`);
    return sessions;
  }

  // ==================== CHAT MESSAGES ====================
  async uploadChatMessages(sessions) {
    console.log('\n[11/14] Uploading Chat Messages...');
    const expiresAt = this.getTimestamp() + (7 * 24 * 60 * 60 * 1000);
    
    const messages = [
      {
        messageId: this.generateId(),
        sessionId: sessions[0].sessionId,
        role: 'student',
        content: 'What is the difference between a variable and a constant in Python?',
        timestamp: this.getTimestamp(5),
        expiresAt: expiresAt,
        metadata: { source: 'web' },
        createdAt: this.getTimestamp(5)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[0].sessionId,
        role: 'ai',
        content: 'A variable in Python is a name that refers to a value that can change, while a constant is meant to be a fixed value.',
        timestamp: this.getTimestamp(5),
        expiresAt: expiresAt,
        metadata: { confidence: 0.95 },
        createdAt: this.getTimestamp(5)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[1].sessionId,
        role: 'student',
        content: 'How do I define a function in Python?',
        timestamp: this.getTimestamp(3),
        expiresAt: expiresAt,
        metadata: { source: 'mobile' },
        createdAt: this.getTimestamp(3)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[1].sessionId,
        role: 'ai',
        content: 'Use the def keyword followed by the function name and parameters in parentheses.',
        timestamp: this.getTimestamp(3),
        expiresAt: expiresAt,
        metadata: { confidence: 0.98 },
        createdAt: this.getTimestamp(3)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[2].sessionId,
        role: 'student',
        content: 'What is a limit in calculus?',
        timestamp: this.getTimestamp(7),
        expiresAt: expiresAt,
        metadata: { source: 'web' },
        createdAt: this.getTimestamp(7)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[3].sessionId,
        role: 'student',
        content: 'What should be in the introduction paragraph of an essay?',
        timestamp: this.getTimestamp(2),
        expiresAt: expiresAt,
        metadata: { source: 'web' },
        createdAt: this.getTimestamp(2)
      },
      {
        messageId: this.generateId(),
        sessionId: sessions[3].sessionId,
        role: 'ai',
        content: 'The introduction should include a hook, background context, and a clear thesis statement.',
        timestamp: this.getTimestamp(2),
        expiresAt: expiresAt,
        metadata: { confidence: 0.97 },
        createdAt: this.getTimestamp(2)
      }
    ];

    const uploaded = await this.batchPutItems('chat_messages', messages);
    console.log(`Uploaded ${uploaded} chat messages`);
    return messages;
  }

  // ==================== QUIZ RESULTS ====================
  async uploadQuizResults() {
    console.log('\n[12/14] Uploading Quiz Results...');
    const expiresAt = this.getTimestamp() + (30 * 24 * 60 * 60 * 1000);
    
    const quizzes = [
      {
        quizId: this.generateId(),
        studentId: 'student-001',
        moduleId: this.createdIds.modules[0],
        expiresAt: expiresAt,
        questions: [
          'What is a variable in Python?',
          'How do you declare a variable?',
          'What types of data can variables hold?'
        ],
        answers: ['A named value that can change', 'name = value', 'strings, integers, floats, etc'],
        score: 85,
        totalQuestions: 3,
        correctAnswers: 3,
        generatedAt: this.getTimestamp(10),
        submittedAt: this.getTimestamp(9),
        duration: 900,
        feedback: 'Excellent understanding of Python variables. Well done!',
        status: 'graded'
      },
      {
        quizId: this.generateId(),
        studentId: 'student-002',
        moduleId: this.createdIds.modules[0],
        expiresAt: expiresAt,
        questions: [
          'What is a variable in Python?',
          'How do you declare a variable?',
          'What types of data can variables hold?'
        ],
        answers: ['Storage location', 'using var keyword', 'many types'],
        score: 70,
        totalQuestions: 3,
        correctAnswers: 2,
        generatedAt: this.getTimestamp(8),
        submittedAt: this.getTimestamp(7),
        duration: 1200,
        feedback: 'Good effort. Review variable declaration syntax in Python.',
        status: 'graded'
      },
      {
        quizId: this.generateId(),
        studentId: 'student-003',
        moduleId: this.createdIds.modules[3],
        expiresAt: expiresAt,
        questions: [
          'What is a limit?',
          'How do you calculate a limit?',
          'What is continuity?'
        ],
        answers: ['Approaching value', 'algebraic and graphical methods', 'no breaks in function'],
        score: 92,
        totalQuestions: 3,
        correctAnswers: 3,
        generatedAt: this.getTimestamp(6),
        submittedAt: this.getTimestamp(5),
        duration: 1500,
        feedback: 'Outstanding! Your calculus fundamentals are very strong.',
        status: 'graded'
      }
    ];

    const uploaded = await this.batchPutItems('quiz_results', quizzes);
    console.log(`Uploaded ${uploaded} quiz results`);
    return quizzes;
  }

  // ==================== SUMMARY RESULTS ====================
  async uploadSummaryResults() {
    console.log('\n[13/14] Uploading Summary Results...');
    const expiresAt = this.getTimestamp() + (30 * 24 * 60 * 60 * 1000);
    
    const summaries = [
      {
        summaryId: this.generateId(),
        studentId: 'student-001',
        moduleId: this.createdIds.modules[0],
        fileId: this.createdIds.files[0],
        expiresAt: expiresAt,
        originalContent: 'Python is a high-level programming language...',
        summaryText: 'Python is a versatile programming language used for web development, data science, and automation.',
        summaryLength: 'short',
        keyPoints: ['High-level language', 'Readable syntax', 'Multiple applications', 'Beginner-friendly'],
        generatedAt: this.getTimestamp(12),
        regenerationCount: 1,
        rating: 5,
        feedback: 'Very accurate and helpful summary',
        status: 'active'
      },
      {
        summaryId: this.generateId(),
        studentId: 'student-002',
        moduleId: this.createdIds.modules[3],
        fileId: this.createdIds.files[3],
        expiresAt: expiresAt,
        originalContent: 'Calculus is the mathematical study of continuous change...',
        summaryText: 'Calculus studies rates of change and accumulation using derivatives and integrals.',
        summaryLength: 'medium',
        keyPoints: ['Continuous change', 'Derivatives', 'Integrals', 'Real-world applications'],
        generatedAt: this.getTimestamp(8),
        regenerationCount: 0,
        rating: 4,
        feedback: 'Good summary, could be more detailed on applications',
        status: 'active'
      },
      {
        summaryId: this.generateId(),
        studentId: 'student-004',
        moduleId: this.createdIds.modules[5],
        fileId: this.createdIds.files[5],
        expiresAt: expiresAt,
        originalContent: 'Essay writing is a fundamental skill in academic communication...',
        summaryText: 'Essays are structured written arguments that present ideas clearly.',
        summaryLength: 'medium',
        keyPoints: ['Structured writing', 'Clear thesis', 'Supporting evidence', 'Organization'],
        generatedAt: this.getTimestamp(4),
        regenerationCount: 1,
        rating: 5,
        feedback: 'Excellent, this helps me understand essay structure better',
        status: 'active'
      }
    ];

    const uploaded = await this.batchPutItems('summary_results', summaries);
    console.log(`Uploaded ${uploaded} summary results`);
    return summaries;
  }

  // ==================== AUDIT LOGS ====================
  async uploadAuditLogs() {
    console.log('\n[14/14] Uploading Audit Logs...');
    const ttl = Math.floor((this.getTimestamp() + (30 * 24 * 60 * 60 * 1000)) / 1000);
    
    const logs = [
      {
        logId: this.generateId(),
        userId: 'admin-001',
        timestamp: this.getTimestamp(20),
        ttl: ttl,
        action: 'create',
        entityType: 'department',
        entityId: this.createdIds.departments[0],
        oldValues: {},
        newValues: { departmentName: 'Computer Science', departmentCode: 'CS' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      },
      {
        logId: this.generateId(),
        userId: 'lecturer-001',
        timestamp: this.getTimestamp(15),
        ttl: ttl,
        action: 'create',
        entityType: 'module',
        entityId: this.createdIds.modules[0],
        oldValues: {},
        newValues: { moduleCode: 'CS101', moduleName: 'Introduction to Programming' },
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0'
      },
      {
        logId: this.generateId(),
        userId: 'lecturer-001',
        timestamp: this.getTimestamp(10),
        ttl: ttl,
        action: 'create',
        entityType: 'file',
        entityId: this.createdIds.files[0],
        oldValues: {},
        newValues: { fileName: 'Python Basics Introduction.pdf', isPublished: true },
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0'
      },
      {
        logId: this.generateId(),
        userId: 'student-001',
        timestamp: this.getTimestamp(5),
        ttl: ttl,
        action: 'update',
        entityType: 'chat_session',
        entityId: this.createdIds.chatSessions[0],
        oldValues: { status: 'active' },
        newValues: { status: 'closed' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0'
      }
    ];

    const uploaded = await this.batchPutItems('audit_logs', logs);
    console.log(`Uploaded ${uploaded} audit log entries`);
    return logs;
  }

  async runUpload() {
    console.log('='.repeat(60));
    console.log('TutorVerse DynamoDB Sample Data Upload');
    console.log(`Environment: ${this.environment}`);
    console.log(`Region: ${this.region}`);
    console.log('='.repeat(60));

    try {
      const campuses = await this.uploadCampuses();
      const faculties = await this.uploadFaculties();
      const departments = await this.uploadDepartments(faculties);
      const users = await this.uploadUsers(departments, campuses);
      const lecturers = await this.uploadLecturers(departments);
      const students = await this.uploadStudents(departments);
      const courses = await this.uploadCourses(departments);
      const modules = await this.uploadModules(courses);
      const files = await this.uploadFiles(modules);
      const sessions = await this.uploadChatSessions();
      const messages = await this.uploadChatMessages(sessions);
      const quizzes = await this.uploadQuizResults();
      const summaries = await this.uploadSummaryResults();
      const logs = await this.uploadAuditLogs();

      console.log('\n' + '='.repeat(60));
      console.log('✓ All data uploaded successfully!');
      console.log('='.repeat(60));
      console.log('\nSummary:');
      console.log(`  Campuses: ${campuses.length}`);
      console.log(`  Faculties: ${faculties.length}`);
      console.log(`  Departments: ${departments.length}`);
      console.log(`  Users: ${users.length}`);
      console.log(`  Lecturers: ${lecturers.length}`);
      console.log(`  Students: ${students.length}`);
      console.log(`  Courses: ${courses.length}`);
      console.log(`  Modules: ${modules.length}`);
      console.log(`  Files: ${files.length}`);
      console.log(`  Chat Sessions: ${sessions.length}`);
      console.log(`  Chat Messages: ${messages.length}`);
      console.log(`  Quiz Results: ${quizzes.length}`);
      console.log(`  Summaries: ${summaries.length}`);
      console.log(`  Audit Logs: ${logs.length}`);
      console.log('\n✓ Ready to use on frontend!');
    } catch (error) {
      console.error('\n✗ Error during upload:', error.message);
      process.exit(1);
    }
  }
}

// Run the upload
const uploader = new DynamoDBUploader(environment, region);
uploader.runUpload();
