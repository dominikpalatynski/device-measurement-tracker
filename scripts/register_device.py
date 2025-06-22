#!/usr/bin/env python3
"""
Device Registration Script
Registers device with server using token and config file.
Usage: python register_device.py --token <TOKEN> --config <CONFIG_FILE> --device-id <DEVICE_ID>
"""

import argparse
import json
import sys
import requests
from pathlib import Path
from typing import Dict, Any

class DeviceRegistrar:
    def __init__(self, base_url: str = None):
        self.base_url = "http://localhost:8080"
        self.register_endpoint = f"{self.base_url}/api/device-register/register"
    
    def register_device(self, token: str, device_id: str) -> bool:
        """Register device with the server."""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "deviceId": device_id,
        }
        
        try:
            print(f"Registering device {device_id}...")
            print(f"Endpoint: {self.register_endpoint}")
            
            response = requests.post(
                self.register_endpoint,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            # Handle response
            if response.status_code == 200 or response.status_code == 201:
                print(f"✓ Device {device_id} registered successfully!")
                try:
                    response_data = response.json()
                    if response_data:
                        print(f"Server response: {json.dumps(response_data, indent=2)}")
                        return response_data.get('data.success')
                except:
                    print("Server returned success without JSON response")
                return True
            
            elif response.status_code == 401:
                print(f"✗ Authentication failed - check your token")
                return False
            
            elif response.status_code == 400:
                print(f"✗ Bad request - check your device ID and config format")
                try:
                    error_details = response.json()
                    print(f"Error details: {json.dumps(error_details, indent=2)}")
                except:
                    print(f"Response: {response.text}")
                return False
            
            else:
                print(f"✗ Registration failed with status {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"✗ Cannot connect to server at {self.base_url}")
            print("Check if the server URL is correct and server is running")
            return False
        
        except requests.exceptions.Timeout:
            print(f"✗ Request timed out")
            return False
        
        except Exception as e:
            print(f"✗ Unexpected error during registration: {e}")
            return False

def main():
    parser = argparse.ArgumentParser(
        description="Register device with server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --token abc123xyz --config init_config.json --device-id mydevice001
  %(prog)s --token $API_TOKEN --config /path/to/config.json --device-id sensor-01 --url https://api.example.com
        """
    )
    
    parser.add_argument(
        "--token", 
        required=False,
        help="API access token for authentication"
    )
    
    parser.add_argument(
        "--device-id", 
        required=False,
        help="Unique device identifier"
    )
    
    args = parser.parse_args()
    
    
    if not all([args.token, args.device_id]):
        print("✗ Missing required arguments")
        parser.print_help()
        return 1
    
    try:
        # Initialize registrar
        registrar = DeviceRegistrar()
        
        
        # Register device
        success = registrar.register_device(args.token, args.device_id)
        
        if success:
            print(f"\n🎉 Registration complete! Device should now be visible in web panel.")
            return 0
        else:
            print(f"\n💥 Registration failed. Check the errors above.")
            return 1
            
    except Exception as e:
        print(f"✗ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())