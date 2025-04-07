import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

interface HealthData {
  id: string;
  temperature: number;
  humidity: number;
  heart_rate: number;
  timestamp: {
    _seconds: number;
    _nanoseconds: number;
  };
}

interface TeamMember {
  name: string;
  role: string;
}

const Home: NextPage = () => {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'about'>('dashboard');

  // Team members data
  const teamMembers: TeamMember[] = [
    { name: "K. Vijay Ratna Babu", role: "Mentor" },
    { name: "Nalgonda Lokesh", role: "Team Member" },
    { name: "Loukith Jaiswal", role: "Team Member" },
    { name: "Vardhan Boya", role: "Team Member" },
    { name: "Pranay Shuhas", role: "Team Member" },
    { name: "Pratapa Siddhartha", role: "Team Member" },
  ];

  const fetchData = async () => {
    try {
      const response = await fetch('http://iot25.vercel.app/api/data');
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    return new Date(seconds * 1000).toLocaleString();
  };

  const getStatusClass = (value: number, type: 'temperature' | 'heart_rate' | 'humidity') => {
    switch (type) {
      case 'temperature':
        return value > 37.5 || value < 35 ? styles.warning : styles.normal;
      case 'heart_rate':
        return value > 100 || value < 60 ? styles.warning : styles.normal;
      case 'humidity':
        return value > 80 || value < 30 ? styles.warning : styles.normal;
      default:
        return styles.normal;
    }
  };

  if (loading) return <div className={styles.container}><div className={styles.loader}></div></div>;
  if (error) return <div className={styles.container}><div className={styles.error}>{error}</div></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>IoT based Patient Health Monitoring System</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'dashboard' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'about' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About Project
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {activeTab === 'dashboard' ? (
          <>
            <div className={styles.dashboardHeader}>
              <div className={styles.subtitle}>Live Patient Data Feed</div>
              <div className={styles.lastUpdated}>
                Last updated: {healthData.length > 0 ? formatTime(healthData[0].timestamp._seconds) : 'N/A'}
              </div>
            </div>
            
            <div className={styles.logContainer}>
              {healthData.map((log) => (
                <div key={log.id} className={styles.logCard}>
                  <div className={styles.timestamp}>
                    {formatTime(log.timestamp._seconds)}
                  </div>
                  <div className={styles.metrics}>
                    <div className={`${styles.metric} ${getStatusClass(log.temperature, 'temperature')}`}>
                      <div className={styles.statusIndicator}></div>
                      <span className={styles.metricValue}>{log.temperature}°C</span>
                      <span className={styles.metricLabel}>Temp</span>
                    </div>
                    <div className={`${styles.metric} ${getStatusClass(log.heart_rate, 'heart_rate')}`}>
                      <div className={styles.statusIndicator}></div>
                      <span className={styles.metricValue}>{log.heart_rate}</span>
                      <span className={styles.metricLabel}>BPM</span>
                    </div>
                    <div className={`${styles.metric} ${getStatusClass(log.humidity, 'humidity')}`}>
                      <div className={styles.statusIndicator}></div>
                      <span className={styles.metricValue}>{log.humidity}%</span>
                      <span className={styles.metricLabel}>Humidity</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.aboutSection}>
            <div className={styles.projectInfo}>
              <h2>Project Overview</h2>
              <p>
                This project presents an IoT-based health monitoring system using an ESP32
                microcontroller. It integrates a temperature and humidity sensor (DHT11) and a heart rate
                sensor to collect vital health data. The collected data is:
              </p>
              <ul className={styles.featureList}>
                <li>Displayed on an OLED screen for immediate viewing.</li>
                <li>Monitored remotely via the Blynk app, providing real-time updates on a mobile device.</li>
                <li>Sent as an SMS alert through Twilio if any abnormal values (like high temperature or irregular heart rate) are detected.</li>
                <li>Posted to a custom web interface, enabling remote monitoring from any browser.</li>
              </ul>
              <p>
                This multi-platform approach ensures comprehensive health tracking, real-time alerts, and
                user-friendly access. The system is ideal for patient care, elderly monitoring, and health
                awareness in remote areas.
              </p>

              <div className={styles.architectureSection}>
                <h3>System Architecture</h3>
                <div className={styles.architectureImage}>
                  <Image 
                    src="https://i.ibb.co/RdGT7Lg/image.png"
                    alt="System Architecture Diagram"
                    width={800}
                    height={400}
                    unoptimized={true}
                    className={styles.archImg}
                  />
                </div>
              </div>
            </div>

            <div className={styles.teamSection}>
              <h2>Team Members</h2>
              <div className={styles.teamGrid}>
                <div className={styles.mentorRow}>
                  <div className={styles.teamMember}>
                    <div className={styles.memberAvatar}>
                      {teamMembers[0].name.charAt(0)}
                    </div>
                    <div className={styles.memberInfo}>
                      <h3>{teamMembers[0].name}</h3>
                      <p>{teamMembers[0].role}</p>
                    </div>
                  </div>
                </div>
                <div className={styles.membersGrid}>
                  {teamMembers.slice(1).map((member, index) => (
                    <div key={index} className={styles.teamMember}>
                      <div className={styles.memberAvatar}>
                        {member.name.charAt(0)}
                      </div>
                      <div className={styles.memberInfo}>
                        <h3>{member.name}</h3>
                        <p>{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>© 2025 IoT Patient Health Monitoring System</p>
      </footer>
    </div>
  );
};

export default Home;
