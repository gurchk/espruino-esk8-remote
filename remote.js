//Variable Definitions

const joyStickPin = D27;
/* 
S :  single short touch to switch on 
SS : double short touch to switch off
*/
pinMode(D27, 'input_pullup');

// var SWBtn = require("https://raw.githubusercontent.com/muet/EspruinoDocs/master/modules/SWButton.js");
// var joyStickBtn = new SWBtn((k) => {
//   console.log("JoystickBtn detected " + k);
//   if (k === "S")
//     LED2.set();
//   else if (k === "SS")
//     LED3.reset();
// }, joyStickPin);


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
  width: 14, height: 13, bpp: 1,
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


var gatt;
var char;
let service;

var on = false;

var batVoltage;

var avgBatVoltage = 0;

var batteryFinal = 0;


var counter = 1;

var g;

let isRemoteLocked = false;
let modeChangeTimeout = null;

let shortClickCount = 0;


var draw = setInterval(() => { }, 100);

const batteryBoy = (function batteryBoyIIFE() {
  let rawData = [];

  return {
    getAverageVoltage: function () {
      const voltage = rawData.reduce((voltageSum, voltage) => {
        return voltageSum + voltage;
      }, 0) / rawData.length;
      return this.roundTo(voltage, 2);
    },
    addEntry: (voltage) => {
      rawData.push(voltage);
    },
    clearSamples: () => {
      rawData = [];
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
      number = (Math.round(number) / multiplicator).toFixed(2);
      if (negative) {
        number = (number * -1).toFixed(2);
      }
      return number;
    }
  };
})();


console.log("batteryBoy", batteryBoy);

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
    startWriting();
  }).catch(error => {
    console.log("Error", error);
    if (error === 'No device found matching filters') {
      setTimeout(() => {
        console.log('Retrying...');
        connectToReciever();
      }, 10000);
    }
  });
}



function startWriting() {
  var busy = false;
  var i = setInterval(function () {
    if (!gatt.connected) {
      clearInterval(i);
      return;
    }
    if (busy || isRemoteLocked) return;
    busy = true;
    var n = analogRead(D28) * 255;

    char.writeValue([n]).then(function () {
      busy = false;
    });
  }, 50);
}


function onInit() {
  console.log("INIT");
  clearInterval(draw);

  I2C1.setup(displayPins);
  g = require("SSD1306").connect(I2C1, mainDraw, { height: 32 });

  require("FontHaxorNarrow7x17").add(Graphics);

  g.setFontHaxorNarrow7x17();

  g.setFontAlign(0, 0, 3);

  draw = setInterval(mainDraw, 100);
  batteryBoy.clearSamples();
  batteryFinal = readBatteryVoltage();


  NRF.setTxPower(4);
  connectToReciever();

}



function readBatteryVoltage() {
  batVoltage = analogRead(D31);
  batVoltage = batVoltage * 6.59;
  const finalVoltage = Math.round(batVoltage * 100) / 100;
  batteryBoy.addEntry(batVoltage);
  console.log("Reading batVoltage", finalVoltage);
  return finalVoltage;
}
setInterval(readBatteryVoltage, 10000);

setInterval(() => {
  console.log("Updating display");
  batteryFinal = batteryBoy.getAverageVoltage();
}, 60 * 1000 * 1);

// 60 * 1000 * 4
// function handleYSwitching() {
//   setInterval(() => {
//     const yValue = analogRead(D29) * 255;

//     if (yValue > ) {

//     }
//   }, 100);
// }


/**
 * @description Watcher for long presses aka remote lock / unlock
 */

setWatch((e) => {
  console.log("L");
  isRemoteLocked = !isRemoteLocked;
}, D27, { repeat: true, debounce: 1000, edge: 'falling' });

/**
 * @description Watcher for Short presses aka cruise control and mode switching
 */

setWatch((e) => {
  const diff = e.time - e.lastTime;
  if (diff > 0.9) {
    shortClickCount = 0;
    return;
  }


  shortClickCount++;
  if (modeChangeTimeout) clearTimeout(modeChangeTimeout);

  modeChangeTimeout = setTimeout(() => {
    if (shortClickCount === 2) {
      console.log("SettingsMode");
    } else {
      // Toggle cruise
      console.log("Toggle cruise");
    }
    shortClickCount = 0;
  }, 200);

  console.log("S", shortClickCount);
}, D27, { repeat: true, debounce: 25, edge: 'rising' });


/**
 *  @description The main draw function fore the display;
 */



function mainDraw() {
  g.clear();

  if (!isRemoteLocked) {
    g.drawImage(unlock, 128 - 31, 3);
  }
  else {
    g.drawImage(lock, 128 - 27, 3);
  }


  g.drawString(batteryFinal, 24 + 34, 21);


  g.flip();
}


NRF.setServices({}, { uart: true }); // Switch to false to for disabling programming;
NRF.setAdvertising({}, { showName: true, connectable: true, discoverable: true });

onInit();




// E.setFlags({pretokenise:1}) will allow JavaScript code in RAM to be heavily compacted, and to execute more quickly.

