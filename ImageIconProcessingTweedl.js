var async = require('async');
var path = require('path');
var AWS = require('aws-sdk');
var gm = require('gm').subClass({
    imageMagick: true
});
var util = require('util');
import logger from './logger';

/**
 * Below, we can replace 'JPG' by an actual given type,
 * type can be extracted by body.ContentType
 * 
 */


var s3 = new AWS.S3();
exports.handler = function (event, context) {
    // Read options from the event.
    logger.message("Reading options from event:\n", util.inspect(event, { depth: 5 }));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    var dstBucket = srcBucket + "resized";
    // Sanity check: validate that source and destination are different buckets.
    if (srcBucket == dstBucket) {
        return;
    }
    var _1024px = {
        width: 1024,
        dstnKey: srcKey,
        destinationPath: "1024"
    };
    var _512px = {
        width: 512,
        dstnKey: srcKey,
        destinationPath: "512"
    };
    var _256px = {
        width: 256,
        dstnKey: srcKey,
        destinationPath: "256"
    };
    var _128px = {
        width: 128,
        dstnKey: srcKey,
        destinationPath: "128"
    };
    var _64px = {
        width: 64,
        dstnKey: srcKey,
        destinationPath: "64"
    };
    var _sizesArray = [_1024px, _512px, _256px, _128px, _64px];
    var len = _sizesArray.length;


    var typeMatch = srcKey.match(/\.([^.]*)$/);
    var fileName = path.basename(srcKey);
    if (!typeMatch) {
        return;
    }
    var imageType = typeMatch[1].toLowerCase();
    if (imageType != "jpg" && imageType != "gif" && imageType != "png" &&
        imageType != "eps") {
        return;
    }
    // Transform, and upload to same S3 bucket but to a different S3 bucket.
    async.forEachOf(_sizesArray, function (value, key, callback) {
        async.waterfall([

            function download(next) {

                // Download the image from S3 into a buffer.
                // sadly it downloads the image several times, but we couldn't place it outside
                // the variable was not recognized
                s3.getObject({
                    Bucket: srcBucket,
                    Key: srcKey
                }, next);

            },
            function convert(response, next) {
                // convert eps images to png

                gm(response.Body).antialias(true).density(
                    300).toBuffer('JPG', function (err,
                        buffer) {
                        if (err) {
                            //next(err);
                            next(err);
                        } else {

                            next(null, buffer);

                        }
                    });
            },
            function process(response, next) {

                // Transform the image buffer in memory.
                //gm(response.Body).size(function(err, size) {
                gm(response).size(function (err, size) {
                    logger.message("buf content type " + buf.ContentType);
                    // Infer the scaling factor to avoid stretching the image unnaturally.

                    var scalingFactor = Math.min(
                        _sizesArray[key].width /
                        size.width, _sizesArray[
                            key].width / size.height
                    );



                    var width = scalingFactor * size.width;
                    var height = scalingFactor * size.height;

                    width = size.width >= width ? width : size.width;
                    height = size.height >= height ? height : size.height;


                    var index = key;

                    this.resize(width, height).toBuffer(
                        'JPG', function (err,
                            buffer) {
                            if (err) {
                                next(err);
                            } else {

                                next(null, buffer, key);

                            }
                        });
                });
            },
            function upload(data, index, next) {


                // Stream the transformed image to a different folder.
                s3.putObject({
                    Bucket: dstBucket,
                    Key: "images/" + _sizesArray[
                        index].destinationPath +
                    "/" + fileName.slice(0, -4) +
                    ".jpg",
                    Body: data,
                    ContentType: 'JPG',
                    ACL: 'public-read'
                }, next);

            }
        ], function (err, result) {
            if (err) {
                logger.message(err);
            }


            callback();
        });
    }, function (err) {
        if (err) {

            logger.message('---->Unable to resize ' + srcBucket + '/' + srcKey + ' and upload to ' + dstBucket + '/images' + ' due to an error: ' + err);
        } else {
            logger.message('---->Successfully resized ' + srcBucket + ' and uploaded to' + dstBucket + "/images");
        }
        context.done();
    });
};
