import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import MultiSelectDropdown from './MultiSelectDropdown';

interface Field {
    key: string;
    label: string;
    type: 'text' | 'select' | 'email' | 'multiselect';
    options?: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}

interface CrudModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: Field[];
    values: Record<string, string | string[]>;
    onChange: (key: string, value: string | string[]) => void;
    onSubmit: () => void;
    isEdit?: boolean;
}

const CrudModal: React.FC<CrudModalProps> = ({
    isOpen,
    onClose,
    title,
    fields,
    values,
    onChange,
    onSubmit,
    isEdit = false,
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        {isEdit ? `Edit ${title}` : `Add New ${title}`}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 space-y-4 py-4">
                    {fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>{field.label}</Label>
                            {field.type === 'multiselect' && field.options ? (
                                <MultiSelectDropdown
                                    options={field.options}
                                    selectedValues={Array.isArray(values[field.key]) ? (values[field.key] as string[]) : []}
                                    onChange={(newValues) => onChange(field.key, newValues)}
                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                />
                            ) : field.type === 'select' && field.options ? (
                                    <Select
                                        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
                                        onValueChange={(value) => onChange(field.key, value)}
                                    >
                                        <SelectTrigger className="border-input">
                                            <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border">
                                            {field.options && field.options.length > 0 ? (
                                                field.options.map((option, idx) => (
                                                    <SelectItem key={`${option.value}-${idx}`} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-muted-foreground">
                                                    No options available
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id={field.key}
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
                                        onChange={(e) => onChange(field.key, e.target.value)}
                                        disabled={field.disabled}
                                    />
                                )}
                            </div>
                        ))}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit}>
                        {isEdit ? 'Save Changes' : 'Add'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CrudModal;
