import React, { useState, useEffect } from 'react';
import {
    LineChart, Database, Zap, ShieldCheck,
    RefreshCcw, Layers, Cpu
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    AreaScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const App = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/data');
            const json = await response.json();
            setData(json.reverse()); // Show newest first
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const chartData = {
        labels: data.slice(0, 10).map(d => b.number).reverse(),
        datasets: [
            {
                label: 'Gas Usage (Gwei)',
                data: data.slice(0, 10).map(d => d.gasUsed).reverse(),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.5)',
                tension: 0.4,
            },
            {
                label: 'Transaction Count',
                data: data.slice(0, 10).map(d => d.tx_count).reverse(),
                borderColor: '#f472b6',
                backgroundColor: 'rgba(244, 114, 182, 0.5)',
                tension: 0.4,
            }
        ],
    };

    return (
        <div className="dashboard-container">
            <header className="header">
                <div>
                    <h1>HPC Blockchain Explorer</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Real-time Big Data Analytics via Apache Spark</p>
                </div>
                <button onClick={fetchData} className="glass-card" style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', display: 'flex', gap: '0.5rem' }}>
                    <RefreshCcw size={18} /> Sync Cluster
                </button>
            </header>

            <div className="stats-grid">
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Spark Nodes</p>
                        <Cpu size={20} className="accent" />
                    </div>
                    <h2>3 Active Nodes</h2>
                    <p style={{ color: '#22c55e', fontSize: '0.875rem' }}>Master + 2 Workers</p>
                </div>
                <div className="glass-card">
                    <p style={{ color: 'var(--text-secondary)' }}>Processed Blocks</p>
                    <h2>{data.length} Total</h2>
                </div>
                <div className="glass-card">
                    <p style={{ color: 'var(--text-secondary)' }}>Verification Engine</p>
                    <div className="verified-badge">
                        <ShieldCheck size={20} /> On-chain Proofing Active
                    </div>
                </div>
            </div>

            <div className="glass-card chart-container">
                <h3>Network Congestion & Throughput</h3>
                <Line data={chartData} options={{ maintainAspectRatio: false }} />
            </div>

            <div className="glass-card">
                <h3>Live Processing Feed</h3>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Block #</th>
                            <th>Gas Used</th>
                            <th>TX Count</th>
                            <th>On-chain Proof</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.number}</td>
                                <td>{item.gasUsed.toLocaleString()}</td>
                                <td>{item.tx_count}</td>
                                <td>
                                    <div className="verified-badge">
                                        <ShieldCheck size={14} /> {item.hash.substring(0, 16)}...
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default App;
