import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail } from '../utils/validation';

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldError(emailErr);
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPasswordForEmail(email.trim());
      if (error) {
        setError(error);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 w-full max-w-[400px] bg-[#161d2b]/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Email envoyé</h1>
          <p className="text-slate-400 text-sm mb-6">
            Si un compte existe pour <strong className="text-slate-300">{email}</strong>, vous recevrez un lien pour réinitialiser votre mot de passe. Pensez à vérifier les spams.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Retour à la connexion
          </button>
        </motion.div>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 w-full max-w-[400px]"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Retour</span>
        </button>
        <div className="bg-[#161d2b]/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/5">
          <h1 className="text-2xl font-bold text-white mb-2">Mot de passe oublié</h1>
          <p className="text-slate-400 text-sm mb-6">
            Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldError(null); setError(null); }}
                  placeholder="votre@email.com"
                  className={`block w-full pl-12 pr-4 py-4 bg-[#0f1521] border rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none ${fieldError ? 'border-red-500/50' : 'border-white/5'}`}
                />
              </div>
              {fieldError && <p className="mt-1 text-sm text-red-400">{fieldError}</p>}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl disabled:opacity-60 transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
