import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2, CheckCircle, User } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Optional Full Name regex check: allow letters, spaces, hyphens, periods, apostrophes
    if (fullName.trim()) {
      const nameRegex = /^[a-zA-Z\s'\-.]+$/;
      if (!nameRegex.test(fullName)) {
        setErrorMessage('Full name can only contain letters, spaces, hyphens, periods, and apostrophes');
        return;
      }
      if (fullName.trim().length < 2 || fullName.trim().length > 100) {
        setErrorMessage('Full name must be between 2 and 100 characters');
        return;
      }
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one digit, and one special character');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await register(email, fullName.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080a] px-4 relative overflow-hidden">
      {/* Background blurs */}
      <div className="glow-blur-purple top-[-20%] left-[-20%]"></div>
      <div className="glow-blur-indigo bottom-[-20%] right-[-20%]"></div>

      <div className="w-full max-w-md liquid-glass p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="font-branding text-5xl text-white tracking-widest">
              Task<span className="text-[#ff453a]">I</span>
            </span>
          </div>
          <h1 className="text-lg font-medium text-slate-100">
            Create Account
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Register for a secure task dashboard
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 text-center text-emerald-400 animate-fadeIn">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <h3 className="font-semibold text-base">Registration Successful</h3>
            <p className="text-xs text-slate-500 mt-1">
              Redirecting you to the login screen...
            </p>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5 text-red-400 text-xs mb-6 flex items-start gap-2.5 animate-fadeIn">
                <span className="text-sm mt-0.5">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Full Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                  <input
                    type="text"
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full liquid-input py-3 pl-11 pr-4 text-sm focus:outline-none"
                  />
                  <div className="error-message text-red-400 text-xs mt-1">
                    Full name must only contain letters, spaces, hyphens, periods, or apostrophes.
                  </div>
                </div>
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="email" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                  <input
                    type="email"
                    id="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full liquid-input py-3 pl-11 pr-4 text-sm focus:outline-none"
                  />
                  <div className="error-message text-red-400 text-xs mt-1">
                    Please enter a valid email address.
                  </div>
                </div>
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="password" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full liquid-input py-3 pl-11 pr-12 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-355 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="error-message text-red-400 text-xs mt-1">
                    Password must contain at least 8 characters, one uppercase, one lowercase, one digit, and one special character.
                  </div>
                </div>
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full liquid-input py-3 pl-11 pr-12 text-sm focus:outline-none"
                  />
                  <div className="error-message text-red-400 text-xs mt-1">
                    Passwords must match.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full liquid-btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Register'
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="text-slate-300 hover:text-white font-medium hover:underline transition-colors">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
