const { Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs');
const { getQldbDriver } = require('./ConnectToLedger');
const VehicleNotFoundError = require('../lib/VehicleNotFoundError'); 
const VehicleIntegrityError = require('../lib/VehicleIntegrityError'); 
const LicenceIntegrityError = require('../lib/LicenceIntegrityError');
const { dom } = require("ion-js");
const Log = require('@dazn/lambda-powertools-logger');



const createLicence = async (name, email, telephone) => {
    Log.debug(`In createLicence function with name: ${name} email ${email} and telephone ${telephone}`);

    let licence;
    // Get a QLDB Driver instance
    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        // Check if the record already exists assuming email unique for demo
        const recordsReturned = await checkEmailUnique(txn, email);
        if (recordsReturned === 0) {
            const licenceId = name.replace(/\s/g, '') + Math.floor(1000 + Math.random() * 9000);
            const licenceDoc = [{"LicenceId": licenceId, "Name": name, "Email": email, "Telephone": telephone  }]
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






const getVehicle = async (vrn) => {
    Log.debug("In getVehicle function with id: " + vrn);
    let result;
    let responseMessage;
    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        result = await getVehicleByVRN(txn, vrn);
        const resultList = result.getResultList();

        if (resultList.length === 0) {
            responseMessage = `No vehicle found: ${vrn}.`;
            throw new VehicleNotFoundError(404, 'Vehicle Not Found', `No vehicle found: ${vrn}.`);
        } else if (resultList.length > 1) {
            throw new VehicleIntegrityError(400, 'Vehicle Integrity Error', `More than one vehicle found: ${vrn}.`);
        } else {
            responseMessage = JSON.stringify(resultList[0]);
        }
    }, () => Log.info("Retrying due to OCC conflict..."));
    return responseMessage;
}

async function getVehicleByVRN(txn, vrn) {
    const query = `SELECT VRN, Make, Model, Colour FROM Vehicle as v WHERE v.VRN = ?`;
    return await txn.execute(query, vrn).then((result) => {
        return result;
    });;
}


const createVehicle = async (vrn, make, model, colour ) => {
    Log.debug(`In the create vehicle handler with VRN: ${vrn} Make: ${make} Model: ${model} Colour: ${colour}`);
    const VEHICLE = [{"VRN": vrn, "Make": make, "Model": model, "Colour": colour }];
    let result;
    let responseMessage;

    const qldbDriver = await getQldbDriver();
    await qldbDriver.executeLambda(async (txn) => {
        const recordsReturned = await checkVRNUnique(txn, vrn);
        if (recordsReturned === 0) {
            result = await insertNewVehicleRecord(txn, VEHICLE);
            responseMessage = `New vehicle record with VRN ${vrn} created`;
        } else {
            throw new VehicleIntegrityError(400, 'Vehicle Integrity Error', `Vehicle record with VRN ${vrn} already exists. No new record created`);
        }
    }, () => Log.info("Retrying due to OCC conflict..."));
    return responseMessage;
}

async function checkVRNUnique(txn, vrn) {
    Log.debug("In checkVRNUnique function");
    const query = `SELECT VRN FROM Vehicle AS v WHERE v.VRN = ?`;

    let recordsReturned;
    await txn.execute(query, vrn).then((result) => {
        recordsReturned = result.getResultList().length;
        if (recordsReturned === 0) {
            Log.debug(`No records have been found for ${vrn}`);
        } else if (recordsReturned === 1) {
            Log.debug(`One record found for ${vrn}`);
        } else {
            Log.debug(`More than one record found for ${vrn}`);
        }
    });
    return recordsReturned;
}


async function insertNewVehicleRecord(txn, documents) {
    Log.debug("In the insertNewVehicleRecord function");
    const statement = `INSERT INTO Vehicle ?`;
    return await txn.execute(statement, documents);
}

module.exports = {
    getVehicle,
    createVehicle,
    createLicence
}