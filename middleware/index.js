const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Import the mock fabric framework router
const fabricMock = require('./fabric_mock');
app.use('/fabric', fabricMock);

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const DATA_FILE = path.join(__dirname, 'blockchain_data.json');

// Mock Blockchain setup (for rapid demo)
// Uses ENV for RPC or defaults to local
const RPC_PROVIDER = process.env.PRIVATE_RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC_PROVIDER);

// Root route to show API status
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 2rem;">
            <h1>🚀 HPC Blockchain Middleware is Running</h1>
            <p>Status: <strong>Online</strong></p>
            <ul>
                <li><strong>Data Feed:</strong> <a href="/data">/data</a></li>
                <li><strong>Ingestion:</strong> /ingest (POST)</li>
                <li><strong>Sync Control:</strong> /sync (POST)</li>
            </ul>
        </div>
    `);
});

// Helper to save data
const saveToLocalDB = (data) => {
    let currentData = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            currentData = JSON.parse(fs.readFileSync(DATA_FILE));
        } catch (e) {
            console.error("Error parsing DB file, resetting.");
            currentData = [];
        }
    }
    // Enhanced deduplication: merge existing and incoming data
    // Map by `${chain}_${number}` to ensure absolute uniqueness across chains
    const mergedData = [...currentData, ...data];
    const uniqueMap = new Map();
    mergedData.forEach(item => uniqueMap.set(`${item.chain}_${item.number}`, item));
    currentData = Array.from(uniqueMap.values());
    currentData.sort((a, b) => b.timestamp - a.timestamp); // Sort by time instead of just block number for multi-chain

    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
};

// ENDPOINT: Receive data from Spark
app.post('/ingest', async (req, res) => {
    const blockchainData = req.body;
    console.log(`Received ${blockchainData.length} records from Spark.`);

    try {
        saveToLocalDB(blockchainData);
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(blockchainData)));
        console.log(`Data Verified. Hash: ${dataHash}`);

        res.status(200).json({
            message: "Data stored and verified",
            hash: dataHash,
            count: blockchainData.length
        });
    } catch (error) {
        console.error("Ingestion failed:", error);
        res.status(500).json({ error: "Failed to process data" });
    }
});

// ENDPOINT: Get data for dashboard
app.get('/data', (req, res) => {
    let data = [];
    if (fs.existsSync(DATA_FILE)) {
        try { data = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { }
    }

    // Calculate node statistics dynamically based on the chains present in recent data
    const chainsPresent = new Set(data.slice(0, 50).map(d => d.chain));
    const activeNodes = {
        polygon: chainsPresent.has('polygon') ? 2 : 0, // Assuming 2 polygon workers
        hyperledger: chainsPresent.has('hyperledger') ? 1 : 0 // Assuming 1 hyperledger gateway
    };

    res.json({
        blocks: data,
        nodes: activeNodes
    });
});

// ENDPOINT: Trigger Spark Processing (The "Sync" button)
app.post('/sync', (req, res) => {
    console.log("Triggering Spark Ingestion Job via CLI...");
    const command = `docker exec spark-master /opt/spark/bin/spark-submit /opt/spark/work-dir/blockchain_ingestion.py`;

    exec(command, (error, stdout, stderr) => {
        if (error) console.error(`Spark Job Error: ${error}`);
        if (stdout) console.log("Spark Job Output:", stdout);
    });

    res.json({ message: "Spark job triggered. Check dashboard in 10s." });
});

app.get('/sync', (req, res) => {
    res.redirect('/'); // Redirect browser visitors back to status page
});

app.post('/reset', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        fs.unlinkSync(DATA_FILE);
    }
    res.json({ message: "Database reset" });
});

// NEW: Simulation endpoint to ensure the UI ALWAYS moves
app.post('/simulate', (req, res) => {
    let currentData = [];
    if (fs.existsSync(DATA_FILE)) {
        try { currentData = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { currentData = []; }
    }

    const lastBlock = currentData.length > 0 ? Math.max(...currentData.map(d => d.number)) : 34599700;
    const newBlocks = [];

    // Generate 5 new "Live" blocks
    for (let i = 1; i <= 5; i++) {
        const isFabric = Math.random() > 0.6;
        newBlocks.push({
            number: lastBlock + i,
            timestamp: Math.floor(Date.now() / 1000),
            gasUsed: Math.floor(Math.random() * (isFabric ? 200000 : 500000)) + (isFabric ? 50000 : 0),
            hash: "0x" + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
            tx_count: Math.floor(Math.random() * 50),
            chain: isFabric ? "hyperledger" : "polygon",
            type: "SIMULATED"
        });
    }

    saveToLocalDB(newBlocks);
    console.log(`Simulated ${newBlocks.length} new blocks.`);
    res.json({ message: "Simulated blocks added", count: newBlocks.length });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Middleware live at http://localhost:${PORT}`);
});
