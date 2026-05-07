import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function ReportsUI({ name = "Patient", dailyData = [], weeklyData = [], alerts = [] }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const formattedDaily = dailyData.map(d => {
    const timeStr = d.timestamp ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (d.time || '');
    return { ...d, time: timeStr };
  });

  const formattedAlerts = alerts.map(a => {
    const dateObj = a.timestamp ? new Date(a.timestamp) : new Date();
    return {
      ...a,
      date: a.date || dateObj.toLocaleDateString(),
      time: a.time || dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  });

  const avgHR = formattedDaily.length ? (formattedDaily.reduce((acc, curr) => acc + curr.heartRate, 0) / formattedDaily.length).toFixed(1) : 0;
  const avgTemp = formattedDaily.length ? (formattedDaily.reduce((acc, curr) => acc + curr.temp, 0) / formattedDaily.length).toFixed(1) : 0;
  const alertCount = formattedAlerts.length;

  const downloadPDFReport = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80);
      doc.text("Official Clinical Report", 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Patient: ${name}`, 14, 30);
      doc.text(`Date of Record: ${new Date().toLocaleDateString()}`, 14, 36);
      doc.line(14, 42, 196, 42);

      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("Executive Summary", 14, 52);
      
      autoTable(doc, {
        startY: 56,
        head: [['Metric', 'Calculated Average', 'Diagnostic']],
        body: [
          ['Heart Rate', `${avgHR} BPM`, avgHR > 100 || avgHR < 60 ? 'ABNORMAL' : 'NORMAL'],
          ['Body Temp', `${avgTemp} °C`, avgTemp > 37.5 ? 'FEVER' : 'NORMAL'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [77, 182, 172] } 
      });

      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 80;

      doc.text("Detailed Vital Log (Last 20 Readings)", 14, finalY + 15);
      const tableData = formattedDaily.slice(-20).map(d => [d.time, `${d.heartRate} BPM`, `${d.temp} °C`]);
      
      autoTable(doc, {
        startY: finalY + 19,
        head: [['Timestamp', 'Heart Rate', 'Temperature']],
        body: tableData.length > 0 ? tableData : [['-', '-', '-']],
        theme: 'striped',
      });

      finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 150;

      if (formattedAlerts.length > 0) {
        if (finalY > 250) { doc.addPage(); finalY = 10; } 
        doc.text("Critical Incident Log", 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 19,
          head: [['Date', 'Time', 'Incident Description']],
          body: formattedAlerts.map(a => [a.date, a.time, a.message]),
          headStyles: { fillColor: [231, 76, 60] } 
        });
      }

      doc.save(`${name.replace(/\s+/g, '_')}_Health_Report.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert(`Error generating PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="reports-wrapper">
      <div className="reports-header-actions">
        <div>
          <h2 className="section-title">Health Analytics</h2>
          <p style={{color: '#666', marginTop: '5px'}}>Comprehensive review for {name}</p>
        </div>
        <button onClick={downloadPDFReport} className="pdf-button" disabled={isGenerating || formattedDaily.length === 0}>
          {isGenerating ? "⏳ Generating PDF..." : "📥 Download Official PDF"}
        </button>
      </div>

      <div className="summary-cards-container">
        <div className="summary-card">
          <div className="summary-icon hr">❤️</div>
          <div><h4>Avg Heart Rate</h4><h2>{avgHR} <span>BPM</span></h2></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon temp">🌡️</div>
          <div><h4>Avg Temperature</h4><h2>{avgTemp} <span>°C</span></h2></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon alert">⚠️</div>
          <div><h4>Total Alerts</h4><h2 style={{color: alertCount > 0 ? '#e74c3c' : '#2ecc71'}}>{alertCount}</h2></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Daily Vitals (24h Window)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={formattedDaily} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="time" tick={{fontSize: 12}} stroke="#999" />
              <YAxis tick={{fontSize: 12}} stroke="#999" />
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="heartRate" stroke="#e74c3c" strokeWidth={3} dot={{r: 3}} activeDot={{r: 6}} name="Heart Rate" />
              <Line type="monotone" dataKey="temp" stroke="#3498db" strokeWidth={3} dot={{r: 3}} activeDot={{r: 6}} name="Temperature" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Recent Alerts Timeline</h3>
          <div className="activity-list" style={{maxHeight: '280px', overflowY: 'auto'}}>
            {formattedAlerts.length > 0 ? (
              formattedAlerts.map((alert, index) => (
                <div key={index} className="activity-item">
                  <span className="activity-date">{alert.date}</span>
                  <span className="activity-time">{alert.time}</span>
                  <span className="activity-desc">{alert.message}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>All vitals are normal.</p>
                <p className="sub-text">No alerts recorded in this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsUI;