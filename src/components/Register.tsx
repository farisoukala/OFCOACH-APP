import React, { useState } from 'react';
import { 
  ArrowLeft, 
  User, 
  ChevronRight, 
  Dumbbell, 
  Weight, 
  Zap, 
  Heart,
  Monitor,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validateEmail, validatePassword, validatePasswordMatch, validateNumber, validateDateOfBirth } from '../utils/validation';

function registerErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('already registered') || lower.includes('user already exists')) return 'Un compte existe déjà avec cette adresse email.';
  if (lower.includes('password') && (lower.includes('6') || lower.includes('least'))) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (lower.includes('invalid email')) return 'Adresse email invalide.';
  if (lower.includes('too many requests')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return raw;
}

interface RegisterProps {
  onRegister: () => void;
  onBack: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegister, onBack }) => {
  const { signUpWithEmail } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'athlete'>('coach');
  const [gender, setGender] = useState<'homme' | 'femme'>('homme');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const computeAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;
    const passwordErr = validatePassword(password);
    if (passwordErr) errors.password = passwordErr;
    const confirmErr = validatePasswordMatch(password, confirmPassword);
    if (confirmErr) errors.confirmPassword = confirmErr;
    if (heightCm.trim()) {
      const hErr = validateNumber(heightCm, { min: 100, max: 250, fieldName: 'La taille' });
      if (hErr) errors.heightCm = hErr;
    }
    if (weightKg.trim()) {
      const wErr = validateNumber(weightKg, { min: 30, max: 300, fieldName: 'Le poids' });
      if (wErr) errors.weightKg = wErr;
    }
    if (dateOfBirth) {
      const dErr = validateDateOfBirth(dateOfBirth);
      if (dErr) errors.dateOfBirth = dErr;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    const height = heightCm.trim() ? parseInt(heightCm, 10) : undefined;
    const weight = weightKg.trim() ? parseFloat(weightKg) : undefined;
    const age = dateOfBirth ? computeAge(dateOfBirth) : undefined;

    setLoading(true);
    try {
      const { error } = await signUpWithEmail({
        email,
        password,
        name: fullName || email,
        role,
        gender,
        height_cm: height != null && !Number.isNaN(height) ? height : undefined,
        weight_kg: weight != null && !Number.isNaN(weight) ? weight : undefined,
        age: age != null ? age : undefined,
      });

      if (error) {
        setError(registerErrorMessage(error));
      } else {
        onRegister();
      }
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (key: string) => setFieldErrors((prev) => ({ ...prev, [key]: undefined }));

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex flex-col">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-primary font-extrabold text-xl tracking-tighter">OfCoach</span>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-xl mx-auto w-full hide-scrollbar">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Créer votre compte</h1>
          <p className="text-slate-600 dark:text-slate-400">Rejoignez la communauté OfCoach et atteignez vos objectifs.</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <div className="flex justify-between items-end">
            <p className="text-slate-900 dark:text-white text-sm font-semibold uppercase tracking-wider">Progression</p>
            <p className="text-primary text-sm font-bold">100%</p>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-full shadow-[0_0_10px_rgba(17,82,212,0.5)]"></div>
          </div>
        </div>

        <form className="space-y-10" onSubmit={handleSubmit}>
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informations de compte</h2>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Nom complet</span>
                <input
                  className="mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none"
                  placeholder="Jean Dupont"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">E-mail</span>
                <input
                  className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                  placeholder="jean.dupont@exemple.com"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                />
                {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Mot de passe</span>
                  <input
                    className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); clearFieldError('confirmPassword'); }}
                  />
                  <PasswordStrengthIndicator password={password} />
                  {fieldErrors.password && <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>}
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Confirmer</span>
                  <input
                    className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                  />
                  {fieldErrors.confirmPassword && <p className="mt-1 text-sm text-red-500">{fieldErrors.confirmPassword}</p>}
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Informations Biométriques</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setGender('homme')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  gender === 'homme'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-bold">Homme</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('femme')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  gender === 'femme'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-sm font-bold">Femme</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Taille (cm)</span>
                <input
                  className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.heightCm ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                  placeholder="180"
                  type="number"
                  min={100}
                  max={250}
                  value={heightCm}
                  onChange={(e) => { setHeightCm(e.target.value); clearFieldError('heightCm'); }}
                />
                {fieldErrors.heightCm && <p className="mt-1 text-sm text-red-500">{fieldErrors.heightCm}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Poids (kg)</span>
                <input
                  className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.weightKg ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                  placeholder="75"
                  type="number"
                  min={30}
                  max={300}
                  value={weightKg}
                  onChange={(e) => { setWeightKg(e.target.value); clearFieldError('weightKg'); }}
                />
                {fieldErrors.weightKg && <p className="mt-1 text-sm text-red-500">{fieldErrors.weightKg}</p>}
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Date de naissance</span>
              <input
                className={`mt-1 block w-full rounded-xl bg-white dark:bg-slate-900/50 border text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary transition-all p-4 outline-none ${fieldErrors.dateOfBirth ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}`}
                type="date"
                value={dateOfBirth}
                onChange={(e) => { setDateOfBirth(e.target.value); clearFieldError('dateOfBirth'); }}
              />
              {fieldErrors.dateOfBirth && <p className="mt-1 text-sm text-red-500">{fieldErrors.dateOfBirth}</p>}
            </label>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="text-primary" size={20} />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Objectifs d'entraînement</h2>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Vous êtes :
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('coach')}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    role === 'coach'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Coach
                </button>
                <button
                  type="button"
                  onClick={() => setRole('athlete')}
                  className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${
                    role === 'athlete'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Athlète
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'bulk', label: 'Prise de masse', icon: <Dumbbell size={20} /> },
                { id: 'loss', label: 'Perte de poids', icon: <Weight size={20} /> },
                { id: 'perf', label: 'Performance', icon: <Zap size={20} /> },
                { id: 'health', label: 'Santé', icon: <Heart size={20} /> }
              ].map((goal) => (
                <label key={goal.id} className="relative cursor-pointer group">
                  <input className="peer sr-only" name="goal" type="radio" defaultChecked={goal.id === 'bulk'} />
                  <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all flex items-center gap-3">
                    <span className="text-primary">{goal.icon}</span>
                    <span className="font-semibold text-sm">{goal.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <div className="pt-6 pb-12">
            {error && (
              <p className="mb-4 text-sm text-red-500 font-medium">
                {error}
              </p>
            )}
            <button
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Création du compte...' : `S'inscrire`}</span>
              <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
            <div className="mt-6 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Déjà un compte ? 
                <button onClick={onBack} className="text-primary font-bold hover:underline ml-1">Se connecter</button>
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
