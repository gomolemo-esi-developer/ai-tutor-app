/**
 * Admin Service - Real Backend Integration
 * Connects to backend on port 3000 for all admin operations
 * 
 * This service handles CRUD operations for all institutional data:
 * - Departments, Faculties, Campuses
 * - Courses, Modules
 * - Lecturers (Educators), Students
 * 
 * Usage:
 *   import AdminService from '@/services/AdminServiceReal';
 *   const departments = await AdminService.getDepartments();
 *   await AdminService.createDepartment({ name: 'CS', code: 'CS', facultyId: 'fac-123' });
 */

import { createGlobalApiClient } from './apiClient';

const api = createGlobalApiClient();

// ============================================================================
// DEPARTMENTS
// ============================================================================

export interface Department {
  departmentId: string;
  name: string;
  code: string;
  facultyId?: string;
  description?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const DepartmentService = {
  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    return api.get('/api/admin/departments');
  },

  /**
   * Get single department by ID
   */
  async getDepartment(id: string): Promise<Department> {
    return api.get(`/api/admin/departments/${id}`);
  },

  /**
   * Create new department
   */
  async createDepartment(data: {
    name: string;
    code: string;
    facultyId?: string;
  }): Promise<Department> {
    return api.post('/api/admin/departments', {
      departmentName: data.name,
      departmentCode: data.code,
      facultyId: data.facultyId,
    });
  },

  /**
   * Update department
   */
  async updateDepartment(
    id: string,
    data: Partial<{ name: string; code: string; facultyId: string }>
  ): Promise<Department> {
    return api.put(`/api/admin/departments/${id}`, {
      departmentName: data.name,
      departmentCode: data.code,
      facultyId: data.facultyId,
    });
  },

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(id: string): Promise<void> {
    return api.delete(`/api/admin/departments/${id}`);
  },
};

// ============================================================================
// FACULTIES
// ============================================================================

export interface Faculty {
  facultyId: string;
  name: string;
  code: string;
  description?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const FacultyService = {
  async getFaculties(): Promise<Faculty[]> {
    return api.get('/api/admin/faculties');
  },

  async getFaculty(id: string): Promise<Faculty> {
    return api.get(`/api/admin/faculties/${id}`);
  },

  async createFaculty(data: { name: string; code: string }): Promise<Faculty> {
    return api.post('/api/admin/faculties', {
      facultyName: data.name,
      facultyCode: data.code,
    });
  },

  async updateFaculty(
    id: string,
    data: Partial<{ name: string; code: string }>
  ): Promise<Faculty> {
    return api.put(`/api/admin/faculties/${id}`, {
      facultyName: data.name,
      facultyCode: data.code,
    });
  },

  async deleteFaculty(id: string): Promise<void> {
    return api.delete(`/api/admin/faculties/${id}`);
  },
};

// ============================================================================
// CAMPUSES
// ============================================================================

export interface Campus {
  campusId: string;
  name: string;
  code: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const CampusService = {
  async getCampuses(): Promise<Campus[]> {
    return api.get('/api/admin/campuses');
  },

  async getCampus(id: string): Promise<Campus> {
    return api.get(`/api/admin/campuses/${id}`);
  },

  async createCampus(data: {
    name: string;
    code?: string;
    city?: string;
    country?: string;
  }): Promise<Campus> {
    return api.post('/api/admin/campuses', {
      campusName: data.name,
      campusCode: data.code || data.name.substring(0, 3).toUpperCase(),
      city: data.city,
      address: data.city && data.country ? `${data.city}, ${data.country}` : undefined,
    });
  },

  async updateCampus(
    id: string,
    data: Partial<{ name: string; code: string; city: string; country: string }>
  ): Promise<Campus> {
    return api.put(`/api/admin/campuses/${id}`, {
      campusName: data.name,
      campusCode: data.code || (data.name ? data.name.substring(0, 3).toUpperCase() : undefined),
      city: data.city,
      address: data.city && data.country ? `${data.city}, ${data.country}` : undefined,
    });
  },

  async deleteCampus(id: string): Promise<void> {
    return api.delete(`/api/admin/campuses/${id}`);
  },
};

// ============================================================================
// COURSES
// ============================================================================

export interface Course {
  courseId: string;
  name: string;
  code: string;
  departmentId: string;
  duration?: number;
  credits?: number;
  description?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const CourseService = {
  async getCourses(): Promise<Course[]> {
    return api.get('/api/admin/courses');
  },

  async getCourse(id: string): Promise<Course> {
    return api.get(`/api/admin/courses/${id}`);
  },

  async getCoursesByDepartment(departmentId: string): Promise<Course[]> {
    return api.get(`/api/admin/courses?departmentId=${departmentId}`);
  },

  async createCourse(data: {
    name: string;
    code: string;
    departmentId: string;
    duration?: number;
    credits?: number;
    description?: string;
  }): Promise<Course> {
    return api.post('/api/admin/courses', {
      courseName: data.name,
      courseCode: data.code,
      departmentId: data.departmentId,
      duration: data.duration,
      credits: data.credits,
      description: data.description,
    });
  },

  async updateCourse(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      departmentId: string;
      duration?: number;
      credits?: number;
      description?: string;
    }>
  ): Promise<Course> {
    return api.put(`/api/admin/courses/${id}`, {
      courseName: data.name,
      courseCode: data.code,
      departmentId: data.departmentId,
      duration: data.duration,
      credits: data.credits,
      description: data.description,
    });
  },

