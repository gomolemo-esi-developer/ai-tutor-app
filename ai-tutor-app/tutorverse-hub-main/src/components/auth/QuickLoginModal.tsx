import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface QuickLoginModalProps {
    isOpen: boolean;
    role: UserRole;
    onClose: () => void;
    onSubmit: (registrationNumber: string) => void;
    isLoading?: boolean;
}

export const QuickLoginModal: React.FC<QuickLoginModalProps> = ({
    isOpen,
    role,
    onClose,
    onSubmit,
    isLoading = false,
}) => {
    const isEducator = role === 'educator';
    const defaultValue = isEducator ? 'L004' : 'S006';
    
    const [registrationNumber, setRegistrationNumber] = useState(defaultValue);

    // Update value when role changes or modal opens
    useEffect(() => {
        setRegistrationNumber(defaultValue);
    }, [role, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (registrationNumber.trim()) {
            onSubmit(registrationNumber);
            setRegistrationNumber(defaultValue);
        }
    };

    const handleClose = () => {
        setRegistrationNumber(defaultValue);
        onClose();
    };

    const placeholder = isEducator ? 'E001' : 'S001';
    const label = isEducator ? 'Staff Number' : 'Student Number';
    const description = isEducator
        ? 'Enter your staff number to access your account'
        : 'Enter your student number to access your account';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-auto bg-background rounded-lg shadow-lg p-6 animate-in fade-in zoom-in-95">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="mb-6 pr-8">
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                        Quick Login
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="registration-number">{label}</Label>
                        <Input
                            id="registration-number"
                            type="text"
                            placeholder={`Enter your ${label.toLowerCase()} (e.g., ${placeholder})`}
                            value={registrationNumber}
                            onChange={(e) => setRegistrationNumber(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                            className="h-12"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 h-10"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!registrationNumber.trim() || isLoading}
                            className="flex-1 h-10"
                        >
                            {isLoading ? 'Loading...' : 'Continue'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
