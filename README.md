# Cemu Gyro Joystick

Using Arduino & IMU module, you can turn your generic joystick to have gyro & accelerometer sensors capability to be used on CEMU (WiiU Emulator).

It's a modified version from [cemu-no-gyro](https://github.com/quinton-ashley/cemu-no-gyro/) to accept raw custom joystick (virtual) input, as a way to pass gyro and accelerometer data from Arduino. The Arduino program is available [in this repository](https://github.com/ArsenicBismuth/Arduino-Programs/tree/master/Gyro_Joystick).

The end result is a very responsive device, at a similar level to a controller with native gyro & accelerometer supports. It's basically one step better than other solutions, which are using your smartphone as a source of sensors data, as they're very bulky.

Modified:

-   Joystick now also controls the accelerometer.
-   3-axis for gyro and 3-axis for accelerometer.
-   Removing all preprocessing (except linear scaling).
-   Custom [Contro module](https://github.com/shroudedcode/contro) to accept 6-axis joystick instead of 4.
-   Also removing the requirement which only accept standard joystick.

## Credits
- Cemu no Gyro by [Quinton Ashley](https://github.com/quinton-ashley/).
- Cemuhook by [rajkosto](https://cemuhook.sshnuke.net/).