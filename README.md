# espruino-esk8-remote

A remote + reciever software i developt with help from AntiumOne. Uses two MDBT42Q boards as reciever and transmitter.
For images or questions; https://www.electric-skateboard.builders/t/haya-12s4p-dual-vesc6-12fifties-first-build-6374/91605/5

Code is WIP and should be used with caution.

### VESC UART Info

It is a uint8_t byte stream.

First byte:

0x02 for payload length of 256 byte >> next byte is for the payload length

0x03 for >256 byte payload length >> next 2 byte for the payload length

The follwing 2 bytes after the payload are the checksum. (see crc.h)

The byte stream it terminated with a 0x03.

http://forum.espruino.com/conversations/330786/#comment14629549

# Parts list

https://docs.google.com/spreadsheets/d/1v0tvWRuCTawj9qs5H4itTRpZTiDidkjRE_8K7aALIss/edit#gid=0
