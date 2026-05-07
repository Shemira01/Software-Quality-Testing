import React from 'react';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function ReportsUI({ dailyData = [], weeklyData = [], alerts = [] }) {
  const needMoreDailyPoints = dailyData.length < 2;
  const needMoreWeeklyPoints = weeklyData.length < 2;

  // WOW FACTOR: PDF Report Generation
  const downloadPDFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 116, 166); // Professional Blue
    doc.text("Clinical Health Summary", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Vitals Summary
    const avgHR = dailyData.length ? (dailyData.reduce((acc, curr) => acc + curr.heartRate, 0) / dailyData.length).toFixed(1) : "N/A";
    const avgTemp = dailyData.length ? (dailyData.reduce((acc, curr) => acc + curr.temp, 0) / dailyData.length).toFixed(1) : "N/A";

    doc.autoTable({
      startY: 40,
      head: [['Metric', 'Average Reading', 'Status']],
      body: [
        ['Heart Rate', `${avgHR} BPM`, avgHR > 100 || avgHR < 60 ? 'ABNORMAL' : 'NORMAL'],
        ['Temperature', `${avgTemp} °C`, avgTemp > 37.5 ? 'FEVER' : 'NORMAL'],
      ],
      theme: 'striped'
    });

    // Alert Logs
    doc.setFontSize(14);
    doc.text("Incident Logs (Alert History)", 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Date', 'Time', 'Event Description']],
      body: alerts.length > 0 ? alerts.map(a => [a.date, a.time, a.message]) : [['-', '-', 'No alerts recorded']],
    });

    doc.save("Patient_Health_Report.pdf");
  };

  return (
    <div className="reports-wrapper">
      <div className="reports-header-actions">
        <h2 className="section-title">Health Analytics & Trends</h2>
        <button onClick={downloadPDFReport} className="pdf-button">
          📥 Export PDF Report
        </button>
      </div>

      {(needMoreDailyPoints || needMoreWeeklyPoints) && (
        <div className="trend-warning">
          <p>Trend charts become meaningful after multiple readings.</p>
        </div>
      )}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Daily Vitals (24h Window)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="heartRate" stroke="#e67e22" strokeWidth={3} name="Heart Rate" />
              <Line type="monotone" dataKey="temp" stroke="#4db6ac" strokeWidth={3} name="Temp" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Weekly Average Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgHR" stroke="#2c3e50" strokeWidth={3} name="Avg HR" />
              <Line type="stepAfter" dataKey="avgTemp" stroke="#4db6ac" strokeDasharray="5 5" name="Avg Temp" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="activity-card">
        <h3>⚠️ Recent Alarming Logs</h3>
        <div className="activity-list">
          {alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <div key={index} className="activity-item">
                <span className="activity-date">{alert.date}</span>
                <span className="activity-desc">{alert.message}</span>
              </div>
            ))
          ) : (
            <p>No alarming events recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsUI;