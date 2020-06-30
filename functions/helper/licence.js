const { Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs');
const { getQldbDriver } = require('./ConnectToLedger');
const LicenceIntegrityError = require('../lib/LicenceIntegrityError');
const LicenceNotFoundError = require('../lib/LicenceNotFoundError');
const { dom } = require("ion-js");
const Log = require('@dazn/lambda-powertools-logger');



const createLicence = async (name, email, telephone, event) => {
    Log.debug(`In createLicence function with name: ${name} email ${email} and telephone ${telephone}`);

    let licence;
    // Get a QLDB Driver instance
    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        // Check if the record already exists assuming email unique for demo
        const recordsReturned = await checkEmailUnique(txn, email);
        if (recordsReturned === 0) {
            // Strip out whitespace in name and add random 4 digit number at end for LicenceID
            const licenceId = (name.replace(/\s/g, '') + Math.floor(1000 + Math.random() * 9000)).toUpperCase();
            const licenceDoc = [{"LicenceId": licenceId, "Name": name, "Email": email, "Telephone": telephone, "Events": event  }]
            // Create the record. This returns the unique document ID in an array as the result set
            const result = await createBicycleLicence(txn, licenceDoc);
            const docIdArray = result.getResultList()
            const docId = docIdArray[0].get("documentId").stringValue();
            // Update the record to add the document ID as the GUID in the payload
            await addGuid(txn, docId, name);
            licence = {
                "GUID": docId,
                "LicenceId": licenceId,
                "Name": name,
                "Email": email,
                "Telephone": telephone 
            };
        } else {
            throw new LicenceIntegrityError(400, 'Licence Integrity Error', `Licence record with email ${email} already exists. No new record created`);
        }
    }, () => Log.info("Retrying due to OCC conflict..."));
    return licence;
};

// helper function to check if the email address is already registered
async function checkEmailUnique(txn, email) {
    Log.debug("In checkEmailUnique function");
    const query = `SELECT Email FROM BicycleLicence AS b WHERE b.Email = ?`;
    let recordsReturned;
    await txn.execute(query, email).then((result) => {
        recordsReturned = result.getResultList().length;
        recordsReturned === 0 ? Log.debug(`No records found for ${email}`) : Log.debug(`Record already exists for ${email}`);
    });
    return recordsReturned;
}

// helper function to create a new licence record
async function createBicycleLicence(txn, licenceDoc) {
    Log.debug("In the createBicycleLicence function");
    const statement = `INSERT INTO BicycleLicence ?`;
    return await txn.execute(statement, licenceDoc);
};

// helper function to add the unique ID as the GUID
async function addGuid(txn, docId, name) {
    Log.debug("In the addGuid function");
    const statement = `UPDATE BicycleLicence as b SET b.GUID = ? WHERE b.Name = ?`;
    return await txn.execute(statement, docId, name);
}


// Function to add or remove penalty points on a licence
const updateLicence = async (email, event) => {
    Log.debug(`In updateLicence function with email ${email} and event ${event}`);

    let licence;
    // Get a QLDB Driver instance
    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        // Get the current record

        const result = await getLicenceRecordByEmail(txn, email);
        const resultList = result.getResultList();

        if (resultList.length === 0) {
            throw new LicenceIntegrityError(400, 'Licence Integrity Error', `Licence record with email ${email} does not exist`);
        } else {
            const originalLicence = JSON.stringify(resultList[0]);
            const LICENCE = JSON.parse(originalLicence);
            const events  = LICENCE.Events;
            events.unshift(event);
            const updateResult = await addEvent(txn, events, email);
            console.log("udpateResult: " + JSON.stringify(updateResult));
            licence = JSON.stringify(updateResult[0])
        }
    }, () => Log.info("Retrying due to OCC conflict..."));
    return licence;
};

async function getLicenceRecordByEmail(txn, email) {
    Log.debug("In getLicenceRecordByEmail function");
    const query = `SELECT * FROM BicycleLicence AS b WHERE b.Email = ?`;
    return txn.execute(query, email);
}

async function getLicenceRecordById(txn, id) {
    Log.debug("In getLicenceRecordById function");
    const query = `SELECT * FROM BicycleLicence AS b WHERE b.LicenceId = ?`;
    return txn.execute(query, id);
}

// helper function to add the unique ID as the GUID
async function addEvent(txn, event, email) {
  Log.debug("In the addEvent function");
  const statement = `UPDATE BicycleLicence as b SET b.Events = ? WHERE b.Email = ?`;
  return await txn.execute(statement, event, email);
}

// Function to retrieve the current state of a licence
const getLicence = async (id) => {
    Log.debug(`In getLicence function with LicenceId ${id}`);

    let licence;
    // Get a QLDB Driver instance
    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        // Get the current record
        const result = await getLicenceRecordById(txn, id);
        const resultList = result.getResultList();

        if (resultList.length === 0) {
            throw new LicenceNotFoundError(400, 'Licence Not Found Error', `Licence record with LicenceId ${id} does not exist`);
        } else {
            licence = JSON.stringify(resultList[0]);
        }
    }, () => Log.info("Retrying due to OCC conflict..."));
    return licence;
};


module.exports = {
    createLicence,
    updateLicence,
    getLicence
}