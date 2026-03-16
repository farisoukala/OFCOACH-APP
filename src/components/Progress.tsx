import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Pencil,
  X,
  Calendar,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { fetchProgressLogs, createProgressLog, updateProgressLog, deleteProgressLog } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Progress: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: '', weight: '', body_fat: '', notes: '' });
  const { appUser } = useAuth();
  const athleteId = appUser?.id;

  const loadLogs = useCallback(async () => {
    if (!athleteId) return;
    try {
      const data = await fetchProgressLogs(athleteId);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    loadLogs();
  }, [athleteId, loadLogs]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().split('T')[0],
      weight: '',
      body_fat: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEdit = (log: any) => {
    setEditingId(log.id);
    setForm({
      date: log.date || '',
      weight: log.weight != null ? String(log.weight) : '',
      body_fat: log.body_fat != null ? String(log.body_fat) : '',
      notes: log.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!athleteId) return;
    const weight = form.weight ? parseFloat(form.weight) : null;
    if (weight == null || !form.date) {
      alert('Renseignez au moins la date et le poids.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateProgressLog(editingId, {
          date: form.date,
          weight,
          body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
          notes: form.notes || null,
        });
      } else {
        await createProgressLog(athleteId, {
          date: form.date,
          weight,
          body_fat: form.body_fat ? parseFloat(form.body_fat) : null,
          notes: form.notes || null,
        });
      }
      await loadLogs();
      setShowModal(false);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || err?.error_description || 'Erreur lors de l\'enregistrement.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await deleteProgressLog(id);
      await loadLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const latestLog = logs.length ? logs[logs.length - 1] : null;
  const firstLog = logs.length ? logs[0] : null;
  const weightDiff = latestLog && firstLog && firstLog.weight != null && latestLog.weight != null
    ? (latestLog.weight - firstLog.weight).toFixed(1)
    : '0';

  const chartData = logs
    .filter((l) => l.weight != null)
    .map((log) => ({
      date: log.date ? new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '',
      weight: log.weight,
    }));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <section>
        <div className="bg-white dark:bg-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Poids actuel</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {latestLog?.weight != null ? latestLog.weight : '--'} <span className="text-lg font-medium opacity-60">kg</span>
              </h3>
            </div>
            {logs.length >= 2 && (
              <div className={`flex items-center gap-1 ${parseFloat(weightDiff) <= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} px-2 py-1 rounded-lg text-xs font-bold`}>
                {parseFloat(weightDiff) <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {weightDiff} kg
              </div>
            )}
          </div>

          {chartData.length >= 2 ? (
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1152D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1152D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="weight" stroke="#1152D4" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : chartData.length === 1 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Ajoutez d'autres entrées pour voir la courbe.</p>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Aucune donnée. Ajoutez une entrée pour commencer.</p>
          )}
        </div>
      </section>

      {latestLog?.body_fat != null && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Masse grasse</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{latestLog.body_fat} %</p>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex justify-between items-center mb-4 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Historique</h2>
          <button onClick={openAdd} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
            <Plus size={14} /> Ajouter
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 rounded-xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-sm">
            Aucune entrée. Cliquez sur « Ajouter » pour enregistrer votre poids et suivre votre progression.
          </div>
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().map((log) => (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {log.weight != null ? `${log.weight} kg` : '—'}
                      {log.body_fat != null && <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">• {log.body_fat} % MG</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {log.date ? new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
                      {log.notes ? ` • ${log.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(log)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(log.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={openAdd}
        className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:border-primary/50 hover:text-primary transition-all"
      >
        <Plus size={20} />
        <span className="text-sm font-bold">Ajouter une entrée</span>
      </button>

      {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => !saving && setShowModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold">{editingId ? 'Modifier l\'entrée' : 'Nouvelle entrée'}</h3>
                <button onClick={() => !saving && setShowModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Poids (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                      placeholder="Ex: 72.5"
                      className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Masse grasse (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.body_fat}
                      onChange={(e) => setForm((f) => ({ ...f, body_fat: e.target.value }))}
                      placeholder="Optionnel"
                      className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optionnel"
                    rows={2}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                <button onClick={handleSubmit} disabled={saving || !form.date || !form.weight.trim()} className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
