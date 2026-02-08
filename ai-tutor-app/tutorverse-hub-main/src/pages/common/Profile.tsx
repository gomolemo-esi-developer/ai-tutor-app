import React, { useState, useEffect } from 'react';
import { User, GraduationCap, Building2, BookOpen, Mail, Hash, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  studentNumber?: string;
  staffNumber?: string;
  departmentName?: string;
  campusName?: string;
  courseId?: string;
  courseName?: string;
  courseCode?: string;
  enrollmentYear?: number;
  educationLevel?: string;
  academicLevel?: number;
}

interface ModuleHierarchy {
  module: {
    moduleId: string;
    moduleCode: string;
    moduleName: string;
  };
  course?: {
    courseCode: string;
    courseName: string;
  } | null;
  department?: {
    departmentCode: string;
    departmentName: string;
  } | null;
  faculty?: {
    facultyCode: string;
    facultyName: string;
  } | null;
}

interface UserModule {
  moduleId?: string;
  id?: string;
  title?: string;
  name?: string;
  code?: string;
  moduleCode?: string;
  description?: string;
  department?: string;
  departmentName?: string;
  thumbnail?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [modules, setModules] = useState<UserModule[]>([]);
  const [moduleHierarchies, setModuleHierarchies] = useState<Record<string, ModuleHierarchy>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const { get: getProfile, loading } = useApi<ProfileData>();
  const { get: getModules } = useApi<UserModule[]>();
  const { get: getModuleHierarchy } = useApi<ModuleHierarchy>();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
       // Normalize role for comparison (backward compatible)
       const normalizedRole = (user?.role || '').toUpperCase();
       const endpoint = normalizedRole === 'EDUCATOR' 
         ? '/api/educator/profile' 
         : '/api/student/profile';
       
       const profileInfo = await getProfile(endpoint);
       console.log('Profile data fetched from API:', profileInfo);
       setProfileData(profileInfo);
       
       // Fetch modules for this user
       const moduleEndpoint = normalizedRole === 'EDUCATOR'
         ? '/api/educator/modules'
         : '/api/student/modules';
      
       const moduleData = await getModules(moduleEndpoint);
       console.log('Modules data fetched from API:', moduleData);
       setModules(moduleData || []);

       // Fetch module hierarchies for students
       if (normalizedRole === 'STUDENT' && moduleData && moduleData.length > 0) {
         const hierarchies: Record<string, ModuleHierarchy> = {};
         for (const mod of moduleData) {
           try {
             const hierarchy = await getModuleHierarchy(`/api/student/modules/${mod.moduleId || mod.id}/hierarchy`);
             if (hierarchy) {
               hierarchies[mod.moduleId || mod.id || ''] = hierarchy;
             }
           } catch (err) {
             console.warn('Failed to fetch hierarchy for module:', mod.moduleCode, err);
           }
         }
         setModuleHierarchies(hierarchies);
       }
     } catch (err) {
       console.error('Error fetching profile:', err);
       toast.error('Failed to load profile data');
     }
   };

  const profileInfo = {
    fullName: profileData?.firstName && profileData?.lastName 
      ? `${profileData.firstName} ${profileData.lastName}`
      : user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : 'User',
    email: profileData?.email || user?.email || 'N/A',
    campusName: profileData?.campusName || 'N/A',
    departmentName: profileData?.departmentName || 'N/A',
    courseName: profileData?.courseName || 'N/A',
    studentNumber: profileData?.studentNumber || profileData?.staffNumber || 'N/A',
    enrollmentYear: profileData?.enrollmentYear,
    academicLevel: profileData?.academicLevel,
    educationLevel: profileData?.educationLevel,
  };

  const enrolledModules = modules.slice(0, 4);
  
  // Normalize role once for all comparisons
  const normalizedRole = (user?.role || '').toUpperCase();

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading profile..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Profile
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Your personal and academic information
            </p>
          </header>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl md:text-3xl font-bold text-primary">
                {profileInfo.fullName.charAt(0)}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                {profileInfo.fullName}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground capitalize">{user?.role || 'Student'}</p>
              <Badge variant="outline" className="mt-2">
                 {profileInfo.campusName}
               </Badge>
            </div>
          </div>

          {/* Personal Information */}
          <Card className="p-4 md:p-6 mb-4 md:mb-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                  <User className="w-3 h-3 md:w-4 md:h-4" /> Full Name
                </p>
                <p className="text-sm md:text-base text-foreground font-medium">{profileInfo.fullName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                    <Hash className="w-3 h-3 md:w-4 md:h-4" /> {normalizedRole === 'EDUCATOR' ? 'Staff Number' : 'Student Number'}
                  </p>
                  <p className="text-sm md:text-base text-foreground font-medium">{profileInfo.studentNumber}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3 h-3 md:w-4 md:h-4" /> Email
                </p>
                <p className="text-sm md:text-base text-foreground font-medium break-all">{profileInfo.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3 h-3 md:w-4 md:h-4" /> Campus
                </p>
                <p className="text-sm md:text-base text-foreground font-medium">{profileInfo.campusName}</p>
              </div>
            </div>
          </Card>

          {/* Academic Information */}
          <Card className="p-4 md:p-6 mb-4 md:mb-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">Academic Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="w-3 h-3 md:w-4 md:h-4" /> Department
                </p>
                <p className="text-sm md:text-base text-foreground font-medium">{profileInfo.departmentName}</p>
              </div>
              {normalizedRole === 'STUDENT' && (
                <div className="space-y-1">
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-3 h-3 md:w-4 md:h-4" /> Course
                  </p>
                  <p className="text-sm md:text-base text-foreground font-medium">
                    {profileInfo.courseName}
                  </p>
                </div>
              )}
              {normalizedRole === 'EDUCATOR' && (
                <div className="space-y-1">
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                    <GraduationCap className="w-3 h-3 md:w-4 md:h-4" /> Education Level
                  </p>
                  <p className="text-sm md:text-base text-foreground font-medium">
                    {profileInfo.educationLevel || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Enrolled Modules */}
          <Card className="p-4 md:p-6 bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                {normalizedRole === 'EDUCATOR' ? 'Assigned Modules' : 'Enrolled Modules'}
              </h3>
            </div>
            <div className="grid gap-3">
              {enrolledModules.map((module) => {
                const moduleId = module.id || module.moduleId || '';
                const moduleTitle = module.title || module.name || 'Untitled Module';
                const moduleCode = module.code || module.moduleCode || 'MODULE';
                const moduleDept = module.department || module.departmentName || 'N/A';
                const imageError = imageErrors[moduleId] || false;
                
                return (
                  <div
                    key={moduleId}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-primary/20 flex items-center justify-center">
                      {!imageError && module.thumbnail ? (
                        <img
                          src={module.thumbnail}
                          alt={moduleTitle}
                          className="w-full h-full object-cover"
                          onError={() => setImageErrors(prev => ({ ...prev, [moduleId]: true }))}
                        />
                      ) : (
                        <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {moduleCode}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">{moduleDept}</span>
                      </div>
                      <p className="text-sm md:text-base font-medium text-foreground truncate mt-1">
                        {moduleTitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
