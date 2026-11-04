# Conexão do ESP32 ao Quadrats Inteligentes

Este tutorial descreve como preparar um ESP32, gravar o firmware e testar a comunicação BLE com o projeto Quadrats Inteligentes.

## 1. Materiais

- Placa ESP32 DevKit ou equivalente.
- Cabo USB de dados.
- Arduino IDE.
- DHT22 para temperatura e umidade do ar.
- DS18B20 à prova d'água para temperatura do solo.
- Sensor capacitivo de umidade do solo.
- BH1750 para luminosidade.
- Módulo GPS compatível, opcional.
- Jumpers e protoboard.

Confirme o modelo exato da placa e dos sensores antes de ligar. O ESP32 utiliza lógica de 3,3 V; não aplique 5 V diretamente em GPIOs.

## 2. Instalar o Arduino IDE e o suporte ESP32

1. Instale o Arduino IDE pelo site oficial.
2. Abra `File > Preferences`.
3. Em `Additional Boards Manager URLs`, adicione:

   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```

4. Abra `Tools > Board > Boards Manager`.
5. Procure `esp32` e instale `esp32 by Espressif Systems`.
6. Reinicie o Arduino IDE.
7. Conecte o ESP32 por USB.
8. Selecione `Tools > Board > ESP32 Arduino > ESP32 Dev Module` ou o modelo correspondente.
9. Selecione a porta em `Tools > Port`.

Referência oficial: https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html

## 3. Instalar bibliotecas dos sensores

No Arduino IDE, abra `Sketch > Include Library > Manage Libraries` e instale:

- `DHT sensor library` — Adafruit.
- `Adafruit Unified Sensor` — Adafruit.
- `OneWire` — Paul Stoffregen.
- `DallasTemperature` — Miles Burton.
- `BH1750` — Christopher Laws.

O firmware BLE utiliza bibliotecas incluídas no core oficial ESP32.

## 4. Ligações sugeridas

| Componente | ESP32 | Observação |
|---|---:|---|
| DHT22 VCC | 3V3 | Use resistor de 10 kΩ entre DATA e 3V3 |
| DHT22 DATA | GPIO 4 | Não use 5 V no sinal |
| DHT22 GND | GND | Terra comum |
| DS18B20 DATA | GPIO 16 | Resistor de 4,7 kΩ entre DATA e 3V3 |
| DS18B20 VCC | 3V3 | Consulte o módulo usado |
| DS18B20 GND | GND | Terra comum |
| BH1750 SDA | GPIO 21 | Barramento I2C |
| BH1750 SCL | GPIO 22 | Barramento I2C |
| BH1750 VCC | 3V3 | Consulte a placa do módulo |
| BH1750 GND | GND | Terra comum |
| Sensor capacitivo | GPIO 34 | Entrada analógica somente |
| GPS TX | GPIO 17 (RX2) | Cruzar TX/RX |
| GPS RX | GPIO 16 (TX2) | Pode conflitar com DS18B20 |

O GPS e o DS18B20 não devem compartilhar o mesmo pino. Se utilizar GPS, mova o DS18B20 para outro GPIO e altere as constantes no firmware.

## 5. Gravar o firmware

1. Abra `firmware/quadrat_ble/quadrat_ble.ino` no Arduino IDE.
2. Ajuste `DEVICE_ID` e `DEVICE_NAME` para o equipamento.
3. Confira os pinos no início do arquivo.
4. Selecione a placa e a porta correta.
5. Clique em `Verify`.
6. Clique em `Upload`.
7. Se aparecer `Connecting...`, mantenha o botão `BOOT` pressionado por alguns segundos.
8. Abra o Serial Monitor em `115200 baud`.

Você deverá ver o dispositivo anunciando o serviço BLE e novas leituras a cada cinco segundos.

## 6. Protocolo BLE

O firmware usa:

```text
Serviço:       6e400001-b5a3-f393-e0a9-e50e24dcca9e
Notificações:  6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

O payload enviado é UTF-8 em JSON:

```json
{
  "deviceId": "Q-001",
  "sequence": 1,
  "uptimeMs": 10000,
  "airTemperature": 24.1,
  "airHumidity": 68.0,
  "soilTemperature": 18.4,
  "soilMoisture": 32.0,
  "luminosity": 1245.0,
  "latitude": null,
  "longitude": null,
  "gpsValid": false
}
```

O aplicativo web precisa solicitar o dispositivo por ação explícita do usuário, conectar ao serviço e assinar a característica de notificações. Web Bluetooth exige navegador compatível e contexto seguro: `localhost` ou HTTPS.

## 7. Teste sem o site

Antes de testar no Quadrats, use um aplicativo BLE como nRF Connect para Android/iOS e confirme:

1. O dispositivo aparece como `Quadrat-Q001`.
2. O serviço UUID está visível.
3. A característica de notificações pode ser ativada.
4. Um JSON chega a cada cinco segundos.

## 8. Calibração

O sensor capacitivo não fornece automaticamente porcentagem real de água no solo. Ajuste no firmware:

- `SOIL_DRY_RAW`: leitura em solo seco.
- `SOIL_WET_RAW`: leitura em solo úmido.

Faça várias leituras e documente o tipo de solo, profundidade e condições da medição.

## 9. Limitações importantes

- O navegador não garante reconexão depois que a aba é fechada ou suspensa.
- O GPS é opcional; sem posição válida, o firmware envia `gpsValid: false`.
- O firmware não transmite dados pela internet; ele usa BLE diretamente com o navegador.
- Os testes com sensores reais devem ser feitos no hardware montado.

