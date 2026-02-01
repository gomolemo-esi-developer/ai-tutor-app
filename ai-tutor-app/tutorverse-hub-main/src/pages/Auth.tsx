import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Shield, Clock, GraduationCap, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { VerificationPage } from '@/components/auth/VerificationPage';
import { QuickLoginModal } from '@/components/auth/QuickLoginModal';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; icon: React.ElementType; description: string }[] = [
    { value: 'student', label: 'Student', icon: GraduationCap, description: 'Access learning materials' },
    { value: 'educator', label: 'Educator', icon: User, description: 'Manage course content' },
    { value: 'admin', label: 'Admin', icon: Settings, description: 'System administration' },
];

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isActivation, setIsActivation] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [staffNumber, setStaffNumber] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [showQuickLoginModal, setShowQuickLoginModal] = useState(false);
    const [quickLoginRole, setQuickLoginRole] = useState<UserRole>('student');

    const { selectedRole, setSelectedRole, login, register } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Default to student role if none selected
    useEffect(() => {
        if (!selectedRole) {
            setSelectedRole('student');
        }
    }, [selectedRole, setSelectedRole]);

    // Open quick login modal
    const openQuickLoginModal = (role: UserRole) => {
        setQuickLoginRole(role);
        setShowQuickLoginModal(true);
    };

    // Quick login - generate instant access link for existing students/educators
    const handleQuickLoginSubmit = async (registrationNumber: string) => {
        setIsLoading(true);
        try {
            const { apiClient } = await import('@/lib/api');
            const response = await apiClient.post('/api/auth/quick-link-existing', {
                [quickLoginRole === 'educator' ? 'staffNumber' : 'studentNumber']: registrationNumber,
                role: quickLoginRole.toUpperCase(),
            }, { skipAuth: true });

            if (response?.link) {
                toast({
                    title: 'Quick Link Generated!',
                    description: 'Redirecting to login...',
                });
                
                // Redirect to the quick link
                window.location.href = response.link;
            } else {
                throw new Error('No link in response');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate quick link';
            toast({
                title: 'Quick Link Failed',
                description: errorMessage,
                variant: 'destructive',
            });
            setIsLoading(false);
            setShowQuickLoginModal(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const roleToUse = selectedRole || 'student';
        setIsLoading(true);

        try {
            let success: boolean;

            if (isLogin) {
                success = await login(email, password);
            } else if (isActivation) {
                // Activation flow - activate pre-created record
                const activationNumber = roleToUse === 'educator' ? staffNumber : studentNumber;

                if (!activationNumber) {
                    toast({
                        title: 'Activation Number Required',
                        description: roleToUse === 'educator' ? 'Please enter your staff number' : 'Please enter your student number',
                        variant: 'destructive',
                    });
                    setIsLoading(false);
                    return;
                }

                // Call backend activation endpoint
                try {
                    const { apiClient } = await import('@/lib/api');
                    
                    const response = await apiClient.post('/api/auth/register-activation', {
                        email,
                        password,
                        firstName,
                        lastName,
                        role: roleToUse.toUpperCase(),
                        staffNumber: roleToUse === 'educator' ? staffNumber : undefined,
                        studentNumber: roleToUse === 'student' ? studentNumber : undefined,
                    }, { skipAuth: true });

                    // Store JWT token
                    const token = response?.accessToken;
                    if (token) {
                        localStorage.setItem('jwt_token', token);
                        apiClient.setToken(token);
                    }

                    // Store user data
                    const userData = response?.user;
                    if (userData) {
                        localStorage.setItem('user', JSON.stringify(userData));
                    }

                    success = true;
                } catch (error: any) {
                    console.error('Activation error:', error);
                    toast({
                        title: 'Activation Failed',
                        description: error.message || 'Could not activate your account. Check your details.',
                        variant: 'destructive',
                    });
                    setIsLoading(false);
                    return;
                }
            } else {
                // Registration flow
                success = await register({
                    email,
                    password,
                    firstName,
                    lastName,
                    role: roleToUse,
                });
            }

            if (success) {
                if (!isLogin && !isActivation) {
                    // Registration successful - show verification page
                    setVerificationEmail(email);
                    sessionStorage.setItem('tempUserData', JSON.stringify({ password }));
                    setShowVerification(true);
                    toast({
                        title: 'Account created!',
                        description: 'Please verify your email to continue.',
                    });
                } else if (isActivation) {
                    // Activation successful - show verification page
                    setVerificationEmail(email);
                    sessionStorage.setItem('tempUserData', JSON.stringify({ password }));
                    setShowVerification(true);
                    toast({
                        title: 'Account activated!',
                        description: 'Please verify your email to continue.',
                    });
                } else {
                    // Login successful - navigate to dashboard
                    toast({
                        title: 'Welcome back!',
                        description: 'Redirecting to dashboard...',
                    });

                    // Get user role from localStorage (was just set by login/register)
                    const storedUser = localStorage.getItem('user');
                    let userRole = roleToUse.toLowerCase();
                    if (storedUser) {
                        try {
                            const userData = JSON.parse(storedUser);
                            userRole = (userData.role || '').toLowerCase();
                        } catch (e) {
                            // Fallback to selected role if parsing fails
                        }
                    }

                    // Navigate based on role
                    if (userRole === 'admin' || userRole === 'super_admin') {
                        navigate('/admin/lecturers');
                    } else if (userRole === 'educator') {
                        navigate('/files');
                    } else if (userRole === 'student') {
                        navigate('/modules');
                    } else {
                        // Default fallback
                        navigate('/modules');
                    }
                }
            } else {
                toast({
                    title: 'Authentication Failed',
                    description: 'Please check your credentials and try again',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Auth error:', error);
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackFromVerification = () => {
        setShowVerification(false);
        setVerificationEmail('');
        sessionStorage.removeItem('tempUserData');
        // Reset form fields
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setIsLogin(true);
    };

    // Show verification page if registration is pending email verification
    if (showVerification) {
        return (
            <div className="min-h-screen flex bg-background">
                {/* Left Panel - Branding with Gradient */}
                <div
                    className="hidden lg:flex lg:w-2/5 flex-col p-10 relative overflow-hidden"
                    style={{ background: 'var(--gradient-hero)' }}
                >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-display font-bold text-white tracking-tight">AI TUTOR</h1>
                                <p className="text-sm text-white/70">Tshwane University of Technology</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <h2 className="text-4xl font-display font-bold text-white mb-6 leading-tight tracking-tight">
                                Verify your email
                                <br />
                                to get started
                            </h2>
                            <p className="text-white/80 text-lg mb-10 max-w-md leading-relaxed">
                                We've sent a verification code to your email address. Enter it below to activate your account.
                            </p>
                        </div>

                        <div className="flex gap-8">
                            <div className="flex items-center gap-3 text-white/80">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm font-medium">Secure Verification</span>
                            </div>
                            <div className="flex items-center gap-3 text-white/80">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm font-medium">Quick Setup</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center Panel - Verification Form */}
                <div className="flex-1 flex items-center justify-center p-6 md:p-10">
                    <div className="w-full max-w-md">
                        <VerificationPage
                            email={verificationEmail}
                            onBack={handleBackFromVerification}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Left Panel - Branding with Gradient */}
            <div
                className="hidden lg:flex lg:w-2/5 flex-col p-10 relative overflow-hidden"
                style={{ background: 'var(--gradient-hero)' }}
            >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-display font-bold text-white tracking-tight">AI TUTOR</h1>
                            <p className="text-sm text-white/70">Tshwane University of Technology</p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <h2 className="text-4xl font-display font-bold text-white mb-6 leading-tight tracking-tight">
                            Discover the future
                            <br />
                            of education with
                            <br />
                            <span className="text-white/90">AI-powered learning</span>
                        </h2>
                        <p className="text-white/80 text-lg mb-10 max-w-md leading-relaxed">
                            Experience personalized tutoring, intelligent content generation, and seamless learning management all in one
                            platform.
                        </p>
                    </div>

                    <div className="flex gap-8">
                        <div className="flex items-center gap-3 text-white/80">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium">Secure Access</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium">24/7 Support</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Center Panel - Auth Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">AI TUTOR</h1>
                    </div>

                    <div className="text-center lg:text-left mb-8">
                        <h2 className="text-3xl font-display font-bold text-foreground mb-2 tracking-tight">
                            {isLogin ? 'Welcome Back' : isActivation ? 'Activate Account' : 'Create Account'}
                        </h2>
                        <p className="text-muted-foreground">
                            {isLogin
                                ? 'Enter your credentials to access your account'
                                : isActivation
                                    ? 'Activate your pre-created account with your credentials'
                                    : 'Fill in your details to get started'}
                        </p>
                    </div>

                    {/* Activation Toggle - Show only when not login */}
                    {!isLogin && (
                        <div className="mb-6 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-xs text-muted-foreground mb-2">Registration Type</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsActivation(false)}
                                    className={cn(
                                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                        !isActivation
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    New Account
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsActivation(true)}
                                    className={cn(
                                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                        isActivation
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    Activate Pre-created
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Role Selection - Inline */}
                    <div className="mb-6">
                        <Label className="text-sm text-muted-foreground mb-3 block">Sign in as</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {roles.map((role) => (
                                <button
                                    key={role.value}
                                    type="button"
                                    onClick={() => setSelectedRole(role.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                                        selectedRole === role.value
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <role.icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{role.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Login Buttons - Demo/Testing Only */}
                    <div className="mb-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-muted-foreground mb-3 text-center">
                            Quick Login (Demo)
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {roles.map((role) => (
                                <Button
                                    key={`quick-${role.value}`}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openQuickLoginModal(role.value)}
                                    disabled={isLoading}
                                    className="text-xs h-9"
                                >
                                    {role.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <>
                                {isActivation && (
                                    <div className="space-y-2">
                                        <Label htmlFor="activationNumber">
                                            {selectedRole === 'educator' ? 'Staff Number' : 'Student Number'}
                                        </Label>
                                        <Input
                                            id="activationNumber"
                                            type="text"
                                            placeholder={selectedRole === 'educator' ? 'Enter your staff number (e.g., E001)' : 'Enter your student number (e.g., S001)'}
                                            value={selectedRole === 'educator' ? staffNumber : studentNumber}
                                            onChange={(e) => selectedRole === 'educator' ? setStaffNumber(e.target.value) : setStudentNumber(e.target.value)}
                                            required={isActivation}
                                            className="h-12"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        placeholder="Enter your first name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required={!isLogin}
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        placeholder="Enter your last name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required={!isLogin}
                                        className="h-12"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <Button type="submit" size="lg" className="w-full h-12 text-base font-medium" disabled={isLoading}>
                            {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : isActivation ? 'Activate Account' : 'Create Account'}
                        </Button>
                    </form>

                    <p className="text-center text-muted-foreground mt-8">
                        {isLogin ? "Don't have an account?" : 'Already have an account?'}
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setIsActivation(false);
                                setEmail('');
                                setPassword('');
                                setFirstName('');
                                setLastName('');
                                setStaffNumber('');
                                setStudentNumber('');
                            }}
                            className="text-primary font-semibold ml-1.5 hover:underline"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>

            {/* Quick Login Modal */}
            <QuickLoginModal
                isOpen={showQuickLoginModal}
                role={quickLoginRole}
                onClose={() => setShowQuickLoginModal(false)}
                onSubmit={handleQuickLoginSubmit}
                isLoading={isLoading}
            />
        </div>
    );
};

export default Auth;
