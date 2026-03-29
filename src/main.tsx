import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={5000}
          expand={false}
          style={{ zIndex: 99999 }}
        />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
