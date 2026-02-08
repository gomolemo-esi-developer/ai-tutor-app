import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Download, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import CrudModal from "@/components/admin/CrudModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import AdminService from "@/services/AdminServiceReal";

interface Faculty {
  id: string;
  name: string;
  abbreviation: string;
}

interface Department {
  id: string;
  name: string;
  facultyId: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
}

interface Campus {
  id: string;
  name: string;
  abbreviation: string;
}

interface Module {
  id: string;
  code: string;
  name: string;
  departmentId: string;
}

interface Student {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  id?: string;
  studentNumber?: string;
  name?: string;
  surname?: string;
  department?: string;
  courseId?: string;
  academicLevel?: string;
  moduleCodes?: string[];
  moduleNames?: string[];
  moduleIds?: string[];
  campus?: string;
}

const Students: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Student | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    item: Student | null;
  }>({ open: false, item: null });
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch all data from AdminService
      const [studentsData, departmentsData, campusesData, modulesData, coursesData] = await Promise.all([
        AdminService.students.getStudents().catch(() => null),
        AdminService.departments.getDepartments().catch(() => null),
        AdminService.campuses.getCampuses().catch(() => null),
        AdminService.modules.getModules().catch(() => null),
        AdminService.courses.getCourses().catch(() => null),
      ]);

      // Transform student data to match frontend Student type
      let transformedStudents: Student[] = [];
      if (Array.isArray(studentsData) && studentsData.length > 0) {
         transformedStudents = studentsData.map((student: any) => ({
           userId: student.userId || '',
           email: student.email || '',
           firstName: student.firstName || '',
           lastName: student.lastName || '',
           title: student.title || '',
           role: 'STUDENT',
           id: student.studentId,
           studentNumber: student.studentNumber || 'N/A',
           name: student.firstName || 'Unknown',
           surname: student.lastName || 'Student',
           department: student.departmentId || 'N/A',
           courseId: student.courseId || '',
           campus: student.campusId || 'N/A',
           academicLevel: student.registrationStatus || 'PENDING',
           moduleIds: student.moduleIds || [],
         } as any));
       }
      
      console.log('✅ Students loaded from DynamoDB:', transformedStudents.length);
      setStudents(transformedStudents);
      
      // Transform departments
      let transformedDepts: Department[] = [];
      if (Array.isArray(departmentsData)) {
        transformedDepts = departmentsData.map((dept: any) => ({
          id: dept.departmentId,
          name: dept.name || dept.departmentName,
          facultyId: dept.facultyId,
        }));
      }
      setDepartments(transformedDepts);
      
      // Transform campuses
      let transformedCampuses: Campus[] = [];
      if (Array.isArray(campusesData)) {
        transformedCampuses = campusesData.map((campus: any) => ({
          id: campus.campusId,
          name: campus.campusName || campus.name,
          abbreviation: campus.campusCode || campus.code || '',
        }));
      }
      console.log('✅ Campuses loaded:', transformedCampuses.length, transformedCampuses);
      setCampuses(transformedCampuses);
      
      // Transform modules
      let transformedModules: Module[] = [];
      if (Array.isArray(modulesData)) {
        transformedModules = modulesData.map((mod: any) => ({
          id: mod.moduleId || mod.id,
          code: mod.moduleCode || mod.code || '',
          name: mod.moduleName || mod.name || '',
          departmentId: mod.departmentId,
        }));
      }
      setModules(transformedModules);

      // Transform courses
      let transformedCourses: Course[] = [];
      if (Array.isArray(coursesData)) {
        transformedCourses = coursesData.map((course: any) => ({
          id: course.courseId || course.id,
          code: course.courseCode || course.code || '',
          name: course.courseName || course.name || '',
          departmentId: course.departmentId,
        }));
      }
      setCourses(transformedCourses);
      } catch (err: any) {
      console.error('❌ Error fetching students:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load students",
        variant: "destructive",
      });
      setStudents([]);
      } finally {
      setLoading(false);
      }
      };

  const columns = [
   {
     key: "studentNumber",
     label: "Student Number",
     render: (item: Student) => (
       <span className="text-sm font-normal text-foreground">
         {item.studentNumber || 'N/A'}
       </span>
     ),
   },
   {
     key: "firstName",
     label: "Full Name",
     render: (item: Student) => (
       <span className="text-sm font-normal text-foreground">
         {item.firstName || item.name} {item.lastName || item.surname}
       </span>
     ),
   },
   {
      key: "title",
      label: "Title",
      render: (item: Student) => (
        <span className="text-sm font-normal text-foreground">{(item as any).title || 'N/A'}</span>
      ),
    },
   { 
     key: "email", 
     label: "Email",
     render: (item: Student) => (
       <span className="text-sm font-normal text-foreground">{item.email || 'N/A'}</span>
     ),
   },
   {
     key: "courseId",
     label: "Course",
     render: (item: Student) => {
       const courseId = (item as any).courseId;
       const course = courses?.find((c: any) => c.id === courseId);
       return <span className="text-sm font-normal text-foreground">{course?.code || 'N/A'}</span>;
     },
   },
   {
     key: "moduleIds",
     label: "Modules",
     render: (item: Student) => {
       const moduleIds = (item as any).moduleIds || [];
       if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
         return <span className="text-sm font-normal text-foreground">None</span>;
       }
       return (
         <div className="flex flex-wrap gap-1">
           {moduleIds.map((moduleId: string) => {
             const module = modules.find(m => m.id === moduleId);
             return (
               <span key={moduleId} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                 {module?.code || moduleId}
               </span>
             );
           })}
         </div>
       );
     },
   },
   {
     key: "department",
     label: "Department",
     render: (item: Student) => {
       const dept = departments.find(d => d.id === item.department);
       return <span className="text-sm font-normal text-foreground">{dept?.name || item.department || 'N/A'}</span>;
     },
   },
   {
     key: "campus",
     label: "Campus",
     render: (item: Student) => {
       const campusId = item.campus;
       const campus = campuses.find(c => c.id === campusId);
       if (!campus) {
         console.warn(`Campus not found for ID: ${campusId}, available campuses:`, campuses.map(c => ({ id: c.id, name: c.name })));
       }
       return <span className="text-sm font-normal text-foreground">{campus?.name || campusId || 'N/A'}</span>;
     },
   },
  ];

  // Form fields for student management
   const fields = [
     {
       key: "studentNumber",
       label: "Enrollment Number",
       type: "text" as const,
       placeholder: "Auto-generated by system",
       disabled: !editingItem, // Only editable when editing
     },
     {
       key: "name",
       label: "First Name",
       type: "text" as const,
       placeholder: "Enter first name",
     },
     {
       key: "surname",
       label: "Last Name",
       type: "text" as const,
       placeholder: "Enter last name",
     },
     {
       key: "title",
       label: "Title",
       type: "select" as const,
       options: [
         { value: "Mr", label: "Mr" },
         { value: "Ms", label: "Ms" },
         { value: "Mrs", label: "Mrs" },
         { value: "Dr", label: "Dr" },
         { value: "Prof", label: "Prof" },
       ],
     },
     {
       key: "email",
       label: "Email Address",
       type: "email" as const,
       placeholder: "Enter email address",
     },
     {
       key: "enrollmentYear",
       label: "Enrollment Year",
       type: "text" as const,
       placeholder: new Date().getFullYear().toString(),
     },
     {
       key: "department",
       label: "Department",
       type: "select" as const,
       options: departments.map((d) => ({ value: d.id, label: d.name })),
     },
     {
       key: "campus",
       label: "Campus",
       type: "select" as const,
       options: campuses.map((c) => ({ value: c.id, label: c.name })),
     },
     {
       key: "moduleIds",
       label: "Modules",
       type: "multiselect" as const,
       options: modules.map((m) => ({ value: m.id, label: m.name })),
     },
     ];

  const filteredStudents = students.filter(
    (student) => {
      const name = (student.name || student.firstName || '').toLowerCase();
      const surname = (student.surname || student.lastName || '').toLowerCase();
      const studentNum = (student.studentNumber || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      
      return (
        name.includes(searchQuery.toLowerCase()) ||
        surname.includes(searchQuery.toLowerCase()) ||
        studentNum.includes(searchQuery.toLowerCase()) ||
        email.includes(searchQuery.toLowerCase())
      );
    }
  );

  const handleFormChange = (key: string, value: string | string[]) => {
    setFormValues({ ...formValues, [key]: value });
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredStudents.length
        ? []
        : filteredStudents.map((s) => s.id)
    );
  };

  const handleAdd = () => {
    setEditingItem(null);
    setSelectedFacultyId("");
    setFormValues({
      studentNumber: `S${String(students.length + 1).padStart(3, "0")}`,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: Student) => {
    setEditingItem(item);
    const moduleIds = (item as any).moduleIds || [];
    setFormValues({
      studentNumber: item.studentNumber,
      name: item.firstName || item.name, // Use firstName from API
      surname: item.lastName || item.surname, // Use lastName from API
      title: (item as any).title || '',
      email: item.email,
      department: item.department || "",
      campus: item.campus || "",
      moduleIds: Array.isArray(moduleIds) ? moduleIds : [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: Student) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.item) return;

    try {
      // DELETE /api/admin/students/:studentId - Delete student
      await AdminService.students.deleteStudent(deleteConfirm.item.id || deleteConfirm.item.userId);
      toast({
        title: "Student deleted",
        description: "Student has been removed.",
      });
      await fetchAllData();
    } catch (err) {
      console.error("Error deleting student:", err);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm({ open: false, item: null });
    }
  };

  const handleSubmit = async () => {
    try {
      const moduleIds = formValues.moduleIds ? (Array.isArray(formValues.moduleIds) ? formValues.moduleIds : [formValues.moduleIds]) : [];
      
      if (editingItem) {
        // PUT /api/admin/students/:studentId - Update student
        await AdminService.students.updateStudent(editingItem.id || editingItem.userId, {
          firstName: formValues.name,
          lastName: formValues.surname,
          title: formValues.title,
          email: formValues.email,
          departmentId: formValues.department,
          campusId: formValues.campus,
          moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
          studentNumber: formValues.studentNumber || editingItem.studentNumber,
          enrollmentYear: parseInt(formValues.enrollmentYear as string) || new Date().getFullYear(),
        } as any);
        toast({
          title: "Student updated",
          description: "Changes saved successfully.",
        });
      } else {
         // POST /api/admin/students - Create new student
         const studentNumber = formValues.studentNumber || `STU-${Date.now()}`;
         
         // Validate required fields
         if (!formValues.name || !formValues.surname || !formValues.email || !formValues.department || !formValues.campus) {
           toast({
             title: "Validation Error",
             description: "Please fill in all required fields (First Name, Last Name, Email, Department, Campus)",
             variant: "destructive",
           });
           return;
         }
         
         await AdminService.students.createStudent({
           firstName: formValues.name,
           lastName: formValues.surname,
           title: formValues.title,
           email: formValues.email,
           departmentId: formValues.department,
           campusId: formValues.campus,
           moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
           studentNumber,
           enrollmentYear: parseInt(formValues.enrollmentYear as string) || new Date().getFullYear(),
         } as any);
         toast({
           title: "Student added",
           description: "New student has been created.",
         });
       }
      await fetchAllData();
    } catch (err) {
      console.error("Error saving student:", err);
      toast({
        title: "Error",
        description: "Failed to save student",
        variant: "destructive",
      });
    }
    setIsModalOpen(false);
    setFormValues({});
    setSelectedFacultyId("");
  };

  const handleBulkDelete = async () => {
    try {
      // DELETE /api/admin/students/:studentId (called multiple times)
      await Promise.all(selectedIds.map((id) => AdminService.students.deleteStudent(id)));
      toast({
        title: "Students deleted",
        description: `${selectedIds.length} students removed.`,
      });
      await fetchAllData();
    } catch (err) {
      console.error("Error deleting students:", err);
      toast({
        title: "Error",
        description: "Failed to delete some students",
        variant: "destructive",
      });
    }
    setSelectedIds([]);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading students..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Students
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage student records and enrollments
            </p>
          </header>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {selectedIds.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredStudents}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            idKey="userId"
          />
        </div>
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Student"
        fields={fields}
        values={formValues}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, item: null })}
        onConfirm={handleDeleteConfirm}
        itemName={
          deleteConfirm.item
            ? `${deleteConfirm.item.name} ${deleteConfirm.item.surname}`
            : undefined
        }
      />
    </MainLayout>
  );
};

export default Students;
