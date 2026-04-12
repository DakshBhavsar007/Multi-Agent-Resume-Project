from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

print('--- Booting App ---')
response = client.get("/docs")
if response.status_code == 200:
    print('OpenAPI Swagger loads perfectly!')
else:
    print('Docs failed to load.')

print('--- Testing End To End Portal Parse Target ---')
try:
    # A dummy parse file request payload would usually require a file. 
    # For now we'll just check if the route is physically active and returns a 401/422 correctly, indicating it functions.
    res = client.post("/api/v1/parse")
    print(f"E2E Target Response Status Code: {res.status_code}")
except Exception as e:
    print(f"Error calling E2E route: {e}")
