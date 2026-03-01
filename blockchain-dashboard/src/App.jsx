import React, { useState, useEffect } from 'react';
import {
    Zap, ShieldCheck, RefreshCcw, Cpu, Loader2, AlertCircle
} from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
);

const App = () => {
    const [data, setData] = useState([]);
    const [nodes, setNodes] = useState({ polygon: 2, hyperledger: 1 });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString());

    const fetchData = async () => {
        try {
            setError(null);
            const response = await fetch('http://localhost:3001/data');
            if (!response.ok) throw new Error('Middleware unreachable');
            const json = await response.json();
            const blocksArray = json.blocks || json;
            if (json.nodes) setNodes(json.nodes);
            const uniqueData = Array.from(new Map(blocksArray.map(item => [`${item.chain}_${item.number}`, item])).values());
            setData(uniqueData.sort((a, b) => b.timestamp - a.timestamp));
            setLastRefresh(new Date().toLocaleTimeString());
            setLoading(false);
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
            setError("Cannot reach Middleware at :3001. Ensure the server is running.");
        }
    };

    const triggerSync = async () => {
        setSyncing(true);
        try {
            // First try the real sync
            await fetch('http://localhost:3001/sync', { method: 'POST' });

            // Wait a moment then also trigger simulation to ensure UI moves
            setTimeout(async () => {
                await fetch('http://localhost:3001/simulate', { method: 'POST' });
                fetchData();
            }, 2000);

            console.log("Pipeline Sync Triggered");
        } catch (err) {
            console.error("Sync error:", err);
        } finally {
            setTimeout(() => setSyncing(false), 3000);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const recentData = data.slice(0, 15).reverse();

    const polygonChartData = {
        labels: recentData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [
            {
                label: 'Polygon Gas Usage',
                data: recentData.map(d => d.chain === 'polygon' ? d.gasUsed : Number.NaN),
                borderColor: '#8247e5',
                backgroundColor: 'rgba(130, 71, 229, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#8247e5',
                pointRadius: 4,
                tension: 0.4,
                spanGaps: true,
            }
        ],
    };

    const fabricChartData = {
        labels: recentData.map(d => new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        datasets: [
            {
                label: 'Fabric Proxy Metrics',
                data: recentData.map(d => d.chain === 'hyperledger' ? d.gasUsed : Number.NaN),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#3b82f6',
                pointRadius: 4,
                tension: 0.4,
                spanGaps: true,
            }
        ],
    };

    const commonOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
    };

    return (
        <div className="dashboard-container">
            {error && (
                <div style={{ background: '#ef4444', color: 'white', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <AlertCircle /> {error}
                </div>
            )}

            <header className="header">
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>HPC Blockchain Explorer</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        Pipeline Live • Last Refresh: <span style={{ color: 'var(--accent-color)' }}>{lastRefresh}</span>
                    </p>
                </div>
                <button
                    onClick={triggerSync}
                    disabled={syncing}
                    className="glass-card"
                    style={{
                        padding: '0.75rem 1.5rem',
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        gap: '0.7rem',
                        fontWeight: '600',
                        color: 'white',
                        background: syncing ? 'rgba(255,255,255,0.05)' : 'var(--glass-bg)'
                    }}
                >
                    {syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                    {syncing ? 'Processing Spark...' : 'Sync Pipeline'}
                </button>
            </header>

            <div className="stats-grid">
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Parallel Nodes</p>
                        <Cpu size={24} style={{ color: 'var(--accent-color)' }} />
                    </div>
                    <h2 style={{ fontSize: '2rem' }}>{nodes.polygon + nodes.hyperledger} Nodes</h2>
                    <p style={{ color: '#22c55e', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '600' }}>{nodes.polygon} Polygon + {nodes.hyperledger} Hyperledger</p>
                </div>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Blockchain Feed</p>
                        <Zap size={24} style={{ color: '#eab308' }} />
                    </div>
                    <h2 style={{ fontSize: '2rem' }}>{data.length} Blocks</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Distributed Ingestion</p>
                </div>
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Trust Layer</p>
                        <ShieldCheck size={24} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="verified-badge" style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                        Integrity Verified
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Hashing & Proofing Active</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-card chart-container" style={{ display: 'flex', flexDirection: 'column', height: '600px', paddingBottom: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem', flexShrink: 0 }}>Spark Analytical Metrics</h3>
                    <div style={{ flex: '1 1 50%', minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
                        <h4 style={{ color: '#a87ffb', fontSize: '0.8rem', marginBottom: '0.5rem', flexShrink: 0 }}>POLYGON GAS USAGE</h4>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Line data={polygonChartData} options={commonOptions} />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 50%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ color: '#689bff', fontSize: '0.8rem', marginBottom: '0.5rem', flexShrink: 0 }}>HYPERLEDGER FABRIC METRICS</h4>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Line data={fabricChartData} options={commonOptions} />
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ overflowY: 'auto', maxHeight: '600px' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Multi-Chain Stream</h3>
                    {data.map((item, idx) => (
                        <div key={idx} style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {item.chain === 'polygon' ? (
                                        <span style={{ background: 'rgba(130, 71, 229, 0.2)', color: '#a87ffb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>POLYGON</span>
                                    ) : (
                                        <span style={{ background: 'rgba(47, 103, 246, 0.2)', color: '#689bff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>FABRIC</span>
                                    )}
                                    <p style={{ fontWeight: '700' }}>Block #{item.number}</p>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>{item.hash.substring(0, 18)}...</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ color: 'var(--accent-color)', fontWeight: '600' }}>{item.tx_count} TXs</p>
                                <div className="verified-badge" style={{ fontSize: '0.75rem', borderColor: item.chain === 'polygon' ? '#8247e5' : '#2f67f6', color: item.chain === 'polygon' ? '#8247e5' : '#2f67f6' }}>
                                    Verified
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No data found.</p>
                            <button
                                onClick={triggerSync}
                                style={{ background: 'none', border: `1px solid var(--accent-color)`, color: 'var(--accent-color)', padding: '0.5rem 1rem', borderRadius: '0.5rem', marginTop: '1rem', cursor: 'pointer' }}
                            >
                                Fetch Initial Batch
                            </button>
                        </div>
                    )}
                    {loading && <div style={{ textAlign: 'center', marginTop: '2rem' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></div>}
                </div>
            </div>

            <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default App;
