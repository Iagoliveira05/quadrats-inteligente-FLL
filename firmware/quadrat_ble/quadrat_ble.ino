#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <BH1750.h>

// Identificação persistente deste equipamento.
// Altere estes valores para cada quadrat físico.
static const char* DEVICE_ID = "Q-001";
static const char* DEVICE_NAME = "Quadrat-Q001";

static const char* SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* MEASUREMENT_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Pinos sugeridos. Confira o arquivo docs/ESP32-CONEXAO.md antes de ligar.
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t DHT_TYPE = DHT22;
constexpr uint8_t SOIL_TEMPERATURE_PIN = 16;
constexpr uint8_t SOIL_MOISTURE_PIN = 34;

// Calibre estes valores no seu sensor capacitivo.
constexpr int SOIL_DRY_RAW = 3000;
constexpr int SOIL_WET_RAW = 1200;
constexpr unsigned long MEASUREMENT_INTERVAL_MS = 5000;

DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(SOIL_TEMPERATURE_PIN);
DallasTemperature soilTemperatureSensor(&oneWire);
BH1750 lightSensor;
BLECharacteristic* measurementCharacteristic = nullptr;
bool clientConnected = false;
uint32_t sequenceNumber = 0;
unsigned long lastMeasurement = 0;

class ServerCallbacks final : public BLEServerCallbacks {
  void onConnect(BLEServer*) override {
    clientConnected = true;
    Serial.println("BLE conectado");
  }

  void onDisconnect(BLEServer* server) override {
    clientConnected = false;
    Serial.println("BLE desconectado; anunciando novamente");
    server->startAdvertising();
  }
};

float soilMoisturePercent(int rawValue) {
  const float percentage = 100.0f * (SOIL_DRY_RAW - rawValue) / (SOIL_DRY_RAW - SOIL_WET_RAW);
  return constrain(percentage, 0.0f, 100.0f);
}

String nullableFloat(float value, bool valid) {
  return valid ? String(value, 6) : "null";
}

String buildMeasurement() {
  const float airTemperature = dht.readTemperature();
  const float airHumidity = dht.readHumidity();
  soilTemperatureSensor.requestTemperatures();
  const float soilTemperature = soilTemperatureSensor.getTempCByIndex(0);
  const int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  const float soilMoisture = soilMoisturePercent(soilRaw);
  const float luminosity = lightSensor.readLightLevel();
  const bool airValid = !isnan(airTemperature) && !isnan(airHumidity);
  const bool soilTemperatureValid = soilTemperature != DEVICE_DISCONNECTED_C;
  const bool lightValid = luminosity >= 0;

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sequence\":" + String(sequenceNumber++) + ",";
  json += "\"uptimeMs\":" + String(millis()) + ",";
  json += "\"airTemperature\":" + (airValid ? String(airTemperature, 2) : "null") + ",";
  json += "\"airHumidity\":" + (airValid ? String(airHumidity, 2) : "null") + ",";
  json += "\"soilTemperature\":" + (soilTemperatureValid ? String(soilTemperature, 2) : "null") + ",";
  json += "\"soilMoisture\":" + String(soilMoisture, 2) + ",";
  json += "\"luminosity\":" + (lightValid ? String(luminosity, 2) : "null") + ",";
  json += "\"latitude\":null,";
  json += "\"longitude\":null,";
  json += "\"gpsValid\":false";
  json += "}";
  return json;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  dht.begin();
  soilTemperatureSensor.begin();
  Wire.begin(21, 22);
  lightSensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);

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
