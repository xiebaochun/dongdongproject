# mqttClient
This is a sample code testing MQTT server with mqttws31.js 

---
#### Connect to MQTT Server:
- Input MQTT server host, port, username, password, and client ID
- If you set a repeated client ID, the other using the same client ID would be kicked out

#### Subscribe Topic
- Input listen topic (ex. *YOUR/TOPIC/LEVEL/#*)

#### Send Message
- Input target topic (ex. *YOUR/TOPIC/LEVEL/ANOTHER/LEVEL*)
- Input message and click send button
- If you send empty message, the topic would be erased

#### Log
- The log area would show MQTT connection status, specific topic messages arrived/sent
- You can filter the infos with the bottom input box
