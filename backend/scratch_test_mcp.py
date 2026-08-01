import requests

def test_mcp():
    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {
            "name": "search_restaurants",
            "arguments": {
                "addressId": "addr_123",
                "query": "pizza"
            }
        },
        "id": 1
    }
    try:
        r = requests.post("https://mcp.swiggy.com/food", json=payload, headers={"Content-Type": "application/json"})
        print(f"Status: {r.status_code}")
        print(r.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_mcp()
