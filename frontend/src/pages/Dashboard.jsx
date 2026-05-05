import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from "firebase/database";
import { deleteUser, onAuthStateChanged } from "firebase/auth"; // For account deletion and auth state
import DashboardUI from '../components/Dashboard';
import ReportsPage from './Reports';
import '../App.css'; // Importing the CSS for styling

function DashboardPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [vitals, setVitals] = useState({ name: 'User', heartRate: 0, temp: 0 });
  const [dateTime, setDateTime] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading auth...');

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthStatus(user ? `signed in as UID: ${user.uid}` : 'not signed in');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const userRef = ref(db, 'users/' + currentUser.uid);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVitals({
          name: data.fullName,
          heartRate: data.vitals?.heartRate || 0,
          temp: data.vitals?.temperature || 0
        });
      }
    });

    return unsubscribe;
  }, [currentUser]);

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("Are you REALLY sure? This will permanently DELETE your account from Firebase.");
    if (confirmDelete) {
      try {
        const user = auth.currentUser;
        if (user) {
          await deleteUser(user); // Deletes from Auth
          alert("Account successfully deleted.");
          onLogout(); // Redirect to login via App.jsx state
        }
      } catch (error) {
        alert("Error deleting account: " + error.message);
      }
    }
  };

  return (
    <div className="layout-container">
      {/* 1. Header with Hamburger */}
      <header className="app-header">
        <div className="header-left">
            <button className="hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                ☰
            </button>
        
            <h1 className="header-title">Health Tracker</h1>
        </div>
        <div className="header-spacer"></div>
      </header>

      {/* 2. Sidebar Overlay */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
        <nav className="nav-menu">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          >
            Dashboard
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
          >
            Reports
          </button>
        </nav>
        <button className="delete-acc-btn" onClick={handleDeleteAccount}>
          Delete Account
        </button>
      </div>

      {/* 3. Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' ? (
          <DashboardUI 
            name={vitals.name} 
            temp={vitals.temp} 
            heartRate={vitals.heartRate} 
            dateTime={dateTime} 
          />
        ) : (
          <ReportsPage />
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
