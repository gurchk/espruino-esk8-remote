let on = false;


const name = 'PearlMcGrain';

const pwmPin = D7;


function onInit() {
  NRF.setServices(
    {
      '446e0001-85de-1237-0fe0-849acbd40fc3': {
        '446e0002-85de-1237-0fe0-849acbd40fc3': {
          value: [0],
          maxLen: 1,
          writable: true,
          onWrite: function (evt) {
            var n = evt.data[0] / 255;
            analogWrite(pwmPin, ((1.2 + n * 0.8) / 10) * 0.5, { freq: 50 });
          },
        },
      },
    },
    { uart: true } // FALSE IS DISABLING THE REPL
  );
  NRF.setAdvertising({}, { name: name });
}


NRF.on('disconnect', function () {
  digitalWrite(pwmPin, 0.5);
  digitalWrite(LED2, false);
});
NRF.on('connect', function () {
  digitalWrite(LED2, true);
});


