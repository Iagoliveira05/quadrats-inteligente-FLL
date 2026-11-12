#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>

// Identificação persistente deste equipamento.
// Altere estes valores para cada quadrat físico.
static const char* DEVICE_ID = "Q-001";
static const char* DEVICE_NAME = "Quadrat-Q001";

static const char* SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* MEASUREMENT_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Pinos sugeridos. Confira o arquivo docs/ESP32-CONEXAO.md antes de ligar.
constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t DHT_TYPE = DHT11;
constexpr uint8_t SOIL_MOISTURE_PIN = 18;
constexpr uint8_t CONNECTION_LED_PIN = 21;
constexpr unsigned long MEASUREMENT_INTERVAL_MS = 5000;

DHT dht(DHT_PIN, DHT_TYPE);
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

String buildMeasurement() {
  const float airTemperature = dht.readTemperature();
  const float airHumidity = dht.readHumidity();
  const bool airValid = !isnan(airTemperature) && !isnan(airHumidity);
  // Neste módulo HW-038, HIGH indica que há água no sensor.
  const int soilMoistureRaw = digitalRead(SOIL_MOISTURE_PIN);
  const int waterLevelPercent = soilMoistureRaw == HIGH ? 100 : 0;

  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sequence\":" + String(sequenceNumber++) + ",";
  json += "\"uptimeMs\":" + String(millis()) + ",";
  json += "\"airTemperature\":" + (airValid ? String(airTemperature, 2) : "null") + ",";
  json += "\"airHumidity\":" + (airValid ? String(airHumidity, 2) : "null") + ",";
  json += "\"waterLevelPercent\":" + String(waterLevelPercent) + ",";
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
