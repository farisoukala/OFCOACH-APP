import React, { useEffect, useMemo, useState } from 'react';
import { 
  Users, 
  Search, 
  ChevronRight,
  TrendingUp,
  Grid,
  MessageSquare,
  Calendar,
  Settings,
  LogOut
} from 'lucide-react';
import { fetchClients } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CoachDashboardProps {
  onNavigateToClients: () => void;
  onNavigateToMessages: () => void;
  onNavigateToCalendar: () => void;
  onNavigateToSettings?: () => void;
  /** Ouvre le profil détaillé d’un athlète (mensurations, etc.) */
  onOpenClientProfile?: (clientId: string) => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  onNavigateToClients,
  onNavigateToMessages,
  onNavigateToCalendar,
  onNavigateToSettings,
  onOpenClientProfile,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { signOut, appUser } = useAuth();
  const coachName = appUser?.name ?? 'Coach';
  const coachAvatar = appUser?.avatar || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=150&auto=format&fit=crop';

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const displayedClients = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return clients.slice(0, 4);
    return clients.filter((client) => normalizeText(String(client?.name ?? '')).includes(q));
  }, [clients, searchQuery]);

  useEffect(() => {
    if (!appUser?.id) {
      setLoading(false);
      return;
    }
    const loadRecentClients = async () => {
      try {
        const data = await fetchClients(appUser.id);
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading recent clients:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRecentClients();
  }, [appUser?.id]);

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <header className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-primary font-extrabold text-2xl tracking-tighter mb-1">OfCoach</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Bon retour, {coachName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => signOut()}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={14} aria-hidden />
              <span>Déconnexion</span>
            </button>
            <div className="size-12 rounded-full border-2 border-primary/30 p-0.5 overflow-hidden">
              <img 
                alt="Coach Profile" 
                className="w-full h-full object-cover rounded-full" 
                src={coachAvatar}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 max-w-sm">
          <div className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
            <div>
              <Users className="text-primary mb-2" size={24} />
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Clients</p>
            </div>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold">{clients.length}</h3>
              <span className="text-emerald-500 text-sm font-semibold flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <TrendingUp size={14} className="mr-1" />+5%
              </span>
            </div>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 text-base"
            placeholder="Rechercher un client..."
            type="search"
            aria-label="Rechercher un client"
          />
        </div>
      </header>

      <main className="flex-1 px-6 pb-24">
        <div className="flex items-center justify-between mb-4 mt-4">
          <h2 className="text-lg font-bold">Clients récents</h2>
          <button 
            onClick={onNavigateToClients}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Voir tout
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : displayedClients.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Aucun client trouvé.</div>
          ) : (
            displayedClients.map((client) => (
              <div 
                key={client.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (onOpenClientProfile) onOpenClientProfile(client.id);
                  else onNavigateToClients();
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  if (onOpenClientProfile) onOpenClientProfile(client.id);
                  else onNavigateToClients();
                }}
                className="flex items-center p-4 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/30 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
              >
                <div className="relative">
                  <img 
                    src={client.avatar} 
                    alt={client.name} 
                    className="size-14 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {client.status === 'En ligne' && (
                    <span className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 border-2 border-background-light dark:border-background-dark rounded-full"></span>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{client.name}</h4>
                    {client.status && (
                      <span className={`${client.status === 'Nouveau' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded`}>
                        {client.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs">
                      <TrendingUp size={14} className="mr-1" />
                      {client.weight || '70 kg'}
                    </div>
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs">
                      <Calendar size={14} className="mr-1" />
                      {client.time || 'Aujourd\'hui'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-primary transition-colors ml-2" size={20} />
              </div>
            ))
          )}
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3 pb-8 flex items-center justify-between z-50"
        aria-label="Navigation coach"
      >
        <button type="button" className="flex flex-col items-center gap-1 group" aria-current="page">
          <Grid className="text-primary transition-all scale-110" fill="currentColor" size={24} aria-hidden />
          <span className="text-[10px] font-bold text-primary">Tableau</span>
        </button>
        <button
          type="button"
          onClick={onNavigateToClients}
          className="flex flex-col items-center gap-1 group text-slate-400 hover:text-primary transition-colors"
        >
          <Users size={24} aria-hidden />
          <span className="text-[10px] font-medium">Clients</span>
        </button>
        <button
          type="button"
          onClick={onNavigateToMessages}
          className="flex flex-col items-center gap-1 group text-slate-400 hover:text-primary transition-colors"
        >
          <MessageSquare size={24} aria-hidden />
          <span className="text-[10px] font-medium">Messages</span>
        </button>
        <button
          type="button"
          onClick={onNavigateToCalendar}
          className="flex flex-col items-center gap-1 group text-slate-400 hover:text-primary transition-colors"
        >
          <Calendar size={24} aria-hidden />
          <span className="text-[10px] font-medium">Planning</span>
        </button>
        <button
          type="button"
          onClick={onNavigateToSettings}
          className="flex flex-col items-center gap-1 group text-slate-400 hover:text-primary transition-colors"
        >
          <Settings size={24} aria-hidden />
          <span className="text-[10px] font-medium">Réglages</span>
        </button>
      </nav>
    </div>
  );
};
