import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

interface HealthData {
  id: string;
  temperature: number;
  humidity: number;
  heart_rate: number;
  timestamp: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const refreshInterval = 10; // seconds

  // Team members data
  const teamMembers: TeamMember[] = [
    { name: "Pramod", role: "Mentor" },
    { name: "Nalgonda Lokesh", role: "Team Leader" },
    { name: "Loukith Jaiswal", role: "Team Member" },
    { name: "Vardhan Boya", role: "Team Member" },
    { name: "Pranay Shuhas", role: "Team Member" },
    { name: "Pratapa Siddhartha", role: "Team Member" },
  ];

  const fetchData = async () => {
    setRefreshing(true);
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
      setRefreshing(false);
      setCountdown(refreshInterval); // Reset countdown after refresh
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) return refreshInterval;
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (timestamp: string) => {
    // Create a date object from the timestamp
    const date = new Date(timestamp);
    
    // Get UTC time components
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDay = date.getUTCDate();
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const utcSeconds = date.getUTCSeconds();
    
    // Create date in IST (UTC+5:30)
    const istDate = new Date();
    istDate.setUTCFullYear(utcYear);
    istDate.setUTCMonth(utcMonth);
    istDate.setUTCDate(utcDay);
    istDate.setUTCHours(utcHours + 5); // Add 5 hours for IST
    istDate.setUTCMinutes(utcMinutes + 30); // Add 30 minutes for IST
    istDate.setUTCSeconds(utcSeconds);
    
    // Format the date components
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    
    // Format time with AM/PM
    let hours = istDate.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm} IST`;
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = healthData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(healthData.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  if (loading) return <div className={styles.container}><div className={styles.loader}></div></div>;
  if (error) return <div className={styles.container}><div className={styles.error}>{error}</div></div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titleLarge}>IoT based Health Monitoring System</h1>
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
              <div className={styles.lastUpdatedContainer}>
                <div className={styles.lastUpdated}>
                  Last updated: {healthData.length > 0 ? formatTime(healthData[0].timestamp) : 'N/A'}
                </div>
                <div className={styles.refreshControls}>
                  <div className={styles.countdownTimer}>
                    <div className={styles.countdownInner} style={{ width: `${(countdown / refreshInterval) * 100}%` }}></div>
                    <span>{countdown}s</span>
                  </div>
                  <button 
                    className={`${styles.refreshButton} ${refreshing ? styles.spinning : ''}`} 
                    onClick={fetchData}
                    disabled={refreshing}
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>
            
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th className={styles.timeColumn}>Timestamp </th>
                    <th>Temperature</th>
                    <th>Heart Rate</th>
                    <th>Humidity</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((log) => (
                    <tr key={log.id}>
                      <td className={styles.timeColumn}>
                        <div className={styles.timeDisplay}>
                          <div className={styles.timeIcon}>🕒</div>
                          <div className={styles.timeDetails}>
                            <div className={styles.timeDate}>{formatTime(log.timestamp).split(',')[0]}</div>
                            <div className={styles.timeHour}>{formatTime(log.timestamp).split(',')[1]}</div>
                          </div>
                        </div>
                      </td>
                      <td className={getStatusClass(log.temperature, 'temperature')}>
                        <div className={styles.tableValue}>
                          <div className={styles.statusIndicator}></div>
                          <span>{log.temperature}°C</span>
                        </div>
                      </td>
                      <td className={getStatusClass(log.heart_rate, 'heart_rate')}>
                        <div className={styles.tableValue}>
                          <div className={styles.statusIndicator}></div>
                          <span>{log.heart_rate} BPM</span>
                        </div>
                      </td>
                      <td className={getStatusClass(log.humidity, 'humidity')}>
                        <div className={styles.tableValue}>
                          <div className={styles.statusIndicator}></div>
                          <span>{log.humidity}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className={styles.pagination}>
                <div className={styles.pageControls}>
                  <button 
                    onClick={prevPage} 
                    disabled={currentPage === 1}
                    className={styles.paginationButton}
                  >
                    Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={nextPage} 
                    disabled={currentPage === totalPages}
                    className={styles.paginationButton}
                  >
                    Next
                  </button>
                </div>
                <div className={styles.itemsPerPageControl}>
                  <label htmlFor="itemsPerPage">Items per page:</label>
                  <select 
                    id="itemsPerPage" 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className={styles.itemsPerPageSelect}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
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
        <p>© 2025 IoT Health Monitoring System</p>
      </footer>
    </div>
  );
};

export default Home;