  async deleteCourse(id: string): Promise<void> {
    return api.delete(`/api/admin/courses/${id}`);
  },
};

// ============================================================================
// MODULES
// ============================================================================

export interface Module {
  moduleId: string;
  name: string;
  code: string;
  departmentId: string;
  description?: string;
  lecturerIds?: string[];
  credits?: number;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const ModuleService = {
  async getModules(): Promise<Module[]> {
    return api.get('/api/admin/modules');
  },

  async getModule(id: string): Promise<Module> {
    return api.get(`/api/admin/modules/${id}`);
  },

  async getModulesByDepartment(departmentId: string): Promise<Module[]> {
    return api.get(`/api/admin/modules?departmentId=${departmentId}`);
  },

  async createModule(data: {
    name: string;
    code: string;
    description?: string;
    courseId?: string;
  }): Promise<Module> {
    return api.post('/api/admin/modules', {
      moduleName: data.name,
      moduleCode: data.code,
      description: data.description,
      courseId: data.courseId,
    });
  },

  async updateModule(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      description?: string;
      courseId?: string;
    }>
  ): Promise<Module> {
    return api.put(`/api/admin/modules/${id}`, {
      moduleName: data.name,
      moduleCode: data.code,
      description: data.description,
      courseId: data.courseId,
    });
  },

  async deleteModule(id: string): Promise<void> {
    return api.delete(`/api/admin/modules/${id}`);
  },
};

// ============================================================================
// LECTURERS
// ============================================================================

export interface Lecturer {
  lecturerId: string;
  userId?: string;
  staffNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  campusId: string;
  moduleIds: string[];
  phone?: string;
  officeLocation?: string;
  bio?: string;
  registrationStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const LecturerService = {
  async getLecturers(): Promise<Lecturer[]> {
    return api.get('/api/admin/lecturers');
  },

  async getLecturer(id: string): Promise<Lecturer> {
    return api.get(`/api/admin/lecturers/${id}`);
  },

  async createLecturer(data: {
    staffNumber: string;
    email: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    campusId: string;
    moduleIds?: string[];
    phone?: string;
    officeLocation?: string;
    bio?: string;
  }): Promise<Lecturer> {
    return api.post('/api/admin/lecturers', {
      staffNumber: data.staffNumber,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      departmentId: data.departmentId,
      campusId: data.campusId,
      moduleIds: data.moduleIds || [],
      phone: data.phone,
      officeLocation: data.officeLocation,
      bio: data.bio,
    });
  },

  async updateLecturer(
    id: string,
    data: Partial<{
      staffNumber: string;
      email: string;
      firstName: string;
      lastName: string;
      title?: string;
      departmentId: string;
      campusId: string;
      moduleIds: string[];
      phone?: string;
      officeLocation?: string;
      bio?: string;
    }>
  ): Promise<Lecturer> {
    return api.put(`/api/admin/lecturers/${id}`, data);
  },

  async deleteLecturer(id: string): Promise<void> {
    return api.delete(`/api/admin/lecturers/${id}`);
  },
};

// ============================================================================
// STUDENTS
// ============================================================================

export interface Student {
  studentId: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  departmentId: string;
  campusId: string;
  moduleIds: string[];
  enrollmentYear: number;
  phone?: string;
  registrationStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  deletedAt?: number;
}

export const StudentService = {
  async getStudents(): Promise<Student[]> {
    return api.get('/api/admin/students');
  },

  async getStudent(id: string): Promise<Student> {
    return api.get(`/api/admin/students/${id}`);
  },

  async createStudent(data: {
    studentNumber: string;
    email: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    campusId: string;
    enrollmentYear: number;
    moduleIds?: string[];
    phone?: string;
  }): Promise<Student> {
    return api.post('/api/admin/students', {
      studentNumber: data.studentNumber,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      departmentId: data.departmentId,
      campusId: data.campusId,
      enrollmentYear: data.enrollmentYear,
      moduleIds: data.moduleIds || [],
      phone: data.phone,
    });
  },

  async updateStudent(
    id: string,
    data: Partial<{
      studentNumber: string;
      email: string;
      firstName: string;
      lastName: string;
      departmentId: string;
      campusId: string;
      enrollmentYear: number;
      moduleIds: string[];
      phone?: string;
    }>
  ): Promise<Student> {
    return api.put(`/api/admin/students/${id}`, data);
  },

  async deleteStudent(id: string): Promise<void> {
    return api.delete(`/api/admin/students/${id}`);
  },
};

// ============================================================================
// COMBINED ADMIN SERVICE
// ============================================================================

const AdminService = {
  departments: DepartmentService,
  faculties: FacultyService,
  campuses: CampusService,
  courses: CourseService,
  modules: ModuleService,
  lecturers: LecturerService,
  students: StudentService,

  /**
   * Set JWT token for all subsequent requests
   */
  setToken: (token: string | null) => api.setToken(token),

  /**
   * Get current JWT token
   */
  getToken: () => api.getToken(),

  /**
   * Clear JWT token (logout)
   */
  clearToken: () => api.clearToken(),
};

export default AdminService;
