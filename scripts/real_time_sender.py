#!/usr/bin/env python3
"""
Basic MQTT Data Sender for IoT Devices
Simple mechanism to send data to MQTT broker for server consumption.
Usage: python mqtt_sender.py --device-id DEVICE001 --config mqtt_config.json
"""

import argparse
import json
import time
import sys
from datetime import datetime, timezone
from typing import Dict, Any
import paho.mqtt.client as mqtt

class MQTTDataSender:
    def __init__(self, device_id: str, mqtt_config: Dict[str, Any]):
        self.device_id = device_id
        self.mqtt_config = mqtt_config
        self.client = None
        self.running = False
        self.message_count = 0
        
    def setup_mqtt(self) -> bool:
        """Setup MQTT connection"""
        try:
            self.client = mqtt.Client(client_id=f"device_{self.device_id}")
            
            # Setup callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_publish = self._on_publish
            
            # Authentication if configured
            if self.mqtt_config.get('username'):
                self.client.username_pw_set(
                    self.mqtt_config['username'],
                    self.mqtt_config.get('password', '')
                )
            
            # Connect
            host = self.mqtt_config.get('host', 'localhost')
            port = self.mqtt_config.get('port', 1883)
            
            print(f"🔌 Connecting to MQTT broker at {host}:{port}...")
            self.client.connect(host, port, 60)
            self.client.loop_start()
            
            return True
            
        except Exception as e:
            print(f"✗ Failed to setup MQTT: {e}")
            return False
    
    def _on_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            print(f"✓ Connected to MQTT broker")
        else:
            print(f"✗ Failed to connect to MQTT broker: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        if rc != 0:
            print(f"⚠ Unexpected disconnection from MQTT broker: {rc}")
    
    def _on_publish(self, client, userdata, mid):
        """MQTT publish callback"""
        pass
    
    def generate_raw_data(self) -> Dict[str, Any]:
        """Generate raw data - server will decode based on device config"""
        self.message_count += 1
        
        # Raw data format - minimal, server handles interpretation
        return {
            'deviceId': self.device_id,  # Only deviceId needed
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'sequenceNumber': self.message_count,
            'rawData': {
                # Simplified raw sensor values - server decodes based on init_config
                'sensor1': f"0x{self.message_count:04X}",  # Hex values like real sensors
                'sensor2': f"RAW_{self.message_count:03d}",
                'status': 0x01 if self.message_count % 2 == 0 else 0x00,
                'checksum': f"0x{(self.message_count * 17) % 256:02X}"
            }
        }
    
    def publish_data(self, data: Dict[str, Any]) -> bool:
        """Publish data to MQTT topic"""
        try:
            topic = f"device/{self.device_id}/raw"
            payload = json.dumps(data, ensure_ascii=False)
            
            print(f"📡 Publishing to topic: {topic}")
            print(f"📄 Payload: {payload}")
            
            result = self.client.publish(topic, payload, qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                seq_num = data.get('sequenceNumber', 'unknown')
                device_id = data.get('deviceId', 'unknown')
                print(f"✅ Message {seq_num} sent | Device: {device_id}")
                return True
            else:
                print(f"✗ Failed to publish message: {result.rc}")
                return False
                
        except Exception as e:
            print(f"✗ Error publishing data: {e}")
            return False
    
    def send_single_message(self, custom_data: Dict[str, Any] = None):
        """Send a single message and exit"""
        if not self.client or not self.client.is_connected():
            print("✗ MQTT not connected")
            return False
        
        data = custom_data if custom_data else self.generate_raw_data()
        return self.publish_data(data)
    
    def run_continuous_sending(self, interval: int = 10):
        """Send messages continuously with specified interval"""
        self.running = True
        print(f"🚀 Starting continuous data sending for device: {self.device_id}")
        print(f"⏱ Send interval: {interval} seconds")
        print(f"📋 Topic: sensors/{self.device_id}/raw")
        print("🔧 Server will decode rawData using device's init_config")
        print("Press Ctrl+C to stop\n")
        
        try:
            while self.running:
                if self.client and self.client.is_connected():
                    data = self.generate_raw_data()
                    self.publish_data(data)
                    print(f"⏳ Waiting {interval}s for next message...\n")
                else:
                    print("⚠ MQTT not connected, attempting to reconnect...")
                    time.sleep(5)
                    continue
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print(f"\n🛑 Stopping continuous sending...")
        except Exception as e:
            print(f"\n✗ Error during continuous sending: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the sender and disconnect"""
        self.running = False
        if self.client:
            print("🔌 Disconnecting from MQTT...")
            self.client.loop_stop()
            self.client.disconnect()
        print("✅ MQTT sender stopped")

def load_config(config_path: str) -> Dict[str, Any]:
    """Load MQTT configuration from JSON file"""
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

def create_sample_config(filename: str = "mqtt_config.json"):
    """Create sample MQTT configuration"""
    sample_config = {
        "host": "localhost",
        "port": 1883,
        "username": "",
        "password": "",
        "send_interval": 10,
        "qos": 1
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"✓ Sample MQTT config created: {filename}")
    print("📝 Edit the config file with your MQTT broker details")

def main():
    parser = argparse.ArgumentParser(
        description="Basic MQTT data sender for IoT devices",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --device-id SENSOR001 --config mqtt_config.json
  %(prog)s --device-id DEVICE123 --config mqtt_config.json --single
  %(prog)s --device-id TEST_DEVICE --config mqtt_config.json --interval 5
  %(prog)s --create-sample-config
        """
    )
    
    parser.add_argument(
        "--device-id",
        required=False,
        help="Unique device identifier"
    )
    
    parser.add_argument(
        "--config",
        required=False,
        help="Path to MQTT configuration JSON file"
    )
    
    parser.add_argument(
        "--single",
        action="store_true",
        help="Send single message and exit"
    )
    
    parser.add_argument(
        "--interval",
        type=int,
        default=10,
        help="Send interval in seconds for continuous mode (default: 10)"
    )
    
    parser.add_argument(
        "--create-sample-config",
        action="store_true",
        help="Create sample configuration file and exit"
    )
    
    args = parser.parse_args()
    
    if args.create_sample_config:
        create_sample_config()
        return 0
    
    if not all([args.device_id, args.config]):
        print("✗ Missing required arguments: --device-id and --config")
        parser.print_help()
        return 1
    
    try:
        # Load configuration
        config = load_config(args.config)
        
        # Create sender
        sender = MQTTDataSender(args.device_id, config)
        
        # Setup MQTT connection
        if not sender.setup_mqtt():
            print("✗ Failed to setup MQTT connection")
            return 1
        
        # Wait for connection to establish
        print("⏳ Waiting for MQTT connection...")
        time.sleep(2)
        
        if not sender.client.is_connected():
            print("✗ MQTT connection failed")
            return 1
        
        # Send data
        if args.single:
            print("📤 Sending single message...")
            success = sender.send_single_message()
            sender.stop()
            return 0 if success else 1
        else:
            # Use interval from config or command line
            interval = config.get('send_interval', args.interval)
            sender.run_continuous_sending(interval)
            return 0
        
    except Exception as e:
        print(f"✗ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())