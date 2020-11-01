# [FFmpeg] Preparing Raspberry Pi 4 With HW Accelaration

In this guide we will discuss how to prepare the **Raspberry Pi 4 for DASH HLS** streaming with real time transcoding to different bitrates. 

One of the great challanges for this is the fact that the RPI (Raspberry Pi) comes with only one harware encoder. This means that for multiple bitrates the **HW Encoder will have to be flipped between different processes.**

**Note: This guide was written based on a Raspberry Pi 4 4GB Ram Running 2020-08-20-raspios-buster-armhf-lite.**

**Note: We will not be covering FFserver as this has been dropped by the FFmpeg team.**

*I have opted to start with FFmpeg because GPAC's MP4Box is little bit unstable for live broadcasting at the moment. But this will be the next step.*


## FFmpeg Francisco Maia's Patch For Dequeued v4l2 buffer

**It is important to note that I recommend building from my own fork of FFmpeg.** 

There is a bug on the main FFmpeg repo that doesnt allow for mismatched video buffers sizes on v4linux, which for our application is crucial. 

***Without the patched v4linux interface we will have very big problems capturing from a video device at 1080p on a RPI***

This is because the hardware requires an alignment to 16 lines under some conditions, even if the number of active pixels within the buffer is lower than that.

The video codecs are a prime example of that as they work on macroblocks of 16x16. The selection api is then used to define the number of active pixels.

    1080 is not a multiple of 16, so it is rounded up to 1088 lines.
    1920*1080*2 (yuyv is 16bpp) = 4147200
    1920*1088*2 = 4177920

A bigger buffer is sufficient to carry the image described, but ffmpeg uses **=** instead of **>=**, and complains.

## Installing the Packages Needed for FFmpeg

In this section. we will be preparing your Raspberry Pi by installing all the required libraries for compiling FFmpeg.

Before we begin, you should first update both the package list and the installed packages.

To update everything, all you need to do is run the following two commands.

    sudo apt update 
    sudo apt upgrade
  
### 1. Installing Packages For FFmpeg Compilation

As there are quite a few, the installation process may take some time to complete.

Run the following command to install all of the required packages to your Raspberry Pi.

    sudo apt -y install autoconf automake build-essential cmake doxygen git graphviz imagemagick libasound2-dev libass-dev libavcodec-dev libavdevice-dev libavfilter-dev libavformat-dev libavutil-dev libfreetype6-dev libgmp-dev libmp3lame-dev libopencore-amrnb-dev libopencore-amrwb-dev libopus-dev librtmp-dev libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-net-dev libsdl2-ttf-dev libsnappy-dev libsoxr-dev libssh-dev libssl-dev libtool libv4l-dev libva-dev libvdpau-dev libvo-amrwbenc-dev libvorbis-dev libwebp-dev libx264-dev libx265-dev libxcb-shape0-dev libxcb-shm0-dev libxcb-xfixes0-dev libxcb1-dev libxml2-dev lzma-dev meson nasm pkg-config python3-dev python3-pip texinfo wget yasm zlib1g-dev libdrm-dev

### 2. Compiling the Additional Libraries on the Raspberry Pi

Before we get started, let’s create a directory where we will store the code for each of these libraries.

    mkdir ~/ffmpeg-libraries
