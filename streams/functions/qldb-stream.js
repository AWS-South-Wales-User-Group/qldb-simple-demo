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

  await Promise.all(
    event.Records.map(async (kinesisRecord) => {
      const records = await promiseDeaggregate(kinesisRecord.kinesis);
      await processRecords(records);
    })
  );
  console.log("finish");
}

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


async function processRecords(records) {
  await Promise.all(
    records.map(async (record) => {
      // Kinesis data is base64 encoded so decode here
      const payload = Buffer.from(record.data, "base64");

      // payload is the actual ion binary record published by QLDB to the stream
      const ionRecord = ion.load(payload);

      // Only process records where the record type is REVISION_DETAILS
      if (JSON.parse(ion.dumpText(ionRecord.recordType)) !== REVISION_DETAILS) {
        console.log(
          `Skipping record of type ` + ion.dumpPrettyText(ionRecord.recordType)
        );
      } else {
        console.log("ION Record: " + ion.dumpPrettyText(ionRecord.payload));
        await processION(ionRecord);
      }
    })
  );
}

async function processION(ionRecord) {
  // retrieve the version and id from the metadata section of the message
  const version = ion.dumpText(ionRecord.payload.revision.metadata.version);
  const id = ion
    .dumpText(ionRecord.payload.revision.metadata.id)
    .replace(/['"]+/g, "");
  const revision = ion.dumpText(ionRecord.payload.revision);

  console.log(`Version ${version} and id ${id}`);

  // Check to see if the data section exists. Wrapped in a try-catch block
  // as you cannot create an Ion value from `undefined` which errors
  try {
    const revisionData = ion.dumpText(ionRecord.payload.revision.data);
    const points = ion.dumpText(ionRecord.payload.revision.data.PenaltyPoints);
    const postcode = ion
      .dumpText(ionRecord.payload.revision.data.Postcode)
      .replace(/['"]+/g, "");

    console.log(`id: ${id}, points: ${points}, postcode: ${postcode}`);
    // if the first version then we need to do a create
    if (version == 0) {
      await createLicence(id, points, postcode);
    } else {
      // Else it is an update
      await updateLicence(id, points, postcode);
    }
  } catch (err) {
    console.log("No data section so handle as a delete");
    await deleteLicence(id);
  }
}