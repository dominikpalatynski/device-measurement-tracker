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
        self.base_url = base_url or "https://your-api-server.com"
        self.register_endpoint = f"{self.base_url}/api/device/register"
    
    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        try:
            config_file = Path(config_path)
            if not config_file.exists():
                raise FileNotFoundError(f"Config file not found: {config_path}")
            
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            print(f"✓ Config loaded from {config_path}")
            return config
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config file: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to load config: {e}")
    
    def register_device(self, token: str, device_id: str, config: Dict[str, Any]) -> bool:
        """Register device with the server."""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "deviceId": device_id,
            "config": config
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

def create_sample_config(filename: str = "init_config.json"):
    """Create a sample configuration file."""
    sample_config = {
        "name": "Sample Device",
        "type": "sensor",
        "location": "Office",
        "settings": {
            "interval": 30,
            "enabled": True,
            "debug_mode": False
        },
        "capabilities": [
            "temperature",
            "humidity",
            "pressure"
        ]
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"✓ Sample config created: {filename}")

def main():
    parser = argparse.ArgumentParser(
        description="Register device with server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --token abc123xyz --config init_config.json --device-id mydevice001
  %(prog)s --token $API_TOKEN --config /path/to/config.json --device-id sensor-01 --url https://api.example.com
  %(prog)s --create-sample-config
        """
    )
    
    parser.add_argument(
        "--token", 
        required=False,
        help="API access token for authentication"
    )
    
    parser.add_argument(
        "--config", 
        required=False,
        help="Path to configuration JSON file"
    )
    
    parser.add_argument(
        "--device-id", 
        required=False,
        help="Unique device identifier"
    )
    
    parser.add_argument(
        "--url", 
        default="https://your-api-server.com",
        help="Base URL of the API server (default: https://your-api-server.com)"
    )
    
    parser.add_argument(
        "--create-sample-config",
        action="store_true",
        help="Create a sample configuration file and exit"
    )
    
    args = parser.parse_args()
    
    # Handle sample config creation
    if args.create_sample_config:
        create_sample_config()
        return 0
    
    # Validate required arguments
    if not all([args.token, args.config, args.device_id]):
        print("✗ Missing required arguments")
        parser.print_help()
        return 1
    
    try:
        # Initialize registrar
        registrar = DeviceRegistrar(args.url)
        
        # Load config
        config = registrar.load_config(args.config)
        
        # Register device
        success = registrar.register_device(args.token, args.device_id, config)
        
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