import { useState } from 'react'
import './App.css';

function App() {
  const [count, setCount] = useState(0)

  return (
  
        <div className="dashboard">

        {/*Sidebar*/}
        <aside className="sidebar">
          <h2>FloodWatch</h2>
          <nav>
            <a className="active" href="#">Dashboard</a>
            <a href="#">Live Monitoring</a>
            <a href="#">Flood Alerts</a>
            <a href="#">Reports</a>
            <a href="#">Settings</a>
          </nav>
          
          <div className="sidebar-bottom">
            <p>FloodWatch v1.0</p>
            <p>Disater Management System</p>
          </div>
        </aside>

        {/*Main Content*/}
        <main className="main-content">

          {/*Header*/}
          <header className="topbar">
          <div>
          <h1>Dashboard</h1>
           <p> Flood Monitoring & Alert System</p>
          </div>
          <div className="profile">ADMIN</div>
          </header>

          {/*Welcome Section*/}
          <section className="welcome">
            <h2>Welcome back, Admin!</h2>
            <p>Here's your flood monitoring overview</p>
          </section>

          {/*Statistics Panel*/}
          <section className="stats">
            <div classname="stat-card">
              <span>⚠️</span>
              <p>Active Alerts</p>
              <h2>08</h2>
              <small>Currently Reported</small>
            </div>

            <div classname="stat-card">
              <span>📍</span>
              <p>Monitored Locations</p>
              <h2>24</h2>
              <small>Locations monitored</small>
            </div>

            <div classname="stat-card">
              <span>🌧️</span>
              <p>Rainfall</p>
              <h2>68 mm</h2>
              <small>Sample Rainfall</small>
            </div>

            <div classname="stat-card">
              <span>💧</span>
              <p>Water Level</p>
              <h2>7.2 m</h2>
              <small>Sample Water Level</small>
            </div>
          </section>

          {/*Monitoring Section*/}
          <section className="monitoring">
            <div classname="section-heading">
              <h2>Flood Monitoring Status</h2>
              <span>Sample data</span>
            </div> 

              <div className="monitor-card">
                <div>
                  <h3>Location: River Zone A</h3>
                  <p>Water Level: 7.2 metres</p>
                  <p>Rainfall: 68 mm</p>
                  </div>
                  <span className="status danger">High Risk</span>
              </div>

            <div className="monitor-card">     
              <div>
              <h3>Location: River Zone B</h3>
              <p>Water level: 4.1 metres</p>
              <p>Rainfall: 32 mm</p>
              </div>
              <span className="monitor-card">Moderate Risk</span>
            </div>
          </section>

          {/*Recent Alerts*/}
          <section className="alerts">
            <h2>Recent Flood Alerts</h2>
            <div className="alert-item">
              <span className="alert-dot red"></span>
              <div>
                <h4>High Flood Risk Detected</h4>
                <p>River Zone A- Immediate attention required</p>
              </div>
            </div>
          
          <div className="alert-item">
              <span className="alert-dot yellow"></span>
              <div>
                <h4>Moderate Wter Level</h4>
                <p>River Zone B- Continue Monitoring</p>
              </div>
            </div>  
          </section>
        </main>
      </div>
    );  
  }
export default App;
