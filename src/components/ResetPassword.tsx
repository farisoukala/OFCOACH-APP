import React, { useState } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validatePassword, validatePasswordMatch } from '../utils/validation';

interface ResetPasswordProps {
  onDone: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onDone }) => {
  const { setNewPasswordAfterRecovery } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newErr = validatePassword(newPassword);
    const confirmErr = validatePasswordMatch(newPassword, confirmPassword);
    if (newErr || confirmErr) {
      setFieldErrors({ new: newErr || undefined, confirm: confirmErr || undefined });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error } = await setNewPasswordAfterRecovery(newPassword);
      if (error) {
        setError(error);
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0f19] via-black/40 to-[#0b0f19] z-10" />
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-40 scale-105 grayscale-[20%]"
            alt=""
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-20 w-full max-w-[400px] bg-[#161d2b]/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Mot de passe mis à jour</h1>
          <p className="text-slate-400 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <button type="button" onClick={onDone} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors">
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0f19] via-black/40 to-[#0b0f19] z-10" />
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-40 scale-105 grayscale-[20%]"
          alt=""
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="relative z-20 w-full max-w-[400px] bg-[#161d2b]/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/5">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
          <Lock size={24} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Nouveau mot de passe</h1>
        <p className="text-slate-400 text-sm mb-6">Choisissez un mot de passe sécurisé pour votre compte.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nouveau mot de passe</label>
            <div className="relative mt-1">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((p) => ({ ...p, new: undefined, confirm: undefined })); }}
                placeholder="••••••••"
                className={`block w-full px-4 py-4 bg-[#0f1521] border rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/50 outline-none ${fieldErrors.new ? 'border-red-500/50' : 'border-white/5'}`}
              />
            </div>
            <PasswordStrengthIndicator password={newPassword} />
            {fieldErrors.new && <p className="mt-1 text-sm text-red-400">{fieldErrors.new}</p>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirm: undefined })); }}
              placeholder="••••••••"
              className={`block w-full mt-1 px-4 py-4 bg-[#0f1521] border rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/50 outline-none ${fieldErrors.confirm ? 'border-red-500/50' : 'border-white/5'}`}
            />
            {fieldErrors.confirm && <p className="mt-1 text-sm text-red-400">{fieldErrors.confirm}</p>}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl disabled:opacity-60 transition-colors">
            {loading ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};
