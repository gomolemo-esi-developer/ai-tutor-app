import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createGlobalApiClient } from '@/services/apiClient';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const email = searchParams.get('email');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!email) {
        setStatus('error');
        setMessage('No email provided. Invalid verification link.');
        return;
      }

      try {
        const apiClient = createGlobalApiClient();
        const response = await apiClient.post('/api/auth/verify-email', {
          email: email,
        });

        if (response) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          toast({
            title: 'Success',
            description: 'Your email has been verified. You can now log in.',
            variant: 'default',
          });

          // Redirect to auth page after 2 seconds
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage(
          error?.message || 'Email verification failed. Please try again or contact support.'
        );
        toast({
          title: 'Verification Failed',
          description: error?.message || 'Could not verify your email.',
          variant: 'destructive',
        });
      }
    };

    verifyEmail();
  }, [email, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Verifying your email address...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-center text-muted-foreground">
                Please wait while we verify your email...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="font-semibold text-green-700">Verification Successful!</p>
                <p className="text-sm text-muted-foreground mt-2">{message}</p>
              </div>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full mt-4"
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center">
                <p className="font-semibold text-red-700">Verification Failed</p>
                <p className="text-sm text-muted-foreground mt-2">{message}</p>
              </div>
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full mt-4"
              >
                Back to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
