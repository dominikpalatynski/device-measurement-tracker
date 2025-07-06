#!/usr/bin/env python3
"""
Basic MQTT Data Sender for IoT Devices
Simple mechanism to send data to MQTT broker for server consumption.
Usage: python mqtt_sender.py --mqtt-config mqtt_config.json
"""

import argparse
import json
import time
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List
import paho.mqtt.client as mqtt
from pathlib import Path

# --- File reading and mapping logic (from batch_processor.py) ---
def read_file_data(file_path: Path) -> List[float]:
    """Read numerical data from file, one value per line"""
    try:
        if not file_path.exists():
            print(f"⚠ File not found: {file_path}")
            return []
        values = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
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


# --- MQTT Sender ---
class MQTTDataSender:
    def __init__(self, device_id: str, mqtt_config: Dict[str, Any], included_channels: List[str], condition_name: str | None = None, data_series: str | None = None):
        self.device_id = device_id
        self.mqtt_config = mqtt_config
        self.client = None
        self.running = False
        self.message_count = 0
        self.included_channels = included_channels  # list of channel names (file stems)
        self.channel_counters = {ch: 1 for ch in included_channels}  # start from 1 for each channel
        self.condition_name = condition_name
        self.data_series = data_series
    
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
    
    def generate_simulated_data(self, config: Dict[str, Any], values_per_channel: int = 100) -> Dict[str, Any]:
        self.message_count += 1
        data = {}
        for ch in self.included_channels:
            # Generate a list of rosnące liczby, startując od aktualnego licznika
            start = self.channel_counters[ch]
            data[ch] = list(range(start, start + values_per_channel))
            # Zwiększ licznik dla kolejnej wiadomości
            self.channel_counters[ch] += values_per_channel
        return {
            'deviceId': self.device_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'sequenceNumber': self.message_count,
            'data': data,
            "condition_name": self.mqtt_config.get('condition_name'),
            "data_series": self.mqtt_config.get('data_series'),
        }
    
    def publish_data(self, data: Dict[str, Any]) -> bool:
        """Publish data to MQTT topic"""
        try:
            topic = f"sensor/{self.device_id}/raw"
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
    
    def send_single_message(self, config: Dict[str, Any]):
        if not self.client or not self.client.is_connected():
            print("✗ MQTT not connected")
            return False
        data = self.generate_simulated_data(config)
        return self.publish_data(data)
    
    def run_continuous_sending(self, config: Dict[str, Any], interval: int = 1):
        self.running = True
        print(f"🚀 Starting continuous data sending for device: {self.device_id}")
        print(f"⏱ Send interval: {interval} seconds")
        print(f"📋 Topic: sensor/{self.device_id}/raw")
        print("🔧 Sending simulated, rosnące dane jako payload")
        print("Press Ctrl+C to stop\n")
        try:
            while self.running:
                if self.client and self.client.is_connected():
                    data = self.generate_simulated_data(config)
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
        "send_interval": 1,
        "qos": 1
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(sample_config, f, indent=2)
    
    print(f"✓ Sample MQTT config created: {filename}")
    print("📝 Edit the config file with your MQTT broker details")

def main():
    parser = argparse.ArgumentParser(
        description="Basic MQTT data sender for IoT devices (simulated, config-driven)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --mqtt-config mqtt_config.json
  %(prog)s --mqtt-config mqtt_config.json --single
  %(prog)s --mqtt-config mqtt_config.json --interval 5
        """
    )
    parser.add_argument(
        "--mqtt-config",
        required=True,
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
        default=None,
        help="Send interval in seconds for continuous mode (default: from config or 1)"
    )
    args = parser.parse_args()
    if not all([args.mqtt_config]):
        print("✗ Missing required arguments: --mqtt-config")
        parser.print_help()
        return 1
    try:
        mqtt_config = load_config(args.mqtt_config)
        device_id = mqtt_config.get('deviceId')
        if not device_id:
            print("✗ Device ID not specified in config")
            return 1
        included_files = mqtt_config.get('included_files', [])
        included_channels = [Path(f).stem for f in included_files]
        interval = args.interval if args.interval is not None else mqtt_config.get('send_interval', 1)
        condition_name = mqtt_config.get('condition_name')
        
        data_series = mqtt_config.get('data_series')
        if not data_series:
            print("✗ Data series not specified in config")
            return 1
        sender = MQTTDataSender(device_id, mqtt_config, included_channels, condition_name, data_series)
        if not sender.setup_mqtt():
            print("✗ Failed to setup MQTT connection")
            sys.exit(1)
        print("⏳ Waiting for MQTT connection...")
        time.sleep(2)
        if not sender.client.is_connected():
            print("✗ MQTT connection failed")
            sys.exit(1)
        if args.single:
            print("📤 Sending single message...")
            success = sender.send_single_message(mqtt_config)
            sender.stop()
            sys.exit(0 if success else 1)
        else:
            sender.run_continuous_sending(mqtt_config, interval)
            sys.exit(0)
    except Exception as e:
        print(f"✗ Fatal error: {e}")
        return 1

if __name__ == "__main__":
    main()