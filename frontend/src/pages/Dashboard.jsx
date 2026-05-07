import React, { useState, useEffect } from 'react';
import DashboardUI from '../components/Dashboard';
import ReportsPage from './Reports';
import { supabase } from '../supabaseClient';
import '../App.css';

function DashboardPage({ onLogout }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [vitals, setVitals] = useState({ heartRate: 0, temperature: 0, status: 'UNKNOWN' });
  const [profile, setProfile] = useState({ name: 'Patient' });
  
  // Navigation State with LocalStorage memory
  const [activeTab, setActiveTab] = useState(localStorage.getItem('dashboardTab') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTabChange = (tab) => {
    localStorage.setItem('dashboardTab', tab);
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchLiveData = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileData) {
          setProfile({ name: profileData.name });
          setVitals({
            heartRate: profileData.current_hr || 0,
            temperature: profileData.current_temp || 0,
            status: profileData.current_status || 'UNKNOWN'
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 2000); 
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  if (!currentUser) {
    return (
      <div className="auth-page-wrapper">
        <p>Verifying secure session...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-container">
      
      <nav className="app-header">
        <div className="header-left">
          <button className="hamburger" onClick={() => setIsSidebarOpen(true)}>
            ☰
          </button>
          <h2 className="header-title">My Health Monitor</h2>
        </div>
      </nav>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>×</button>
        <div className="nav-menu">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''} 
            onClick={() => handleTabChange('dashboard')}
          >
            Live Vitals
          </button>
          <button 
            className={activeTab === 'reports' ? 'active' : ''} 
            onClick={() => handleTabChange('reports')}
          >
            My Reports
          </button>
        </div>
        <button className="delete-acc-btn" onClick={handleLogout} style={{marginTop: 'auto'}}>
          Logout
        </button>
      </div>

      <div 
        className="main-content" 
        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
      >
        {activeTab === 'dashboard' ? (
          <DashboardUI 
            name={profile.name}
            temp={vitals.temperature}
            heartRate={vitals.heartRate}
            dateTime={new Date()}
          />
        ) : (
          <ReportsPage userId={currentUser.id} userName={profile.name} />
        )}
      </div>

    </div>
  );
}

export default DashboardPage;