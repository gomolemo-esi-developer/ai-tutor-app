import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import styles from './VerificationPage.module.css';

interface VerificationPageProps {
  email: string;
  onBack: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  email,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, verifyEmail, resendVerificationCode } = useAuth();

  // Get temp user data from sessionStorage (set during registration)
  const getTempUserData = () => {
    const tempData = sessionStorage.getItem('tempUserData');
    return tempData ? JSON.parse(tempData) : null;
  };

  const handleVerify = async () => {
     setError('');
     setMessage('');
     setIsLoading(true);

     try {
       // Verify email with the 6-digit code
       if (!code || code.length !== 6) {
         setError('Please enter a valid 6-digit code');
         return;
       }

       const success = await verifyEmail(email, code);

       if (!success) {
         setError('Verification failed. Invalid code or email.');
         return;
       }

       setMessage('Email verified successfully! Logging you in...');

       // Auto-login after verification if we have temp user data
       const tempUserData = getTempUserData();
       if (tempUserData?.password) {
         try {
           const loginSuccess = await login(email, tempUserData.password);

           if (loginSuccess) {
             // Clear temp data
             sessionStorage.removeItem('tempUserData');
             // Get user role from localStorage
             const storedUser = localStorage.getItem('user');
             let userRole = 'student'; // default
             if (storedUser) {
               try {
                 const userData = JSON.parse(storedUser);
                 userRole = (userData.role || 'student').toLowerCase();
               } catch (e) {
                 // Fallback to default
               }
             }
             // Navigate to appropriate dashboard
             setTimeout(() => {
               if (userRole === 'admin' || userRole === 'super_admin') {
                 navigate('/admin/lecturers');
               } else if (userRole === 'educator') {
                 navigate('/files');
               } else {
                 navigate('/modules');
               }
             }, 500);
           } else {
             throw new Error('Auto-login failed');
           }
         } catch (loginError) {
           console.log('Auto-login failed, redirecting to login page');
           setMessage('Email verified! Please log in with your credentials.');
           setTimeout(() => {
             navigate('/auth');
           }, 2000);
         }
       } else {
         // No temp data, just redirect to login
         setMessage('Email verified! Please log in with your credentials.');
         setTimeout(() => {
           navigate('/auth');
         }, 2000);
       }
     } finally {
       setIsLoading(false);
     }
   };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const success = await resendVerificationCode(email);
      if (success) {
        setMessage('Verification code sent to your email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <div className={styles.header}>
          <button onClick={onBack} className={styles.backButton}>
            <ArrowLeft className={styles.backButtonIcon} />
            <span>Back to sign up</span>
          </button>

          <div className={styles.iconContainer}>
            <CheckCircle className={styles.iconCheck} />
          </div>

          <h2 className={styles.title}>Verify your email</h2>
          <p className={styles.subtitle}>
            We've sent a 6-digit verification code to
          </p>
          <p className={styles.emailDisplay}>{email}</p>
        </div>

        <div className={styles.formContent}>
          <div className={styles.otpContainer}>
            <InputOTP
              value={code}
              onChange={setCode}
              maxLength={6}
              className={styles.otpInput}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className={styles.otpSlot} />
                <InputOTPSlot index={1} className={styles.otpSlot} />
                <InputOTPSlot index={2} className={styles.otpSlot} />
                <InputOTPSlot index={3} className={styles.otpSlot} />
                <InputOTPSlot index={4} className={styles.otpSlot} />
                <InputOTPSlot index={5} className={styles.otpSlot} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {message && (
            <div className={styles.successMessage}>
              <CheckCircle className={styles.successIcon} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || isLoading}
            className={styles.verifyButton}
          >
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinnerIcon} />
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify Email'
            )}
          </button>

          <div className={styles.resendSection}>
            <p className={styles.resendText}>Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={isLoading}
              className={styles.resendButton}
            >
              {isLoading ? 'Sending...' : 'Resend code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
