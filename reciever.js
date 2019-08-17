

const np = require("neopixel");
const name = 'PearlMcGrain';

const pwmPin = D7;
const frontLightPin = D16;
const backLightPin = D18;

const neopixelBase = new Uint8Array(9 * 3);

var arr = new Uint8ClampedArray(9 * 3);
var pos = 0;
var interval;
var breakLightOff = true;
var lightsOn = false;
var lastState = 'breakLightOff';

function getPattern() {
  pos++;
  for (var i = 0; i < arr.length; i += 3) {
    arr[i] = (1 + Math.sin((i + pos) * 0.1324)) * 127;
    arr[i + 1] = (1 + Math.sin((i + pos) * 0.1654)) * 127;
    arr[i + 2] = (1 + Math.sin((i + pos) * 0.1)) * 127;
  }
}

function onTimer() {
  if (pos > 40) {
    clearInterval(interval);
    clearStrip();
  } else {
    getPattern();
    np.write(frontLightPin, arr);
    np.write(backLightPin, arr);
  }
}

function clearStrip() {
  np.write(frontLightPin, neopixelBase);
  np.write(backLightPin, neopixelBase);
}

function turnOnLights() {

  const front = new Uint8Array(9 * 3).map(() => 255);
  const back = new Uint8Array(9 * 3).map((val, index) => {
    if (index % 3 === 1) {
      return 100;
    }
    return val;
  });
  np.write(frontLightPin, front);
  np.write(backLightPin, back);
  lightsOn = true;

}

function startRainbow() {
  interval = setInterval(onTimer, 50);
}

function startBreakLight() {
  const back = neopixelBase.map((val, index) => {
    if (index % 3 === 1) {
      return 255;
    }
    return val;
  });
  np.write(backLightPin, back);
}

function stopBreakLight() {
  const back = neopixelBase.map((val, index) => {
    if (index % 3 === 1) {
      return 100;
    }
    return val;
  });
  np.write(backLightPin, back);

}
function onInit() {
  let n;
  NRF.setServices(
    {
      '446e0001-85de-1237-0fe0-849acbd40fc3': {
        '446e0002-85de-1237-0fe0-849acbd40fc3': {
          value: [0],
          maxLen: 1,
          writable: true,
          onWrite: function (evt) {
            n = evt.data[0] / 255;
            analogWrite(pwmPin, ((1.2 + n * 0.8) / 10) * 0.5, { freq: 50 });
          },
        },
        '446e0003-85de-1237-0fe0-849acbd40fc3': {
          value: [0],
          maxLen: 1,
          writable: true,
          onWrite: function () {
            if (lightsOn) {
              clearStrip();
              lightsOn = false;
            } else if (!lightsOn) {
              turnOnLights();
            }
          },
        }
      },
    },
    { uart: true } // FALSE IS DISABLING THE REPL
  );

  setInterval(() => {
    if (n < 0.455 && lightsOn && breakLightOff) {
      breakLightOff = false;
      startBreakLight();
      lastState = 'breakLightOn';
    } else if (n >= 0.455 && lightsOn && lastState === 'breakLightOn') {
      breakLightOff = true;
      lastState = 'breakLightOff';
      stopBreakLight();
    }
  }, 150);
  NRF.setAdvertising({}, { name: name });
}


NRF.on('disconnect', function () {
  digitalWrite(pwmPin, 0.5);
  digitalWrite(LED2, false);
});
NRF.on('connect', function () {
  digitalWrite(LED2, true);
  startRainbow();
});


