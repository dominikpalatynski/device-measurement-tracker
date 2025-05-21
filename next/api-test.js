// This is a simple script to test API connectivity
// Run with: node api-test.js

const API_URL = 'http://localhost:8080/api';
const DEVICE_UUID = 'test-device-001';

async function testApi() {
  try {
    console.log('Testing API connection...');
    console.log(`API URL: ${API_URL}`);

    // Test the echo endpoint first (simplest)
    const echoUrl = `${API_URL}/measurement/echo?message=TestFromNodeScript`;
    console.log(`\nTesting echo endpoint: ${echoUrl}`);
    
    const echoResponse = await fetch(echoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Echo status: ${echoResponse.status} ${echoResponse.statusText}`);
    
    if (echoResponse.ok) {
      const echoData = await echoResponse.json();
      console.log('Echo response data:', echoData);
    } else {
      console.error('Echo request failed');
    }

    // Test the latest endpoint
    const latestUrl = `${API_URL}/measurement/latest?deviceUuid=${DEVICE_UUID}`;
    console.log(`\nTesting latest endpoint: ${latestUrl}`);
    
    const latestResponse = await fetch(latestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Latest status: ${latestResponse.status} ${latestResponse.statusText}`);
    
    if (latestResponse.ok) {
      const text = await latestResponse.text();
      console.log('Raw response:', text);
      
      try {
        const latestData = JSON.parse(text);
        console.log('Latest response data:', latestData);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        console.log('Invalid JSON response received');
      }
    } else {
      console.error('Latest request failed');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testApi();
