import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';
import { supabase } from '../supabaseClient';

function ReportsPage({ userId, userName }) {
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchHistoryDirectly = async () => {
      try {
        setLoading(true);

        // Fetch the last 50 vitals records directly from Supabase
        const { data: vitalsRows, error } = await supabase
          .from('vitals')
          .select('heart_rate, temperature, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && vitalsRows) {
          // 1. Process Daily Data Trend Line (Chronological order)
          // Mapping BOTH "temp" and "temperature" to satisfy any variation in ReportsUI!
          const trendData = vitalsRows.map(item => ({
            time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            heartRate: item.heart_rate || 0,
            temperature: item.temperature || 0,
            temp: item.temperature || 0, // Fallback key
          })).reverse(); // Reverse so the chart moves from left-to-right (past-to-present)

          setDailyData(trendData);
          setWeeklyData(trendData); // Use trend records as fallback if weekly isn't a separate table

          // 2. Process Alerts List (Mapping BOTH temp and temperature)
          const alertLogs = vitalsRows
            .filter(item => 
              item.status === 'ALERT' || 
              item.status === 'ALARMING' || 
              (item.heart_rate > 100 || item.heart_rate < 60 || item.temperature > 37.5 || item.temperature < 35.5)
            )
            .map((item, index) => ({
              id: index,
              time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date(item.created_at).toLocaleDateString(),
              heartRate: item.heart_rate || 0,
              temperature: item.temperature || 0,
              temp: item.temperature || 0, // Fallback key
              status: item.status || 'ALARMING',
              message: `Abnormal readings registered: ${item.heart_rate} BPM / ${item.temperature}°C`
            }));

          setAlerts(alertLogs);
        } else if (error) {
          console.error("Supabase query error:", error.message);
        }
      } catch (err) {
        console.error("Error executing client-side analytics compilation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryDirectly();
    
    // Refresh trend logs every 5 seconds to match mock sensor loop frequency
    const interval = setInterval(fetchHistoryDirectly, 5000); 
    return () => clearInterval(interval);
  }, [userId]);

  if (loading && dailyData.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h3>Compiling medical telemetry metrics...</h3>
      </div>
    );
  }

  return (
    <div className="reports-page-container">
      <ReportsUI 
        name={userName}
        dailyData={dailyData} 
        weeklyData={weeklyData} 
        alerts={alerts} 
      />
    </div>
  );
}

export default ReportsPage;