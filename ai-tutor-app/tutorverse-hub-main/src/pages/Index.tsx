import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    console.log('Index.tsx - Auth state:', { isAuthenticated, user, loading });

    if (isAuthenticated && user) {
      // Normalize role for comparison (backward compatible)
      const role = (user.role || '').toUpperCase();
      console.log('Redirecting to:', { role });
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/lecturers');
      } else if (role === 'EDUCATOR') {
        navigate('/files');
      } else {
        navigate('/modules');
      }
    } else {
      console.log('Not authenticated, redirecting to /auth');
      navigate('/auth');
    }
  }, [isAuthenticated, user, loading, navigate]);

  return null;
};

export default Index;
