//Preset : Multi Bitrate
//This will allow the creation of mutiple bitrates.
module.exports = {
  build : function(device, output, options){
    var streams = []
    allParsed = false
    var bitrateCheck = 0;
    while(!allParsed){
      if(options.indexOf(`-b:${bitrateCheck}`)>=0){ //Find first bitrate
        if(typeof options[options.indexOf(`-b:${bitrateCheck}`)+1] == 'undefined' &&
        typeof options[options.indexOf(`-f:${bitrateCheck}`)+1] == 'undefined' &&
      typeof options[options.indexOf(`-p:${bitrateCheck}`)+1] == 'undefined') {
          // does not exist
          allParsed = true
        } else {
          // does exist
          streams.push({
            id : bitrateCheck,
            bitrate : options[options.indexOf(`-b:${bitrateCheck}`)+1],
            filter : (options.indexOf(`-f:${bitrateCheck}`)>=0) ? options[options.indexOf(`-f:${bitrateCheck}`)+1] : undefined, //Cleaner
            profile : (options.indexOf(`-p:${bitrateCheck}`)>=0) ? options[options.indexOf(`-p:${bitrateCheck}`)+1] : undefined //Cleaner
          });
          bitrateCheck = bitrateCheck+1
        }
      }else{
        allParsed = true
      }
    }
    return {
      input : this.input(device),
      videoCodec : this.videoCodec(),
      output : this.output(streams, output)
    }
  },
  config : function(){
    return []
  },
  input : function(device){
    return {
      options : ['-f v4l2',
        '-video_size 1080x720',
        '-framerate 24',
        `-i ${device}`]
    }
  },
  videoCodec: function(){
    return {
      codec : "h264_omx"
    }
  },
  output : function(streams, output){
    var maps = [];
    var streamFilterOptions = []
    var streamFilter = [];
    for(var streamI in streams){
      stream = streams[streamI] // Find stream with index
      maps.push(`-map 0:v:0`) //Default for video only.
      streamFilterOptions.push(`-b:v:${stream.id} ${stream.bitrate}`)
      //Profile
      if(!(typeof stream.profile == 'undefined')){
          streamFilterOptions.push(`-profile:v:${stream.id}`)
          streamFilterOptions.push(`"${stream.profile}"`)
      }
      //Filter
      if(!(typeof stream.filter == 'undefined')){
        streamFilterOptions.push(`-filter:v:${stream.id}`)
        streamFilterOptions.push(`"${stream.filter}"`)
      }
    }
    streamFilter = streamFilter.concat(streamFilterOptions)
    var outputOptions = ['-var_stream_map',
      '"0:v:0"',
      '-window_size 5',
      '-seg_duration 1',
      '-adaptation_sets',
      '"id=0,streams=v id=1,streams=a"',
      '-use_template 1',
      '-use_timeline 1',
      '-remove_at_exit 1',
      '-f dash']
    var preOutputOptions = ['-vcodec h264_omx',
      '-g 24',
      '-keyint_min 1',
      '-zerocopy 1',
      '-bf -1',
      '-b_strategy 0',
      '-sc_threshold 0',
      '-pix_fmt yuv420p']
    var combinedOpts = maps
    combinedOpts = combinedOpts.concat(streamFilter)
    combinedOpts = combinedOpts.concat(outputOptions)
    var finalOps = preOutputOptions.concat(combinedOpts)
    finalOps.push("-f dash") //Finally add the output
    finalOps.push(output)
    return finalOps
  }
}
