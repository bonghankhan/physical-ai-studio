// Physical AI Studio - minimal ESP32 Web Serial command example
// Board: ESP32-C3 SuperMini (or another ESP32 board)
// Commands from the browser: FORWARD / BACKWARD / LEFT / RIGHT / STOP

const int LED_PIN = 8; // Change for your board if needed.

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("READY");
}

void loop() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "FORWARD") {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("OK FORWARD");
  } else if (cmd == "STOP") {
    digitalWrite(LED_PIN, LOW);
    Serial.println("OK STOP");
  } else if (cmd == "BACKWARD" || cmd == "LEFT" || cmd == "RIGHT") {
    Serial.print("OK ");
    Serial.println(cmd);
  } else {
    Serial.print("UNKNOWN ");
    Serial.println(cmd);
  }
}
