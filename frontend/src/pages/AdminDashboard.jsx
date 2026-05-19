import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient'; // Secure frontend client!

function AdminDashboard({ onLogout, onBack }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // 1. SECURE FETCH: Get live statuses for all users using the frontend Admin Session
  useEffect(() => {
    const fetchPatients = async () => {
      if (selectedPatient) return;
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;

        const formattedPatients = data.map(p => ({
          uid: p.id,
          name: p.name || "Unknown Patient",
          heartRate: p.current_hr || 0,
          temperature: p.current_temp || 0,
          status: p.current_status || 'UNKNOWN',
          lastUpdate: p.last_active || 'N/A'
        }));
        
        setPatients(formattedPatients);
      } catch (err) { 
        console.error("Error fetching patients:", err.message); 
      }
    };
    
    fetchPatients();
    const timer = setInterval(fetchPatients, 5000);
    return () => clearInterval(timer);
  }, [selectedPatient]);

  // 2. SECURE FETCH: Get deep history for a specific user using frontend Admin Session
  const handleViewReport = async (uid, name) => {
    setIsLoadingReport(true);
    try {
      const { data: vitalsData, error } = await supabase
        .from('vitals')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const daily = [];
      const alerts = [];
      
      if (vitalsData) {
        vitalsData.forEach(log => {
          daily.push({ 
            timestamp: log.created_at, 
            heartRate: log.heart_rate, 
            temp: log.temperature 
          });
          if (log.status === 'ALERT') {
            alerts.push({ 
              timestamp: log.created_at, 
              message: `Critical Incident: HR ${log.heart_rate}, Temp ${log.temperature}` 
            });
          }
        });
      }

      setSelectedPatient({
        uid, name, history: { daily, weekly: [], alerts }
      });
    } catch (err) {
      alert("Failed to load patient data.");
      console.error(err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // 3. Export the entire Admin Roster as a PDF
  const downloadRosterPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text("Global Patient Roster Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.line(14, 36, 196, 36);

    const tableData = patients.map(p => [
      p.name, 
      `${p.heartRate} BPM`, 
      `${p.temperature} °C`, 
      p.status,
      p.lastUpdate !== 'N/A' ? new Date(p.lastUpdate).toLocaleTimeString() : 'N/A'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Patient Name', 'Heart Rate', 'Temperature', 'Status', 'Last Sync']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'ALERT') {
            data.cell.styles.textColor = [231, 76, 60];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [39, 174, 96];
          }
        }
      }
    });

    doc.save("Admin_Global_Roster.pdf");
  };

  // --- VIEW A: INDIVIDUAL PATIENT REPORTS PAGE ---
  if (selectedPatient) {
    const history = selectedPatient.history;
    return (
      <div className="admin-detailed-view-container">
        <nav className="admin-detail-header">
          <button onClick={() => setSelectedPatient(null)} className="back-btn-modern">← Back to Roster</button>
          <div className="detail-header-info">
            <h2>Clinical View: <span>{selectedPatient.name}</span></h2>
            <p>Full Historical Analytics & PDF Export</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onBack} className="back-btn-modern" style={{background: 'white', color: '#34495e', border: '1px solid #34495e'}}>Home</button>
            <button onClick={onLogout} className="logout-btn-modern">Logout</button>
          </div>
        </nav>
        
        <div className="admin-reports-wrapper">
          <ReportsUI 
            name={selectedPatient.name}
            dailyData={history.daily || []} 
            weeklyData={history.weekly || []} 
            alerts={history.alerts || []} 
          />
        </div>
      </div>
    );
  }

  // --- VIEW B: MAIN ADMIN DASHBOARD ---
  return (
    <div className="admin-roster-container">
      <nav className="admin-roster-header">
        <div className="header-left-group">
          <button onClick={onBack} className="back-btn-modern">← Home</button>
          <div>
            <h2 className="header-title">Admin Control Center</h2>
            <p className="header-subtitle">Live Global Patient Monitoring</p>
          </div>
        </div>
        <div className="header-right-group">
           <button onClick={downloadRosterPDF} className="export-roster-btn">
             📥 Download Global Roster PDF
           </button>
           <button onClick={onLogout} className="logout-btn-modern">Logout</button>
        </div>
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
              <span className="sync-time">⏱ {p.lastUpdate !== 'N/A' ? new Date(p.lastUpdate).toLocaleTimeString() : 'N/A'}</span>
              <button 
                className="view-report-btn" 
                onClick={() => handleViewReport(p.uid, p.name)}
                disabled={isLoadingReport}
              >
                {isLoadingReport ? 'Loading...' : 'Open Reports →'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;