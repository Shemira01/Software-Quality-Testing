import React, { useState, useEffect } from 'react';
import LoginForm from './pages/LoginForm';
import SignupForm from './pages/SignupForm';
import DashboardPage from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import { supabase } from './supabaseClient';
import './App.css'; 

function App() {
  const [view, setView] = useState(localStorage.getItem('appView') || 'loading');

  const handleSetView = (newView) => {
    localStorage.setItem('appView', newView);
    setView(newView);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const savedView = localStorage.getItem('appView');
        if (savedView === 'admin') handleSetView('admin');
        else handleSetView('dashboard');
      } else {
        handleSetView('login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) handleSetView('login');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (view === 'loading') return null; 

  return (
    <div className="app-container">
      {view === 'login' && <LoginForm onNavigate={handleSetView} />}
      {view === 'signup' && <SignupForm onNavigate={handleSetView} />}
      
      {view === 'dashboard' && (
        <>
          <div className="admin-gateway">
            <button onClick={() => handleSetView('admin')}>🛡️ Open Admin Panel</button>
          </div>
          <DashboardPage onLogout={() => handleSetView('login')} />
        </>
      )}

      {view === 'admin' && (
        <AdminDashboard 
          onLogout={async () => {
            await supabase.auth.signOut();
            handleSetView('login');
          }} 
          onBack={() => handleSetView('dashboard')} 
        />
      )}
    </div>
  );
}

export default App;