#include <Arduino.h>

// Teste isolado e calibração do sensor de umidade do solo YL-69 no ESP32.
// Ligações obrigatórias:
// - YL-69 VCC -> 3V3 (NÃO ligar em 5V/VIN, senão satura o ADC em 4095 / 0%)
// - YL-69 GND -> GND
// - YL-69 AO  -> GPIO 34 (pino ADC1 — não conflita com Bluetooth/BLE)
//   (NÃO ligar o pino DO na entrada analógica)

constexpr uint8_t YL69_PIN = 34;
constexpr int SOIL_MOISTURE_DRY_RAW = 4095;
constexpr int SOIL_MOISTURE_WET_RAW = 1200;
constexpr uint8_t SAMPLES = 16;
constexpr unsigned long READ_INTERVAL_MS = 1000;

unsigned long lastReadAt = 0;

int readAverageRaw() {
  (void)analogRead(YL69_PIN);
  delay(5);

  uint32_t total = 0;
  for (uint8_t i = 0; i < SAMPLES; i++) {
    total += analogRead(YL69_PIN);
    delay(5);
  }
  return static_cast<int>(total / SAMPLES);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(YL69_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(YL69_PIN, ADC_11db);

  Serial.println();
  Serial.println("=== Teste e calibração do YL-69 (ADC1) ===");
  Serial.println("AO: GPIO 34 | VCC: 3V3 | GND: GND");
  Serial.println("Anote o valor 'raw' com a sonda SECA no ar e depois MERGULHADA em água.");
}

void loop() {
  if (millis() - lastReadAt < READ_INTERVAL_MS) return;
  lastReadAt = millis();

  const int raw = readAverageRaw();
  const int mv = analogReadMilliVolts(YL69_PIN);
  const float ratio = static_cast<float>(SOIL_MOISTURE_DRY_RAW - raw) /
                      static_cast<float>(SOIL_MOISTURE_DRY_RAW - SOIL_MOISTURE_WET_RAW);
  const int percent = constrain(static_cast<int>(lroundf(ratio * 100.0f)), 0, 100);

  Serial.print("raw=");
  Serial.print(raw);
  Serial.print(" | tensao=");
  Serial.print(mv);
  Serial.print(" mV | umidade=");
  Serial.print(percent);
  Serial.println("%");

  if (raw >= 4090) {
    Serial.println("  -> Leitura no teto (4095): verifique se o fio está em AO (não DO), VCC em 3V3 e a sonda ligada.");
  }
}
