import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectDropdownProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    options,
    selectedValues,
    onChange,
    placeholder = 'Select options',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLabels = options
        .filter(opt => selectedValues.includes(opt.value))
        .map(opt => opt.label);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate dropdown direction and close dropdown when clicking outside
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            // Calculate if there's enough space below
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const dropdownHeight = 320; // approximate: search (40px) + 8 items (32px each) + borders
            const spaceBelow = window.innerHeight - triggerRect.bottom;
            const spaceAbove = triggerRect.top;

            // If not enough space below and more space above, open upwards
            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                setOpenDirection('up');
            } else {
                setOpenDirection('down');
            }
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleToggleOption = (value: string) => {
        const newValues = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newValues);
    };

    const handleRemoveTag = (value: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                    isOpen && 'ring-2 ring-ring ring-offset-2'
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex flex-1 flex-wrap gap-1 overflow-hidden">
                    {selectedLabels.length > 0 ? (
                        selectedLabels.map((label) => {
                            const value = options.find(opt => opt.label === label)?.value;
                            return (
                                <span
                                    key={value}
                                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                                >
                                    {label}
                                    <button
                                        className="hover:bg-secondary/80 rounded-full p-0.5 transition-colors"
                                        onClick={(e) => handleRemoveTag(value || '', e)}
                                        aria-label={`Remove ${label}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 opacity-50 transition-transform flex-shrink-0',
                        isOpen && 'transform rotate-180'
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className={cn(
                        "absolute z-50 left-0 right-0 rounded-md border border-input bg-background shadow-lg overflow-hidden",
                        openDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
                    )}
                    role="listbox"
                >
                    {/* Search Input */}
                    <div className="border-b border-input p-2">
                        <input
                            type="text"
                            placeholder="Search options..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-muted/10">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 px-3 py-2 transition-colors"
                                        role="option"
                                        aria-selected={isSelected}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleOption(option.value)}
                                            className="w-4 h-4 rounded border-input cursor-pointer accent-primary"
                                            aria-label={`Select ${option.label}`}
                                        />
                                        <span className="text-sm font-medium text-foreground flex-1">
                                            {option.label}
                                        </span>
                                    </label>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                {options.length === 0
                                    ? 'No options available'
                                    : 'No matching options'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
