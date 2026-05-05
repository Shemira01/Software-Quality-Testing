import React, { useState, useEffect, useRef } from 'react';
import ReportsUI from '../components/Reports';
import { auth, db } from '../firebaseConfig';
import { ref, onValue } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import '../App.css';

function ReportsPage() {
  // Initialize with Empty Arrays for a "Clean Slate"
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [debugInfo, setDebugInfo] = useState('waiting for auth...');
  const historyExistsRef = useRef(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setDebugInfo(`signed in as UID: ${user.uid}`);
      } else {
        setDebugInfo('not signed in');
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setDailyData([]);
      setWeeklyData([]);
      setAlerts([]);
      return;
    }

    const historyRef = ref(db, `users/${currentUser.uid}/history`);
    const vitalsRef = ref(db, `users/${currentUser.uid}/vitals`);

    const historyUnsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        historyExistsRef.current = true;
        setDailyData(data.daily || []);
        setWeeklyData(data.weekly || []);
        setAlerts(data.alerts || []);
      } else {
        historyExistsRef.current = false;
        setDailyData([]);
        setWeeklyData([]);
        setAlerts([]);
      }
    });

    const vitalsUnsubscribe = onValue(vitalsRef, (snapshot) => {
      const data = snapshot.val();
      if (!historyExistsRef.current && data) {
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        setDailyData([
          {
            time: timestamp.toLocaleTimeString(),
            heartRate: data.heartRate || 0,
            temp: data.temperature || 0
          }
        ]);
        setWeeklyData([
          {
            day: timestamp.toLocaleDateString(),
            avgHR: data.heartRate || 0,
            avgTemp: data.temperature || 0
          }
        ]);
        setAlerts(data.status === 'ALERT' ? [
          {
            date: timestamp.toLocaleDateString(),
            time: timestamp.toLocaleTimeString(),
            message: 'Most recent vitals triggered an alert.'
          }
        ] : []);
      }
    });

    return () => {
      historyUnsubscribe();
      vitalsUnsubscribe();
    };
  }, [currentUser]);

  return (
    <div className="reports-page-container">
      {!currentUser ? (
        <div className="reports-empty-state">
          <p>Please sign in to view your reports.</p>
        </div>
      ) : (
        <ReportsUI 
          dailyData={dailyData} 
          weeklyData={weeklyData} 
          alerts={alerts} 
        />
      )}
    </div>
  );
}

export default ReportsPage;
