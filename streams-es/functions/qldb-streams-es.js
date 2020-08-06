/*
 * Lambda function that consumes messages from a Kinesis data stream that uses the
 * Kinesis Aggregated Data Format
 */

const Log = require('@dazn/lambda-powertools-logger');
const {  sendRequest } = require('./helper/es-licence');
const deagg = require('aws-kinesis-agg');
let ion = require("ion-js");


const computeChecksums = true;
const REVISION_DETAILS = 'REVISION_DETAILS';

module.exports.handler = async (event, context) => {
  console.log(`** PRINT MSG: ${JSON.stringify(event, null, 2)}`);
  Log.debug(`Processing  ${event.Records.length} Kinesis Input Records`);

  await Promise.all(
    event.Records.map(async (kinesisRecord) => {
      const records = await promiseDeaggregate(kinesisRecord.kinesis);
      await processRecords(records);
    })
  );
  Log.debug(`Finished processing in qldb-stream handler`);
}


/**
 * Promisified function to deaggregate Kinesis record
 * @param record An individual Kinesis record from the aggregated records
 * @returns The resolved Promise object containing the deaggregated records
 */
const promiseDeaggregate = (record) =>
  new Promise((resolve, reject) => {
    deagg.deaggregateSync(record, computeChecksums, (err, responseObject) => {
      if (err) {
        //handle/report error
        return reject(err);
      }
      return resolve(responseObject);
    });
});

/**
 * Processes each deaggregated Kinesis record in order. The function
 * ignores all records apart from those of typee REVISION_DETAILS
 * @param records The deaggregated Kinesis records to be processed
 */
async function processRecords(records) {
  await Promise.all(
    records.map(async (record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.data, "base64");

      // payload is the actual ion binary record published by QLDB to the stream
      const ionRecord = ion.load(payload);

      // Only process records where the record type is REVISION_DETAILS
      if (JSON.parse(ion.dumpText(ionRecord.recordType)) !== REVISION_DETAILS) {
        console.log(`Skipping record of type ${ion.dumpPrettyText(ionRecord.recordType)} with payload 
          ${ion.dumpPrettyText(ionRecord.payload)}`);
      } else {
        console.log(`Ion Record: ${ion.dumpPrettyText(ionRecord.payload)}`);
        await processIon(ionRecord);
      }
    })
  );
}

/**
 * Processes each Ion record, and takes the appropriate action to 
 * create, update or delete a record in DynamoDB
 * @param ionRecord The Ion data loaded from a Uint8Array
 */
async function processIon(ionRecord) {
  // retrieve the version and id from the metadata section of the message
  const version = ion.dumpText(ionRecord.payload.revision.metadata.version);
  const id = ion
    .dumpText(ionRecord.payload.revision.metadata.id)
    .replace(/['"]+/g, "");
  const revision = ion.dumpText(ionRecord.payload.revision);

  Log.debug(`Version ${version} and id ${id}`);

  // Check to see if the data section exists.
  if (ionRecord.payload.revision.data == null) {
    Log.debug(`No data section so handle as a delete`);
    console.log('About to delete a record from elasticsearch');
    const response = await sendRequest({ httpMethod: 'DELETE', requestPath: '/licence/_doc/' + id});
    console.log(`RESPONSE: ` + JSON.stringify(response));

  } else {
    const points = ion.dumpText(ionRecord.payload.revision.data.PenaltyPoints);
    const postcode = ion
      .dumpText(ionRecord.payload.revision.data.Postcode)
      .replace(/['"]+/g, "");

    Log.debug(`id: ${id}, points: ${points}, postcode: ${postcode}`);

    
    let doc;
    // if the first version then we need to do a create
    if (version == 0) {
      doc = {
        "points": points,
        "postcode": postcode,
        "version": version
      };
      console.log('About to insert a new record to elasticsearch');
      const response = await sendRequest({ httpMethod: 'POST', requestPath: '/licence/_doc/' + id, payload: doc });
      console.log(`RESPONSE: ` + JSON.stringify(response));

    } else {

      doc = {
        "script" : {
          "source": "if (Integer.parseInt(ctx._source.version) < Integer.parseInt(params.version)) { ctx._source.points = params.points; ctx._source.postcode = params.postcode; ctx._source.version = params.version; }",
          "lang": "painless",
          "params" : {
            "points": points,
            "postcode": postcode,
            "version": version
          }
        },
        "upsert": {
          "points": points,
          "postcode": postcode,
          "version": version
        }
      };
      console.log('About to update a record to elasticsearch');
      const response = await sendRequest({ httpMethod: 'POST', requestPath: '/licence/_update/' + id, payload: doc });
      console.log(`RESPONSE: ` + JSON.stringify(response));
    }
  }
}