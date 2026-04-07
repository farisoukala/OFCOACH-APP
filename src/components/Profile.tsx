import React, { useEffect, useRef, useState } from 'react';
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
  ImageUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchClientById,
  updateUserProfile,
  upsertBodyMeasurementSnapshot,
  uploadUserAvatarFile,
} from '../services/api';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { validatePassword, validatePasswordMatch, validateRequired } from '../utils/validation';
import { toast } from '../lib/toast';
import {
  getBrowserNotificationSupport,
  requestBrowserNotificationPermission,
} from '../lib/browserNotifications';

const defaultAvatar = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop';

interface ProfileProps {
  onBack?: () => void;
  onNavigateToNotifications?: () => void;
}

type ProfileData = {
  name?: string | null;
  avatar?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  taille_cm?: number | null;
  tour_poitrine_cm?: number | null;
  tour_ventre_cm?: number | null;
  tour_hanche_cm?: number | null;
  tour_bras_cm?: number | null;
  tour_epaule_cm?: number | null;
  tour_mollet_cm?: number | null;
};

export const Profile: React.FC<ProfileProps> = ({ onBack, onNavigateToNotifications }) => {
  const { appUser, signOut, refreshProfile, updatePassword } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
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
  const [browserNotifyPerm, setBrowserNotifyPerm] = useState(() => getBrowserNotificationSupport());
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const [tailleCm, setTailleCm] = useState<string>('');
  const [tourPoitrineCm, setTourPoitrineCm] = useState<string>('');
  const [tourVentreCm, setTourVentreCm] = useState<string>('');
  const [tourHancheCm, setTourHancheCm] = useState<string>('');
  const [tourBrasCm, setTourBrasCm] = useState<string>('');
  const [tourEpauleCm, setTourEpauleCm] = useState<string>('');
  const [tourMolletCm, setTourMolletCm] = useState<string>('');

  const todayIso = new Date().toISOString().split('T')[0];
  const [measurementDate, setMeasurementDate] = useState<string>(todayIso);
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
        setTailleCm(data.taille_cm != null ? String(data.taille_cm) : '');
        setTourPoitrineCm(data.tour_poitrine_cm != null ? String(data.tour_poitrine_cm) : '');
        setTourVentreCm(data.tour_ventre_cm != null ? String(data.tour_ventre_cm) : '');
        setTourHancheCm(data.tour_hanche_cm != null ? String(data.tour_hanche_cm) : '');
        setTourBrasCm(data.tour_bras_cm != null ? String(data.tour_bras_cm) : '');
        setTourEpauleCm(data.tour_epaule_cm != null ? String(data.tour_epaule_cm) : '');
        setTourMolletCm(data.tour_mollet_cm != null ? String(data.tour_mollet_cm) : '');
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
      setProfile((p) => (p ? { ...p, name: editName.trim(), avatar: editAvatar.trim() } : p));
      setShowEditModal(false);
      await refreshProfile();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeasurements = async () => {
    if (!appUser?.id) return;
    setSaving(true);
    try {
      const payload = {
        taille_cm: tailleCm ? Number(tailleCm) : null,
        tour_poitrine_cm: tourPoitrineCm ? Number(tourPoitrineCm) : null,
        tour_ventre_cm: tourVentreCm ? Number(tourVentreCm) : null,
        tour_hanche_cm: tourHancheCm ? Number(tourHancheCm) : null,
        tour_bras_cm: tourBrasCm ? Number(tourBrasCm) : null,
        tour_epaule_cm: tourEpauleCm ? Number(tourEpauleCm) : null,
        tour_mollet_cm: tourMolletCm ? Number(tourMolletCm) : null,
      };

      await updateUserProfile(appUser.id, payload);

      // Historiser un relevé daté (sert aux courbes de progrès en cm)
      await upsertBodyMeasurementSnapshot(appUser.id, { snapshot_date: measurementDate, ...payload });

      setProfile((p) => (p ? { ...p, ...payload } : p));
      await refreshProfile();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la sauvegarde des mensurations.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !appUser?.id) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadUserAvatarFile(appUser.id, file);
      await updateUserProfile(appUser.id, { avatar: url });
      setProfile((p) => (p ? { ...p, avatar: url } : p));
      setEditAvatar(url);
      await refreshProfile();
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      console.error(err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Vérifie le format (JPEG, PNG, WebP, max 2,5 Mo) et exécute supabase_migration_storage_avatars.sql sur Supabase si besoin.';
      toast.error('Envoi de la photo impossible', msg);
    } finally {
      setUploadingAvatar(false);
    }
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
      toast.success('Mot de passe modifié.');
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
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          onChange={(ev) => void handleAvatarFileChange(ev)}
        />
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
            type="button"
            disabled={uploadingAvatar}
            onClick={() => avatarFileRef.current?.click()}
            title="Choisir une photo dans la photothèque"
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg border-4 border-background-light dark:border-background-dark disabled:opacity-60"
          >
            {uploadingAvatar ? (
              <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera size={18} />
            )}
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

      {/* Mensurations (athlètes uniquement ; le coach les modifie sur la fiche du client) */}
      {appUser?.role === 'coach' ? (
        <div className="px-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 rounded-2xl p-4">
            Les <strong>mensurations</strong> des athlètes se modifient depuis leur fiche :{' '}
            <strong>Clients</strong> → choisir l’athlète → <strong>Modifier le profil</strong>.
          </p>
        </div>
      ) : (
      <div className="px-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">
          Mensurations
        </h3>

        <div className="space-y-1">
          <label className="text-xs text-slate-500 dark:text-slate-400">Date du relevé</label>
          <input
            type="date"
            value={measurementDate}
            onChange={(e) => setMeasurementDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Taille (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tailleCm}
              onChange={(e) => setTailleCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 170"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour de poitrine (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourPoitrineCm}
              onChange={(e) => setTourPoitrineCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 95"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour de ventre (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourVentreCm}
              onChange={(e) => setTourVentreCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 80"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour de hanches (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourHancheCm}
              onChange={(e) => setTourHancheCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 95"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour de bras (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourBrasCm}
              onChange={(e) => setTourBrasCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 32"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour d’épaule (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourEpauleCm}
              onChange={(e) => setTourEpauleCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 110"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">Tour de mollet (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              value={tourMolletCm}
              onChange={(e) => setTourMolletCm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="ex : 38"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSaveMeasurements}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les mensurations'}
          </button>
        </div>
      </div>
      )}

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
          type="button"
          onClick={onNavigateToNotifications}
          className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <Bell size={20} className="text-primary" />
            <span className="font-medium">Notifications</span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {appUser?.role === 'athlete' && browserNotifyPerm !== 'unsupported' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-4 space-y-2">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Rappels navigateur</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              En complément des toasts dans l’app, tu peux autoriser les notifications du navigateur pour les rappels RDV
              (sous 48 h), séance du jour et nouveaux messages (hors onglet actif). Fonctionne en HTTPS ou en local.
            </p>
            {browserNotifyPerm === 'granted' ? (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Notifications autorisées</p>
            ) : browserNotifyPerm === 'denied' ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Refus navigateur : débloque les notifications pour ce site dans les paramètres du navigateur.
              </p>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const r = await requestBrowserNotificationPermission();
                  setBrowserNotifyPerm(r);
                  if (r === 'granted') toast.success('Rappels navigateur activés');
                  else if (r === 'denied') toast.warning('Notifications refusées', 'Tu peux réessayer via les paramètres du site.');
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold"
              >
                Autoriser les notifications du navigateur
              </button>
            )}
          </div>
        )}
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

      {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => !saving && setShowEditModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Photo</label>
                  <button
                    type="button"
                    disabled={saving || uploadingAvatar || !appUser?.id}
                    onClick={() => avatarFileRef.current?.click()}
                    className="w-full mb-3 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 font-semibold text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <>
                        <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <ImageUp size={20} />
                        Photothèque (galerie)
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-slate-500 mb-2">Ou colle une URL d’image :</p>
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
            </div>
          </div>
        )}

      {showPasswordModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => !savingPassword && setShowPasswordModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
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
            </div>
          </div>
        )}
    </div>
  );
};
