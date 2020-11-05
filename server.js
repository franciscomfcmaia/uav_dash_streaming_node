//Options
const commandLineArgs = require('command-line-args')
//Options to listen to
const optionDefinitions = [
  { name: 'preset', type: String },
  { name: 'presetConfig', type: String, multiple: true},
  { name: 'port', type: Number, defaultValue: 3000 },
  { name: 'device', type: String },
  { name: 'mpdOutput', type: String },
  { name: 'cleanup', type: String },
  { name: 'runPort', type: Boolean }
]
const options = commandLineArgs(optionDefinitions)
//Setting logging option & pretty
var PrettyStream = require('bunyan-pretty-colors');
//initialise PrettyStream
var prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);
//Logging options
const bunyanOpts = {
    name: 'uav_dash_streaming',
    streams: [
      {
        level: 'debug',
        path: __dirname+'/logs/logs.json'  // log INFO and above to a file
      },
      {
        level: 'debug',
        type: 'raw',
        stream: prettyStdOut
      }
    ]
};
//Require Libraries
var express = require('express');
var dashServer = express();
var bunyan = require('bunyan');
var fs = require('fs');
var path = require('path');
var { spawn } = require('child_process');
var logger = bunyan.createLogger(bunyanOpts);
//start
logger.info(`started with arguments => ${process.argv.join(' ')}`)
//setting middleware
//Ressolve home if valid...
var resolveHome = function (filepath) {
    if (filepath[0] === '~') {
        return path.join(process.env.HOME, filepath.slice(1));
    }
    return filepath;
}
var static_folder = path.dirname(resolveHome(options.mpdOutput))+"/"; // Use mpd output to get the directory
dashServer.use(express.static(static_folder)); //Serves resources from public folder
//Terminate Script
var terminate = function(exitCode, exitMessage = "No exit message, bye!"){
  if(exitCode==1){
    logger.error(`fata error : ${exitMessage}`)
  }else{
    logger.info(exitMessage)
  }
  process.exit(exitCode);
}
//Set Exit Listeners
//process.on('exit', terminate.bind(null,0, "Graceful termination, bye :)"));
process.on('SIGINT', terminate.bind(null, 0, "CTRL+C SIGINT caught, bye :)"));
process.on('SIGUSR1', terminate.bind(null, 0, "PID Killed, bye :)"));
process.on('SIGUSR2', terminate.bind(null, 0, "PID Killed, bye :)"));
//process.on('uncaughtException', terminate.bind(null, 1, "Uncaught Exceptions, sorry :("));
//Start ffmpeg
var startServer = function(preset){
  var ffmpegOptions = preset.input.options;
  ffmpegOptions = ffmpegOptions.concat(preset.output)
  var ffmpegErr = ""
  logger.info(`ffmpeg spawned with => ${ffmpegOptions.join(" ")}`)
  var ffmpegStream = spawn('ffmpeg', ffmpegOptions, { shell: true });
  ffmpegStream.stdout.setEncoding('utf8');
  ffmpegStream.stdout.on('data', function(data) {
    //Here is where the output goes
  });
  ffmpegStream.stderr.setEncoding('utf8');
  ffmpegStream.stderr.on('data', function(data) {
    //Here is where the error output goes
    data=data.toString()
    ffmpegErr = ffmpegErr + data
  });
  ffmpegStream.on('close', function(code) {
    //Close script
    terminate(1, ffmpegErr)
  });
}
//loading preset
try {
  if (fs.existsSync(options.preset)) {
    var preset = require(options.preset);
    logger.info(`preset loaded, building config...`)
    var ffmpegConfig = preset.build(options.device, options.mpdOutput, options.presetConfig)
    logger.info(`preset built configs ok`)
    startServer(ffmpegConfig)
  }else{
    logger.error(`preset not found => ${options.preset}`)
  }
} catch(err) {
  logger.error(`error loading preset => ${err}`)
}
if(options.runPort){
  dashServer.listen(options.port, () => {
    logger.info(`server running on port ${options.port}`)
    logger.info(`serving static => ${static_folder}`)
  })
}else{
  logger.info(`not serving to port, just outputting mpd...`)
}
