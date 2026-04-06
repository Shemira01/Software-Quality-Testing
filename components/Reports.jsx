import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function ReportsUI({ dailyData, weeklyData, alerts }) {
  return (
    <div className="reports-wrapper">
      <h2 className="section-title">Health Analytics & Trends</h2>

      <div className="charts-grid">
        {/* Daily Chart */}
        <div className="chart-card">
          <h3>Daily Vitals (24h Window)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="heartRate" stroke="#e67e22" strokeWidth={3} dot={{r: 4}} name="Heart Rate" />
              <Line type="monotone" dataKey="temp" stroke="#4db6ac" strokeWidth={3} dot={{r: 4}} name="Temp" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Chart */}
        <div className="chart-card">
          <h3>Weekly Average Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgHR" stroke="#2c3e50" strokeWidth={3} name="Avg Heart Rate" />
              <Line type="stepAfter" dataKey="avgTemp" stroke="#4db6ac" strokeDasharray="5 5" name="Avg Temp" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="activity-card">
        <h3>⚠️ Recent Alarming Logs</h3>
        <div className="activity-list">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <div key={index} className="activity-item">
                <span className="activity-date">{alert.date}</span>
                <span className="activity-time">{alert.time}</span>
                <span className="activity-desc">{alert.message}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
                <p>No alarming events recorded yet.</p>
                <p className="sub-text">Waiting for IoT sensor synchronization...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
