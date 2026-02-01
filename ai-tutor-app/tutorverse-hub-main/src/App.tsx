import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopLoadingBar from "@/components/ui/top-loading-bar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ContentSelectionProvider } from "@/contexts/ContentSelectionContext";
import { FilesProvider } from "@/contexts/FilesContext";
import { ChatProvider } from "@/contexts/ChatContext";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import QuickLinkCallback from "./pages/auth/QuickLinkCallback";
import Modules from "./pages/student/Modules";
import ModuleContent from "./pages/student/ModuleContent";
import Quiz from "./pages/student/Quiz";
import QuizResults from "./pages/student/QuizResults";
import Summary from "./pages/student/Summary";
import Chat from "./pages/student/Chat";
import EducatorModules from "./pages/educator/EducatorModules";
import EducatorModuleFiles from "./pages/educator/EducatorModuleFiles";
import Profile from "./pages/common/Profile";
import { StudentRouteGuard } from "@/components/auth/StudentRouteGuard";
import { EducatorRouteGuard } from "@/components/auth/EducatorRouteGuard";
import Lecturers from "./pages/admin/Lecturers";
import Students from "./pages/admin/Students";
import AdminFiles from "./pages/admin/AdminFiles";
import CollegeHub from "./pages/admin/CollegeHub";
import Faculty from "./pages/admin/Faculty";
import Departments from "./pages/admin/Departments";
import Courses from "./pages/admin/Courses";
import ModuleList from "./pages/admin/ModuleList";
import Campus from "./pages/admin/Campus";
import NotFound from "./pages/common/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Wait for auth state to be restored from localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user role is allowed
  if (roles && user) {
    const userRole = (user.role || '').toLowerCase();
    // Allow both 'admin' and 'super_admin' for admin routes
    const allowedRoles = roles.map((r) => r.toLowerCase());
    const isAdminRoute = allowedRoles.includes('admin');
    const isSuperAdmin = userRole === 'super_admin';
    
    if (isAdminRoute && isSuperAdmin) {
      // Super admin can access admin routes
      return <>{children}</>;
    } else if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/modules" replace />;
    }
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/quick" element={<QuickLinkCallback />} />
      
      {/* Student Routes - Protected by JWT + STUDENT role */}
      <Route path="/modules" element={
        <StudentRouteGuard>
          <Modules />
        </StudentRouteGuard>
      } />
      <Route path="/modules/:moduleCode" element={
        <StudentRouteGuard>
          <ModuleContent />
        </StudentRouteGuard>
      } />
      <Route path="/modules/:moduleCode/quiz" element={
        <StudentRouteGuard>
          <Quiz />
        </StudentRouteGuard>
      } />
      <Route path="/modules/:moduleCode/quiz-results" element={
        <StudentRouteGuard>
          <QuizResults />
        </StudentRouteGuard>
      } />
      <Route path="/modules/:moduleCode/summary" element={
        <StudentRouteGuard>
          <Summary />
        </StudentRouteGuard>
      } />
      <Route path="/chat" element={
        <StudentRouteGuard>
          <Chat />
        </StudentRouteGuard>
      } />

      {/* Educator Routes - Protected by JWT + EDUCATOR role */}
      <Route path="/files" element={
        <EducatorRouteGuard>
          <EducatorModules />
        </EducatorRouteGuard>
      } />
      <Route path="/files/:moduleCode" element={
        <EducatorRouteGuard>
          <EducatorModuleFiles />
        </EducatorRouteGuard>
      } />

      {/* Admin Routes */}
      <Route path="/admin/lecturers" element={
        <ProtectedRoute roles={['admin']}>
          <Lecturers />
        </ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute roles={['admin']}>
          <Students />
        </ProtectedRoute>
      } />
      <Route path="/admin/files" element={
        <ProtectedRoute roles={['admin']}>
          <AdminFiles />
        </ProtectedRoute>
      } />
      <Route path="/admin/college-hub" element={
        <ProtectedRoute roles={['admin']}>
          <CollegeHub />
        </ProtectedRoute>
      } />
      <Route path="/admin/faculty" element={
        <ProtectedRoute roles={['admin']}>
          <Faculty />
        </ProtectedRoute>
      } />
      <Route path="/admin/departments" element={
        <ProtectedRoute roles={['admin']}>
          <Departments />
        </ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <ProtectedRoute roles={['admin']}>
          <Courses />
        </ProtectedRoute>
      } />
      <Route path="/admin/modules" element={
        <ProtectedRoute roles={['admin']}>
          <ModuleList />
        </ProtectedRoute>
      } />
      <Route path="/admin/campus" element={
        <ProtectedRoute roles={['admin']}>
          <Campus />
        </ProtectedRoute>
      } />

      {/* Common Routes */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      {/* Legacy redirect */}
      <Route path="/settings" element={<Navigate to="/profile" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FilesProvider>
          <ContentSelectionProvider>
            <ChatProvider>
              <TooltipProvider>
                <TopLoadingBar isLoading={false} />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </ChatProvider>
          </ContentSelectionProvider>
        </FilesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
