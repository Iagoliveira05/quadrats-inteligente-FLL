#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>

// DS18B20 DATA conectado ao GPIO 17 (D17).
constexpr uint8_t DS18B20_PIN = 17;
constexpr unsigned long READ_INTERVAL_MS = 2000;

OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);
unsigned long lastReadAt = 0;

void printAddress(const DeviceAddress address) {
  for (uint8_t index = 0; index < 8; index++) {
    if (address[index] < 16) Serial.print('0');
    Serial.print(address[index], HEX);
    if (index < 7) Serial.print(':');
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=== Teste isolado do DS18B20 ===");
  Serial.println("DATA: GPIO 17 | VCC: 3V3 | GND: GND");
  Serial.println("Use resistor de 4,7 kΩ entre DATA e 3V3.");

  ds18b20.begin();
  ds18b20.setResolution(12);
  ds18b20.setWaitForConversion(true);

  const uint8_t sensorCount = ds18b20.getDeviceCount();
  Serial.print("Sensores encontrados: ");
  Serial.println(sensorCount);

  if (sensorCount == 0) {
    Serial.println("ERRO: nenhum DS18B20 encontrado.");
    Serial.println("Confira a fiação, o resistor de 4,7 kΩ e a alimentação em 3V3.");
    return;
  }

  for (uint8_t index = 0; index < sensorCount; index++) {
    DeviceAddress address;
    if (ds18b20.getAddress(address, index)) {
      Serial.print("Sensor ");
      Serial.print(index + 1);
      Serial.print(" - endereço: ");
      printAddress(address);
      Serial.println();
    }
  }
}

void loop() {
  if (millis() - lastReadAt < READ_INTERVAL_MS) return;
  lastReadAt = millis();

  const uint8_t sensorCount = ds18b20.getDeviceCount();
  if (sensorCount == 0) {
    Serial.println("Sem sensor detectado no GPIO 17.");
    return;
  }

  ds18b20.requestTemperatures();
  for (uint8_t index = 0; index < sensorCount; index++) {
    const float temperature = ds18b20.getTempCByIndex(index);
    Serial.print("Sensor ");
    Serial.print(index + 1);
    Serial.print(": ");

    if (temperature == DEVICE_DISCONNECTED_C) {
      Serial.println("erro de leitura (sensor desconectado)");
    } else {
      Serial.print(temperature, 2);
      Serial.println(" °C");
    }
  }
}
