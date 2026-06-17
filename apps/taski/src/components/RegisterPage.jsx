import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2, CheckCircle } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

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
      await register(email, password);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-violet-900/20 blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-fuchsia-900/10 blur-[120px] animate-pulse-slow"></div>

      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <span className="text-4xl font-extrabold text-white tracking-wider">
              Task<span className="text-red-500">I</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-350">
            Create Account
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Register for a secure dashboard
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-6 text-center text-emerald-400 animate-fadeIn">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <h3 className="font-bold text-lg">Registration Successful</h3>
            <p className="text-sm text-slate-400 mt-1">
              Redirecting you to the login screen...
            </p>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-6 flex items-start gap-2.5 animate-fadeIn">
                <span className="text-base mt-0.5">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="email"
                    id="email"
                    required
                    autocomplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
                  />
                  <div className="error-message text-red-400 text-xs mt-1">
                    Please enter a valid email address.
                  </div>
                </div>
              </div>

              <div className="form-field flex flex-col gap-1.5">
                <label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    required
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                    autocomplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
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
                <label htmlFor="confirmPassword" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    required
                    autocomplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
                  />
                  <div className="error-message text-red-400 text-xs mt-1">
                    Passwords must match.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-violet-950/50 hover:shadow-violet-900/40 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Register'
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-sm text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
