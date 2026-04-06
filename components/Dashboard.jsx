import React from 'react';

function DashboardUI({ name, temp, heartRate, dateTime }) {
  // Logic for LED Indicators (HCI: Semantic Feedback)
  const isAlarming = temp > 37.5 || temp < 35.5 || heartRate > 100 || heartRate < 60;
  const isNatural = !isAlarming && heartRate > 0;

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <h2>Welcome, <span className="user-highlight">{name}</span></h2>
        <div className="date-time-display">
          <p>{dateTime.toLocaleDateString()}</p>
          <p className="time-text">{dateTime.toLocaleTimeString()}</p>
        </div>
      </header>

      <div className="sensor-container">
        {/* Temperature Card */}
        <div className="sensor-card">
          <div className="sensor-icon">🌡️</div>
          <h3>Temperature</h3>
          <div className="sensor-value">{temp}°C</div>
          <p className="sensor-label">Sensor Status: Active</p>
        </div>

        {/* Heart Rate Card */}
        <div className="sensor-card">
          <div className="sensor-icon">❤️</div>
          <h3>Heart Rate</h3>
          <div className="sensor-value">{heartRate} BPM</div>
          <p className="sensor-label">Sensor Status: Active</p>
        </div>
      </div>

      <div className="led-status-container">
        <div className={`led-btn natural ${isNatural ? 'flicker-green' : ''}`}>
          NATURAL
        </div>
        <div className={`led-btn alarming ${isAlarming ? 'flicker-orange' : ''}`}>
          ALARMING
        </div>
      </div>
    </div>
  );
}

export default DashboardUI;
