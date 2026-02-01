import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Download, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import CrudModal from "@/components/admin/CrudModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Course } from "@/types";
import { useToast } from "@/hooks/use-toast";
import AdminService from "@/services/AdminServiceReal";

interface Department {
  id: string;
  name: string;
  facultyId: string;
}

interface Faculty {
  id: string;
  name: string;
}

const CoursesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Course | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    item: Course | null;
  }>({ open: false, item: null });
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchCourses(), fetchDepartments(), fetchFaculties()]);
  };

  const fetchFaculties = async () => {
    try {
      const data = await AdminService.faculties.getFaculties();
      const transformedFacs = (data || []).map((fac: any) => ({
        id: fac.facultyId,
        name: fac.name || fac.facultyName,
      }));
      setFaculties(transformedFacs);
    } catch (err) {
      console.error('Error loading faculties:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await AdminService.departments.getDepartments();
      const transformedDepts = (data || []).map((dept: any) => ({
        id: dept.departmentId,
        name: (dept as any).departmentName || dept.name,
        facultyId: dept.facultyId,
      }));
      setDepartments(transformedDepts);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await AdminService.courses.getCourses();
      
      // Transform course data to match frontend Course type
      // Handle both old format (name, code) and new format (courseName, courseCode)
      let transformedCourses: Course[] = [];
      if (Array.isArray(data) && data.length > 0) {
        transformedCourses = data.map((course: any) => ({
          id: course.courseId,
          courseId: course.courseId,
          code: (course as any).courseCode || course.code || '',
          name: (course as any).courseName || course.name || '',
          description: course.description || '',
          departmentId: course.departmentId || '',
          credits: course.credits || 0,
          level: '',
          status: 'ACTIVE',
        }));
      }
      
      console.log('✅ Courses loaded from DynamoDB:', transformedCourses.length);
      setCourses(transformedCourses);
    } catch (err: any) {
      console.error('❌ Error fetching courses:', err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to load courses" });
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "id",
      label: "Course ID",
      render: (item: Course) => (
        <span className="text-sm font-normal text-primary bg-primary/10 px-2 py-1 rounded">
          {item.id || item.courseId || "N/A"}
        </span>
      ),
    },
    {
      key: "name",
      label: "Course Name",
      render: (item: Course) => (
        <span className="text-sm font-normal text-foreground">{item.name}</span>
      ),
    },
    {
      key: "code",
      label: "Course Code",
      render: (item: Course) => (
        <span className="text-sm font-normal text-foreground">{item.code || "N/A"}</span>
      ),
    },
    {
      key: "departmentId",
      label: "Department Name",
      render: (item: Course) => {
        const dept = departments.find(d => d.id === item.departmentId);
        return <span className="text-sm font-normal text-foreground">{dept?.name || item.departmentId || "N/A"}</span>;
      },
    },
    {
      key: "facultyId",
      label: "Faculty Name",
      render: (item: Course) => {
        const dept = departments.find(d => d.id === item.departmentId);
        const faculty = faculties.find(f => f.id === dept?.facultyId);
        return <span className="text-sm font-normal text-foreground">{faculty?.name || "N/A"}</span>;
      },
    },
  ];

  const fields = [
    {
      key: "code",
      label: "Course Code",
      type: "text" as const,
      placeholder: "e.g., CS101",
    },
    {
      key: "name",
      label: "Course Name",
      type: "text" as const,
      placeholder: "e.g., Introduction to Computer Science",
    },
    {
      key: "facultyId",
      label: "Faculty",
      type: "select" as const,
      options: faculties.map((f) => ({ value: f.id, label: f.name })),
    },
    {
      key: "departmentId",
      label: "Department",
      type: "select" as const,
      options: departments.filter(d => !('facultyId' in formValues) || d.facultyId === (formValues.facultyId || '')).map((d) => ({ value: d.id, label: d.name })),
    },
    {
      key: "description",
      label: "Description",
      type: "text" as const,
      placeholder: "Brief course description",
    },
  ];

  const handleFormChange = (key: string, value: string) => {
    setFormValues({ ...formValues, [key]: value });
  };

  const filteredCourses = courses.filter(
    (course) =>
      (course.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredCourses.length
        ? []
        : filteredCourses.map((c) => c.id)
    );
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: Course) => {
    setEditingItem(item);
    setFormValues({
      code: item.code,
      name: item.name,
      departmentId: item.departmentId,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: Course) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.item) {
      try {
        await AdminService.courses.deleteCourse(deleteConfirm.item.courseId);
        toast({
          title: "Course deleted",
          description: `${deleteConfirm.item.name} has been removed.`,
        });
        await fetchCourses();
      } catch (err) {
        toast({ title: "Error", description: "Failed to delete course" });
      }
    }
    setDeleteConfirm({ open: false, item: null });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await AdminService.courses.updateCourse(editingItem.courseId, {
          code: formValues.code,
          name: formValues.name,
          departmentId: formValues.departmentId,
        });
        toast({
          title: "Course updated",
          description: "Changes saved successfully.",
        });
      } else {
        await AdminService.courses.createCourse({
          code: formValues.code,
          name: formValues.name,
          departmentId: formValues.departmentId,
        });
        toast({
          title: "Course added",
          description: `${formValues.name} has been added.`,
        });
      }
      await fetchCourses();
    } catch (err) {
      toast({
        title: "Error",
        description: editingItem
          ? "Failed to update course"
          : "Failed to add course",
      });
    }
    setIsModalOpen(false);
    setFormValues({});
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => AdminService.courses.deleteCourse(id))
      );
      toast({
        title: "Courses deleted",
        description: `${selectedIds.length} courses removed.`,
      });
      await fetchCourses();
      setSelectedIds([]);
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete courses" });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading courses..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Courses
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage academic courses
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
            data={filteredCourses}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            idKey="id"
          />
        </div>
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Course"
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
        itemName={deleteConfirm.item?.name}
      />
    </MainLayout>
  );
};

export default CoursesPage;
