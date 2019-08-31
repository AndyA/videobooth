// keyboard driver

#include "Keyboard.h"

const int BLUE = 2;
const int GREEN = 3;
const int RED = 4;

const int DEBOUNCE = 50;

struct button {
  unsigned long stableSince;
  int state;
  int nextState;
  int input;
} button[3];

struct key {
  int keyCode;
  int state;
} key[3];

int checkButton(struct button *b) {
  int newState = !digitalRead(b->input);
  unsigned long now = millis();
  
  if (newState == b->nextState) {
    if (now - b->stableSince >= DEBOUNCE)
      b->state = newState;
  }
  else {
    b->stableSince = now;
    b->nextState = newState;
  }
  return b->state;
}

void handleKey(struct key *key, int state) {
  if (key->state == state) return;
  key->state = state;
  if (state)
    Keyboard.press(key->keyCode);
  else
    Keyboard.release(key->keyCode);
}

void setup() {
  button[0].input = RED;
  button[1].input = GREEN;
  button[2].input = BLUE;

  key[0].keyCode = '1';
  key[1].keyCode = '2';
  key[2].keyCode = '3';
  
  for (int i = 0; i < 3; i++) {
    pinMode(button[i].input, INPUT_PULLUP);
  }
  pinMode(LED_BUILTIN, OUTPUT);

  Keyboard.begin();
}

// the loop function runs over and over again forever
void loop() {
  int down = 0;
  for (int i = 0; i < 3; i++) {
    handleKey(&key[i], checkButton(&button[i]));
    if (key[i].state) down++;
  }
  digitalWrite(LED_BUILTIN, down ? HIGH : LOW);
}
