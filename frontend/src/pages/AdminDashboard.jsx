import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function PatientReport({ patient, onBack, onHome }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('vitals').select('*').eq('user_id', patient.id)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setVitals(data || []); setLoading(false); });
  }, [patient.id]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.navLink}>← Back to Roster</button>
        <button onClick={onHome} style={styles.homeBtn}>Home</button>
      </div>
      
      <div style={styles.reportCard}>
        <h2 style={styles.title}>{patient.name}</h2>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Clinical Telemetry Records</p>
        
        <table style={styles.table}>
          <thead>
            <tr style={styles.tr}>
              <th style={styles.th}>Timestamp</th>
              <th style={styles.th}>Heart Rate</th>
              <th style={styles.th}>Temperature</th>
            </tr>
          </thead>
          <tbody>
            {vitals.map((v, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>{new Date(v.created_at).toLocaleString()}</td>
                <td style={{ ...styles.td, fontWeight: '700', color: '#2563eb' }}>{v.heart_rate} BPM</td>
                <td style={{ ...styles.td, fontWeight: '700', color: '#059669' }}>{v.temperature}°C</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout, onBack }) {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    supabase.from('vitals').select(`user_id, profiles (name)`)
      .then(({ data }) => {
        if (!data) return;
        const unique = [...new Map(data.map(item => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return [item.user_id, { id: item.user_id, name: profile?.name || "Unnamed Patient" }];
        })).values()];
        setPatients(unique);
      });
  }, []);

  if (selectedPatient) {
    return (
      <PatientReport 
        patient={selectedPatient} 
        onBack={() => setSelectedPatient(null)} 
        onHome={onBack} 
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Portal</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onBack} style={styles.homeBtn}>Home</button>
          <button onClick={onLogout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>

      <div style={styles.grid}>
        {patients.map(p => (
          <div key={p.id} style={styles.card}>
            <div style={styles.avatar}>{p.name.charAt(0).toUpperCase()}</div>
            <h3 style={styles.cardName}>{p.name}</h3>
            <button onClick={() => setSelectedPatient(p)} style={styles.viewBtn}>View Telemetry</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px', fontFamily: "'Inter', sans-serif", backgroundColor: '#f3f4f6', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  title: { fontSize: '2.5rem', color: '#111827', margin: 0, fontWeight: '800' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },
  card: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e5e7eb' },
  avatar: { width: '70px', height: '70px', borderRadius: '20px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 'bold', margin: '0 auto 20px' },
  cardName: { fontSize: '1.4rem', marginBottom: '20px', color: '#1f2937' },
  viewBtn: { width: '100%', padding: '14px', backgroundColor: '#4338ca', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' },
  logoutBtn: { padding: '12px 24px', backgroundColor: '#fef2f2', color: '#b91c1c', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' },
  homeBtn: { padding: '12px 24px', backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' },
  navLink: { background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', textDecoration: 'underline' },
  reportCard: { backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0', marginTop: '30px' },
  th: { textAlign: 'left', padding: '18px', backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '18px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: '1rem' },
  tr: { transition: 'background-color 0.2s' }
};

export default AdminDashboard;