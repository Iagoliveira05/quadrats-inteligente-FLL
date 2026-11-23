#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <DHT.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <Wire.h>
#include <BH1750.h>

// Identificação persistente deste equipamento.
// Altere estes valores para cada quadrat físico.
static const char* DEVICE_ID = "Q-001";
static const char* DEVICE_NAME = "Quadrat-Q001";

static const char* SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* MEASUREMENT_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// Ligações dos sensores e do LED.
constexpr uint8_t DHT_PIN = 26;                // DHT11: temperatura e umidade do ar.
constexpr uint8_t DHT_TYPE = DHT11;
constexpr uint8_t SOIL_TEMPERATURE_PIN = 21;  // DS18B20: temperatura do solo.
constexpr uint8_t SOIL_TEMPERATURE_RESOLUTION = 12;
// IMPORTANTE: use um pino do ADC1 (GPIO 34, 35, 36 ou 39) para o YL-69 (saída AO).
// Pinos do ADC2 (como GPIO 15) conflitam com o rádio BLE do ESP32 e travam a leitura.
// Alimente o módulo YL-69 em 3V3 (não em 5V) para não saturar o ADC em 4095 (0%).
constexpr uint8_t SOIL_MOISTURE_PIN = 34;     // YL-69: saída analógica (AO) no ADC1.
constexpr uint8_t I2C_SDA_PIN = 32;           // BH1750 SDA.
constexpr uint8_t I2C_SCL_PIN = 33;           // BH1750 SCL.
constexpr uint8_t CONNECTION_LED_PIN = 12;    // LED verde: conexão BLE ativa.
constexpr unsigned long MEASUREMENT_INTERVAL_MS = 5000;

// Calibre estes limites com os valores de soilMoistureRaw exibidos no Monitor Serial.
// Com o YL-69 alimentado em 3V3 no ADC de 12 bits (0–4095):
// - Seco no ar: ~4095
// - Em água / solo saturado: ~1200
constexpr int SOIL_MOISTURE_DRY_RAW = 4095;
constexpr int SOIL_MOISTURE_WET_RAW = 1200;
constexpr uint8_t SOIL_MOISTURE_SAMPLES = 16;

DHT dht(DHT_PIN, DHT_TYPE);
OneWire soilTemperatureWire(SOIL_TEMPERATURE_PIN);
DallasTemperature soilTemperatureSensor(&soilTemperatureWire);
BH1750 lightSensor;

BLECharacteristic* measurementCharacteristic = nullptr;
bool clientConnected = false;
bool soilTemperatureSensorDetected = false;
bool lightSensorDetected = false;
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

void setupSoilTemperatureSensor() {
  soilTemperatureSensor.begin();
  soilTemperatureSensor.setResolution(SOIL_TEMPERATURE_RESOLUTION);
  soilTemperatureSensor.setWaitForConversion(true);

  const uint8_t sensorCount = soilTemperatureSensor.getDeviceCount();
  soilTemperatureSensorDetected = sensorCount > 0;
  Serial.print("DS18B20 encontrado(s): ");
  Serial.println(sensorCount);
  if (!soilTemperatureSensorDetected) {
    Serial.print("Conecte o DS18B20 ao GPIO ");
    Serial.print(SOIL_TEMPERATURE_PIN);
    Serial.println(" com resistor de 4,7 kΩ entre DATA e 3V3.");
  }
}

void setupLightSensor() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  lightSensorDetected = lightSensor.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  Serial.println(lightSensorDetected ? "BH1750 encontrado no I2C." : "BH1750 não encontrado no I2C.");
}

int readSoilMoistureRaw() {
  // Descarta a primeira amostra para estabilização do ADC1.
  (void)analogRead(SOIL_MOISTURE_PIN);
  delay(5);

  uint32_t total = 0;
  for (uint8_t sample = 0; sample < SOIL_MOISTURE_SAMPLES; sample++) {
    total += analogRead(SOIL_MOISTURE_PIN);
    delay(5);
  }
  return static_cast<int>(total / SOIL_MOISTURE_SAMPLES);
}

int computeSoilMoisturePercent(int raw) {
  if (SOIL_MOISTURE_DRY_RAW == SOIL_MOISTURE_WET_RAW) return 0;
  const float ratio = static_cast<float>(SOIL_MOISTURE_DRY_RAW - raw) /
                      static_cast<float>(SOIL_MOISTURE_DRY_RAW - SOIL_MOISTURE_WET_RAW);
  const int percent = static_cast<int>(lroundf(ratio * 100.0f));
  return constrain(percent, 0, 100);
}

String buildMeasurement() {
  const float airTemperature = dht.readTemperature();
  const float airHumidity = dht.readHumidity();
  const bool airTemperatureValid = !isnan(airTemperature);
  const bool airHumidityValid = !isnan(airHumidity);

  if (!soilTemperatureSensorDetected) {
    soilTemperatureSensorDetected = soilTemperatureSensor.getDeviceCount() > 0;
  }
  if (soilTemperatureSensorDetected) {
    soilTemperatureSensor.requestTemperatures();
  }
  const float soilTemperature = soilTemperatureSensorDetected
    ? soilTemperatureSensor.getTempCByIndex(0)
    : DEVICE_DISCONNECTED_C;
  const bool soilTemperatureValid =
    soilTemperature != DEVICE_DISCONNECTED_C && !isnan(soilTemperature);
  if (!soilTemperatureValid) {
    Serial.print("DS18B20 sem leitura. Verifique o sensor, o GPIO ");
    Serial.print(SOIL_TEMPERATURE_PIN);
    Serial.println(" e o resistor de 4,7 kΩ.");
  }

  // O YL-69 está ligado pela saída analógica AO no GPIO 34 (ADC1).
  // A leitura diminui à medida que o solo fica mais úmido.
  const int soilMoistureRaw = readSoilMoistureRaw();
  const int soilMoistureMv = analogReadMilliVolts(SOIL_MOISTURE_PIN);
  const float lightLux = lightSensorDetected ? lightSensor.readLightLevel() : NAN;
  const bool lightLuxValid = !isnan(lightLux) && lightLux >= 0;
  const int soilMoisturePercent = computeSoilMoisturePercent(soilMoistureRaw);
  const bool soilMoisture = soilMoisturePercent >= 50;

  Serial.print("YL-69 (GPIO ");
  Serial.print(SOIL_MOISTURE_PIN);
  Serial.print(") raw=");
  Serial.print(soilMoistureRaw);
  Serial.print(" (");
  Serial.print(soilMoistureMv);
  Serial.print(" mV) -> ");
  Serial.print(soilMoisturePercent);
  Serial.println("%");
  if (soilMoistureRaw >= 4090) {
    Serial.println("Aviso YL-69: leitura no teto (4095). Confirme: fio em AO (não DO), VCC em 3V3 (não 5V) e garfo conectado.");
  }

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
  json += "\"lightLux\":" + numberOrNull(lightLux, lightLuxValid) + ",";
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
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_MOISTURE_PIN, ADC_11db);
  dht.begin();

  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(517);
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
  setupSoilTemperatureSensor();
  setupLightSensor();

  Serial.println("Quadrat Inteligente iniciado");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.print("YL-69 analógico (AO) no GPIO ");
  Serial.print(SOIL_MOISTURE_PIN);
  Serial.println(" (ADC1). Use soilMoistureRaw para calibrar os limites seco/úmido.");
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
