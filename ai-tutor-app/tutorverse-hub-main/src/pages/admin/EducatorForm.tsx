import React, { useState, useEffect } from 'react';
import CrudModal from '@/components/admin/CrudModal';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/hooks/useApi';

interface Educator {
  educatorId?: string;
  userId: string;
  firstName: string;
  lastName: string;
  title: string; // NEW: Position/Title
  email: string;
  staffNumber?: string; // Alternative to employeeId
  employeeId: string;
  department: string;
  departmentId?: string;
  campus?: string;
  campusId?: string;
  specialization: string;
  educationLevel: 'Bachelor' | 'Master' | 'PhD';
  yearsExperience: number;
  officeLocation?: string;
  officeHours?: string;
}

interface Department {
  departmentId: string;
  name?: string;
  departmentName?: string; // Fallback for compatibility
}

interface Campus {
  campusId: string;
  name: string;
  code?: string;
}

const EducatorForm: React.FC<{
  onClose?: () => void;
  educatorId?: string;
  onSuccess?: () => void;
}> = ({ onClose, educatorId, onSuccess }) => {
  const { toast } = useToast();
  const { get, post, put, loading } = useApi<any>();

  const [formValues, setFormValues] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    title: '', // NEW
    email: '',
    staffNumber: '',
    employeeId: '',
    department: '',
    campus: '', // NEW
    specialization: '',
    educationLevel: 'Master',
    yearsExperience: '0',
    officeLocation: '',
    officeHours: '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchCampuses(); // NEW
    if (educatorId) {
      fetchEducator();
    }
  }, [educatorId]);

  const fetchDepartments = async () => {
    try {
      const response = await get('/api/v3/departments'); // Updated endpoint
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
      toast({
        title: 'Error',
        description: 'Failed to fetch campuses',
        variant: 'destructive',
      });
    }
  };

  const fetchEducator = async () => {
    if (!educatorId) return;
    try {
      setIsLoading(true);
      const response = await get(`/educators/${educatorId}`);
      if (response?.data) {
        const educator = response.data;
          setFormValues({
            firstName: educator.firstName || '',
            lastName: educator.lastName || '',
            title: educator.title || '', // NEW
            email: educator.email || '',
            staffNumber: educator.staffNumber || '', // NEW
            employeeId: educator.employeeId || '',
            department: educator.departmentId || educator.department || '',
            campus: educator.campusId || educator.campus || '', // NEW
            specialization: educator.specialization || '',
            educationLevel: educator.educationLevel || 'Master',
            yearsExperience: String(educator.yearsExperience || 0),
            officeLocation: educator.officeLocation || '',
            officeHours: educator.officeHours || '',
          });
          setIsEdit(true);
      }
    } catch (error) {
      console.error('Failed to fetch educator:', error);
      toast({
        title: 'Error',
        description: 'Failed to load educator details',
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
      'title', // NEW
      'email',
      'staffNumber', // NEW (or employeeId)
      'department',
      'campus', // NEW
      'specialization',
      'educationLevel',
      'yearsExperience',
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

    // Validate education level
    if (
      !['Bachelor', 'Master', 'PhD'].includes(formValues.educationLevel)
    ) {
      toast({
        title: 'Validation Error',
        description: 'Invalid education level',
        variant: 'destructive',
      });
      return false;
    }

    // Validate years of experience
    const yearsExp = parseInt(formValues.yearsExperience, 10);
    if (isNaN(yearsExp) || yearsExp < 0) {
      toast({
        title: 'Validation Error',
        description: 'Years of experience must be a non-negative number',
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
        yearsExperience: parseInt(formValues.yearsExperience, 10),
      };

      if (isEdit && educatorId) {
        await put(`/api/v3/educators/${educatorId}`, {
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          title: formValues.title, // NEW
          staffNumber: formValues.staffNumber, // NEW
          departmentId: formValues.department, // NEW
          campusId: formValues.campus, // NEW
          specialization: formValues.specialization,
          educationLevel: formValues.educationLevel,
          yearsExperience: parseInt(formValues.yearsExperience, 10),
          officeLocation: formValues.officeLocation,
          officeHours: formValues.officeHours,
        });
        toast({
          title: 'Success',
          description: 'Educator updated successfully',
        });
      } else {
        await post('/api/v3/educators', {
          ...payload,
          departmentId: formValues.department,
          campusId: formValues.campus,
        });
        toast({
          title: 'Success',
          description: 'Educator created successfully',
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
          (isEdit ? 'Failed to update educator' : 'Failed to create educator'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const educationLevelOptions = [
    { value: 'Bachelor', label: 'Bachelor Degree' },
    { value: 'Master', label: 'Master Degree' },
    { value: 'PhD', label: 'PhD' },
  ];

  const departmentOptions = departments.map((dept) => ({
    value: dept.departmentId,
    label: dept.name || dept.departmentName || dept.departmentId,
  }));

  const campusOptions = campuses.map((campus) => ({ // NEW
    value: campus.campusId,
    label: `${campus.name}${campus.code ? ` (${campus.code})` : ''}`,
  }));

  const yearsExperienceOptions = Array.from({ length: 51 }, (_, i) => ({
    value: String(i),
    label: `${i} year${i !== 1 ? 's' : ''}`,
  }));

  const titleOptions = [ // NEW
    { value: 'Professor', label: 'Professor' },
    { value: 'Associate Professor', label: 'Associate Professor' },
    { value: 'Assistant Professor', label: 'Assistant Professor' },
    { value: 'Lecturer', label: 'Lecturer' },
    { value: 'Senior Lecturer', label: 'Senior Lecturer' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Instructor', label: 'Instructor' },
  ];

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
      label: 'Title',
      type: 'select' as const,
      options: titleOptions,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email' as const,
      placeholder: 'john@example.com',
      disabled: isEdit,
    },
    {
      key: 'staffNumber', // NEW
      label: 'Staff Number',
      type: 'text' as const,
      placeholder: 'STAFF001',
      disabled: isEdit,
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
      key: 'specialization',
      label: 'Specialization',
      type: 'text' as const,
      placeholder: 'e.g., Computer Science, Mathematics',
    },
    {
      key: 'educationLevel',
      label: 'Education Level',
      type: 'select' as const,
      options: educationLevelOptions,
    },
    {
      key: 'yearsExperience',
      label: 'Years of Experience',
      type: 'select' as const,
      options: yearsExperienceOptions,
    },
    {
      key: 'officeLocation',
      label: 'Office Location',
      type: 'text' as const,
      placeholder: 'e.g., Building A, Room 101',
    },
    {
      key: 'officeHours',
      label: 'Office Hours',
      type: 'text' as const,
      placeholder: 'e.g., Mon-Wed 2-4 PM',
    },
  ];

  return (
    <div className="space-y-4">
      <CrudModal
        isOpen={true}
        onClose={onClose || (() => {})}
        title="Educator"
        fields={fields}
        values={formValues}
        onChange={handleChange}
        onSubmit={handleSubmit}
        isEdit={isEdit}
      />
    </div>
  );
};

export default EducatorForm;
