import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Download, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import CrudModal from "@/components/admin/CrudModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Faculty } from "@/types";
import { useToast } from "@/hooks/use-toast";
import AdminService, { Faculty as AdminFaculty } from "@/services/AdminServiceReal";

const FacultyPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Faculty | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        item: Faculty | null;
    }>({ open: false, item: null });
    const { toast } = useToast();

    useEffect(() => {
        fetchFaculties();
    }, []);

    const fetchFaculties = async () => {
        try {
            setLoading(true);
            const data = await AdminService.faculties.getFaculties();

            // Transform faculty data to match frontend Faculty type
            const transformedFaculties: Faculty[] = (data || []).map((faculty: AdminFaculty) => ({
                id: faculty.facultyId,
                name: faculty.name || faculty.facultyName,
                abbreviation: faculty.code || faculty.facultyCode,
            }));

            console.log('✅ Faculties loaded from DynamoDB:', transformedFaculties.length);
            setFaculties(transformedFaculties);
        } catch (err: any) {
            console.error('❌ Error fetching faculties:', err);
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to load faculties"
            });
            setFaculties([]);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: "id",
            label: "Faculty ID",
            render: (item: Faculty) => (
                <span className="font-medium text-foreground">{item.id}</span>
            ),
        },
        {
            key: "name",
            label: "Faculty Name",
            render: (item: Faculty) => (
                <span className="font-medium text-foreground">{item.name}</span>
            ),
        },
        {
            key: "abbreviation",
            label: "Code/Abbreviation",
            render: (item: Faculty) => (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                    {item.abbreviation || 'N/A'}
                </span>
            ),
        },
    ];

    const fields = [
        {
            key: "name",
            label: "Faculty Name",
            type: "text" as const,
            placeholder: "e.g., Faculty of Engineering",
        },
        {
            key: "abbreviation",
            label: "Code/Abbreviation",
            type: "text" as const,
            placeholder: "e.g., FEBE",
        },
    ];

    const filteredFaculties = faculties.filter(
        (faculty) =>
            (faculty.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (faculty.abbreviation || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedIds(
            selectedIds.length === filteredFaculties.length
                ? []
                : filteredFaculties.map((f) => f.id)
        );
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormValues({});
        setIsModalOpen(true);
    };

    const handleEdit = (item: Faculty) => {
        setEditingItem(item);
        setFormValues({
            name: item.name,
            abbreviation: item.abbreviation,
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: Faculty) => {
        setDeleteConfirm({ open: true, item });
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirm.item) {
            try {
                await AdminService.faculties.deleteFaculty(deleteConfirm.item.id);
                toast({
                    title: "Faculty deleted",
                    description: `${deleteConfirm.item.name} has been removed.`,
                });
                await fetchFaculties();
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to delete faculty"
                });
            }
        }
        setDeleteConfirm({ open: false, item: null });
    };

    const handleSubmit = async () => {
        try {
            if (editingItem) {
                await AdminService.faculties.updateFaculty(editingItem.id, {
                    name: formValues.name,
                    code: formValues.abbreviation,
                });
                toast({
                    title: "Faculty updated",
                    description: "Changes saved successfully.",
                });
            } else {
                await AdminService.faculties.createFaculty({
                    name: formValues.name,
                    code: formValues.abbreviation,
                });
                toast({
                    title: "Faculty added",
                    description: `${formValues.name} has been added.`,
                });
            }
            await fetchFaculties();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : (editingItem
                    ? "Failed to update faculty"
                    : "Failed to add faculty"),
            });
        }
        setIsModalOpen(false);
        setFormValues({});
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(
                selectedIds.map((id) => AdminService.faculties.deleteFaculty(id))
            );
            toast({
                title: "Faculties deleted",
                description: `${selectedIds.length} faculties removed.`,
            });
            await fetchFaculties();
            setSelectedIds([]);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to delete faculties"
            });
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner message="Loading faculty data..." />
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
                            Faculty
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Manage faculty departments and divisions
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
                        data={filteredFaculties}
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
                title="Faculty"
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

export default FacultyPage;
