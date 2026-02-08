import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Filter,
  Users,
  BookOpen,
  FileText,
  MessageSquare,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

interface AdminStats {
  totalStudents: number;
  totalEducators: number;
  totalModules: number;
  activeChats: number;
  totalFiles: number;
  enrollmentTrend?: { month: string; count: number }[];
}

const CollegeHub: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { get, loading } = useApi<AdminStats>();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await get("/api/admin/stats");
      console.log('Admin stats data fetched from API:', data);
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      toast.error("Failed to load statistics");
      // Use default values if API fails
      setStats({
        totalStudents: 0,
        totalEducators: 0,
        totalModules: 0,
        activeChats: 0,
        totalFiles: 0,
      });
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
  }) => (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm mb-2">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary">{Icon}</div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading statistics..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              College Hub Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              System statistics and overview
            </p>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Students"
              value={stats?.totalStudents || 0}
            />
            <StatCard
              icon={<Users className="w-6 h-6" />}
              label="Total Educators"
              value={stats?.totalEducators || 0}
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6" />}
              label="Total Modules"
              value={stats?.totalModules || 0}
            />
            <StatCard
              icon={<MessageSquare className="w-6 h-6" />}
              label="Active Chats"
              value={stats?.activeChats || 0}
            />
            <StatCard
              icon={<FileText className="w-6 h-6" />}
              label="Total Files"
              value={stats?.totalFiles || 0}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CollegeHub;
