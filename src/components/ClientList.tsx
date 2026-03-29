import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  Bell, 
  Settings, 
  Plus, 
  ChevronRight,
  Users,
  Grid,
  MessageSquare,
  Calendar,
  Dumbbell,
  X,
  UserPlus
} from 'lucide-react';
import { fetchClients, linkAthleteByEmail } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PublicUserRow } from '../types/rows';

interface ClientListProps {
  onSelectClient: (id: string) => void;
  onNavigateToMessages: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToDashboard: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ 
  onSelectClient, 
  onNavigateToMessages, 
  onNavigateToCalendar,
  onNavigateToDashboard
}) => {
  const [clients, setClients] = useState<PublicUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const { appUser } = useAuth();

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredClients = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return clients;
    return clients.filter((client) => normalizeText(String(client?.name ?? '')).includes(q));
  }, [clients, searchQuery]);

  const loadClients = useCallback(async () => {
    if (!appUser?.id) return;
    try {
      const data = await fetchClients(appUser.id);
      setClients(data ?? []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  useEffect(() => {
    if (!appUser?.id) {
      setLoading(false);
      return;
    }
    loadClients();
  }, [appUser?.id, loadClients]);

  const handleLinkAthlete = async () => {
    const email = linkEmail.trim();
    if (!email || !appUser?.id) return;
    setLinkError(null);
    setLinkSuccess(null);
    setLinkLoading(true);
    try {
      const updated = await linkAthleteByEmail(email, appUser.id);
      if (updated) {
        setLinkSuccess(`${updated.name} a été ajouté à votre liste.`);
        setLinkEmail('');
        await loadClients();
        setTimeout(() => {
          setShowLinkModal(false);
          setLinkSuccess(null);
        }, 1500);
      } else {
        setLinkError("Aucun athlète trouvé avec cet email, ou il a déjà un coach.");
      }
    } catch (err) {
      console.error(err);
      setLinkError("Erreur lors de la liaison. Vérifiez l'email.");
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Dumbbell size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Liste des Clients</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-primary transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 text-slate-500 hover:text-primary transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </div>
        <div className="px-4 pb-4 max-w-2xl mx-auto w-full">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
              <Search size={20} />
            </div>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border-transparent focus:border-primary/30 focus:bg-white dark:focus:bg-[#1c263b] rounded-2xl transition-all text-sm outline-none placeholder:text-slate-500" 
              placeholder="Rechercher un client par nom..." 
              type="text" 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 hide-scrollbar space-y-2.5">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-10 text-slate-500">Aucun client trouvé.</div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectClient(client.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectClient(client.id)}
              className="flex items-center gap-4 bg-white dark:bg-[#1c263b] p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-primary/30 dark:hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="relative">
                <div className="size-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 ring-2 ring-primary/10">
                  <img 
                    className="w-full h-full object-cover" 
                    src={client.avatar || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=150&auto=format&fit=crop'} 
                    alt={client.name}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white truncate mb-0.5">{client.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${client.status === 'En ligne' ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                  <span className={`text-xs font-semibold ${client.status === 'En ligne' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {client.status}
                  </span>
                </div>
              </div>
              <div className="size-9 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight size={20} />
              </div>
            </div>
          ))
        )}
      </main>

      <button
        onClick={() => { setShowLinkModal(true); setLinkError(null); setLinkSuccess(null); setLinkEmail(''); }}
        className="fixed bottom-24 right-6 size-14 bg-primary text-white rounded-2xl shadow-xl shadow-primary/40 flex items-center justify-center hover:shadow-primary/60 hover:-translate-y-1 transition-all active:scale-95 z-30"
        title="Lier un athlète"
      >
        <Plus size={28} />
      </button>

      {showLinkModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => !linkLoading && setShowLinkModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white dark:bg-[#1c263b] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserPlus size={22} className="text-primary" />
                  Lier un athlète
                </h3>
                <button
                  onClick={() => !linkLoading && setShowLinkModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Saisissez l'email de l'athlète inscrit. Il sera ajouté à votre liste s'il n'a pas déjà un coach.
                </p>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkAthlete()}
                  placeholder="email@exemple.com"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
                  autoFocus
                  disabled={linkLoading}
                />
                {linkError && (
                  <p className="text-sm text-red-500 font-medium">{linkError}</p>
                )}
                {linkSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">{linkSuccess}</p>
                )}
                <button
                  onClick={handleLinkAthlete}
                  disabled={linkLoading || !linkEmail.trim()}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {linkLoading ? 'Liaison...' : 'Lier cet athlète'}
                </button>
              </div>
            </div>
          </div>
        )}

      <nav className="sticky bottom-0 z-20 w-full bg-white dark:bg-[#192233] border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex max-w-2xl mx-auto px-2 py-2">
          <button 
            onClick={() => onNavigateToDashboard()}
            className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <Grid size={24} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Dashboard</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-primary">
            <Users size={24} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Clients</p>
          </button>
          <button 
            onClick={() => onNavigateToMessages()}
            className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <MessageSquare size={24} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Messages</p>
          </button>
          <button 
            onClick={() => onNavigateToCalendar()}
            className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <Calendar size={24} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Planning</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors">
            <Settings size={24} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Paramètres</p>
          </button>
        </div>
      </nav>
    </div>
  );
};
