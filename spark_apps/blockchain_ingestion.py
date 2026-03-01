import sys
import traceback
import json
import os
import urllib.request

# Configuration (defaults provided if env not set)
RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "https://rpc-amoy.polygon.technology")
MIDDLEWARE_URL = "http://host.docker.internal:3001/ingest"

def get_polygon_block(block_number):
    try:
        payload = {
            "jsonrpc": "2.0", "method": "eth_getBlockByNumber",
            "params": [hex(block_number), True], "id": 1
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(RPC_URL, data=data, headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            b = json.loads(res_body).get('result')
            if not b: return None
            return {
                "chain": "polygon",
                "number": int(b['number'], 16),
                "timestamp": int(b['timestamp'], 16),
                "gasUsed": int(b['gasUsed'], 16),
                "hash": b['hash'],
                "tx_count": len(b['transactions']) if 'transactions' in b else 0
            }
    except Exception as e:
        print(f"Error fetching polygon block {block_number}: {e}")
        return None

def get_fabric_block(block_number):
    try:
        req = urllib.request.Request(f"http://host.docker.internal:3001/fabric/blocks/{block_number}", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            b = json.loads(response.read().decode('utf-8'))
            return {
                "chain": "hyperledger",
                "number": b['header']['number'],
                "timestamp": b['metadata']['timestamp'],
                "gasUsed": b['metadata']['gasUsed'],
                "hash": b['header']['data_hash'],
                "tx_count": len(b['data']['data'])
            }
    except Exception as e:
        print(f"Error fetching fabric block {block_number}: {e}")
        return None

def main():
    print(f"Connecting to RPC: {RPC_URL}")
    # Initialize Spark
    from pyspark.sql import SparkSession
    spark = SparkSession.builder \
        .appName("BlockchainIngress") \
        .master("spark://spark-master:7077") \
        .getOrCreate()
    
    try:
        latest_block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "id": 1}
        data = json.dumps(latest_block_payload).encode('utf-8')
        req = urllib.request.Request(RPC_URL, data=data, headers={
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        })
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode('utf-8')
            latest_block_hex = json.loads(res_body).get('result')
            latest_polygon_block = int(latest_block_hex, 16)
            print(f"Latest Polygon Block: {latest_polygon_block}")
    except Exception as e:
        print(f"Failed to get latest block: {e}")
        spark.stop()
        return

    # Get Fabric latest block from Mock API
    latest_fabric_block = 1200
    try:
        req = urllib.request.Request("http://host.docker.internal:3001/fabric/status", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode('utf-8'))
            latest_fabric_block = res_body['current_block']
            print(f"Latest Fabric Block: {latest_fabric_block}")
    except Exception as e:
        print(f"Mock Fabric API unreachable, defaulting to block {latest_fabric_block}")

    # Create task payloads: (chain_type, block_number)
    polygon_tasks = [("polygon", b) for b in range(latest_polygon_block - 10, latest_polygon_block + 1)]
    fabric_tasks = [("hyperledger", b) for b in range(latest_fabric_block - 10, latest_fabric_block + 1)]
    all_tasks = polygon_tasks + fabric_tasks
    
    rdd = spark.sparkContext.parallelize(all_tasks)
    
    def process_block_task(task):
        chain, num = task
        if chain == "polygon": return get_polygon_block(num)
        if chain == "hyperledger": return get_fabric_block(num)
        return None

    # Fetch blocks over the distributed worker nodes
    blocks_data = rdd.map(process_block_task).filter(lambda x: x is not None).collect()
    
    print(f"Processing {len(blocks_data)} multi-chain blocks...")

    # PUSH to Middleware via urllib
    try:
        print(f"Streaming data to: {MIDDLEWARE_URL}")
        data = json.dumps(blocks_data).encode('utf-8')
        req = urllib.request.Request(MIDDLEWARE_URL, data=data, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as response:
            print(f"Ingestion Sync Status: {response.getcode()}")
    except Exception as e:
        print(f"Failed to stream to middleware: {e}")

    spark.stop()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        sys.exit(1)
