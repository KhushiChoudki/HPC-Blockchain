import urllib.request
import json
RPC_URL = "https://rpc-amoy.polygon.technology"
try:
    latest_block_payload = {"jsonrpc": "2.0", "method": "eth_blockNumber", "id": 1}
    data = json.dumps(latest_block_payload).encode('utf-8')
    req = urllib.request.Request(RPC_URL, data=data, headers={
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    })
    with urllib.request.urlopen(req, timeout=15) as response:
        res_body = response.read().decode('utf-8')
        print("LATEST:", res_body)
except Exception as e:
    print(e)
