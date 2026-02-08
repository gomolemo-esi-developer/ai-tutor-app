import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ModuleCard from '@/components/modules/ModuleCard';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

interface Module {
  moduleId: string;
  title?: string;
  description?: string;
  code?: string;
  department?: string;
  departmentName?: string;
  educator?: string;
  progress?: number;
  id?: string;
  name?: string;
  moduleName?: string;
  moduleCode?: string;
  thumbnail?: string;
}

const Modules: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { get: fetchModulesApi, loading, error } = useApi<Module[]>();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      // Normalize role for comparison (backward compatible)
      const normalizedRole = (user?.role || '').toUpperCase();
      const endpoint = normalizedRole === 'EDUCATOR' 
        ? '/api/educator/modules' 
        : '/api/student/modules';
      
      const moduleData = await fetchModulesApi(endpoint);
      console.log('Modules data fetched from API:', moduleData);
      setModules(moduleData || []);
      if (moduleData && moduleData.length > 0) {
        toast.success(`${moduleData.length} module(s) loaded`);
      } else {
        toast.info('No modules found');
      }
    } catch (err) {
      console.error('Error loading modules:', err);
      toast.error('Failed to load modules');
    }
  };

  const filteredModules = modules.filter(
    (module) =>
      (module.title?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      (module.code?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) ||
      (module.department?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );

  const handleModuleClick = (module: Module) => {
    const moduleCode = module.code || module.moduleCode;
    if (moduleCode) {
      navigate(`/modules/${moduleCode}`);
    }
  };

  // Normalize role for comparison (backward compatible)
  const normalizedRole = (user?.role || '').toUpperCase();

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6 md:mb-8">
             <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
               {user?.role === 'EDUCATOR' ? 'My Teaching Modules' : 'My Modules'} 
             </h1>
             <p className="text-muted-foreground text-sm md:text-base">
               {user?.role === 'EDUCATOR' ? 'Manage your assigned modules' : 'Browse your enrolled modules'}
             </p>
           </header>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search modules by name, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>

          {loading ? (
            <LoadingSpinner message="Loading modules..." />
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {filteredModules.map((module, index) => (
                  <div
                    key={module.moduleId || module.id}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <ModuleCard
                       module={{
                          id: module.moduleId || module.id || '',
                          name: module.title || module.name || module.moduleName || '',
                          code: module.code || module.moduleCode || '',
                          department: module.department || module.departmentName || '',
                          instructor: module.educator || '',
                          progress: module.progress || 0,
                          description: module.description || '',
                          thumbnail: module.thumbnail || ''
                        }}
                        onClick={() => handleModuleClick(module)}
                      />
                  </div>
                ))}
              </div>

              {filteredModules.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No modules found matching your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Modules;
