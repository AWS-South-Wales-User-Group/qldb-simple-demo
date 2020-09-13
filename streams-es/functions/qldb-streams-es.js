/*
 * Lambda function that consumes messages from a Kinesis data stream that uses the
 * Kinesis Aggregated Data Format
 */
const Log = require('@dazn/lambda-powertools-logger');
const deagg = require('aws-kinesis-agg');
const ion = require('ion-js');
const { sendRequest } = require('./helper/es-licence');

const computeChecksums = true;
const REVISION_DETAILS = 'REVISION_DETAILS';

/**
 * Promisified function to deaggregate Kinesis record
 * @param record An individual Kinesis record from the aggregated records
 * @returns The resolved Promise object containing the deaggregated records
 */
const promiseDeaggregate = (record) => new Promise((resolve, reject) => {
  deagg.deaggregateSync(record, computeChecksums, (err, responseObject) => {
    if (err) {
      // handle/report error
      return reject(err);
    }
    return resolve(responseObject);
  });
});

/**
 * Processes each Ion record, and takes the appropriate action to
 * create, update or delete a record in DynamoDB
 * @param ionRecord The Ion data loaded from a Uint8Array
 */
async function processIon(ionRecord) {
  // retrieve the version and id from the metadata section of the message
  const version = ionRecord.payload.revision.metadata.version.numberValue();
  const id = ionRecord.payload.revision.metadata.id.stringValue();
  let response;

  // Check to see if the data section exists.
  if (ionRecord.payload.revision.data == null) {
    Log.debug('No data section so handle as a delete');
    response = await sendRequest({ httpMethod: 'DELETE', requestPath: `/licence/_doc/${id}?version=${version}&version_type=external` });
    Log.debug(`RESPONSE: ${JSON.stringify(response)}`);
  } else {
    const points = ionRecord.payload.revision.data.penaltyPoints.numberValue();
    const postcode = ionRecord.payload.revision.data.postcode.stringValue();
    const licenceId = ionRecord.payload.revision.data.licenceId.stringValue();
    const firstName = ionRecord.payload.revision.data.firstName.stringValue();
    const lastName = ionRecord.payload.revision.data.lastName.stringValue();

    Log.debug(`id: ${id}, points: ${points}, postcode: ${postcode}, licenceId: ${licenceId}, firstName: ${firstName}, lastName: ${lastName}}`);

    const doc = {
      licenceId,
      points,
      postcode,
      version,
      firstName,
      lastName,
    };
    response = await sendRequest({
      httpMethod: 'PUT',
      requestPath: `/licence/_doc/${id}?version=${version}&version_type=external`,
      payload: doc,
    });
    Log.debug(`RESPONSE: ${JSON.stringify(response)}`);
  }
}

/**
 * Processes each deaggregated Kinesis record in order. The function
 * ignores all records apart from those of typee REVISION_DETAILS
 * @param records The deaggregated Kinesis records to be processed
 */
async function processRecords(records) {
  await Promise.all(
    records.map(async (record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.data, 'base64');

      // payload is the actual ion binary record published by QLDB to the stream
      const ionRecord = ion.load(payload);

      // Only process records where the record type is REVISION_DETAILS
      if (ionRecord.recordType.stringValue() !== REVISION_DETAILS) {
        Log.debug(`Skipping record of type ${ion.dumpPrettyText(ionRecord.recordType)}`);
      } else {
        Log.debug(`Ion Record: ${ion.dumpPrettyText(ionRecord.payload)}`);
        await processIon(ionRecord);
      }
    }),
  );
}

module.exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log(`** PRINT MSG: ${JSON.stringify(event, null, 2)}`);
  Log.debug(`In ${context.functionName} processing  ${event.Records.length} Kinesis Input Records`);

  await Promise.all(
    event.Records.map(async (kinesisRecord) => {
      const records = await promiseDeaggregate(kinesisRecord.kinesis);
      await processRecords(records);
    }),
  );
  Log.debug('Finished processing in qldb-stream handler');
};
