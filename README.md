# Dash Streaming On Node.JS

This node project allows you to run a simple Node.JS wrapper for ffmpeg with emphasis on dash streaming. This code was optimized to run on a Rapsberry Pi 4.

## Requirements

For development, you will only need Node.js and a node global package, Yarn, installed in your environement.

### FFmpeg
- You must compile FFmpeg with OMX (Hardware)  encoding. Please follow this guide. You also need to compile my own version of FFmpef which you can find here : [Build Instructions.](BUILD_INSTRUCTIONS.md)

```
$ ffmpeg -version
ffmpeg version git-2020-10-27-71d58ec Copyright (c) 2000-2020 the FFmpeg developers
built with gcc 8 (Raspbian 8.3.0-6+rpi1)
configuration: --extra-cflags=-I/usr/local/include --extra-ldflags=-L/usr/local/lib --extra-libs='-lpthread -lm -latomic' --arch=armel --enable-gmp --enable-gpl --enable-libaom --enable-libass --enable-libdav1d --enable-libdrm --enable-libfdk-aac --enable-libfreetype --enable-libkvazaar --enable-libmp3lame --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopus --enable-librtmp --enable-libsnappy --enable-libsoxr --enable-libssh --enable-libvorbis --enable-libvpx --enable-libzimg --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-mmal --enable-nonfree --enable-omx --enable-omx-rpi --enable-version3 --target-os=linux --enable-pthreads --enable-openssl --enable-hardcoded-tables
libavutil  56. 60.100 / 56. 60.100
libavcodec 58.112.100 / 58.112.100
libavformat  58. 63.100 / 58. 63.100
libavdevice  58. 11.102 / 58. 11.102
libavfilter 7. 88.100 /  7. 88.100
libswscale  5.  8.100 /  5.  8.100
libswresample 3.  8.100 /  3.  8.100
libpostproc  55.  8.100 / 55.  8.100

```

## Install

    $ git clone https://github.com/franciscomfcmaia/uav_dash_streaming_node
    $ cd uav_dash_streaming_node
    $ npm install

## Running the project

This project must be ran with some flags. 

###  Preset Option Flag
This option will specify a preset that will be use. The preset will take simplified configurations and output FFmpeg run flags. These can be quite extensive and quite complicated.

An example:

```
$ node server.js --preset ./presets/multi-bitrate.js
```

###  Port Option Flag
This option will specify a port that will be use. The port will be used to serve a static folder with the outputted stream.

*Note: You **must** use runPort flag with this port flag to start the port service.*

An example:

```
$ node server.js --port 3000
```

###  Preset Configuration Flag
This option will specify a preset configuration that will be use. This optiosn will be passed direclty onto a preset. So an example usage would be.
An example:

```
$ node server.js -preset ./presets/multi-bitrate.js --presetConfig -b:0 1000k -b:1 2000k -f:0 "scale=-2:720" -p:0 "baseline" -f:1 "scale=-2:720" -p:1 "main" --mpdOutput "~/dash_uav_panel/http_dash/stream.mpd"
```

###  Device Flag
This option will specify a device that will be that will be use for capture. This options will be passed to ffmpeg as the input device.
An example:

```
$ node server.js --device "/dev/video0"
```

###  runPort Flag
This option will specify wether or not the port service should be run.

```
$ node server.js --port 3000 --runPort
```

### Putting it all together
 A fully loaded command line will look like this.
```
$ node server.js --preset ./presets/multi-bitrate.js \
--port 3000 --presetConfig -b:0 1000k -b:1 2000k -f:0 \
"scale=-2:720" -p:0 "baseline" -f:1 "scale=-2:720" -p:1 "main" \ 
--mpdOutput "~/dash_uav_panel/http_dash/stream.mpd" \
--device "/dev/video0" --runPort
```
