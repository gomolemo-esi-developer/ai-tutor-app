import React, { useState, useEffect } from "react";
import { Search, Plus, Upload, Download, Trash2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import CrudModal from "@/components/admin/CrudModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Campus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import AdminService, { Campus as AdminCampus } from "@/services/AdminServiceReal";

const CampusPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Campus | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        open: boolean;
        item: Campus | null;
    }>({ open: false, item: null });
    const { toast } = useToast();

    useEffect(() => {
        fetchCampuses();
    }, []);

    const fetchCampuses = async () => {
        try {
            setLoading(true);
            const data = await AdminService.campuses.getCampuses();

            // Transform campus data to match frontend Campus type
            // Handle both old format (name, code) and new format (campusName, campusCode)
            const transformedCampuses: Campus[] = (data || []).map((campus: AdminCampus) => ({
                id: campus.campusId,
                name: (campus as any).campusName || campus.name,
                city: campus.city,
                country: campus.country,
                address: campus.address,
            }));

            console.log('✅ Campuses loaded from DynamoDB:', transformedCampuses.length);
            setCampuses(transformedCampuses);
        } catch (err: any) {
            console.error('❌ Error fetching campuses:', err);
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to load campuses"
            });
            setCampuses([]);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: "id",
            label: "Campus ID",
            render: (item: Campus) => (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">{item.id}</span>
            ),
        },
        {
            key: "name",
            label: "Campus Name",
            render: (item: Campus) => (
                <span className="text-sm font-normal text-foreground">{item.name}</span>
            ),
        },
        {
            key: "address",
            label: "Address",
            render: (item: Campus) => (
                <span className="text-sm font-normal text-foreground">{item.address || 'N/A'}</span>
            ),
        },
    ];

    const fields = [
        {
            key: "name",
            label: "Campus Name",
            type: "text" as const,
            placeholder: "e.g., Main Campus",
        },
        {
            key: "code",
            label: "Abbreviation",
            type: "text" as const,
            placeholder: "e.g., MC",
        },
        {
            key: "address",
            label: "Address",
            type: "text" as const,
            placeholder: "e.g., 123 Main Street",
        },
    ];

    const filteredCampuses = campuses.filter(
        (campus) =>
            (campus.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (campus.abbreviation || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedIds(
            selectedIds.length === filteredCampuses.length
                ? []
                : filteredCampuses.map((c) => c.id)
        );
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormValues({});
        setIsModalOpen(true);
    };

    const handleEdit = (item: Campus) => {
        setEditingItem(item);
        setFormValues({
            name: item.name,
            code: item.code || item.abbreviation || '',
            address: item.address || '',
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: Campus) => {
        setDeleteConfirm({ open: true, item });
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirm.item) {
            try {
                await AdminService.campuses.deleteCampus(deleteConfirm.item.id);
                toast({
                    title: "Campus deleted",
                    description: `${deleteConfirm.item.name} has been removed.`,
                });
                await fetchCampuses();
            } catch (err: any) {
                toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : "Failed to delete campus"
                });
            }
        }
        setDeleteConfirm({ open: false, item: null });
    };

    const handleSubmit = async () => {
        try {
            if (editingItem) {
                await AdminService.campuses.updateCampus(editingItem.id, {
                    name: formValues.name,
                    code: formValues.code,
                    abbreviation: formValues.code,
                    address: formValues.address,
                } as any);
                toast({
                    title: "Campus updated",
                    description: "Changes saved successfully.",
                });
            } else {
                await AdminService.campuses.createCampus({
                    name: formValues.name,
                    code: formValues.code,
                    abbreviation: formValues.code,
                    address: formValues.address,
                } as any);
                toast({
                    title: "Campus added",
                    description: `${formValues.name} has been added.`,
                });
            }
            await fetchCampuses();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : (editingItem
                    ? "Failed to update campus"
                    : "Failed to add campus"),
            });
        }
        setIsModalOpen(false);
        setFormValues({});
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(
                selectedIds.map((id) => AdminService.campuses.deleteCampus(id))
            );
            toast({
                title: "Campuses deleted",
                description: `${selectedIds.length} campuses removed.`,
            });
            await fetchCampuses();
            setSelectedIds([]);
        } catch (err: any) {
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : "Failed to delete campuses"
            });
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner message="Loading campuses..." />
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
                            Campus
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Manage campus locations
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
                        data={filteredCampuses}
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
                title="Campus"
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

export default CampusPage;
