import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';

function AdminDashboard({ onLogout, onBack }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null); // Holds data when a patient is clicked
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Fetch the summary list for the table
  useEffect(() => {
    const fetchPatients = async () => {
      if (selectedPatient) return; // Don't refresh table if looking at a report
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

  // Fetch individual logs when a patient is clicked
  const handleViewReport = async (uid, name) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:8000/api/admin/user/${uid}`);
      const data = await response.json();
      
      // Merge the name and fetched data into the selected patient state
      setSelectedPatient({
        uid,
        name,
        history: data.history || { daily: [], weekly: [], alerts: [] }
      });
    } catch (err) {
      console.error("Failed to load patient details", err);
      alert("Failed to load patient data from database.");
    }
    setIsLoadingDetails(false);
  };

  // --- VIEW 1: INDIVIDUAL REPORT VIEW ---
  if (selectedPatient) {
    const history = selectedPatient.history;
    return (
      <div className="admin-container">
        <nav className="admin-nav">
          <button onClick={() => setSelectedPatient(null)} className="back-btn">
            ← Back to Patient Roster
          </button>
          <h2>Viewing Logs: {selectedPatient.name}</h2>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </nav>
        
        {/* We reuse your amazing ReportsUI component! */}
        <ReportsUI 
          name={selectedPatient.name}
          dailyData={history.daily || []} 
          weeklyData={history.weekly || []} 
          alerts={history.alerts || []} 
        />
      </div>
    );
  }

  // --- VIEW 2: ALL PATIENTS TABLE VIEW ---
  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <button onClick={onBack} className="back-btn">← Back to Home</button>
        <h2>Health Admin Control Center</h2>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </nav>

      {isLoadingDetails && <p className="loading-text">Loading secure patient logs...</p>}

      <div className="patient-grid">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Status</th>
              <th>Heart Rate</th>
              <th>Temp</th>
              <th>Last Sync</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.uid} className={p.status === 'ALERT' ? 'row-alert' : ''}>
                <td><strong>{p.name}</strong></td>
                <td>
                  <span className={`status-badge ${p.status.toLowerCase()}`}>
                    {p.status}
                  </span>
                </td>
                <td>{p.heartRate} BPM</td>
                <td>{p.temperature}°C</td>
                <td>{p.lastUpdate !== 'N/A' ? new Date(p.lastUpdate).toLocaleTimeString() : 'N/A'}</td>
                <td>
                  <button 
                    className="view-btn" 
                    onClick={() => handleViewReport(p.uid, p.name)}
                    disabled={isLoadingDetails}
                  >
                    🔍 View Detailed Reports
                  </button>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No patient data found in Database. Run seed_db.py!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;