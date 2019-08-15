
pinMode(D27, 'input_pullup');
pinMode(D22, 'input_pullup');


//-------------End animations---------------


const recieverName = 'PearlMcGrain';
const primaryService = '446e0001-85de-1237-0fe0-849acbd40fc3';
const pwmCharacteristic = '446e0002-85de-1237-0fe0-849acbd40fc3';
const lightCharacteristic = '446e0003-0890-4783-b9b5-36ff9f898937';
const queue = [];
var gatt;
var char;
let service;
var lightChar;
let busy = false;
let pause = false;
var batteryFinalPercentage = 0;
var rx = 0, ry = 0;

let cruisecontrolValue = null;
let _joystickXAxisValue;

let shortClickCount = 0;
let isRemoteLocked = false;

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
            return this.roundTo(batteryPercentage, 0);
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
function readBatteryVoltage() {
    batVoltage = analogRead(D31);
    batVoltage = batVoltage * 6.59;
    const finalVoltage = Math.round(batVoltage * 100) / 100;
    batteryBoy.addEntry(batVoltage);
    console.log('B:', finalVoltage);
    return finalVoltage;
}
function executeVoltageRead() {
    const readBatteryInterval = setInterval(readBatteryVoltage, 100);

    setTimeout(() => {
        batteryFinalPercentage = batteryBoy.getAveragePercentage();
        console.log("Updating display", batteryBoy.getRawDataAmount(), batteryFinalPercentage);
        clearInterval(readBatteryInterval);
        if (batteryFinalPercentage > 80) {
            digitalPulse(LED2, false, [300, 500, 300, 500, 300, 500]);
        } else if (batteryFinalPercentage <= 80 && batteryFinalPercentage > 70) {
            digitalPulse(LED2, false, [300, 500, 300, 500]);
        }
        else if (batteryFinalPercentage <= 70 && batteryFinalPercentage > 60) {
            digitalPulse(LED2, false, [300, 500]);
        }
        else if (batteryFinalPercentage <= 60 && batteryFinalPercentage > 50) {
            digitalPulse(LED1, false, [300, 500]);
        }
        else if (batteryFinalPercentage <= 50 && batteryFinalPercentage > 40) {
            digitalPulse(LED1, false, [300, 500, 300, 500]);
        }
        else if (batteryFinalPercentage <= 40 && batteryFinalPercentage > 30) {
            digitalPulse(LED2, false, [300, 500, 300, 500, 300, 500]);
        }
        else if (batteryFinalPercentage <= 30 && batteryFinalPercentage > 0) {
            digitalPulse(LED2, false, [300, 500, 300, 500, 300, 500, 300, 500, 300, 500]);
        }
        batteryBoy.clearSamples();
    }, 1000);
}
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
        const pwn = char || pwmCharacteristic;
        const light = lightChar || lightCharacteristic;
        return service.getCharacteristics([pwn, light]);

    }).then(function (c) {
        console.log("Got Characteristic", c);
        digitalPulse(LED2, false, [100, 100, 100, 100, 100, 100]);

        char = c.filter(service => service.uuid === pwmCharacteristic)[0];
        lightChar = c.filter(service => service.uuid !== pwmCharacteristic)[0];

        console.log("lightchar", lightChar);
        console.log("pwm", char);
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

    let i = setInterval(() => {
        if (gatt === undefined || !gatt.connected) {
            clearInterval(i);
            return;
        }
        if (busy || isRemoteLocked) return;
        busy = true;
        const read = analogRead(D28);


        _joystickXAxisValue = 0 - (read * 255) * 2 + 235;
        char.writeValue([_joystickXAxisValue]).then(() => busy = false);
    }, 50);
}



function onInit() {
    NRF.setTxPower(4);
    connectToReciever();

}


/**
 * @description Watcher for long presses aka remote lock / unlock
 */

setWatch((e) => {
    isRemoteLocked = !isRemoteLocked;
    if (isRemoteLocked) {
        digitalPulse(LED1, false, [100, 100, 100, 100, 100, 100]);
    } else {
        digitalPulse(LED2, false, [100, 100, 100, 100, 100, 100]);
    }
}, D27, { repeat: true, debounce: 1000, edge: 'falling' });

setWatch((e) => {

    executeVoltageRead();
}, D27, { repeat: true, debounce: 3000, edge: 'falling' });

setWatch((e) => {
    remoteReset();
}, D27, { repeat: false, debounce: 9000, edge: 'falling' });

const toggleLed = (e) => {
    if (busy) {
        setTimeout(() => {
            toggleLed();
        }, 30);
    } else {
        busy = true;
        lightChar.writeValue(0x00).then(() => busy = false);
    }
};
setWatch(toggleLed, D27, { repeat: true, debounce: 420, edge: 'falling' });

function remoteReset() {

    let resetCounter = 10;
    activeDrawInterval = setInterval(() => {
        if (resetCounter === 0) {
            reset(true);
        } else {
            resetCounter--;
        }
    }, 1000);

}




NRF.on('disconnect', (reason) => {
    console.log("board disconnected", reason);
    onInit();
});

NRF.setServices({}, { uart: true }); // Switch to false to for disabling programming;

NRF.setAdvertising([], { showName: true, connectable: true, scannable: true });




// E.setFlags({pretokenise:1}) will allow JavaScript code in RAM to be heavily compacted, and to execute more quickly.

