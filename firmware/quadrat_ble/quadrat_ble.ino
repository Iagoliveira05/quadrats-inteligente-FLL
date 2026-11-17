#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>
#include <DallasTemperature.h>
#include <OneWire.h>

// Identificação persistente deste equipamento.
// Altere estes valores para cada quadrat físico.
static const char* DEVICE_ID = "Q-001";
static const char* DEVICE_NAME = "Quadrat-Q001";

static const char* SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* MEASUREMENT_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Ligações dos sensores e do LED.
constexpr uint8_t DHT_PIN = 4;                 // DHT11: temperatura e umidade do ar.
constexpr uint8_t DHT_TYPE = DHT11;
constexpr uint8_t SOIL_TEMPERATURE_PIN = 17;  // DS18B20: temperatura do solo.
constexpr uint8_t SOIL_MOISTURE_PIN = 18;     // YL-69: saída digital (D0).
constexpr uint8_t CONNECTION_LED_PIN = 21;    // LED verde: conexão BLE ativa.
constexpr unsigned long MEASUREMENT_INTERVAL_MS = 5000;

DHT dht(DHT_PIN, DHT_TYPE);
OneWire soilTemperatureWire(SOIL_TEMPERATURE_PIN);
DallasTemperature soilTemperatureSensor(&soilTemperatureWire);

BLECharacteristic* measurementCharacteristic = nullptr;
bool clientConnected = false;
uint32_t sequenceNumber = 0;
unsigned long lastMeasurement = 0;

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer*) override {
    clientConnected = true;
    digitalWrite(CONNECTION_LED_PIN, HIGH);
    Serial.println("BLE conectado");
  }

  void onDisconnect(BLEServer* server) override {
    clientConnected = false;
    digitalWrite(CONNECTION_LED_PIN, LOW);
    Serial.println("BLE desconectado; anunciando novamente");
    server->startAdvertising();
  }
};

String numberOrNull(float value, bool valid) {
  return valid ? String(value, 2) : "null";
}

String buildMeasurement() {
  const float airTemperature = dht.readTemperature();
  const float airHumidity = dht.readHumidity();
  const bool airTemperatureValid = !isnan(airTemperature);
  const bool airHumidityValid = !isnan(airHumidity);

  soilTemperatureSensor.requestTemperatures();
  const float soilTemperature =
    soilTemperatureSensor.getTempCByIndex(0);
  const bool soilTemperatureValid =
    soilTemperature != DEVICE_DISCONNECTED_C && !isnan(soilTemperature);
  if (!soilTemperatureValid) {
    Serial.println("DS18B20 sem leitura. Verifique o sensor, o GPIO 17 e o resistor de 4,7 kΩ.");
  }

  // O YL-69 está ligado pela saída digital D0 no GPIO 18.
  // Ajuste o potenciômetro do módulo para definir o limiar seco/úmido.
  const int soilMoistureRaw = digitalRead(SOIL_MOISTURE_PIN);
  const bool soilMoisture = soilMoistureRaw == HIGH;
  const int soilMoisturePercent = soilMoisture ? 100 : 0;

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sequence\":" + String(sequenceNumber++) + ",";
  json += "\"uptimeMs\":" + String(millis()) + ",";
  json += "\"airTemperature\":" + numberOrNull(airTemperature, airTemperatureValid) + ",";
  json += "\"airHumidity\":" + numberOrNull(airHumidity, airHumidityValid) + ",";
  json += "\"soilTemperature\":" + numberOrNull(soilTemperature, soilTemperatureValid) + ",";
  json += "\"soilMoisture\":" + String(soilMoisture ? "true" : "false") + ",";
  json += "\"soilMoisturePercent\":" + String(soilMoisturePercent) + ",";
  json += "\"soilMoistureRaw\":" + String(soilMoistureRaw) + ",";
  json += "\"latitude\":null,";
  json += "\"longitude\":null,";
  json += "\"gpsValid\":false";
  json += "}";
  return json;
}

void setup() {
  Serial.begin(115200);
  pinMode(CONNECTION_LED_PIN, OUTPUT);
  digitalWrite(CONNECTION_LED_PIN, LOW);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  dht.begin();
  soilTemperatureSensor.begin();
  soilTemperatureSensor.setResolution(10);
  soilTemperatureSensor.setWaitForConversion(true);

  BLEDevice::init(DEVICE_NAME);
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  BLEService* service = server->createService(SERVICE_UUID);
  measurementCharacteristic = service->createCharacteristic(
    MEASUREMENT_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  measurementCharacteristic->addDescriptor(new BLE2902());
  service->start();

  BLEAdvertising* advertising = server->getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  advertising->start();

  Serial.println("Quadrat Inteligente iniciado");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("DS18B20 encontrado(s): ");
  Serial.println(soilTemperatureSensor.getDeviceCount());
  if (soilTemperatureSensor.getDeviceCount() == 0) {
    Serial.println("Conecte o DS18B20 ao GPIO 17 com resistor de 4,7 kΩ entre DATA e 3V3.");
  }
  Serial.println("Aguardando conexão BLE...");
}

void loop() {
  if (millis() - lastMeasurement < MEASUREMENT_INTERVAL_MS) return;
  lastMeasurement = millis();

  const String payload = buildMeasurement();
  Serial.println(payload);
  if (clientConnected && measurementCharacteristic != nullptr) {
    measurementCharacteristic->setValue(payload.c_str());
    measurementCharacteristic->notify();
  }
}
