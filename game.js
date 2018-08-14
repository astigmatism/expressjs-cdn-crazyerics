const fs = require('fs-extra');
const Main = require('./main.js');
const path = require('path');
const config = require('config');
const async = require('async');

const processedRoot = path.join(__dirname, '/','processed','game');
const gameRoot = path.join(__dirname, '/','media','game');
const SEGMENT_SIZE = 25000000;

//file
/*

key:
f: files

returned object:
{
    f: {
        filename: [string, string, ...]
    }
}

*/

module.exports = new (function() {

    var _self = this;

	this.GetRom = function(gk, callback) {

        //first, we must have meaningful data out of the gk
        var gameKey = Main.Decompress.gamekey(gk);

        if (!gameKey) {
            return callback(400, 'err 1');
        }

        //to save time, see if this game has been generated already
        var processedPath = path.join(processedRoot, gameKey.system, gameKey.title);
        var processedFilePath = path.join(processedPath, gameKey.file);
        
        fs.readJson(processedFilePath, (err, preProcessedGame) => {
            if (err) {

                var response = {
                    f: {
                    }
                };
                var responseFile = response.f[Main.Compress.string(gameKey.file)] = []; //compress the file name to obscure it
                
                var romPath = path.join(gameRoot, gameKey.system, gameKey.title, gameKey.file);

                //open file
                fs.readFile(romPath, (err, buffer) => {
                    if (err) return callback(500, 'err 1');

                    var segments = SegmentBuffer(buffer, SEGMENT_SIZE);

                    //compress each segment to a string
                    for (var i = 0; i < segments.length; ++i) {
                        var compressedSegment = Main.Compress.bytearray(segments[i]);
                        responseFile.push(compressedSegment);
                    }

                    //write to processed location
                    fs.ensureDir(processedPath, err => {
                        if (err) return callback(500, 'err 2');

                        fs.writeJson(processedFilePath, response, (err) => {
                            if (err) return callback(500, 'err 3');
    
                            return callback(201, null, response, buffer.length);
                        });
                    });
                });
                return;
            }
            else {
                callback(200, null, preProcessedGame); //200 successfully retieved processed image
            }
        });
    };

    var SegmentBuffer = function(buffer, segmentSize) {
    
        var totalsegments = Math.ceil(buffer.length / segmentSize);
        var bufferPosition = 0;
    
        var segments = [];
    
        var i = 0;
        for (i; i < totalsegments; ++i) {
            if (i === (totalsegments - 1)) {
                var finalSegementLength = buffer.length - bufferPosition;
                var ab = new ArrayBuffer(finalSegementLength);
                var view = new Uint8Array(ab);
                for (var j = 0; j < finalSegementLength; ++j) {
                    view[j] = buffer[bufferPosition];
                    //console.log(bufferPosition + ': ' + view[j]);
                    bufferPosition++;
                }
            } else {
                var ab = new ArrayBuffer(segmentSize);
                var view = new Uint8Array(ab);
                for (var j = 0; j < segmentSize; ++j) {
                    view[j] = buffer[bufferPosition];
                    //console.log(bufferPosition + ': ' + view[j]);
                    bufferPosition++;
                }
            }
            segments[i] = view;
        }
    
        return segments;
    };
});
