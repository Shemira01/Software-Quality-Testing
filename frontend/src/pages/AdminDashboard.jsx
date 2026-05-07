import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';

function AdminDashboard({ onLogout, onBack }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      if (selectedPatient) return;
      try {
        const response = await fetch('http://localhost:8000/api/admin/all-users-status');
        const data = await response.json();
        setPatients(data);
      } catch (err) { console.error(err); }
    };
    
    fetchPatients();
    const timer = setInterval(fetchPatients, 5000);
    return () => clearInterval(timer);
  }, [selectedPatient]);

  const handleViewReport = async (uid, name) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/user/${uid}`);
      const data = await response.json();
      setSelectedPatient({
        uid, name, history: data.history || { daily: [], weekly: [], alerts: [] }
      });
    } catch (err) {
      alert("Failed to load patient data.");
    }
  };

  if (selectedPatient) {
    const history = selectedPatient.history;
    return (
      <div className="admin-container">
        <nav className="app-header" style={{marginBottom: '30px', borderRadius: '12px'}}>
          <button onClick={() => setSelectedPatient(null)} className="back-btn-modern">← Back to Roster</button>
          <h2 className="header-title">Viewing: {selectedPatient.name}</h2>
          <button onClick={onLogout} className="logout-btn-modern">Logout</button>
        </nav>
        
        <ReportsUI 
          name={selectedPatient.name}
          dailyData={history.daily || []} 
          weeklyData={history.weekly || []} 
          alerts={history.alerts || []} 
        />
      </div>
    );
  }

  return (
    <div className="admin-container" style={{padding: '30px', maxWidth: '1200px', margin: '0 auto'}}>
      <nav className="app-header" style={{marginBottom: '40px', borderRadius: '12px', padding: '15px 30px'}}>
        <button onClick={onBack} className="back-btn-modern">← Home</button>
        <h2 className="header-title">Admin Control Center</h2>
        <button onClick={onLogout} className="logout-btn-modern">Logout</button>
      </nav>

      <div className="modern-patient-grid">
        {patients.map((p) => (
          <div key={p.uid} className={`modern-patient-card ${p.status === 'ALERT' ? 'card-alert' : ''}`}>
            <div className="card-header">
              <h3>{p.name}</h3>
              <span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span>
            </div>
            
            <div className="card-vitals">
              <div className="vital-box">
                <span className="v-label">Heart Rate</span>
                <span className="v-value">{p.heartRate} <small>BPM</small></span>
              </div>
              <div className="vital-box">
                <span className="v-label">Temperature</span>
                <span className="v-value">{p.temperature} <small>°C</small></span>
              </div>
            </div>

            <div className="card-footer">
              <span className="sync-time">⏱ Last Sync: {p.lastUpdate !== 'N/A' ? new Date(p.lastUpdate).toLocaleTimeString() : 'N/A'}</span>
              <button className="view-report-btn" onClick={() => handleViewReport(p.uid, p.name)}>
                Open Reports →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;