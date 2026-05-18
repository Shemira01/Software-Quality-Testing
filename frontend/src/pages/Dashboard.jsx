import React, { useState, useEffect } from 'react';
import DashboardUI from '../components/Dashboard';
import ReportsPage from './Reports';
import { supabase } from '../supabaseClient';
import '../App.css';

// We added the 'onOpenAdmin' prop here
function DashboardPage({ onLogout, onOpenAdmin }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [vitals, setVitals] = useState({ heartRate: 0, temperature: 0, status: 'UNKNOWN' });
  
  // We added 'role' to the profile state
  const [profile, setProfile] = useState({ name: 'Patient', role: 'patient' });
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('dashboardTab') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleTabChange = (tab) => {
    localStorage.setItem('dashboardTab', tab);
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Listen for secure authentication state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Core Real-Time Synchronizer Hook
  useEffect(() => {
    if (!currentUser) return;

    const fetchLiveData = async () => {
      try {
        // 1. SAFE PROFILE FETCH: Replaced .single() to eliminate the 406 Not Acceptable crash
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id);
        
        if (!profileError && profileRows && profileRows.length > 0) {
          const profileData = profileRows[0];
          setProfile({ 
            name: profileData.name || 'Patient', 
            role: profileData.role || 'patient' 
          });
        } else {
          // Robust fallback template if user profile metadata is empty
          setProfile({ name: 'Patient Account', role: 'patient' });
          console.warn("Profile metadata entry not found for auth ID:", currentUser.id);
        }

        // 2. LIVE TELEMETRY INGESTION READING: Pulling from the vitals table
        const { data: vitalsData, error: vitalsError } = await supabase
          .from('vitals')
          .select('heart_rate, temperature, status')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Debug diagnostic log so you can track database state right in your inspect console
        console.log("CURRENT AUTH USER ID:", currentUser.id, "RECEIVED VITALS ARRAY:", vitalsData);

        if (!vitalsError && vitalsData && vitalsData.length > 0) {
          const latest = vitalsData[0]; // Extract the latest row object from the array wrapper
          
          // Map database snake_case keys cleanly into UI expected state fields
          setVitals({
            heartRate: latest.heart_rate || 0,
            temperature: latest.temperature || 0,
            status: latest.status || 'NORMAL'
          });
        }
      } catch (err) {
        console.error("Error executing background dashboard refresh sync:", err);
      }
    };

    // Execute immediately on loading context, then schedule the intervals
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

          {/* --- THE ROLE-BASED ACCESS CONTROL (RBAC) CHECK --- */}
          {/* This button ONLY renders if the database says this user is an admin */}
          {profile.role === 'admin' && (
            <button 
              onClick={onOpenAdmin}
              style={{
                marginTop: '30px', 
                background: '#2c3e50', 
                color: '#f1c40f', 
                fontWeight: 'bold',
                border: '1px solid #f1c40f'
              }}
            >
              🛡️ Admin Dashboard
            </button>
          )}

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