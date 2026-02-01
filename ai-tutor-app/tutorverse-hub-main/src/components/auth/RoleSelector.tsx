import React from 'react';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onRoleSelect: (role: UserRole) => void;
}

const roles: { role: UserRole; icon: React.ElementType; label: string; description: string }[] = [
  { role: 'educator', icon: BookOpen, label: 'Educator', description: 'Manage courses & content' },
  { role: 'student', icon: GraduationCap, label: 'Student', description: 'Learn & explore' },
  { role: 'admin', icon: Shield, label: 'Administrator', description: 'System management' },
];

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Select Your Role
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {roles.map(({ role, icon: Icon, label, description }) => (
          <button
            key={role}
            onClick={() => onRoleSelect(role)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
              "hover:border-primary/50 hover:bg-secondary/50",
              selectedRole === role
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                : "border-border bg-card"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              selectedRole === role ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className={cn(
                "font-semibold",
                selectedRole === role ? "text-primary" : "text-foreground"
              )}>
                {label}
              </p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector;
