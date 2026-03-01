# HPC Blockchain Explorer

A high-performance computing pipeline designed to seamlessly ingest, process, and distribute real-time data across both public (Polygon) and private (Hyperledger Fabric) distributed ledgers.

## 🏗️ System Architecture

The project is built on a robust, fault-tolerant three-tier microservice architecture:

### 1. Distributed Data Ingestion \& Processing (PySpark)
The core computational heavy-lifting is performed by a **Dockerized Apache Spark Cluster**. 
- **Parallel Workloads:** PySpark translates sequential API queries into Resilient Distributed Dataset (RDD) map operations, parallelizing the ingestion workload across available containerized workers.
- **Decentralized Querying:** Simultaneously fetches data from EVM-compatible RPC nodes (Polygon Amoy) and Fabric REST gateways (Hyperledger).

### 2. Middleware Gateway (Node.js / Express)
A centralized backend server that bridges the isolated Docker network with external data consumption APIs.
- **Deduplication:** Aggregates and dynamically deduplicates incoming cryptographic blocks using chronological timestamps and composite keys (`chain_type` + `block_number`).
- **Data Store:** Maintains a persistently updated JSON data store (`blockchain_data.json`) for downstream distribution.
- **Simulation:** Features a built-in `/simulate` endpoint capable of generating deterministic deterministic mock payloads for localized UI testing.

### 3. Analytics and Visualization (React.js)
A dynamic, real-time Front-End Dashboard configured natively with Vite.
- **Multi-Chain Stream:** A live DOM component mapping the unified dataset chronologically with custom categorical tags.
- **Distributed Charting:** Utilizes `Chart.js` to render independent, stacked Line Charts for Gas/Throughput metrics across independent networks on a shared timezone axis.

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python (3.9+)
- Java 11 (for local PySpark execution)

### Installation & Setup

#### 1. Middleware Backend
```bash
cd middleware
npm install
npm run dev
```

#### 2. React Dashboard
```bash
cd blockchain-dashboard
npm install
npm run dev
```

#### 3. Spark Ingestion Cluster
Ensure Docker is running, then start the containerized Spark cluster:
```bash
# From the project root
docker-compose up -d
```
You can trigger the ingestion pipeline either via the **"Sync Pipeline"** button on the React dashboard or by manually executing the PySpark script:
```bash
docker exec spark-master /opt/spark/bin/spark-submit /opt/spark/work-dir/blockchain_ingestion.py
```

## 🛠️ Built With
* **Apache Spark / PySpark** - Distributed Data Processing
* **Node.js & Express** - Middleware Gateway
* **React & Vite** - Frontend User Interface
* **Chart.js** - Multi-Chain Analytics Visualization
* **Docker** - Container Orchestration
