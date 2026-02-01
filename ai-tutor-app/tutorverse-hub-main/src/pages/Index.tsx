import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Normalize role for comparison (backward compatible)
      if ((user.role || '').toUpperCase() === 'ADMIN') {
        navigate('/admin/lecturers');
      } else {
        navigate('/modules');
      }
    } else {
      navigate('/auth');
    }
  }, [isAuthenticated, user, navigate]);

  return null;
};

export default Index;
