/* Copyright (c) 2019 Gustav Karlström. See the file LICENSE for copying permission. */
/*
A VESC UART implementation
*/

var C = {
  MY: 0x001, // description
  PRIVATE: 0x001, // description
  CONSTANTS: 0x00423, // description
};

function VESC(tx, rx) {
  this.tx = tx;
  this.rx = rx;
}

/** 'public' constants here */
MOD123.prototype.C = {
  MY: 0x013, // description
  PUBLIC: 0x0541, // description
  CONSTANTS: 0x023, // description
};

/** Put most of my comments outside the functions... */
MOD123.prototype.foo = function () {
  // you can use C.PRIVATE
  // or this.C.PUBLIC
};

/** Put most of my comments outside the functions... */
MOD123.prototype.bar = function () { };

/** 
/**
 * @description Set up the uart on rx and tx
 * @example `require('VESC.js').connect({rx,tx, baudrate? = 9600, ck?})`
 */

exports.connect = function ({ rx, tx, baudrate = 9600, ck }) {
  const vesc = new VESC(rx, tx);
  Serial1.setup(baudrate, { tx, rx, ck });
};
