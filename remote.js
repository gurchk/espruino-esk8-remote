
pinMode(D27, 'input_pullup');


//------------------Animations------------------
//big lock and unlock below
const lock = {
  width: 27, height: 26, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("AAf/gAH/+D///4////P///7/////A///wH//8A///gH//8A///gHj/8A8B/gHgP8A8f/gH//8A///gH//+A///4H//f///5////H///4f///AA//wAD/8A=="))
};

const unlock = {
  width: 31, height: 26, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("AAB/+AAB//g/A//4/gf/8/wP/+/4H///AD///AB///AA///gAf//wAP//4AHj/8ADwH+AB4D/AA8f/gAf//wAP//4AH//+AD///gB//3////5////8f///+H////AAD//AAA//A="))
};

const csEmpty = {
  width: 8, height: 7, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("AQMH/wcDAQ=="))
};


const csOne = {
  width: 10, height: 7, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("AFw4Hv+B3DAE"))
};

const csTwo = {
  width: 12, height: 9, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("PgQRnDoHr/oHnDQRPgA="))
};


const csFull = {
  width: 14, height: D, bpp: 1,
  transparent: 0,
  buffer: E.toArrayBuffer(atob("H8CAhPkkEacOoHq/6genDkEU+QgIH8A="))
};

//-------------End animations---------------


const recieverName = 'PearlMcGrain';
const primaryService = '446e0001-85de-1237-0fe0-849acbd40fc3';
const pwmCharacteristic = '446e0002-85de-1237-0fe0-849acbd40fc3';

const displayPins = {
  scl: D26,
  sda: D25
};

const connectionAnimationOptions = [
  [csEmpty, 110 - 100, 3],
  [csOne, 108 - 100, 3],
  [csTwo, 106 - 100, 2],
  [csFull, 104 - 100, 0],
  [csFull, 104 - 100, 0],
  [csTwo, 106 - 100, 2],
  [csOne, 108 - 100, 3],
  [csEmpty, 110 - 100, 3],
];
var gatt;
var char;
let service;


var batVoltage;


var batteryFinalPercentage = 0;
var rx = 0, ry = 0;

let cruisecontrolValue = null;
var g;

let _joystickXAxisValue;

let isRemoteLocked = false;
let modeChangeTimeout = null;

let shortClickCount = 0;


let activeDrawInterval = null;
let temp = '';
const batteryBoy = (function batteryBoyIIFE() {
  let rawData = [];

  return {
    getAverageVoltage: function () {
      const voltage = rawData.reduce((voltageSum, voltage) => {
        return voltageSum + voltage;
      }, 0) / rawData.length;
      return this.roundTo(voltage, 2);
    },
    getAveragePercentage: function () {
      const mapBetween = (currentNum, minAllowed, maxAllowed, min, max) => {
        return (maxAllowed - minAllowed) * (currentNum - min) / (max - min) + minAllowed;
      };
      const batteryPercentage = mapBetween(this.getAverageVoltage(), 0, 100, 3.3, 4.2);
      return this.roundTo(batteryPercentage, 0) + '%';
    },
    addEntry: (voltage) => {
      rawData.push(voltage);
    },
    clearSamples: () => {
      rawData = [];
    },
    getRawDataAmount: () => {
      return rawData.length;
    },
    roundTo: (number, decimals) => {
      let negative = false;
      if (decimals === undefined) {
        decimals = 0;
      }
      if (number < 0) {
        negative = true;
        number = number * -1;
      }
      const multiplicator = Math.pow(10, decimals);
      number = parseFloat((number * multiplicator).toFixed(11));
      number = (Math.round(number) / multiplicator).toFixed(decimals);
      if (negative) {
        number = (number * -1).toFixed(decimals);
      }
      return number;
    }
  };
})();

// const driveModeOrganizer = (function driveModeOrganizerIIFE() {
//   let currentDriveMode = '';
//   const activeDriveMode = 'activeDriveMode';
//   const settingsMode = 'settingsMode';
//   return {
//     setCurrentDriveMode: (driveMode) => {
//       currentDriveMode = driveMode;
//     },
//     toggleSwitchDriveMode: () => {
//       if (currentDriveMode.length > 0) {
//         if (currentDriveMode === activeDriveMode) {
//           currentDriveMode = settingsMode;
//         } else {
//           currentDriveMode = activeDriveMode;
//         }
//       }
//     }
//   };
// })();



