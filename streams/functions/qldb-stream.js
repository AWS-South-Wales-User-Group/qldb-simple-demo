const Log = require('@dazn/lambda-powertools-logger');

const {  createLicence, deleteLicence, updateLicence } = require('./helper/dyanamodb-licence');

const deagg = require('aws-kinesis-agg');
const async = require('async');
const computeChecksums = true;

const ok = 'OK';
const error = 'ERROR';
const REVISION_DETAILS = 'REVISION_DETAILS';

let ion = require("ion-js");

module.exports.handler = async (event, context) => {
  console.log(`** PRINT MSG: ` + JSON.stringify(event, null, 2));
  console.log("Processing KPL Aggregated Messages using kpl-deagg(async)");
  console.log("Processing " + event.Records.length + " Kinesis Input Records");

  let realRecords = [];

  handleNoProcess(event, function() {

        // process all records in parallel
        async.map(event.Records, function(record, asyncCallback) {
          // use the async deaggregate interface. the per-record callback
          // appends the records to an array, and the after record callback
          // calls the async callback to mark the kinesis record as completed
          // within the async map operation
          deagg.deaggregate(record.kinesis, 
            computeChecksums, 
            function(err, userRecord) {
              if (err) {
                console.log("Error on Record: " + err);
                asyncCallback(err);
              } else {

                // Kinesis data is base64 encoded so decode here
                const payload = Buffer.from(userRecord.data, 'base64');

                // payload is the actual ion binary record published by QLDB to the stream
                const ionRecord = ion.load(payload);
                
                // Only process records where the record type is REVISION_DETAILS
                if (JSON.parse(ion.dumpText(ionRecord.recordType)) !== REVISION_DETAILS) {
                  console.log(`Skipping record of type ` + ion.dumpPrettyText(ionRecord.recordType));
                } else {
                  console.log("ION Record: " + ion.dumpPrettyText(ionRecord.payload))
                  realRecords.push(ionRecord);
                }
              }
            }, function(err) {
              if (err) {
                console.log(err);
              }
              // call the async callback to reflect that the kinesis message
              // is completed
              asyncCallback(err);
            });
          }, function(err, results) {
            // function is called once all kinesis records have been processed
            // by async.map
              console.log("Kinesis Record Processing Completed");
              console.log("Processed " + realRecords.length + " Kinesis User Revision Details Records");
      
              if (err) {
                finish(event, context, error, err);
              } else {
                finish(event, context, ok, "Success");
              }
      });

  });


  await Promise.all(realRecords.map(async (ionRecord) => {

    // retrieve the version and id from the metadata section of the message
    const version = ion.dumpText(ionRecord.payload.revision.metadata.version);
    const id = ion.dumpText(ionRecord.payload.revision.metadata.id).replace(/['"]+/g, '');
    const revision = ion.dumpText(ionRecord.payload.revision);

    console.log(`Version ${version} and id ${id}`);

    // Check to see if the data section exists. Wrapped in a try-catch block
    // as you cannot create an Ion value from `undefined` which errors
    try {
      const revisionData = ion.dumpText(ionRecord.payload.revision.data);
      const points = ion.dumpText(ionRecord.payload.revision.data.PenaltyPoints);
      const postcode = ion.dumpText(ionRecord.payload.revision.data.PenaltyPoints);

      // if the first version then we need to do a create
      if (version == 0) {
        await createLicence(id, points, postcode);
      } else {
        // Else it is an update
        await updateLicence(id, points, postcode); 
      }
    } catch (err) {
      console.log("No data section so handle as a delete");
      (async() => {
        await deleteLicence(id);
      })();
    }
  }));


};


/** function which closes the context correctly based on status and message */
const finish = function(event, context, status, message) {
	"use strict";

	console.log("Processing Complete");

	// log the event if we've failed
	if (status !== ok) {
		if (message) {
			console.log(message);
		}

		// ensure that Lambda doesn't checkpoint to kinesis
		context.done(status, JSON.stringify(message));
	} else {
		context.done(null, message);
	}
};

/** function which handles cases where the input message is malformed */
const handleNoProcess = function(event, callback) {

	var noProcessReason;

	if (!event.Records || event.Records.length === 0) {
		noProcessReason = "Event contains no Data";
	}
	if (event.Records[0].eventSource !== "aws:kinesis") {
		noProcessReason = "Invalid Event Source " + event.eventSource;
	}
	if (event.Records[0].kinesis.kinesisSchemaVersion !== "1.0") {
		noProcessReason = "Unsupported Event Schema Version " + event.Records[0].kinesis.kinesisSchemaVersion;
	}

	if (noProcessReason) {
		finish(event, error, noProcessReason);
	} else {
		callback();
	}
};