import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Download, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import CrudModal from "@/components/admin/CrudModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Department } from "@/types";
import { useToast } from "@/hooks/use-toast";
import AdminService, { Department as AdminDepartment } from "@/services/AdminServiceReal";

interface Faculty {
  id: string;
  name: string;
}

const DepartmentsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    item: Department | null;
  }>({ open: false, item: null });
  const { toast } = useToast();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const [deptData, facultyData] = await Promise.all([
        AdminService.departments.getDepartments().catch(() => null),
        AdminService.faculties.getFaculties().catch(() => null),
      ]);
      
      // Transform department data
      const transformedDepartments: Department[] = (deptData || []).map((dept: AdminDepartment) => ({
        id: dept.departmentId,
        departmentId: dept.departmentId,
        name: dept.name || dept.departmentName,
        code: dept.code || dept.departmentCode,
        facultyId: dept.facultyId,
        description: dept.description || '',
      }));
      
      // Transform faculty data
      const transformedFaculties: Faculty[] = (facultyData || []).map((fac: any) => ({
        id: fac.facultyId,
        name: fac.name || fac.facultyName,
      }));
      
      console.log('✅ Departments loaded from DynamoDB:', transformedDepartments.length);
      setDepartments(transformedDepartments);
      setFaculties(transformedFaculties);
    } catch (err: any) {
      console.error('❌ Error fetching departments:', err);
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to load departments" 
      });
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "id",
      label: "Department ID",
      render: (item: Department) => (
        <span className="text-sm font-normal text-primary bg-primary/10 px-2 py-1 rounded">
          {item.id || "N/A"}
        </span>
      ),
    },
    {
      key: "name",
      label: "Department Name",
      render: (item: Department) => (
        <span className="text-sm font-normal text-foreground">{item.name}</span>
      ),
    },
    {
      key: "code",
      label: "Department Code",
      render: (item: Department) => (
        <span className="text-sm font-normal text-foreground">{item.code || "N/A"}</span>
      ),
    },
    {
      key: "facultyId",
      label: "Faculty Name",
      render: (item: Department) => {
        const faculty = faculties.find(f => f.id === item.facultyId);
        return <span className="text-sm font-normal text-foreground">{faculty?.name || item.facultyId || "N/A"}</span>;
      },
    },
  ];

  const fields = [
    {
      key: "name",
      label: "Department Name",
      type: "text" as const,
      placeholder: "e.g., Computer Science",
    },
    {
      key: "code",
      label: "Department Code",
      type: "text" as const,
      placeholder: "e.g., CS",
    },
    {
      key: "facultyId",
      label: "Faculty",
      type: "select" as const,
      options: faculties.map((f) => ({ value: f.id, label: f.name })),
    },
  ];

  const filteredDepartments = departments.filter(
    (dept) =>
      (dept.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredDepartments.length
        ? []
        : filteredDepartments.map((d) => d.id)
    );
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: Department) => {
    setEditingItem(item);
    setFormValues({
      name: item.name,
      code: item.code,
      facultyId: item.facultyId,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: Department) => {
    setDeleteConfirm({ open: true, item });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.item) {
      try {
        await AdminService.departments.deleteDepartment(deleteConfirm.item.departmentId);
        toast({
          title: "Department deleted",
          description: `${deleteConfirm.item.name} has been removed.`,
        });
        await fetchDepartments();
      } catch (err: any) {
        toast({ 
          title: "Error", 
          description: err instanceof Error ? err.message : "Failed to delete department" 
        });
      }
    }
    setDeleteConfirm({ open: false, item: null });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await AdminService.departments.updateDepartment(editingItem.departmentId, {
          name: formValues.name,
          code: formValues.code || editingItem.code,
          facultyId: formValues.facultyId,
        });
        toast({
          title: "Department updated",
          description: "Changes saved successfully.",
        });
      } else {
        await AdminService.departments.createDepartment({
          name: formValues.name,
          code: formValues.code || '',
          facultyId: formValues.facultyId,
        });
        toast({
          title: "Department added",
          description: `${formValues.name} has been added.`,
        });
      }
      await fetchDepartments();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : (editingItem
          ? "Failed to update department"
          : "Failed to add department"),
      });
    }
    setIsModalOpen(false);
    setFormValues({});
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        selectedIds.map((id) => AdminService.departments.deleteDepartment(id))
      );
      toast({
        title: "Departments deleted",
        description: `${selectedIds.length} departments removed.`,
      });
      await fetchDepartments();
      setSelectedIds([]);
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err instanceof Error ? err.message : "Failed to delete departments" 
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading departments..." />
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
              Departments
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage academic departments
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
            data={filteredDepartments}
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
        title="Department"
        fields={fields}
        values={formValues}
        onChange={(key, value) =>
          setFormValues({ ...formValues, [key]: value })
        }
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

export default DepartmentsPage;
