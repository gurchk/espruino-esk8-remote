    global.LED2=D2;
    var on = false;
    function onInit()
    {
    }
    NRF.setServices({
      "3e440001-f5bb-357d-719d-179272e4d4d9": {
        "3e440002-f5bb-357d-719d-179272e4d4d9": {
          value : [0],
          maxLen : 1,
          writable : true,
          //description: "PWM Throttle Input",
          onWrite : function(evt) {
            // Data comes in as a byte, make it 0..1 range
            var n = evt.data[0] / 255;
            // Send data directly to servo as PWM
            analogWrite(D7, ((1.2 + n*0.8)/10)*0.5, {freq:50});
          }
        }
      }
    }, { uart : true });
    NRF.setAdvertising({}, {name:"RxFlag"});
     // analogWrite(D7, pwmValue);
    //on disconnect return to a neutral state
    NRF.on('disconnect', function() {
      digitalWrite(D7,0.5);
      digitalWrite(LED, false);
    });
    NRF.on('connect', function() {
      digitalWrite(LED, true);
    });
     digitalWrite(LED2, true);
