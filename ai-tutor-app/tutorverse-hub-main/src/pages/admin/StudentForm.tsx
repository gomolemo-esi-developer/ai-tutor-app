import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import CrudModal from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/useApi';

interface Student {
  studentId?: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  title?: string;
  email: string;
  studentNumber: string;
  enrollmentNumber: string;
  academicLevel: '100' | '200' | '300' | '400';
  department: string;
  departmentId?: string;
  campus: string;
  campusId?: string;
  course?: string;
  courseId?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
}

interface Department {
  departmentId: string;
  name?: string;
  departmentName?: string;
}

interface Campus {
  campusId: string;
  name: string;
  code?: string;
}

interface Course {
  courseId: string;
  name: string;
  code?: string;
}

const StudentForm: React.FC<{
  onClose?: () => void;
  studentId?: string;
  onSuccess?: () => void;
}> = ({ onClose, studentId, onSuccess }) => {
  const { toast } = useToast();
  const { get, post, put, loading } = useApi<any>();

  const [formValues, setFormValues] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    title: '', // NEW
    email: '',
    studentNumber: '', // NEW
    enrollmentNumber: '',
    academicLevel: '100',
    department: '',
    campus: '', // NEW
    course: '', // NEW
    dateOfBirth: '',
    phoneNumber: '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]); // NEW
  const [courses, setCourses] = useState<Course[]>([]); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchCampuses(); // NEW
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  const fetchDepartments = async () => {
    try {
      const response = await get('/api/v3/departments');
      if (response?.data) {
        setDepartments(response.data.departments || response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch departments',
        variant: 'destructive',
      });
    }
  };

  const fetchCampuses = async () => { // NEW
    try {
      const response = await get('/api/v3/campuses');
      if (response?.data) {
        setCampuses(response.data.campuses || response.data);
      }
    } catch (error) {
      console.error('Failed to fetch campuses:', error);
    }
  };

  const fetchStudent = async () => {
    if (!studentId) return;
    try {
      setIsLoading(true);
      const response = await get(`/students/${studentId}`);
      if (response?.data) {
        const student = response.data;
        setFormValues({
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          title: student.title || '', // NEW
          email: student.email || '',
          studentNumber: student.studentNumber || '', // NEW
          enrollmentNumber: student.enrollmentNumber || '',
          academicLevel: student.academicLevel || '100',
          department: student.departmentId || student.department || '',
          campus: student.campusId || student.campus || '', // NEW
          course: student.courseId || student.course || '', // NEW
          dateOfBirth: student.dateOfBirth || '',
          phoneNumber: student.phoneNumber || '',
        });
        setIsEdit(true);
      }
    } catch (error) {
      console.error('Failed to fetch student:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateForm = () => {
    const required = [
      'firstName',
      'lastName',
      'email',
      'studentNumber', // NEW
      'enrollmentNumber',
      'academicLevel',
      'department',
      'campus', // NEW
    ];
    const missing = required.filter((field) => !formValues[field]);

    if (missing.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Missing required fields: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formValues.email)) {
      toast({
        title: 'Validation Error',
        description: 'Invalid email address',
        variant: 'destructive',
      });
      return false;
    }

    // Validate academic level
    if (!['100', '200', '300', '400'].includes(formValues.academicLevel)) {
      toast({
        title: 'Validation Error',
        description: 'Invalid academic level',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      const payload = {
        userId: formValues.userId || `user-${Date.now()}`,
        ...formValues,
      };

      if (isEdit && studentId) {
        await put(`/api/v3/students/${studentId}`, {
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          title: formValues.title, // NEW
          studentNumber: formValues.studentNumber, // NEW
          academicLevel: formValues.academicLevel,
          departmentId: formValues.department, // NEW
          campusId: formValues.campus, // NEW
          courseId: formValues.course, // NEW
          phoneNumber: formValues.phoneNumber,
        });
        toast({
          title: 'Success',
          description: 'Student updated successfully',
        });
      } else {
        await post('/api/v3/students', {
          ...payload,
          departmentId: formValues.department,
          campusId: formValues.campus,
          courseId: formValues.course,
        });
        toast({
          title: 'Success',
          description: 'Student created successfully',
        });
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description:
          error.response?.data?.error ||
          (isEdit ? 'Failed to update student' : 'Failed to create student'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const academicLevelOptions = [
    { value: '100', label: 'Year 1 (100 Level)' },
    { value: '200', label: 'Year 2 (200 Level)' },
    { value: '300', label: 'Year 3 (300 Level)' },
    { value: '400', label: 'Year 4 (400 Level)' },
  ];

  const departmentOptions = departments.map((dept) => ({
    value: dept.departmentId,
    label: dept.name || dept.departmentName || dept.departmentId,
  }));

  const campusOptions = campuses.map((campus) => ({ // NEW
    value: campus.campusId,
    label: `${campus.name}${campus.code ? ` (${campus.code})` : ''}`,
  }));

  const courseOptions = courses.map((course) => ({ // NEW
    value: course.courseId,
    label: `${course.code || ''} - ${course.name}`,
  }));

  const fields = [
    {
      key: 'firstName',
      label: 'First Name',
      type: 'text' as const,
      placeholder: 'John',
    },
    {
      key: 'lastName',
      label: 'Last Name',
      type: 'text' as const,
      placeholder: 'Doe',
    },
    {
      key: 'title', // NEW
      label: 'Title (Optional)',
      type: 'text' as const,
      placeholder: 'e.g., Mr., Mrs., Ms.',
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email' as const,
      placeholder: 'john@example.com',
      disabled: isEdit,
    },
    {
      key: 'studentNumber', // NEW
      label: 'Student Number',
      type: 'text' as const,
      placeholder: 'STU001',
      disabled: isEdit,
    },
    {
      key: 'enrollmentNumber',
      label: 'Enrollment Number',
      type: 'text' as const,
      placeholder: 'ENG123456',
      disabled: isEdit,
    },
    {
      key: 'academicLevel',
      label: 'Academic Level',
      type: 'select' as const,
      options: academicLevelOptions,
    },
    {
      key: 'department',
      label: 'Department',
      type: 'select' as const,
      options: departmentOptions,
    },
    {
      key: 'campus', // NEW
      label: 'Campus',
      type: 'select' as const,
      options: campusOptions,
    },
    {
      key: 'course', // NEW (optional)
      label: 'Course (Optional)',
      type: 'select' as const,
      options: courseOptions,
    },
    {
      key: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'text' as const,
      placeholder: 'YYYY-MM-DD',
    },
    {
      key: 'phoneNumber',
      label: 'Phone Number',
      type: 'text' as const,
      placeholder: '+1 (555) 000-0000',
    },
  ];

  return (
    <div className="space-y-4">
      <CrudModal
        isOpen={true}
        onClose={onClose || (() => {})}
        title="Student"
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isEdit={isEdit}
      />
    </div>
  );
};

export default StudentForm;
