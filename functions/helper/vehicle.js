const { Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs');
const { getQldbDriver } = require('./ConnectToLedger');
const VehicleNotFoundError = require('../lib/VehicleNotFoundError'); 
const VehicleIntegrityError = require('../lib/VehicleIntegrityError'); 
const { dom } = require("ion-js");
const Log = require('@dazn/lambda-powertools-logger');


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
    createVehicle
}