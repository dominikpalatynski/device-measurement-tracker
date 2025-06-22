#Enviroment init

1. source project_env/bin/activate
2. pip install -r requirements.txt

#RegisterDevice

1. python3 register_device.py --token q4Z_ooBVKFJA --device-id pcS-GqREh2 --create-sample-config

#Batch processing

1. python batch_processor.py --config mapping_config.json --data-dir ./seria-danych-dsp

#Real time streaming

1. ./yii mqtt/subscribe
2. python real_time_sender.py --mqtt-config mqtt_config.json
