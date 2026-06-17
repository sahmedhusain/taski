import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  isDangerous 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl p-6 relative">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          {isDangerous ? (
            <AlertTriangle className="w-5 h-5 text-[#ff453a]" />
          ) : (
            <Info className="w-5 h-5 text-blue-400" />
          )}
          {title}
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="liquid-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              isDangerous 
                ? 'bg-[#ff453a] hover:bg-[#ff453a]/90 text-white font-medium shadow-[0_4px_12px_rgba(255,69,58,0.25)]' 
                : 'liquid-btn-primary'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
