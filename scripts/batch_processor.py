#!/usr/bin/env python3
"""
Simple File Data Mapper and Sender
Reads measurement files from directory and sends mapped data to server.
Usage: python file_mapper.py --config mapping_config.json --device-id DEVICE001 --data-dir ./data
"""

import argparse
import json
import sys
import requests
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

class FileDataMapper:
    def __init__(self, config: Dict[str, Any], data_dir: str):
        self.config = config
        self.device_id = config.get('deviceId')
        self.data_dir = Path(data_dir)
        self.included_files = config.get('included_files', [])
        self.server_config = config.get('server', {})
        self.phenomenon_id = config.get('phenomenomId')
        
    def read_file_data(self, file_path: Path) -> List[float]:
        """Read numerical data from file, one value per line"""
        try:
            if not file_path.exists():
                print(f"⚠ File not found: {file_path}")
                return []
            
            values = []
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:  # Skip empty lines
                        continue
                    
                    try:
                        # Try to convert to float
                        value = float(line)
                        values.append(value)
                    except ValueError:
                        print(f"⚠ Invalid number at line {line_num} in {file_path.name}: '{line}'")
                        continue
            
            print(f"✓ Read {len(values)} values from {file_path.name}")
            return values
            
        except Exception as e:
            print(f"✗ Error reading file {file_path}: {e}")
            return []
    
    def map_files_to_channels(self) -> Dict[str, List[float]]:
        """Map files to measurement channels based on included_files list"""
        channel_data = {}
        
        if not self.data_dir.exists():
            print(f"✗ Data directory not found: {self.data_dir}")
            return {}
        
        for filename in self.included_files:
            file_path = self.data_dir / filename
            
            # Use filename without extension as channel name
            channel_name = file_path.stem
            
            print(f"📁 Reading channel '{channel_name}' from file: {filename}")
            values = self.read_file_data(file_path)
            
            if values:
                channel_data[channel_name] = values
            else:
                print(f"⚠ No valid data for channel: {channel_name}")
        
        return channel_data
    
    def create_measurement_payload(self, channel_data: Dict[str, List[float]]) -> Dict[str, Any]:
        """Create measurement payload in required format"""
        payload = {
            "phenomenomId": self.phenomenon_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": channel_data
        }
        
        return payload
    
    def send_to_server(self, payload: Dict[str, Any]) -> bool:
        """Send measurement data to server"""
        try:
            url = self.server_config.get('url')
            if not url:
                print("✗ No server URL configured")
                return False
            
            headers = {
                'Content-Type': 'application/json'
            }
            
            print(f"🌐 Sending data to: {url}")
            # print(f"📄 Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ Data sent successfully! Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if response_data:
                        print(f"📥 Server response: {json.dumps(response_data, indent=2)}")
                except:
                    pass
                return True
            else:
                print(f"✗ Server error: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            print(f"✗ Cannot connect to server")
            return False
        except requests.exceptions.Timeout:
            print(f"✗ Request timed out")
            return False
        except Exception as e:
            print(f"✗ Error sending data: {e}")
            return False
    
    def process_and_send(self) -> bool:
        """Main processing: read files, map data, send to server"""
        print(f"🔧 Processing files for device: {self.device_id}")
        print(f"📁 Data directory: {self.data_dir}")
        print(f"📋 Files to include: {', '.join(self.included_files)}")
        print(f"🎯 Phenomenon ID: {self.phenomenon_id if self.phenomenon_id else 'null'}")
        
        # Read and map file data
        channel_data = self.map_files_to_channels()
        
        if not channel_data:
            print("✗ No valid channel data found")
            return False
        
        # Create payload
        payload = self.create_measurement_payload(channel_data)
        
        # Send to server
        return self.send_to_server(payload)

def load_config(config_path: str) -> Dict[str, Any]:
    """Load mapping configuration from JSON file"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        print(f"✓ Config loaded from {config_path}")
        return config
    except FileNotFoundError:
        print(f"✗ Config file not found: {config_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON in config file: {e}")
        sys.exit(1)

def create_sample_config(filename: str = "mapping_config.json"):
    """Create sample mapping configuration"""
    sample_config = {
        "deviceId": "DEVICE001",
        "phenomenomId": 12345,
        "included_files": [
            "idc.dat",
            "acc_x.dat", 
            "acc_y.dat",
            "temperature.dat"
        ],
        "server": {
            "url": "https://your-server.com/api/measurements"
        }
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"✓ Sample mapping config created: {filename}")
    print("📝 Edit the config file with your server details")
    
    # Also create sample data files
    sample_data_dir = Path("sample_data")
    sample_data_dir.mkdir(exist_ok=True)
    
    # Create sample idc.dat file like in the example
    sample_idc_data = [
        "1041245004",
        "1040017923", 
        "1040621906",
        "1039083277"
    ]
    
    with open("sample_data/idc.dat", 'w') as f:
        f.write('\n'.join(sample_idc_data))
    
    # Create sample acc files
    with open("sample_data/acc_x.dat", 'w') as f:
        f.write('\n'.join(["105", "104", "103"]))
    
    with open("sample_data/acc_y.dat", 'w') as f:
        f.write('\n'.join(["95", "94", "93"]))
        
    with open("sample_data/temperature.dat", 'w') as f:
        f.write("26")
    
    print("✓ Sample data files created in ./sample_data/ directory")
    print("Usage: python file_mapper.py --config mapping_config.json --data-dir ./sample_data")

def create_null_phenomenon_config(filename: str = "mapping_config_null.json"):
    """Create config with null phenomenomId"""
    config = {
        "deviceId": "SENSOR001", 
        "phenomenomId": None,
        "included_files": [
            "sensor.dat"
        ],
        "server": {
            "url": "https://your-server.com/api/measurements"
        }
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
    
    print(f"✓ Null phenomenon config created: {filename}")

def main():
    parser = argparse.ArgumentParser(
        description="Map file data to channels and send to server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --config mapping_config.json --data-dir ./data
  %(prog)s --config mapping_config.json --data-dir /path/to/measurements
  %(prog)s --create-sample-config
        """
    )
    
    parser.add_argument(
        "--config",
        required=False,
        help="Path to mapping configuration JSON file"
    )
    
    parser.add_argument(
        "--data-dir",
        required=False,
        help="Directory containing measurement data files"
    )
    
    parser.add_argument(
        "--create-sample-config",
        action="store_true", 
        help="Create sample configuration file and exit"
    )
    
    parser.add_argument(
        "--create-null-config",
        action="store_true",
        help="Create config with null phenomenomId and exit"
    )
    
    args = parser.parse_args()
    
    if args.create_sample_config:
        create_sample_config()
        return 0
    
    if args.create_null_config:
        create_null_phenomenon_config()
        return 0
    
    if not all([args.config, args.data_dir]):
        print("✗ Missing required arguments: --config and --data-dir")
        parser.print_help()
        return 1
    
    try:
        # Load configuration
        config = load_config(args.config)
        
        # Create mapper
        mapper = FileDataMapper(config, args.data_dir)
        
        # Process and send
        success = mapper.process_and_send()
        return 0 if success else 1
        
    except Exception as e:
        print(f"✗ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())