import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';

function ReportsPage({ userId, userName }) {
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/admin/user/${userId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.history) {
            setDailyData(data.history.daily || []);
            setWeeklyData(data.history.weekly || []);
            setAlerts(data.history.alerts || []);
          }
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); 
    return () => clearInterval(interval);
  }, [userId]);

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