import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, Download, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import DataTable from '@/components/admin/DataTable';
import CrudModal from '@/components/admin/CrudModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { AdminModule } from '@/types';
import { useToast } from '@/hooks/use-toast';
import AdminService from '@/services/AdminServiceReal';

interface ApiModule {
  id: string;
  moduleId?: string;
  code: string;
  name: string;
  title?: string;
  courseId?: string;
  description?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

const ModuleListPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminModule | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: AdminModule | null }>({ open: false, item: null });
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([fetchModules(), fetchDepartments(), fetchCourses()]);
  };

  const fetchCourses = async () => {
    try {
      const data = await AdminService.courses.getCourses();
      const transformedCourses = (data || []).map((course: any) => ({
        id: course.courseId,
        name: course.name || course.courseName,
        code: course.code || course.courseCode,
      }));
      console.log('✅ Courses loaded:', transformedCourses.length, transformedCourses);
      setCourses(transformedCourses);
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await AdminService.departments.getDepartments();
      const transformedDepts = (data || []).map((dept: any) => ({
        id: dept.departmentId,
        name: dept.name || dept.departmentName,
        code: dept.code || dept.departmentCode,
      }));
      setDepartments(transformedDepts);
    } catch (err) {
      console.error('Error loading departments:', err);
    }
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await AdminService.modules.getModules();
      
      let modulesArray: AdminModule[] = [];
      if (Array.isArray(data) && data.length > 0) {
        modulesArray = data.map((m: any) => ({
          id: m.moduleId,
          code: m.moduleCode || m.code || '',
          name: m.moduleName || m.name || '',
          description: m.description || '',
          courseId: m.courseId || '',
          departmentId: m.departmentId || ''
        })) as AdminModule[];
      }
      
      console.log('✅ Modules loaded from DynamoDB:', modulesArray.length);
      setModules(modulesArray);
    } catch (err: any) {
      console.error('❌ Error fetching modules:', err);
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to load modules' });
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Module ID',
      render: (item: AdminModule) => (
        <span className="text-sm font-normal text-primary bg-primary/10 px-2 py-1 rounded">{item.id}</span>
      ),
    },
    {
      key: 'name',
      label: 'Module Name',
      render: (item: AdminModule) => (
        <span className="text-sm font-normal text-foreground">{item.name}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (item: AdminModule) => (
        <span className="text-sm font-normal text-foreground">{item.description || 'N/A'}</span>
      ),
    },
    {
      key: 'code',
      label: 'Module Code',
      render: (item: AdminModule) => (
        <span className="text-sm font-normal text-foreground">{item.code || 'N/A'}</span>
      ),
    },
    {
      key: 'courseId',
      label: 'Course Code',
      render: (item: AdminModule) => {
        const course = courses.find(c => c.id === item.courseId);
        return <span className="text-sm font-normal text-foreground">{course?.code || item.courseId || 'N/A'}</span>;
      },
    },
  ];

  const fields = [
    { key: 'name', label: 'Module Name', type: 'text' as const, placeholder: 'e.g., Information Systems' },
    { key: 'code', label: 'Module Code', type: 'text' as const, placeholder: 'e.g., ISY238T' },
    { key: 'description', label: 'Description', type: 'text' as const, placeholder: 'Brief description of the module' },
    {
      key: 'courseId',
      label: 'Course',
      type: 'select' as const,
      options: courses.map((c) => ({ value: c.id, label: c.code || c.name })),
    },
  ];

  const handleFormChange = (key: string, value: string) => {
    setFormValues({ ...formValues, [key]: value });
  };

  const filteredModules = modules.filter(
    (mod) =>
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredModules.length
        ? []
        : filteredModules.map((m) => m.id)
    );
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: AdminModule) => {
    setEditingItem(item);
    setFormValues({
      code: item.code,
      name: item.name,
      description: item.description || '',
      departmentId: item.departmentId || '',
      courseId: item.courseId || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: AdminModule) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteConfirm.item) {
        await AdminService.modules.deleteModule(deleteConfirm.item.id);
        toast({ title: 'Module deleted', description: `${deleteConfirm.item.name} has been removed.` });
        await fetchAllData();
      }
    } catch (err: any) {
      console.error('Error deleting module:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete module',
        variant: 'destructive',
      });
    }
    setDeleteConfirm({ open: false, item: null });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await AdminService.modules.updateModule(editingItem.id, {
          name: formValues.name,
          code: formValues.code,
          description: formValues.description,
          courseId: formValues.courseId || undefined,
        });
        toast({ title: 'Module updated', description: 'Changes saved successfully.' });
      } else {
        await AdminService.modules.createModule({
            name: formValues.name,
            code: formValues.code,
            description: formValues.description,
            courseId: formValues.courseId || undefined,
          });
          toast({ title: 'Module added', description: `${formValues.name} has been added.` });
        }
        await fetchAllData();
    } catch (err: any) {
      console.error('Error saving module:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save module',
        variant: 'destructive',
      });
    }
    setIsModalOpen(false);
    setFormValues({});
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => AdminService.modules.deleteModule(id))
      );
      toast({ title: 'Modules deleted', description: `${selectedIds.length} modules removed.` });
      await fetchAllData();
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Error deleting modules:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete modules',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading modules..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Module List
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage academic modules
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
            data={filteredModules}
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
        title="Module"
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

export default ModuleListPage;
