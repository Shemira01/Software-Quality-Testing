import React, { useState } from 'react';
import LoginForm from './pages/LoginForm';
import SignupForm from './pages/SignupForm';
import DashboardPage from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard'; // Import Admin
import './App.css'; 

function App() {
  const [view, setView] = useState('login'); 

  return (
    <div className="app-container">
      {view === 'login' && <LoginForm onNavigate={(next) => setView(next)} />}
      {view === 'signup' && <SignupForm onNavigate={(next) => setView(next)} />}
      
      {view === 'dashboard' && (
        <>
          <div className="admin-gateway">
            <button onClick={() => setView('admin')}>🛡️ Open Admin Panel</button>
          </div>
          <DashboardPage onLogout={() => setView('login')} />
        </>
      )}

      {view === 'admin' && (
        <AdminDashboard 
          onLogout={() => setView('login')} 
          onBack={() => setView('dashboard')} 
        />
      )}
    </div>
  );
}

export default App;