function connectToReciever() {

  console.log("connecting...");

  NRF.requestDevice({ filters: [{ name: recieverName }] }).then(function (device) {
    console.log("Found");
    return device.gatt.connect({ minInterval: 7.5, maxInterval: 7.5 });
  }).then(function (g) {
    console.log("Connected");
    gatt = g;

    return gatt.getPrimaryService(service || primaryService);
  }).then(function (s) {
    service = s;
    return service.getCharacteristic(char || pwmCharacteristic);
  }).then(function (c) {
    console.log("Got Characteristic");
    char = c;
    startPayloadStream();
  }).catch(error => {
    console.log("Error", error);
    if (error) {
      setTimeout(() => {
        console.log('Retrying...');
        connectToReciever();
      }, 1000);
    }
  });
}




function startPayloadStream() {
  let busy = false;
  let i = setInterval(() => {
    if (gatt === undefined || !gatt.connected) {
      clearInterval(i);
      return;
    }
    if (busy || isRemoteLocked) return;
    busy = true;
    _joystickXAxisValue = cruisecontrolValue || analogRead(D28) * 255;
    // console.log(_joystickXAxisValue);
    char.writeValue([_joystickXAxisValue]).then(() => busy = false);
  }, 50);
}


function executeVoltageRead() {
  const readBatteryInterval = setInterval(readBatteryVoltage, 100);

  setTimeout(() => {
    batteryFinalPercentage = batteryBoy.getAveragePercentage();
    console.log("Updating display", batteryBoy.getRawDataAmount(), batteryFinalPercentage);
    cruisecontrolValue = null;
    clearInterval(readBatteryInterval);
    batteryBoy.clearSamples();
  }, 2500);
}

function onInit() {
  console.log("-- ON INIT --");
  clearInterval(activeDrawInterval);

  executeVoltageRead();

  I2C1.setup(displayPins);
  g = require("SSD1306").connect(I2C1, drawInitScreen, { height: 32 });

  require("FontHaxorNarrow7x17").add(Graphics);

  g.setFontHaxorNarrow7x17();
  g.setFontAlign(0, 0, 3);
  temp = E.getTemperature().toFixed(1) + ' C';
  batteryBoy.clearSamples();

  NRF.setTxPower(4);
  connectToReciever();


  const drawDriveModeTimeout = setInterval(() => {
    if (gatt !== undefined && gatt.connected) {
      clearInterval(drawDriveModeTimeout);
      drawDriveMode();
    }
  }, 500);


  // REMOVE ME LATER
  // setTimeout(() => {
  //   clearInterval(drawDriveModeTimeout);
  //   drawDriveMode();
  // }, 20 * 1000);

}




