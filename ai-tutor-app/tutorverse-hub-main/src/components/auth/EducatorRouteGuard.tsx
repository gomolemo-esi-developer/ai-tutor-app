import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface EducatorRouteGuardProps {
  children: React.ReactNode;
}

/**
 * EducatorRouteGuard - Protects educator routes
 * Redirects non-authenticated or non-educator users
 * 
 * Usage:
 *   <Route path="/educator/modules" element={<EducatorRouteGuard><EducatorModules /></EducatorRouteGuard>} />
 */
export const EducatorRouteGuard: React.FC<EducatorRouteGuardProps> = ({ children }) => {
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
  if (userRole !== 'educator') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default EducatorRouteGuard;
