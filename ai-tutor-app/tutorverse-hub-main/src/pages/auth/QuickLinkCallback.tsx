import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'STUDENT' | 'EDUCATOR' | 'ADMIN';
  };
}

export default function QuickLinkCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    stage: 'validating' | 'storing' | 'complete';
  }>({
    loading: true,
    error: null,
    stage: 'validating',
  });

  useEffect(() => {
    const authenticateWithQuickLink = async () => {
      try {
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (!token || !email) {
          throw new Error('Invalid quick link: missing token or email');
        }

        // Validate quick link token
         setState(prev => ({ ...prev, stage: 'validating' }));
         
         const result = await apiClient.get<AuthResponse>(
           `/api/auth/quick?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
         );

         const data: AuthResponse = result;

        // Store tokens and user
        setState(prev => ({ ...prev, stage: 'storing' }));
        
        localStorage.setItem('jwt_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Mark complete
        setState(prev => ({ ...prev, stage: 'complete' }));

        // Redirect based on role
        const redirectUrl = {
          'STUDENT': '/modules',
          'EDUCATOR': '/files',
          'ADMIN': '/admin/lecturers',
        }[data.user.role] || '/modules';

        // Brief delay for visual feedback
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 500);
      } catch (err) {
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Authentication failed',
          stage: 'validating',
        });
      }
    };

    authenticateWithQuickLink();
  }, [searchParams, navigate]);

  // Loading State
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="mb-6">
            <Loader2 className="w-16 h-16 animate-spin text-emerald-500 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {state.stage === 'validating' && 'Validating Quick Link...'}
            {state.stage === 'storing' && 'Setting Up Your Session...'}
            {state.stage === 'complete' && 'Logging You In...'}
          </h1>
          <p className="text-gray-400">This should only take a moment.</p>
        </div>
      </div>
    );
  }

  // Error State
  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-50 p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Link Invalid</h1>
              <p className="text-gray-600 mb-6">{state.error}</p>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={() => navigate('/auth')}
                className="w-full bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition"
              >
                Back to Login
              </button>
            </div>

            <div className="bg-gray-50 px-6 py-4 text-sm text-gray-600 text-center border-t">
              <p>⏱️ Links expire in 15 minutes for security.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
