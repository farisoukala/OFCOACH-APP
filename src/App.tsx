import { useEffect, useState } from 'react';
import { Screen } from './types';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { Verify } from './components/Verify';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import { ClientList } from './components/ClientList';
import { ClientProfile } from './components/ClientProfile';
import { AthleteDashboard } from './components/AthleteDashboard';
import { Messages } from './components/Messages';
import { Calendar } from './components/Calendar';
import { CoachDashboard } from './components/CoachDashboard';
import { Profile } from './components/Profile';
import { Notifications } from './components/Notifications';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageOpenWithUserId, setMessageOpenWithUserId] = useState<string | null>(null);
  const [notificationsReturnTo, setNotificationsReturnTo] = useState<Screen>('athlete_dashboard');
  const { role, session, loading, needsPasswordReset, clearPasswordReset } = useAuth();

  useEffect(() => {
    if (!session) {
      setCurrentScreen('login');
      setSelectedClientId(null);
    }
  }, [session]);

  const handleLogin = () => {
    if (role === 'coach') {
      setCurrentScreen('coach_dashboard');
    } else {
      setCurrentScreen('athlete_dashboard');
    }
  };

  const renderScreen = () => {
    if (needsPasswordReset) {
      return (
        <ResetPassword
          onDone={() => {
            clearPasswordReset();
            setCurrentScreen('login');
            handleLogin();
          }}
        />
      );
    }

    switch (currentScreen) {
      case 'login':
        return (
          <Login
            onLogin={handleLogin}
            onNavigateToRegister={() => setCurrentScreen('register')}
            onNavigateToForgotPassword={() => setCurrentScreen('forgot_password')}
          />
        );
      case 'register':
        return (
          <Register
            onRegister={() => setCurrentScreen('verify')}
            onBack={() => setCurrentScreen('login')}
          />
        );
      case 'verify':
        return (
          <Verify
            onVerify={handleLogin}
            onBack={() => setCurrentScreen('register')}
          />
        );
      case 'forgot_password':
        return <ForgotPassword onBack={() => setCurrentScreen('login')} />;
      case 'coach_dashboard':
        return (
          <CoachDashboard
            onNavigateToClients={() => setCurrentScreen('client_list')}
            onNavigateToMessages={() => setCurrentScreen('messages')}
            onNavigateToCalendar={() => setCurrentScreen('calendar')}
            onNavigateToSettings={() => setCurrentScreen('settings')}
            onOpenClientProfile={(id) => {
              setSelectedClientId(id);
              setCurrentScreen('client_profile');
            }}
          />
        );
      case 'client_list':
        return (
          <ClientList
            onSelectClient={(id) => {
              setSelectedClientId(id);
              setCurrentScreen('client_profile');
            }}
            onNavigateToMessages={() => setCurrentScreen('messages')}
            onNavigateToCalendar={() => setCurrentScreen('calendar')}
            onNavigateToDashboard={() => setCurrentScreen('coach_dashboard')}
          />
        );
      case 'client_profile':
        return (
          <ClientProfile
            selectedClientId={selectedClientId}
            onBack={() => setCurrentScreen('client_list')}
            onNavigateToMessages={
              selectedClientId
                ? () => {
                    setMessageOpenWithUserId(selectedClientId);
                    setCurrentScreen('messages');
                  }
                : undefined
            }
          />
        );
      case 'athlete_dashboard':
        return (
          <AthleteDashboard
            onNavigateToMessages={() => setCurrentScreen('messages')}
            onNavigateToNotifications={() => {
              setNotificationsReturnTo('athlete_dashboard');
              setCurrentScreen('notifications');
            }}
          />
        );
      case 'messages':
        return (
          <Messages
            openWithUserId={messageOpenWithUserId}
            onClearOpenWith={() => setMessageOpenWithUserId(null)}
            onBack={() => setCurrentScreen(role === 'coach' ? 'coach_dashboard' : 'athlete_dashboard')}
            onNavigateToDashboard={() => setCurrentScreen(role === 'coach' ? 'coach_dashboard' : 'athlete_dashboard')}
            onNavigateToClients={() =>
              setCurrentScreen(role === 'coach' ? 'client_list' : 'athlete_dashboard')
            }
            onNavigateToCalendar={() => setCurrentScreen('calendar')}
            onNavigateToSettings={() => setCurrentScreen('settings')}
          />
        );
      case 'calendar':
        return (
          <Calendar
            onBack={() => setCurrentScreen(role === 'coach' ? 'coach_dashboard' : 'athlete_dashboard')}
          />
        );
      case 'settings':
        return (
          <Profile
            onBack={() => setCurrentScreen(role === 'coach' ? 'coach_dashboard' : 'athlete_dashboard')}
            onNavigateToNotifications={() => {
              setNotificationsReturnTo('settings');
              setCurrentScreen('notifications');
            }}
          />
        );
      case 'notifications':
        return <Notifications onBack={() => setCurrentScreen(notificationsReturnTo)} />;
      default:
        return (
          <Login
            onLogin={handleLogin}
            onNavigateToRegister={() => setCurrentScreen('register')}
            onNavigateToForgotPassword={() => setCurrentScreen('forgot_password')}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center gap-6">
        <div className="text-primary font-extrabold text-2xl tracking-tighter">OfCoach</div>
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {renderScreen()}
    </div>
  );
}
