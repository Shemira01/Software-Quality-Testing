import React, { useState } from 'react';
import LoginForm from './pages/LoginForm';
import SignupForm from './pages/SignupForm';
import DashboardPage from './pages/Dashboard'; // Import your new Dashboard Page
import './App.css'; 

function App() {
  /**
   * View State Logic
   * 'login'     -> Default starting point
   * 'signup'    -> User registration
   * 'dashboard' -> Accessed only after Firebase authentication
   */
  const [view, setView] = useState('login'); 

  return (
    <div className="app-container">
      
      {/* 1. Login View (The Entry Point) */}
      {view === 'login' && (
        <LoginForm onNavigate={(nextView) => setView(nextView)} />
      )}

      {/* 2. Signup View */}
      {view === 'signup' && (
        <SignupForm onNavigate={(nextView) => setView(nextView)} />
      )}

      {/* 3. Real-time Dashboard View */}
      {view === 'dashboard' && (
        <DashboardPage onLogout={() => setView('login')} />
      )}

    </div>
  );
}

export default App;
