import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Sparkles,
  FolderOpen,
  Users,
  GraduationCap,
  Building2,
  FileText,
  MapPin,
  Menu,
  X,
  Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const studentMenuItems = [
    { icon: BookOpen, label: 'Modules', path: '/modules' },
    { icon: MessageSquare, label: 'Chatbox', path: '/chat' },
    { icon: Settings, label: 'Profile', path: '/profile' },
  ];

  const educatorMenuItems = [
    { icon: FolderOpen, label: 'Files', path: '/files' },
    { icon: Settings, label: 'Profile', path: '/profile' },
  ];

  const adminMenuItems = [
    { icon: GraduationCap, label: 'Lecturers', path: '/admin/lecturers' },
    { icon: Users, label: 'Students', path: '/admin/students' },
    { icon: FileText, label: 'Files', path: '/admin/files' },
    { icon: Library, label: 'College Hub', path: '/admin/college-hub' },
    { icon: Building2, label: 'Faculty', path: '/admin/faculty' },
    { icon: Building2, label: 'Departments', path: '/admin/departments' },
    { icon: BookOpen, label: 'Courses', path: '/admin/courses' },
    { icon: BookOpen, label: 'Module List', path: '/admin/modules' },
    { icon: MapPin, label: 'Campus', path: '/admin/campus' },
    { icon: Settings, label: 'Profile', path: '/profile' },
  ];

  // Normalize role to uppercase for comparison (backward compatible)
  const normalizedRole = (user?.role || '').toUpperCase();
  const menuItems = normalizedRole.includes('ADMIN') 
    ? adminMenuItems 
    : normalizedRole === 'EDUCATOR' 
      ? educatorMenuItems 
      : studentMenuItems;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Construct full name from firstName and lastName
  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.fullName || 'User';
  
  const firstLetter = fullName.charAt(0).toUpperCase();

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-display font-bold text-foreground">AI TUTOR</h1>
            <p className="text-xs text-muted-foreground">Discover the future</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/modules' && location.pathname.startsWith(item.path));
          return (
            <Button
              key={item.path}
              variant={isActive ? 'sidebar-active' : 'sidebar'}
              className="w-full text-sm md:text-base"
              onClick={() => handleNavigate(item.path)}
            >
              <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 md:p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {user?.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-primary">
                {firstLetter}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {fullName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role || 'Student'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-display font-bold text-foreground">AI TUTOR</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 pt-14"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-[280px] h-full bg-sidebar border-r border-sidebar-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[280px] h-screen bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>
    </>
  );
};

export default LeftSidebar;
