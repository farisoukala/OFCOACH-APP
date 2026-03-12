import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Settings,
  Bell,
  Shield,
  ChevronRight,
  Camera,
  LogOut,
  ArrowLeft,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchClientById, updateUserProfile } from '../services/api';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validatePassword, validatePasswordMatch, validateRequired } from '../utils/validation';

const defaultAvatar = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop';

interface ProfileProps {
  onBack?: () => void;
  onNavigateToNotifications?: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onBack, onNavigateToNotifications }) => {
  const { appUser, signOut, refreshProfile, updatePassword } = useAuth();
  const [profile, setProfile] = useState<{ weight_kg?: number | null; height_cm?: number | null; age?: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  useEffect(() => {
    if (!appUser?.id) {
      setLoading(false);
      return;
    }
    fetchClientById(appUser.id)
      .then((data) => {
        setProfile(data);
        setEditName(data.name ?? '');
        setEditAvatar(data.avatar ?? '');
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [appUser?.id]);

  const handleSaveProfile = async () => {
    if (!appUser?.id) return;
    setSaving(true);
    try {
      await updateUserProfile(appUser.id, {
        name: editName.trim() || null,
        avatar: editAvatar.trim() || null,
      });
      setProfile((p) => ({ ...p, name: editName.trim(), avatar: editAvatar.trim() }));
      setShowEditModal(false);
      await refreshProfile();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordFieldErrors({});
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    const errors: { current?: string; new?: string; confirm?: string } = {};
    const currentErr = validateRequired(currentPassword, 'Le mot de passe actuel');
    if (currentErr) errors.current = currentErr;
    const newErr = validatePassword(newPassword);
    if (newErr) errors.new = newErr;
    const confirmErr = validatePasswordMatch(newPassword, confirmPassword);
    if (confirmErr) errors.confirm = confirmErr;
    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      return;
    }
    setPasswordFieldErrors({});
    setPasswordError(null);
    setSavingPassword(true);
    try {
      const { error } = await updatePassword(currentPassword, newPassword);
      if (error) {
        setPasswordError(error);
        return;
      }
      setShowPasswordModal(false);
      setPasswordError(null);
      setPasswordFieldErrors({});
      alert('Mot de passe modifié.');
    } finally {
      setSavingPassword(false);
    }
  };

  const displayName = profile?.name ?? appUser?.name ?? 'Utilisateur';
  const displayAvatar = profile?.avatar ?? appUser?.avatar ?? defaultAvatar;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {onBack && (
        <header className="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Paramètres</h1>
        </header>
      )}

      <div className="flex flex-col items-center pt-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-primary/20">
            <img
              src={displayAvatar || defaultAvatar}
              alt="Profil"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <button
            onClick={() => {
              setEditName(displayName);
              setEditAvatar(displayAvatar || '');
              setShowEditModal(true);
            }}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg border-4 border-background-light dark:border-background-dark"
          >
            <Camera size={18} />
          </button>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">{appUser?.email}</p>
        {appUser?.role && (
          <span className="mt-2 text-xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">
            {appUser.role === 'coach' ? 'Coach' : 'Athlète'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 px-4">
        {[
          { label: 'Poids', value: profile?.weight_kg != null ? String(profile.weight_kg) : '—', unit: 'kg' },
          { label: 'Taille', value: profile?.height_cm != null ? String(profile.height_cm) : '—', unit: 'cm' },
          { label: 'Âge', value: profile?.age != null ? String(profile.age) : '—', unit: 'ans' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-100 dark:bg-slate-900 p-3 rounded-2xl text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className="font-bold text-lg text-slate-900 dark:text-white">
              {stat.value} <span className="text-xs font-normal text-slate-500">{stat.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Compte</h3>
        <button
          onClick={() => {
            setEditName(displayName);
            setEditAvatar(displayAvatar || '');
            setShowEditModal(true);
          }}
          className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <User size={20} className="text-primary" />
            <span className="font-medium">Informations personnelles</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
        <div className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center gap-4">
            <Settings size={20} className="text-primary" />
            <span className="font-medium">Paramètres de l'application</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
        <button
          onClick={onNavigateToNotifications}
          className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-primary" />
            <span className="font-medium">Notifications</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </div>

      <div className="px-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">Sécurité</h3>
        <button
          onClick={openPasswordModal}
          className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Lock size={20} className="text-primary" />
            <span className="font-medium">Modifier le mot de passe</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
        <div className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center gap-4">
            <Shield size={20} className="text-primary" />
            <span className="font-medium">Confidentialité & Sécurité</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
      </div>

      <div className="px-4 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-red-500/10 dark:bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors text-red-600 dark:text-red-400"
        >
          <div className="flex items-center gap-4">
            <LogOut size={20} />
            <span className="font-medium">Déconnexion</span>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setShowEditModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold">Modifier le profil</h3>
                <button onClick={() => !saving && setShowEditModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Photo (URL)</label>
                  <input
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !savingPassword && setShowPasswordModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold">Modifier le mot de passe</h3>
                <button onClick={() => !savingPassword && setShowPasswordModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordFieldErrors((p) => ({ ...p, current: undefined })); }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary ${passwordFieldErrors.current ? 'ring-1 ring-red-500' : ''}`}
                  />
                  {passwordFieldErrors.current && <p className="mt-1 text-sm text-red-500">{passwordFieldErrors.current}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordFieldErrors((p) => ({ ...p, new: undefined, confirm: undefined })); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary ${passwordFieldErrors.new ? 'ring-1 ring-red-500' : ''}`}
                  />
                  <PasswordStrengthIndicator password={newPassword} />
                  {passwordFieldErrors.new && <p className="mt-1 text-sm text-red-500">{passwordFieldErrors.new}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordFieldErrors((p) => ({ ...p, confirm: undefined })); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary ${passwordFieldErrors.confirm ? 'ring-1 ring-red-500' : ''}`}
                  />
                  {passwordFieldErrors.confirm && <p className="mt-1 text-sm text-red-500">{passwordFieldErrors.confirm}</p>}
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                <button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