The first library that we are going to compile is the  [Fraunhofer FDK AAC library](https://github.com/mstorsjo/fdk-aac).

Compiling this library will allow FFmpeg to have support for the  **AAC sound format**.

Run the following command to download and compile the source code to your Raspberry Pi.

    git clone --depth 1 https://github.com/mstorsjo/fdk-aac.git ~/ffmpeg-libraries/fdk-aac \ 
    	&& cd ~/ffmpeg-libraries/fdk-aac \
    	&& autoreconf -fiv \ 
    	&& ./configure \ 
    	&& make -j$(nproc) \ 
    	&& sudo make install
 
 The next library we are going to compile is the “**dav1d**” library.

This library will add support for decoding the AV1 video format into FFmpeg. This codec is considered the successor of the VP9 codec and as a competitor to the x265 codec.

Run the following command to compile and install the  [“**dav1d**” library](https://code.videolan.org/videolan/dav1d)  to your Raspberry Pi.

    git clone --depth 1 https://code.videolan.org/videolan/dav1d.git ~/ffmpeg-libraries/dav1d \ 
	    && mkdir ~/ffmpeg-libraries/dav1d/build \ 
	    && cd ~/ffmpeg-libraries/dav1d/build \ 
	    && meson .. \ 
	    && ninja \ 
	    && sudo ninja install
	    
This library that we are going to compile next is an HEVC encoder called “**kvazaar**“.

Using the following command, you can clone and compile the  [Kvazaar library](https://github.com/ultravideo/kvazaar)  on your Raspberry Pi.

    git clone --depth 1 https://github.com/ultravideo/kvazaar.git ~/ffmpeg-libraries/kvazaar \ 
	    && cd ~/ffmpeg-libraries/kvazaar \ 
	    && ./autogen.sh \ 
	    && ./configure \ 
	    && make -j$(nproc) \ 
	    && sudo make install

We can now compile the library that we need for FFmpeg to be able to support the VP8 and VP9 video codecs on our Raspberry Pi.

This library we are compiling is called  [LibVPX](https://www.webmproject.org/)  and is developed by Google.

The following command will clone, configure, and compile the library to our Pi.

    git clone --depth 1 https://chromium.googlesource.com/webm/libvpx ~/ffmpeg-libraries/libvpx \
	    && cd ~/ffmpeg-libraries/libvpx \ 
	    && ./configure --disable-examples --disable-tools --disable-unit_tests --disable-docs \ 
	    && make -j$(nproc) \ 
	    && sudo make install

We now need to compile the  [library called “**AOM**“](https://aomedia.googlesource.com/aom).

This library will allow us to add support for encoding to the AP1 video codec on your Raspberry Pi.

Use the following command to clone and compile the code on your Pi.

    git clone --depth 1 https://aomedia.googlesource.com/aom ~/ffmpeg-libraries/aom \ 
	    && mkdir ~/ffmpeg-libraries/aom/aom_build \ 
	    && cd ~/ffmpeg-libraries/aom/aom_build \ 
	    && cmake -G "Unix Makefiles" AOM_SRC -DENABLE_NASM=on -DPYTHON_EXECUTABLE="$(which python3)" -DCMAKE_C_FLAGS="-mfpu=vfp -mfloat-abi=hard" .. \ 
	    && sed -i 's/ENABLE_NEON:BOOL=ON/ENABLE_NEON:BOOL=OFF/' CMakeCache.txt \ 
	    && make -j$(nproc) \ 
	    && sudo make install

The final library we need to compile is the  [“**zimg**” library](https://github.com/sekrit-twc/zimg).

This library implements a range of image processing features, dealing with the basics of scaling, colorspace, and depth.

Clone and compile the code by running the command below.

    git clone -b release-2.9.3 https://github.com/sekrit-twc/zimg.git 
	    ~/ffmpeg-libraries/zimg \ 
	    && cd ~/ffmpeg-libraries/zimg \ 
	    && sh autogen.sh \ 
	    && ./configure \ 
	    && make \ 
	    && sudo make install
Now, run the command below to update the link cache.

This command ensures we won’t run into linking issues because the compiler can’t find a library.

    sudo ldconfig

## Compiling FFmpeg on your Raspberry Pi

In this section, we will show you how to put everything together and finally compile FFmpeg.

We can finally compile FFmpeg on our Raspberry Pi.

During the compilation, we will be enabling all the extra libraries that we compiled and installed in the previous two sections.

We will also be enabling features that help with the Raspberry Pi, such as  **omx-rpi**.

Run the following command to compile everything. This command is reasonably large, as there is a considerable amount of features that we need to enable.

    git clone --depth 1 https://github.com/FFmpeg/FFmpeg.git ~/FFmpeg \ 
	    && cd ~/FFmpeg \ 
	    && ./configure \ 
		    --extra-cflags="-I/usr/local/include" \ 
		    --extra-ldflags="-L/usr/local/lib" \ 
		    --extra-libs="-lpthread -lm -latomic" \ 
		    --arch=armel \ 
		    --enable-gmp \ 
		    --enable-gpl \ 
		    --enable-libaom \ 
		    --enable-libass \ 
		    --enable-libdav1d \ 
		    --enable-libdrm \ 
		    --enable-libfdk-aac \ 
		    --enable-libfreetype \ 
		    --enable-libkvazaar \ 
		    --enable-libmp3lame \ 
		    --enable-libopencore-amrnb \ 
		    --enable-libopencore-amrwb \ 
		    --enable-libopus \ 
		    --enable-librtmp \ 
		    --enable-libsnappy \ 
		    --enable-libsoxr \ 
		    --enable-libssh \ 
		    --enable-libvorbis \ 
		    --enable-libvpx \ 
		    --enable-libzimg \ 
		    --enable-libwebp \ 
		    --enable-libx264 \ 
		    --enable-libx265 \ 
		    --enable-libxml2 \ 
		    --enable-mmal \ 
		    --enable-nonfree \ 
		    --enable-omx \ 
		    --enable-omx-rpi \ 
		    --enable-version3 \ 
		    --target-os=linux \ 
		    --enable-pthreads \ 
		    --enable-openssl \ 
		    --enable-hardcoded-tables \ 
	    && make -j$(nproc) \ 
	    && sudo make install

Compiling FFmpeg can take significant time on the Raspberry Pi, so be patient.

At this point in the guide, you should now have FFmpeg successfully compiled on your Raspberry Pi.
