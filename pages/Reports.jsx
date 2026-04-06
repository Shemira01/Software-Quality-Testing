import React, { useState, useEffect } from 'react';
import ReportsUI from '../components/Reports';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from "firebase/database";
import '../App.css';

function ReportsPage() {
  // Initialize with Empty Arrays for a "Clean Slate"
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // SQA: This listener will automatically update the charts 
      // the moment your IoT device pushes new data to these nodes.
      const historyRef = ref(db, `users/${user.uid}/history`);
      
      const unsubscribe = onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // If data exists, we map it to our state
          setDailyData(data.daily || []);
          setWeeklyData(data.weekly || []);
          setAlerts(data.alerts || []);
        } else {
          // If no data (New User), keep it empty
          setDailyData([]);
          setWeeklyData([]);
          setAlerts([]);
        }
      });

      return () => unsubscribe();
    }
  }, []);

  return (
    <div className="reports-page-container">
      <ReportsUI 
        dailyData={dailyData} 
        weeklyData={weeklyData} 
        alerts={alerts} 
      />
    </div>
  );
}

export default ReportsPage;
