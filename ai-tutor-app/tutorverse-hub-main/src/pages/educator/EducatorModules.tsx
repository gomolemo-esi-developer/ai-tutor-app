import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import ModuleCard from "@/components/modules/ModuleCard";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

interface Module {
  id?: string;
  moduleId?: string;
  code?: string;
  moduleCode?: string;
  name?: string;
  title?: string;
  department?: string;
  departmentName?: string;
  description?: string;
  thumbnail?: string;
}

const EducatorModules: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const navigate = useNavigate();

  const { get, loading } = useApi<Module[]>();

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await get("/api/educator/modules");
      console.log("Educator modules fetched from API:", data);
      setModules(data || []);
    } catch (err) {
      console.error("Error fetching modules:", err);
      toast.error("Failed to load modules");
    }
  };

  const availableModules = modules;

  const filteredModules = availableModules.filter(
    (module) =>
      (module.name || module.title || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (module.code || module.moduleCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.department || module.departmentName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModuleClick = (module: any) => {
    const moduleCode = module.code || module.moduleCode;
    if (moduleCode) {
      navigate(`/files/${moduleCode}`);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading modules..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              My Modules
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Select a module to manage its files
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

          <div className="grid gap-4">
            {filteredModules.map((module, index) => (
              <div
                key={module.id || module.moduleId}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ModuleCard
                   module={{
                      ...module,
                      id: module.id || module.moduleId || "",
                      name: module.name || module.title || "",
                      code: module.code || module.moduleCode || "",
                      department: module.department || module.departmentName || "",
                      thumbnail: module.thumbnail || ""
                    }}
                    onClick={() =>
                      handleModuleClick(module)
                    }
                  />
              </div>
            ))}
          </div>

          {filteredModules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No modules found matching your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default EducatorModules;
