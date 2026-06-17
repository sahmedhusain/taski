import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, User, Lock, Info } from 'lucide-react';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, checkMe } = useAuth();

  const [profileEmail, setProfileEmail] = useState('');
  const [profileFullName, setProfileFullName] = useState('');
  const [profileCompanyName, setProfileCompanyName] = useState('');
  const [profileDesignation, setProfileDesignation] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('');
  const [profileDateOfBirth, setProfileDateOfBirth] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isEmailConfirmOpen, setIsEmailConfirmOpen] = useState(false);
  const [isSimpleConfirmOpen, setIsSimpleConfirmOpen] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setProfileEmail(user.email || '');
      setProfileFullName(user.full_name || '');
      setProfileCompanyName(user.company_name || '');
      setProfileDesignation(user.designation || '');
      setProfileDepartment(user.department || '');
      setProfileDateOfBirth(user.date_of_birth || '');
      setProfileError('');
      setProfileSuccess(false);
      setIsEmailConfirmOpen(false);
      setIsSimpleConfirmOpen(false);
      setConfirmPasswordInput('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const submitProfileUpdate = async (password = '') => {
    setIsProfileSubmitting(true);
    setProfileError('');
    setProfileSuccess(false);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: profileEmail.trim(),
          password: password,
          full_name: profileFullName.trim(),
          company_name: profileCompanyName.trim(),
          designation: profileDesignation.trim(),
          department: profileDepartment.trim(),
          date_of_birth: profileDateOfBirth
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfileSuccess(true);
      await checkMe(); // refresh user info globally
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setProfileError(err.message || 'An error occurred while saving profile');
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (isProfileSubmitting) return;

    const nameTrimmed = profileFullName.trim();
    if (nameTrimmed) {
      const nameRegex = /^[a-zA-Z\s'\-.]+$/;
      if (!nameRegex.test(nameTrimmed)) {
        setProfileError('Full name can only contain letters, spaces, hyphens, periods, and apostrophes');
        return;
      }
      if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
        setProfileError('Full name must be between 2 and 100 characters');
        return;
      }
    }

    if (profileDateOfBirth) {
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(profileDateOfBirth)) {
        setProfileError('Date of Birth must be in YYYY-MM-DD format');
        return;
      }

      const dobDate = new Date(profileDateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dobDate > today) {
        setProfileError('Date of Birth cannot be in the future');
        return;
      }

      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }

      if (age < 12) {
        setProfileError('You must be at least 12 years old');
        return;
      }
      if (age > 120) {
        setProfileError('Invalid Date of Birth (age cannot exceed 120 years)');
        return;
      }
    }

    const fieldRegex = /^[a-zA-Z0-9\s'\-.,&()]*$/;

    if (profileCompanyName.trim()) {
      if (profileCompanyName.length > 100) {
        setProfileError('Company Name must not exceed 100 characters');
        return;
      }
      if (!fieldRegex.test(profileCompanyName)) {
        setProfileError('Company Name contains invalid characters');
        return;
      }
    }

    if (profileDesignation.trim()) {
      if (profileDesignation.length > 100) {
        setProfileError('Designation must not exceed 100 characters');
        return;
      }
      if (!fieldRegex.test(profileDesignation)) {
        setProfileError('Designation contains invalid characters');
        return;
      }
    }

    if (profileDepartment.trim()) {
      if (profileDepartment.length > 100) {
        setProfileError('Department must not exceed 100 characters');
        return;
      }
      if (!fieldRegex.test(profileDepartment)) {
        setProfileError('Department contains invalid characters');
        return;
      }
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(profileEmail.trim())) {
      setProfileError('Please enter a valid email address');
      return;
    }

    const hasEmailChanged = profileEmail.trim().toLowerCase() !== (user?.email || '').toLowerCase();
    const hasOtherFieldsChanged =
      nameTrimmed !== (user?.full_name || '') ||
      profileCompanyName.trim() !== (user?.company_name || '') ||
      profileDesignation.trim() !== (user?.designation || '') ||
      profileDepartment.trim() !== (user?.department || '') ||
      profileDateOfBirth !== (user?.date_of_birth || '');

    if (hasEmailChanged) {
      setConfirmPasswordInput('');
      setIsEmailConfirmOpen(true);
    } else if (hasOtherFieldsChanged) {
      setIsSimpleConfirmOpen(true);
    } else {
      // Nothing changed, close modal
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]">
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1.5 cursor-pointer rounded-full hover:bg-white/5 transition-all"
          aria-label="Close profile dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          User Profile Details
        </h3>

        {profileError && (
          <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs mb-4">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-xs mb-4">
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          
          {/* Account Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profileEmail" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Account Email <span className="text-[#ff453a]">*</span>
            </label>
            <input
              id="profileEmail"
              type="email"
              required
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="profileFullName" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Full Name
            </label>
            <input
              id="profileFullName"
              type="text"
              value={profileFullName}
              onChange={(e) => setProfileFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Company & Designation (Row) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profileCompanyName" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Company
              </label>
              <input
                id="profileCompanyName"
                type="text"
                value={profileCompanyName}
                onChange={(e) => setProfileCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profileDesignation" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Designation
              </label>
              <input
                id="profileDesignation"
                type="text"
                value={profileDesignation}
                onChange={(e) => setProfileDesignation(e.target.value)}
                placeholder="e.g. Developer"
                className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Department & Date of Birth (Row) */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profileDepartment" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Department
              </label>
              <input
                id="profileDepartment"
                type="text"
                value={profileDepartment}
                onChange={(e) => setProfileDepartment(e.target.value)}
                placeholder="e.g. Engineering"
                className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profileDateOfBirth" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Birth Date
              </label>
              <input
                id="profileDateOfBirth"
                type="date"
                value={profileDateOfBirth}
                onChange={(e) => setProfileDateOfBirth(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Form buttons */}
          <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="liquid-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProfileSubmitting}
              className="liquid-btn-primary px-5 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Email Password Confirmation Overlay */}
        {isEmailConfirmOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fadeIn rounded-2xl">
            <div className="w-full space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#ff9f0a]" />
                Confirm Email Update
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                You are updating your account email to <strong className="text-white">{profileEmail}</strong>. For security, please enter your password to confirm.
              </p>
              <div>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full liquid-input py-2.5 px-3.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailConfirmOpen(false)}
                  className="liquid-btn-secondary px-4 py-2 text-[10px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProfileSubmitting || !confirmPasswordInput.trim()}
                  onClick={() => submitProfileUpdate(confirmPasswordInput)}
                  className="liquid-btn-primary px-5 py-2 text-[10px] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isProfileSubmitting ? 'Confirming...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simple Save Confirmation Overlay */}
        {isSimpleConfirmOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fadeIn rounded-2xl">
            <div className="w-full space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Save Changes?
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Are you sure you want to update your profile details?
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSimpleConfirmOpen(false)}
                  className="liquid-btn-secondary px-4 py-2 text-[10px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProfileSubmitting}
                  onClick={() => submitProfileUpdate('')}
                  className="liquid-btn-primary px-5 py-2 text-[10px] font-semibold cursor-pointer"
                >
                  {isProfileSubmitting ? 'Saving...' : 'Yes, Save'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
