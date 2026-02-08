import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, Download, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import DataTable from '@/components/admin/DataTable';
import CrudModal from '@/components/admin/CrudModal';
import DeleteConfirmModal from '@/components/admin/DeleteConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Lecturer } from '@/types';
import { useToast } from '@/hooks/use-toast';
import AdminService from '@/services/AdminServiceReal';

interface User {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
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
    name: string;
    code: string;
}

const Lecturers: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Lecturer | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; item: Lecturer | null }>({ open: false, item: null });
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [lecturersData, departmentsData, campusesData, modulesData] = await Promise.all([
                AdminService.lecturers.getLecturers().catch(() => null),
                AdminService.departments.getDepartments().catch(() => null),
                AdminService.campuses.getCampuses().catch(() => null),
                AdminService.modules.getModules().catch(() => null),
            ]);

            // Transform lecturer data
            let lecturersArray: Lecturer[] = [];
            if (Array.isArray(lecturersData) && lecturersData.length > 0) {
                lecturersArray = lecturersData.map((lecturer: any) => {
                    return {
                        id: lecturer.lecturerId,
                        educatorId: lecturer.lecturerId,
                        userId: lecturer.userId,
                        email: lecturer.email,
                        firstName: lecturer.firstName || '',
                        lastName: lecturer.lastName || '',
                        staffNumber: lecturer.staffNumber || '',
                        name: lecturer.firstName || 'Unknown',
                        surname: lecturer.lastName || 'Lecturer',
                        employeeId: lecturer.lecturerId,
                        department: lecturer.departmentId,
                        departmentId: lecturer.departmentId,
                        moduleCode: '',
                        moduleName: '',
                        moduleIds: lecturer.moduleIds || [],
                        campus: lecturer.campusId,
                        campusId: lecturer.campusId,
                        title: lecturer.title || undefined,
                        educationLevel: '',
                        specialization: '',
                        yearsExperience: 0,
                        officeHours: '',
                        officeLocation: lecturer.officeLocation || '',
                        isRegistered: false,
                        registrationStatus: lecturer.registrationStatus || 'PENDING',
                        status: lecturer.registrationStatus || 'PENDING',
                        role: 'EDUCATOR',
                    };
                }) as Lecturer[];
            }
            console.log('✅ Lecturers loaded from DynamoDB:', lecturersArray.length);
            setLecturers(lecturersArray);

            // Transform departments data
            let transformedDepts: Department[] = [];
            if (Array.isArray(departmentsData)) {
                transformedDepts = departmentsData.map((dept: any) => ({
                    id: dept.departmentId,
                    name: dept.name || dept.departmentName,
                    facultyId: dept.facultyId,
                }));
            }
            setDepartments(transformedDepts);

            // Transform campuses data
            let transformedCampuses: Campus[] = [];
            if (Array.isArray(campusesData)) {
                transformedCampuses = campusesData.map((campus: any) => ({
                    id: campus.campusId,
                    name: campus.campusName || campus.name || '',
                    abbreviation: campus.campusCode || campus.code || '',
                }));
            }
            setCampuses(transformedCampuses);

            // Transform modules data
            let transformedModules: Module[] = [];
            if (Array.isArray(modulesData)) {
                transformedModules = modulesData.map((module: any) => ({
                    id: module.moduleId || module.id,
                    name: module.moduleName || module.name || '',
                    code: module.moduleCode || module.code || '',
                }));
            }
            setModules(transformedModules);
        } catch (err: any) {
            console.error('❌ Error fetching lecturers:', err);
            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to load lecturers' });
            setLecturers([]);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'staffNumber',
            label: 'Staff Number',
            render: (item: Lecturer) => (
                <span className="font-medium text-foreground">{item.staffNumber || 'N/A'}</span>
            ),
        },
        {
            key: 'name',
            label: 'Full Name',
            render: (item: Lecturer) => (
                <span className="font-medium text-foreground">
                    {item.firstName || item.name} {item.lastName || item.surname}
                </span>
            ),
        },
        {
            key: 'title',
            label: 'Title',
            render: (item: Lecturer) => (
                <span className="text-sm text-foreground">{(item as any).title || 'N/A'}</span>
            ),
        },
        {
            key: 'email',
            label: 'Email',
            render: (item: Lecturer) => (
                <span className="text-sm text-foreground">{item.email || 'N/A'}</span>
            ),
        },
        {
            key: 'moduleIds',
            label: 'Modules',
            render: (item: Lecturer) => {
                const moduleIds = (item as any).moduleIds || [];
                if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
                    return <span className="text-sm text-muted-foreground">None</span>;
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
            key: 'departmentId',
            label: 'Department',
            render: (item: Lecturer) => {
                const dept = departments.find(d => d.id === item.departmentId);
                return <span>{dept?.name || item.department || 'N/A'}</span>;
            },
        },
        {
            key: 'campusId',
            label: 'Campus',
            render: (item: Lecturer) => {
                const campus = campuses.find(c => c.id === item.campusId);
                return <span>{campus?.name || item.campus || 'N/A'}</span>;
            },
        },
    ];

    const filteredCourses = courses.filter((c) =>
        formValues.department ? c.departmentId === formValues.department : true
    );

    const fields = [
        { key: 'staffNumber', label: 'Staff Number', type: 'text' as const, placeholder: 'Auto-generated', disabled: !editingItem },
        { key: 'name', label: 'First Name', type: 'text' as const, placeholder: 'Enter first name' },
        { key: 'surname', label: 'Last Name', type: 'text' as const, placeholder: 'Enter last name' },
        {
            key: 'title',
            label: 'Title',
            type: 'select' as const,
            options: [
                { value: 'Mr', label: 'Mr' },
                { value: 'Ms', label: 'Ms' },
                { value: 'Mrs', label: 'Mrs' },
                { value: 'Dr', label: 'Dr' },
                { value: 'Prof', label: 'Prof' },
            ],
        },
        { key: 'email', label: 'Email Address', type: 'email' as const, placeholder: 'Enter email address' },
        {
            key: 'department',
            label: 'Department',
            type: 'select' as const,
            options: departments.map((d) => ({ value: d.id, label: d.name })),
        },
        {
            key: 'campus',
            label: 'Campus',
            type: 'select' as const,
            options: campuses.map((c) => ({ value: c.id, label: c.name })),
        },
        {
            key: 'moduleIds',
            label: 'Modules',
            type: 'multiselect' as const,
            options: modules.map((m) => ({ value: m.id, label: m.name })),
        },
    ];

    const filteredLecturers = lecturers.filter(
        (lecturer) =>
            (lecturer.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lecturer.surname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lecturer.staffNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lecturer.department || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        setSelectedIds(
            selectedIds.length === filteredLecturers.length
                ? []
                : filteredLecturers.map((l) => l.id)
        );
    };

    const handleFormChange = (key: string, value: string | string[]) => {
        if (key === 'department') {
            setFormValues({ ...formValues, [key]: value as string, moduleCode: '' });
        } else if (key === 'moduleIds') {
            setSelectedModules(Array.isArray(value) ? value : []);
            setFormValues({ ...formValues, [key]: value });
        } else {
            setFormValues({ ...formValues, [key]: value as string });
        }
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormValues({ staffNumber: `L${String(lecturers.length + 1).padStart(3, '0')}` });
        setIsModalOpen(true);
    };

    const handleEdit = (item: Lecturer) => {
        setEditingItem(item);
        const moduleIds = (item as any).moduleIds || [];
        setSelectedModules(Array.isArray(moduleIds) ? moduleIds : []);
        setFormValues({
            staffNumber: item.staffNumber,
            name: item.firstName || item.name,
            surname: item.lastName || item.surname,
            title: (item as any).title || '',
            department: item.departmentId || item.department,
            moduleCode: item.moduleCode,
            moduleName: item.moduleName,
            campus: item.campusId || item.campus,
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = (item: Lecturer) => {
        setDeleteConfirm({ open: true, item });
    };

    const handleDeleteConfirm = async () => {
        if (deleteConfirm.item) {
            try {
                await AdminService.lecturers.deleteLecturer(deleteConfirm.item.id);
                toast({ title: 'Lecturer deleted', description: `${deleteConfirm.item.firstName} ${deleteConfirm.item.lastName} has been removed.` });
                await fetchAllData();
            } catch (err) {
                toast({ title: 'Error', description: 'Failed to delete lecturer' });
            }
        }
        setDeleteConfirm({ open: false, item: null });
    };

    const handleSubmit = async () => {
        try {
            const moduleIds = formValues.moduleIds ? (Array.isArray(formValues.moduleIds) ? formValues.moduleIds : [formValues.moduleIds]) : [];

            if (editingItem) {
                const updateData: any = {
                    staffNumber: formValues.staffNumber || editingItem.staffNumber,
                    firstName: formValues.name,
                    lastName: formValues.surname,
                    email: formValues.email || editingItem.email,
                    departmentId: formValues.department || editingItem.departmentId,
                    campusId: formValues.campus || editingItem.campusId,
                    moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
                };
                // Only include title if it's not empty
                if (formValues.title) {
                    updateData.title = formValues.title;
                }
                await AdminService.lecturers.updateLecturer(editingItem.id, updateData);
                toast({ title: 'Lecturer updated', description: 'Changes saved successfully.' });
            } else {
                const staffNumber = formValues.staffNumber || `L${String(lecturers.length + 1).padStart(3, '0')}`;
                const createData: any = {
                    staffNumber,
                    firstName: formValues.name,
                    lastName: formValues.surname,
                    email: formValues.email || `${formValues.name.toLowerCase()}.${formValues.surname.toLowerCase()}@university.edu`,
                    departmentId: formValues.department,
                    campusId: formValues.campus,
                    moduleIds: moduleIds.length > 0 ? moduleIds : undefined,
                };
                // Only include title if it's not empty
                if (formValues.title) {
                    createData.title = formValues.title;
                }
                await AdminService.lecturers.createLecturer(createData);
                toast({ title: 'Lecturer added', description: `${formValues.name} ${formValues.surname} has been added.` });
            }
            await fetchAllData();
        } catch (err: any) {
            console.error('Error saving lecturer:', err);
            toast({ title: 'Error', description: editingItem ? 'Failed to update lecturer' : 'Failed to add lecturer' });
        }
        setIsModalOpen(false);
        setFormValues({});
        setSelectedModules([]);
    };

    const handleBulkDelete = async () => {
        try {
            await Promise.all(selectedIds.map((id) => AdminService.lecturers.deleteLecturer(id)));
            toast({ title: 'Lecturers deleted', description: `${selectedIds.length} lecturers removed.` });
            await fetchAllData();
            setSelectedIds([]);
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete lecturers' });
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner message="Loading lecturers..." />
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
                            Lecturers
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Manage lecturer records and assignments
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
                        data={filteredLecturers}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        onEdit={handleEdit}
                        onDelete={handleDeleteClick}
                        idKey="educatorId"
                    />
                </div>
            </div>

            <CrudModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Lecturer"
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
                itemName={deleteConfirm.item ? `${deleteConfirm.item.name} ${deleteConfirm.item.surname}` : undefined}
            />
        </MainLayout>
    );
};

export default Lecturers;
