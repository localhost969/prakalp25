import React, { useEffect, useState, useRef } from 'react';
import { NextPage } from 'next';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
// Fix jsPDF autotable import
// @ts-ignore
import 'jspdf-autotable'; 

// Register Chart.js components
Chart.register(...registerables);

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
  const [countdown, setCountdown] = useState(30);
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'heart_rate' | 'humidity' | 'all'>('all');
  const refreshInterval = 30; // seconds
  
  // Use proper typing for the chart reference
  const chartRef = useRef<any>(null);

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
      const response = await fetch('https://iot25.vercel.app/api/data');
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.statusText}`);
      const data = await response.json();
      
      // Add validation to ensure data is in expected format
      if (Array.isArray(data)) {
        setHealthData(data);
        setError(null);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Error fetching data: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
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
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid date';
    }
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

  // Prepare chart data with enhanced styling and fixed gradient creation
  const prepareChartData = (): ChartData<'line'> => {
    // Handle empty data case
    if (!healthData || healthData.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'No data available',
            data: [],
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            borderWidth: 2,
            tension: 0.3
          }
        ]
      };
    }

    // Use more data points for a fuller graph
    const chartData = [...healthData].reverse().slice(0, 30);
    
    // Create meaningful labels
    const labels = chartData.map(item => {
      try {
        const date = new Date(item.timestamp);
        return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
      } catch (err) {
        console.error('Error formatting chart label:', err);
        return 'Invalid';
      }
    });

    // Fix: Safe gradient creation with fallbacks
    let tempGradient = 'rgba(220, 53, 69, 0.2)';
    let heartGradient = 'rgba(0, 123, 255, 0.2)';
    let humidGradient = 'rgba(40, 167, 69, 0.2)';
    
    try {
      // Get the chart context for gradients
      const chart = chartRef.current;
      if (chart && chart.ctx) {
        const ctx = chart.ctx;
        // Create gradient fills
        const createGradient = (color1: string, color2: string) => {
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, color1);
          gradient.addColorStop(1, color2);
          return gradient;
        };
        
        tempGradient = createGradient('rgba(220, 53, 69, 0.4)', 'rgba(220, 53, 69, 0.0)');
        heartGradient = createGradient('rgba(0, 123, 255, 0.4)', 'rgba(0, 123, 255, 0.0)');
        humidGradient = createGradient('rgba(40, 167, 69, 0.4)', 'rgba(40, 167, 69, 0.0)');
      }
    } catch (err) {
      console.error('Error creating gradients:', err);
      // Use fallback solid colors if gradient creation fails
    }

    // Normalize data for better visualization
    // Create datasets with enhanced styling
    const datasets = [
      {
        label: 'Temperature (°C)',
        data: chartData.map(item => item.temperature),
        borderColor: '#dc3545',
        backgroundColor: tempGradient,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#dc3545',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        hidden: activeMetric !== 'temperature' && activeMetric !== 'all',
      },
      {
        label: 'Heart Rate (BPM)',
        data: chartData.map(item => item.heart_rate),
        borderColor: '#007bff',
        backgroundColor: heartGradient,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#007bff',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        hidden: activeMetric !== 'heart_rate' && activeMetric !== 'all',
      },
      {
        label: 'Humidity (%)',
        data: chartData.map(item => item.humidity),
        borderColor: '#28a745',
        backgroundColor: humidGradient,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#28a745',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        hidden: activeMetric !== 'humidity' && activeMetric !== 'all',
      }
    ];

    return { labels, datasets };
  };

  // Fix chart options with proper TypeScript typing for Chart.js v3+
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)',
        },
        border: {
          display: false // Use border property instead of drawBorder
        },
        ticks: {
          font: {
            size: 11
          },
          padding: 10,
          color: '#666'
        }
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false // Use border property instead of drawBorder
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          font: {
            size: 11
          },
          padding: 10,
          color: '#666'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255,255,255,0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(tooltipItems) {
            // Fix: Safe timestamp access with proper indexing
            try {
              if (tooltipItems.length > 0) {
                const index = tooltipItems[0].dataIndex;
                // For reversed data, we need to calculate the correct index
                const chartData = [...healthData].reverse().slice(0, 30);
                if (index >= 0 && index < chartData.length) {
                  const timestamp = chartData[index].timestamp;
                  const date = new Date(timestamp);
                  if (!isNaN(date.getTime())) {
                    return `Time: ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                  }
                }
              }
            } catch (err) {
              console.error('Error formatting tooltip title:', err);
            }
            return 'Time: Unknown';
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Temperature')) {
                label += context.parsed.y + '°C';
              } else if (label.includes('Heart')) {
                label += context.parsed.y + ' BPM';
              } else {
                label += context.parsed.y + '%';
              }
            }
            return label;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    // Fix: Enhanced chart animation for smoother rendering
    animations: {
      tension: {
        duration: 1000,
        easing: 'easeOutQuad',
        from: 0.2,
        to: 0.4,
        loop: false
      }
    },
    elements: {
      line: {
        borderJoinStyle: 'round'
      },
      point: {
        hitRadius: 10
      }
    }
  };

  // Keep only CSV export function, remove PDF export
  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ['Timestamp', 'Temperature (°C)', 'Heart Rate (BPM)', 'Humidity (%)'];
      const csvData = healthData.map(item => [
        formatTime(item.timestamp),
        item.temperature,
        item.heart_rate,
        item.humidity
      ]);
      
      let csvContent = headers.join(',') + '\n' + 
        csvData.map(row => row.join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'health-data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export error:', err);
      alert('Error exporting CSV. Please try again.');
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
            
            {/* Table/Logs FIRST */}
            <div className={styles.tableContainer}>
              <div className={styles.tableHeader}>
                <h3>Logs</h3>
                <button className={`${styles.exportButton} ${styles.csvButton}`} onClick={exportToCSV}>
                  Export CSV
                </button>
              </div>
              
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th className={styles.timeColumn}>Timestamp</th>
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
            
            {/* Graph SECOND */}
            <div className={styles.graphSection}>
              <div className={styles.graphHeader}>
                <div className={styles.graphTitle}>Live Health Data Trends</div>
              </div>
              
              <div className={styles.metricTabs}>
                <button 
                  className={`${styles.metricTab} ${activeMetric === 'all' ? styles.activeMetricTab : ''}`}
                  onClick={() => setActiveMetric('all')}
                >
                  All Metrics
                </button>
                <button 
                  className={`${styles.metricTab} ${activeMetric === 'temperature' ? styles.activeMetricTab : ''}`}
                  onClick={() => setActiveMetric('temperature')}
                >
                  Temperature
                </button>
                <button 
                  className={`${styles.metricTab} ${activeMetric === 'heart_rate' ? styles.activeMetricTab : ''}`}
                  onClick={() => setActiveMetric('heart_rate')}
                >
                  Heart Rate
                </button>
                <button 
                  className={`${styles.metricTab} ${activeMetric === 'humidity' ? styles.activeMetricTab : ''}`}
                  onClick={() => setActiveMetric('humidity')}
                >
                  Humidity
                </button>
              </div>
              
              <div className={styles.graphContainer}>
                {healthData.length > 0 ? (
                  <React.Suspense fallback={<div className={styles.loader}></div>}>
                    <Line
                      data={prepareChartData()}
                      options={chartOptions}
                      ref={chartRef}
                      redraw={false}
                    />
                  </React.Suspense>
                ) : (
                  <div className={styles.noDataMessage}>No data available to display</div>
                )}
              </div>

              {healthData.length > 0 && (
                <div className={styles.graphLegend}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{backgroundColor: '#dc3545'}}></div>
                    <span>Temperature (°C)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{backgroundColor: '#007bff'}}></div>
                    <span>Heart Rate (BPM)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{backgroundColor: '#28a745'}}></div>
                    <span>Humidity (%)</span>
                  </div>
                </div>
              )}
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
