import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#08080a] px-4 relative overflow-hidden">
      {/* Background soft blurs */}
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
            Sign In
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Access your task manager dashboard
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3.5 text-red-400 text-xs mb-6 flex items-start gap-2.5 animate-fadeIn">
            <span className="text-sm mt-0.5">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                Please enter a valid email address (e.g. name@domain.com).
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full liquid-input py-3 pl-11 pr-12 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <div className="error-message text-red-400 text-xs mt-1">
                Password is required.
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
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-500">
          New to TaskI?{' '}
          <Link to="/register" className="text-slate-300 hover:text-white font-medium hover:underline transition-colors">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};
