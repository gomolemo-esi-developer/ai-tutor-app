import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import AdminService from '@/services/AdminServiceReal';

export type UserRole = 'student' | 'educator' | 'admin' | 'super_admin';

export interface User {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<boolean>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for fallback (if backend unavailable)
const mockUsers: Record<string, User> = {
  'student@test.com': {
    userId: 'student-123',
    email: 'student@test.com',
    role: 'student',
    firstName: 'John',
    lastName: 'Student',
  },
  'educator@test.com': {
    userId: 'educator-456',
    email: 'educator@test.com',
    role: 'educator',
    firstName: 'Jane',
    lastName: 'Educator',
  },
  'admin@test.com': {
    userId: 'admin-789',
    email: 'admin@test.com',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('jwt_token');
        const cachedUser = localStorage.getItem('user');

        if (storedToken && cachedUser) {
          // Restore token and user from localStorage
          apiClient.setToken(storedToken);
          AdminService.setToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(cachedUser));
          console.log('✅ Auth restored from localStorage');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Try real backend first
      try {
        const response = await apiClient.post('/api/auth/login', {
          email,
          password,
        });

        // Store JWT token
          const token = response.accessToken;
          localStorage.setItem('jwt_token', token);
          
          // Set token in all services
          apiClient.setToken(token);
          AdminService.setToken(token);
          setToken(token);

          // Store user data (response.user contains the user object)
          const userData: User = {
            userId: response.user?.userId || response.userId,
            email: response.user?.email || response.email,
            role: (response.user?.role || response.role) as UserRole,
            firstName: response.user?.firstName || response.firstName,
            lastName: response.user?.lastName || response.lastName,
            profilePictureUrl: response.user?.profilePictureUrl || response.profilePictureUrl,
          };

          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setError(null);
          return true;
      } catch (apiError) {
        // Fallback to mock if backend unavailable (for development)
        console.warn('Backend login failed, trying mock:', apiError);
        const mockUser = mockUsers[email];
        if (mockUser) {
          localStorage.setItem('user', JSON.stringify(mockUser));
          setUser(mockUser);
          return true;
        }
        throw apiError;
      }
    } catch (err: any) {
      const message = err.message || 'Login failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // Try real backend registration
      try {
        const response = await apiClient.post('/api/auth/register', {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        });

        // Store JWT token
        const token = response.accessToken;
        localStorage.setItem('jwt_token', token);
        apiClient.setToken(token);
        AdminService.setToken(token);
        setToken(token);

        // Store user data
        const userData: User = {
          userId: response.userId,
          email: response.email,
          role: response.role as UserRole,
          firstName: data.firstName,
          lastName: data.lastName,
        };

        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setError(null);
        return true;
      } catch (apiError) {
        // Fallback to mock if backend unavailable
        console.warn('Backend registration failed, using mock:', apiError);
        const newUser: User = {
          userId: `user-${Date.now()}`,
          email: data.email,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
        };

        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        return true;
      }
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Try to call logout endpoint on backend
      const storedToken = localStorage.getItem('jwt_token');
      if (storedToken) {
        try {
          await apiClient.post('/api/auth/logout', {});
        } catch (err) {
          console.warn('Backend logout failed:', err);
        }
      }
    } finally {
      // Clear tokens and user regardless of backend response
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      apiClient.clearToken();
      AdminService.clearToken();
      setUser(null);
      setToken(null);
      setSelectedRole(null);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    try {
      await apiClient.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
      });
    } catch (err: any) {
      throw new Error(err.message || 'Password change failed');
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const verifyEmail = async (email: string, code: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/api/auth/verify-email', {
        email,
        code,
      });
      setError(null);
      return true;
    } catch (err: any) {
      const message = err.message || 'Email verification failed';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async (email: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/api/auth/resend-verification-code', {
        email,
      });
      setError(null);
      return true;
    } catch (err: any) {
      const message = err.message || 'Failed to resend verification code';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isLoading: loading,
    error,
    selectedRole,
    setSelectedRole,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    hasRole,
    changePassword,
    verifyEmail,
    resendVerificationCode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
