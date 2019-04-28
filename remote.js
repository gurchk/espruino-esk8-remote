//Variable Definitions
//hall input = d28
//bat input = d31
//"d8:c6:7e:99:1b:96 random";

var gatt;
    var char; 

var on = false;

var batVoltage;

var avgBatVoltage = 0;

var batFinal = 0;

var hallInput;

var counter = 1;

var g;

var isRemoteLocked;

var lastPress = 0;
// the number of button presses
var pressCount = 0;
// the timeout that happens one second after a button press
var timeout;

var draw = setInterval(function(){},100);


function Connect() {

        console.log("connecting...");

        NRF.requestDevice({ filters: [{ name:"RxFlag" }] }).then(function(device) {
        console.log("Found");
        return device.gatt.connect({minInterval:7.5, maxInterval:7.5});
        }).then(function(g) {
        console.log("Connected");
        gatt = g;
        return gatt.getPrimaryService(
            "3e440001-f5bb-357d-719d-179272e4d4d9");
        }).then(function(service) {
        return service.getCharacteristic(
            "3e440002-f5bb-357d-719d-179272e4d4d9");
        }).then(function (c) {
        console.log("Got Characteristic");
        char = c;

        startWriting();
        });
    }


function startWriting() {
  console.log("writing");
  var busy = false;
  var i = setInterval(function() {
    if (!gatt.connected) {
      clearInterval(i);
      return;
    }
    if (busy) return;
    busy = true;
    var n = analogRead(D28)*255;

    char.writeValue([n]).then(function() {
      busy = false;
    });
  }, 50);
}


function onInit()
{
    clearInterval(draw);

I2C1.setup({scl:D26,sda:D25});
  g = require("SSD1306").connect(I2C1, mainDraw, { height : 32 });

  require("FontHaxorNarrow7x17").add(Graphics);

  g.setFontHaxorNarrow7x17();

  g.setFontAlign(0,0,3);
  //g.setFontVector(12);

  draw = setInterval(mainDraw, 100);

isRemoteLocked = false;

batVoltage = analogRead(D31);

batVoltage = batVoltage * 6.567764361;

batFinal = Math.round(batVoltage * 100)/100;

    NRF.setTxPower(4);
        Connect();

}



 /* gatt.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
}).then(function(service) {
  return service.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca9e");
}).then(function(characteristic) {
  return characteristic.writeValue("LED1.set()\n");
}).then(function() {
  gatt.disconnect();
  console.log("Done!");
});
*/


//------------------Animations------------------
//big lock and unlock below
var lock = {
  width : 27, height : 26, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AAf/gAH/+D///4////P///7/////A///wH//8A///gH//8A///gHj/8A8B/gHgP8A8f/gH//8A///gH//+A///4H//f///5////H///4f///AA//wAD/8A=="))
};

var unlock = {
  width : 31, height : 26, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AAB/+AAB//g/A//4/gf/8/wP/+/4H///AD///AB///AA///gAf//wAP//4AHj/8ADwH+AB4D/AA8f/gAf//wAP//4AH//+AD///gB//3////5////8f///+H////AAD//AAA//A="))
};

var csEmpty = {
  width : 8, height : 7, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AQMH/wcDAQ=="))
};

var csOne = {
  width : 10, height : 7, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AFw4Hv+B3DAE"))
};

var csTwo = {
  width : 12, height : 9, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("PgQRnDoHr/oHnDQRPgA="))
};


var csFull = {
  width : 14, height : 13, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("H8CAhPkkEacOoHq/6genDkEU+QgIH8A="))
};

//-------------End animations---------------

function mainDraw()
{
 g.clear();

    if(!isRemoteLocked)
    {
      g.drawImage(unlock, 128-31, 3);
    }
    else
    {
      g.drawImage(lock, 128-27, 3);
    }

  if(counter === 0)
  {
    batFinal = Math.round(avgBatVoltage)/100;
    counter = 1;
    avgBatVoltage = 0;
  }
  else
  {
    batVoltage = analogRead(D31);

    batVoltage = batVoltage * 6.567764361;

    batVoltage = Math.round(batVoltage *     100)/100;

    avgBatVoltage = avgBatVoltage + batVoltage;

    ++counter;
    counter = counter%100;
    //console.log(counter);
  }

hallInput = analogRead(D28);

hallInput = Math.round(hallInput * 100);

//Remote Battery Indicator Draw
  g.drawString("B.BAT:", 7, 16);
g.drawString("41.8", 24, 21);
g.drawString("V",24,3);

//Board Battery Indicator Draw
  g.drawString("R.BAT:", 7 + 34, 16);
g.drawString(batFinal, 24 + 34, 21);
g.drawString("V",24 + 34,3);

//Hall effect sensor output Draw
g.drawString("-----",72,16);
g.drawString(hallInput, 64+21, 16);

//++counter;
//counter = counter%16;

g.flip();
}


function onTimeout() {

  if(pressCount === 1)
  {
    isRemoteLocked = false;
  }
  else if(pressCount === 2)
  {
    isRemoteLocked = true;
  }
  else if(pressCount === 4)
  {
    firstConnect();
  }
  else
  {
     isRemoteLocked = false;
  }

  timeout = undefined;
  pressCount = 0;
}

function onPress(timeDiff) {
  pressCount++;
  //console.log(pressCount);

  // if we had a timeout from another button press, remove it
  if (timeout) clearTimeout(timeout);
  // one second after this press, run 'onTimeout'
  timeout = setTimeout(onTimeout, 500);
}


function buttonWatcher(e) {
  var timeDiff = e.time - lastPress;
  lastPress = e.time;
  if (timeDiff>0.1) onPress(timeDiff);
}


//Main wactch of button activiation
setWatch(buttonWatcher, D29, {edge:"rising", repeat:true,debounce:25});


//button setup
digitalWrite(D30, 1);
  pinMode(D29, 'input_pulldown');

//blinks the LED in the remote
setInterval(function() {
  on = !on;
  LED1.write(on);
}, 10000);

//Main initation functions
onInit();
E.on('init', onInit);


//GENERAL COMMENTS UNUSED CODE

