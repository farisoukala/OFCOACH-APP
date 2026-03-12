import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Mail, 
  AlertCircle,
  Dumbbell
} from 'lucide-react';

interface VerifyProps {
  onVerify: () => void;
  onBack: () => void;
}

export const Verify: React.FC<VerifyProps> = ({ onVerify, onBack }) => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      <div className="relative flex min-h-screen flex-col items-center justify-start px-6 py-8 md:justify-center">
        <div className="absolute top-8 left-6">
          <button 
            onClick={onBack}
            className="flex items-center justify-center p-2 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 hover:bg-primary/20 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md space-y-8 text-center mt-12 md:mt-0"
        >
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/10 mb-6">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <Mail className="text-primary relative z-10" size={48} />
              <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary ring-4 ring-background-dark">
                <AlertCircle className="text-white" size={12} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Vérifiez votre boîte mail
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Nous avons envoyé un lien de confirmation et un code à l'adresse <span className="text-primary font-semibold">user@ofcoach.com</span>.
            </p>
          </div>

          <div className="pt-4">
            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); onVerify(); }}>
              <div className="flex justify-between gap-2 sm:gap-4 max-w-sm mx-auto">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <input 
                    key={i}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-transparent focus:border-primary focus:ring-0 dark:bg-slate-900/50 transition-all outline-none" 
                    maxLength={1} 
                    type="text" 
                  />
                ))}
              </div>

              <div className="space-y-4 pt-4">
                <button 
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
                  type="submit"
                >
                  Confirmer
                </button>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Vous n'avez rien reçu ?
                  </p>
                  <button className="text-primary font-bold text-sm hover:underline decoration-2 underline-offset-4" type="button">
                    Renvoyer le code
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        <div className="mt-auto pt-12 opacity-50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Dumbbell className="text-white" size={14} />
            </div>
            <span className="font-bold tracking-tight text-lg">OfCoach</span>
          </div>
        </div>

        <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="fixed bottom-0 left-0 -z-10 w-1/2 h-1/2 bg-primary/5 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
};