let animationCounter = 0;
function drawInitScreen() {
  clearInterval(activeDrawInterval);
  g.clear();

  const drawImgWrapper = (img, x, y) => g.drawImage(img, x, y);
  drawImgWrapper.apply(null, connectionAnimationOptions[animationCounter % 8]);
  animationCounter++;

  g.drawString(temp, 30, 16);

  rx += 0.1;
  ry += 0.1;
  const rcx = Math.cos(rx), rsx = Math.sin(rx);
  const rcy = Math.cos(ry), rsy = Math.sin(ry);
  const project3Dto2D = (x, y, z) => {
    var t;
    t = x * rcy + z * rsy;
    z = z * rcy - x * rsy;
    x = t;
    t = y * rcx + z * rsx;
    z = z * rcx - y * rsx;
    y = t;
    z += 4;
    return [109 + 40 * x / z, 16 + 32 * y / z];
  };
  const projectValue = 1;
  let a, b;
  // -z
  a = project3Dto2D(-projectValue, -projectValue, -projectValue);
  b = project3Dto2D(projectValue, -projectValue, -projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(projectValue, projectValue, -projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  b = project3Dto2D(-projectValue, projectValue, -projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(-projectValue, -projectValue, -projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  // z
  a = project3Dto2D(-projectValue, -projectValue, projectValue);
  b = project3Dto2D(projectValue, -projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(projectValue, projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  b = project3Dto2D(-projectValue, projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(-projectValue, -projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  // edges
  a = project3Dto2D(-projectValue, -projectValue, -projectValue);
  b = project3Dto2D(-projectValue, -projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(projectValue, -projectValue, -projectValue);
  b = project3Dto2D(projectValue, -projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(projectValue, projectValue, -projectValue);
  b = project3Dto2D(projectValue, projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  a = project3Dto2D(-projectValue, projectValue, -projectValue);
  b = project3Dto2D(-projectValue, projectValue, projectValue);
  g.drawLine(a[0], a[1], b[0], b[1]);
  g.flip(true);


  activeDrawInterval = setInterval(drawInitScreen, 33.32);

}



function drawLock() {
  if (!isRemoteLocked) {
    g.drawImage(unlock, 128 - 31, 5);
  }
  else {
    g.drawImage(lock, 128 - 27, 5);
    cruisecontrolValue = null;
  }
}

function drawBoundingBox() {
  g.drawRect(0, 0, 127, 31);
}

function drawDriveMode() {
  clearInterval(activeDrawInterval);


  g.clear();
  drawLock();

  g.drawString(batteryFinalPercentage, 80, 18);
  const percentage = _joystickXAxisValue * 100 / 255;

  drawThrottleXValueAnimation(percentage);

  g.flip();

  activeDrawInterval = setInterval(drawDriveMode, 33.32);

}




function drawThrottleXValueAnimation(percentage) {
  const x1 = Math.abs(127 * (percentage / 100) - 127);
  g.drawRect(x1, 1, 64, 0);
  g.drawRect(x1, 3, 64, 2);
}

function readBatteryVoltage() {
  batVoltage = analogRead(D31);
  batVoltage = batVoltage * 6.59;
  const finalVoltage = Math.round(batVoltage * 100) / 100;
  batteryBoy.addEntry(batVoltage);
  console.log('B:', finalVoltage);
  return finalVoltage;
}



/**
 * @description Watcher for long presses aka remote lock / unlock
 */

setWatch((e) => {
  console.log("L");
  isRemoteLocked = !isRemoteLocked;
  if (isRemoteLocked) executeVoltageRead();
}, D27, { repeat: true, debounce: 1000, edge: 'falling' });

setWatch((e) => {
  clearInterval(activeDrawInterval);
  g.clear();
  drawRemoteResetScreen();
}, D27, { repeat: false, debounce: 9000, edge: 'falling' });


function drawRemoteResetScreen() {

  let resetCounter = 10;
  activeDrawInterval = setInterval(() => {
    if (resetCounter === 0) {
      reset(true);
    } else {
      const seconds = resetCounter + ' s';
      g.clear();
      g.drawString('RE', 20, 21);
      g.drawString('SETT', 37, 16);
      g.drawString('ING', 54, 19.5);
      g.drawString(seconds, 94, 15);
      g.flip();
      resetCounter--;
    }
  }, 1000);
  setWatch(() => {
    drawDriveMode();
  }, D27, { repeat: false, debounce: 25, edge: 'rising' });


  isRemoteLocked = !isRemoteLocked;
  if (isRemoteLocked) executeVoltageRead();

}

/**
 * @description Watcher for Short presses aka cruise control and mode switching
 */

// const drawHandler = (function drawHandlerIIFE() {
//   let activeDrawInterval = null;
//   let activeDrawPromise = null;

//   const clearActiveInterval = () => {
//     if (activeDrawInterval !== null) {
//       clearInterval(activeDrawInterval);
//     }
//   }
//   return {
//     setDrawInterval: (callback) => {
//       activeDrawInterval = setInterval(() => {
//         activeDrawPromise = new Promise(resolve => {
//           clearActiveInterval();
//           callback();
//           resolve();
//         })
//       });
//     }
//   }
//   // WIP
// })();



setWatch((e) => {
  const diff = e.time - e.lastTime;
  if (diff > 0.9) {
    shortClickCount = 0;
    return;
  }


  // shortClickCount++;
  // if (modeChangeTimeout) clearTimeout(modeChangeTimeout);

  // modeChangeTimeout = setTimeout(() => {
  // if (shortClickCount === 2) {
  //   console.log("SettingsMode");
  // } else {
  // Toggle cruise
  if (cruisecontrolValue === null) {
    cruisecontrolValue = _joystickXAxisValue;
  } else {
    cruisecontrolValue = null;
  }
  console.log("Toggle cruise");
  setTimeout(() => {
    const killCruiseControlXInterval = setInterval((e) => {
      const joystickXAxisValue = analogRead(D28) * 255;
      if (joystickXAxisValue >= 132 || joystickXAxisValue <= 122) {
        cruisecontrolValue = null;
        clearInterval(killCruiseControlXInterval);
        clearInterval(killCruiseControlYInterval);
      }
    }, 50);
    const killCruiseControlYInterval = setInterval((e) => {
      const joystickYAxisValue = analogRead(D29) * 255;
      if (joystickYAxisValue >= 132 || joystickYAxisValue <= 120) {
        cruisecontrolValue = null;
        clearInterval(killCruiseControlXInterval);
        clearInterval(killCruiseControlYInterval);
      }
    }, 50);
  }, 700);

  //   shortClickCount = 0;
  // }, 200);

  console.log("S", shortClickCount);
}, D27, { repeat: true, debounce: 50, edge: 'rising' });

NRF.on('disconnect', (reason) => {
  console.log("board disconnected", reason);
  onInit();
});

NRF.setServices({}, { uart: false }); // Switch to false to for disabling programming;

NRF.setAdvertising([], { showName: false, connectable: false, scannable: false });




// E.setFlags({pretokenise:1}) will allow JavaScript code in RAM to be heavily compacted, and to execute more quickly.

