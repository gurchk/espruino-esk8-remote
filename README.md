# espruino-esk8-remote

### VESC UART Info

It is a uint8_t byte stream.

First byte:

0x02 for payload length of 256 byte >> next byte is for the payload length

0x03 for >256 byte payload length >> next 2 byte for the payload length

The follwing 2 bytes after the payload are the checksum. (see crc.h)

The byte stream it terminated with a 0x03.

http://forum.espruino.com/conversations/330786/#comment14629549
