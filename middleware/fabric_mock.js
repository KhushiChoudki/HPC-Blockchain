const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Keep track of internal fake fabric block height
let currentBlockHeight = 1200;

// Mock Fabric API Endpoint: GET /fabric/api/status
router.get('/status', (req, res) => {
    res.json({
        network_name: "hyperledger-fabric-testnet",
        active_peers: 3,
        current_block: currentBlockHeight
    });
});

// Mock Fabric API Endpoint: GET /fabric/api/blocks/:number
router.get('/blocks/:number', (req, res) => {
    const blockNumber = parseInt(req.params.number);

    // Simulate slight delay equivalent to internal networking
    setTimeout(() => {
        // Generate a deterministic hash based on block number
        const hashBase = `hlf_block_${blockNumber}_${Date.now()}`;
        const mockHash = crypto.createHash('sha256').update(hashBase).digest('hex');

        // Output format matching a simplified fabric block payload
        res.json({
            header: {
                number: blockNumber,
                previous_hash: crypto.createHash('sha256').update(`hlf_block_${blockNumber - 1}`).digest('hex'),
                data_hash: crypto.createHash('sha256').update(`data_${blockNumber}`).digest('hex')
            },
            data: {
                data: [
                    // Random number of transactions between 1 and 15
                    ...Array(Math.floor(Math.random() * 14) + 1).fill("tx_payload")
                ]
            },
            metadata: {
                // approximate timestamp in seconds
                timestamp: Math.floor(Date.now() / 1000) - (currentBlockHeight - blockNumber) * 2,
                gasUsed: Math.floor(Math.random() * 200000) + 50000 // Scaled up so it's visible on the shared linear chart alongside Polygon
            }
        });

        // Auto increment the live chain slowly
        if (Math.random() > 0.8) currentBlockHeight++;

    }, 50); // 50ms latency
});

module.exports = router;
