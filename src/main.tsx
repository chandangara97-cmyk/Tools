import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './services/auth';
import { LoginGate } from './components/LoginGate';
import './index.css';

// The whole app, including the hub page, opens only after a town sign-in.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <LoginGate>
        <App />
      </LoginGate>
    </AuthProvider>
  </React.StrictMode>
);
