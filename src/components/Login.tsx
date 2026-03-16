import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Github, 
  Chrome 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';

function loginErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid_credentials')) return 'Email ou mot de passe incorrect.';
  if (lower.includes('email not confirmed')) return 'Vérifiez votre boîte mail pour confirmer votre compte.';
  if (lower.includes('too many requests')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (lower.includes('user not found')) return 'Aucun compte avec cette adresse email.';
  return raw;
}

interface LoginProps {
  onLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLogin,
  onNavigateToRegister,
  onNavigateToForgotPassword,
}) => {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (emailErr || passwordErr) {
      setFieldErrors({ email: emailErr || undefined, password: passwordErr || undefined });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error } = await signInWithEmail({ email: email.trim(), password });
      if (error) {
        setError(loginErrorMessage(error));
      } else {
        onLogin();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0b0f19]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0b0f19] via-black/40 to-[#0b0f19] z-10" />
        <img 
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop" 
          className="w-full h-full object-cover opacity-40 scale-105 grayscale-[20%]"
          alt="Gym background"
          referrerPolicy="no-referrer"
        />
      </div>

      <main className="relative z-20 w-full max-w-[480px] px-6 py-12">
        <div className="flex flex-col items-center mb-10">
           <div className="mb-6 flex justify-center bg-primary/20 p-4 rounded-2xl">
            <div className="text-primary font-extrabold text-4xl tracking-tighter">OfCoach</div>
          </div>
          <h1 className="text-4xl font-extrabold text-center text-white mb-3 tracking-tight">Prêt pour l'excellence ?</h1>
          <p className="text-slate-400 text-center text-lg font-medium">Connectez-vous à votre tableau de bord</p>
        </div>

        <div className="bg-[#161d2b]/60 backdrop-blur-2xl p-10 rounded-3xl border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Adresse E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail size={20} />
                </div>
                <input
                  className={`block w-full pl-12 pr-4 py-4 bg-[#0f1521] border rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none text-[15px] ${fieldErrors.email ? 'border-red-500/50' : 'border-white/5'}`}
                  placeholder="coach@ofcoach.com"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                />
              </div>
              {fieldErrors.email && <p className="text-sm text-red-400">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock size={20} />
                </div>
                <input
                  className={`block w-full pl-12 pr-12 py-4 bg-[#0f1521] border rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none text-[15px] ${fieldErrors.password ? 'border-red-500/50' : 'border-white/5'}`}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: undefined })); }}
                />
              </div>
              {fieldErrors.password && <p className="text-sm text-red-400">{fieldErrors.password}</p>}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onNavigateToForgotPassword}
                  className="text-primary hover:text-blue-400 text-sm font-semibold transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 font-medium">
                {error}
              </p>
            )}

            <button 
              className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-bold py-4 rounded-xl shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base tracking-wide mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              <ArrowRight size={20} />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
              <span className="px-4 bg-[#1a2333] text-slate-500">Ou continuer avec</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3.5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.07] transition-all hover:border-white/10">
              <Chrome size={20} />
              <span className="text-sm font-semibold">Google</span>
            </button>
            <button className="flex items-center justify-center gap-3 py-3.5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.07] transition-all hover:border-white/10">
              <Github size={20} />
              <span className="text-sm font-semibold">Github</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 font-medium">
            Pas encore de compte ? 
            <button 
              onClick={onNavigateToRegister}
              className="text-white font-bold hover:text-primary transition-colors ml-1"
            >
              Inscrivez-vous maintenant
            </button>
          </p>
        </div>
      </main>
      
      <div className="fixed bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
    </div>
  );
};
