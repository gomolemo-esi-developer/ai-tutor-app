import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface StudentRouteGuardProps {
  children: React.ReactNode;
}

/**
 * StudentRouteGuard - Protects student routes
 * Redirects non-authenticated or non-student users
 * 
 * Usage:
 *   <Route path="/modules" element={<StudentRouteGuard><Modules /></StudentRouteGuard>} />
 */
export const StudentRouteGuard: React.FC<StudentRouteGuardProps> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading state while auth initializes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role (case-insensitive)
  const userRole = (user?.role || '').toLowerCase();
  if (userRole !== 'student') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default StudentRouteGuard;
