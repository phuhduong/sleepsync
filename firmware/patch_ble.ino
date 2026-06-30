/*
 * SleepSync ESP32 BLE patch. See docs/BLE_PATCH.md.
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#define PUMP_PIN 2
#define PWM_CHANNEL 0
#define PWM_FREQ 5000
#define PWM_RES 8

static const char *DEVICE_NAME = "SleepSync Patch";
static const char *SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char *TARGET_DOSE_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
static const char *PROFILE_SCHEDULE_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

#define MAX_KEYFRAMES 24

struct Keyframe {
  float t;
  float dose;
};

static Keyframe scheduleKeyframes[MAX_KEYFRAMES];
static int scheduleKeyframeCount = 0;
static unsigned long scheduleWrittenAtMs = 0;
static unsigned long scheduleMsUntilBed = 0;
static unsigned long scheduleWindowDurationMs = 0;
static bool scheduleActive = false;
static unsigned long lastScheduleTickMs = 0;

float currentDose = 0.0f;

float clampDose(float value) {
  if (value < 0.0f) return 0.0f;
  if (value > 1.0f) return 1.0f;
  return value;
}

void applyDose(float dose) {
  currentDose = clampDose(dose);
  if (currentDose <= 0.0f) {
    ledcWrite(PWM_CHANNEL, 0);
    Serial.println("Pump OFF");
    return;
  }
  int duty = (int)(currentDose * 255.0f);
  ledcWrite(PWM_CHANNEL, duty);
  Serial.print("Pump PWM duty=");
  Serial.println(duty);
}

float interpolateSchedule(float t) {
  if (scheduleKeyframeCount <= 0) return 0.0f;
  if (t <= scheduleKeyframes[0].t) return scheduleKeyframes[0].dose;
  for (int i = 1; i < scheduleKeyframeCount; i++) {
    if (t <= scheduleKeyframes[i].t) {
      float t0 = scheduleKeyframes[i - 1].t;
      float t1 = scheduleKeyframes[i].t;
      float d0 = scheduleKeyframes[i - 1].dose;
      float d1 = scheduleKeyframes[i].dose;
      float span = t1 - t0;
      if (span <= 0.0f) return d1;
      float u = (t - t0) / span;
      return d0 + u * (d1 - d0);
    }
  }
  return scheduleKeyframes[scheduleKeyframeCount - 1].dose;
}

void parseProfileSchedule(const uint8_t *data, size_t len) {
  if (len < 10) return;
  uint32_t msUntilBed;
  uint32_t windowDurationMs;
  uint16_t count;
  memcpy(&msUntilBed, data, sizeof(uint32_t));
  memcpy(&windowDurationMs, data + 4, sizeof(uint32_t));
  memcpy(&count, data + 8, sizeof(uint16_t));
  if (count > MAX_KEYFRAMES) count = MAX_KEYFRAMES;
  size_t needed = 10 + (size_t)count * 8;
  if (len < needed || windowDurationMs == 0) return;

  scheduleMsUntilBed = msUntilBed;
  scheduleWindowDurationMs = windowDurationMs;
  scheduleKeyframeCount = (int)count;
  for (int i = 0; i < scheduleKeyframeCount; i++) {
    size_t off = 10 + (size_t)i * 8;
    memcpy(&scheduleKeyframes[i].t, data + off, sizeof(float));
    memcpy(&scheduleKeyframes[i].dose, data + off + 4, sizeof(float));
    scheduleKeyframes[i].t = clampDose(scheduleKeyframes[i].t);
    scheduleKeyframes[i].dose = clampDose(scheduleKeyframes[i].dose);
  }
  scheduleWrittenAtMs = millis();
  scheduleActive = scheduleKeyframeCount > 0;
  Serial.print("ProfileSchedule loaded keyframes=");
  Serial.println(scheduleKeyframeCount);
}

void updateScheduledDose() {
  if (!scheduleActive || scheduleWindowDurationMs == 0) return;

  unsigned long now = millis();
  unsigned long bedMs = scheduleWrittenAtMs + scheduleMsUntilBed;
  unsigned long wakeMs = bedMs + scheduleWindowDurationMs;

  if (now >= wakeMs) {
    scheduleActive = false;
    applyDose(0.0f);
    Serial.println("Schedule complete");
    return;
  }
  if (now < bedMs) {
    applyDose(0.0f);
    return;
  }

  float t = (float)(now - bedMs) / (float)scheduleWindowDurationMs;
  if (t > 1.0f) t = 1.0f;
  applyDose(interpolateSchedule(t));
}

class TargetDoseCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    if (value.length() < 4) {
      Serial.println("Write too short");
      return;
    }
    float dose;
    memcpy(&dose, value.data(), sizeof(float));
    Serial.print("BLE dose write: ");
    Serial.println(dose, 4);
    if (dose <= 0.0f) {
      scheduleActive = false;
    }
    applyDose(dose);
  }
};

class ProfileScheduleCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *characteristic) {
    std::string value = characteristic->getValue();
    parseProfileSchedule((const uint8_t *)value.data(), value.length());
  }
};

void setup() {
  Serial.begin(115200);
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES);
  ledcAttachPin(PUMP_PIN, PWM_CHANNEL);
  applyDose(0.0f);

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();

  BLEService *service = server->createService(SERVICE_UUID);
  BLECharacteristic *targetDose = service->createCharacteristic(
    TARGET_DOSE_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  targetDose->setCallbacks(new TargetDoseCallbacks());

  BLECharacteristic *profileSchedule = service->createCharacteristic(
    PROFILE_SCHEDULE_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  profileSchedule->setCallbacks(new ProfileScheduleCallbacks());

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("SleepSync patch ready");
}

void loop() {
  unsigned long now = millis();
  if (scheduleActive && now - lastScheduleTickMs >= 200) {
    lastScheduleTickMs = now;
    updateScheduledDose();
  }
  delay(10);
}
