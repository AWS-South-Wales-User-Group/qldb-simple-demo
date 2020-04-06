const { QldbSession, Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs');
const { closeQldbSession, createQldbSession } = require('./ConnectToLedger');
const { dom } = require("ion-js");
const Log = require('@dazn/lambda-powertools-logger');


const getVehicle = async (vrn) => {
    Log.debug("In getVehicle function with id: " + vrn);

    let result;
    let responseMessage;
    let session;
    try {
        session = await createQldbSession();
        await session.executeLambda(async (txn) => {
            result = await getVehicleByVRN(txn, vrn);
            const resultList = result.getResultList();

            if (resultList.length === 0) {
                responseMessage = `No vehicle found: ${vrn}.`;
                throw new Error(`No vehicle found: ${vrn}.`);
            } else if (resultList.length > 1) {
                responseMessage = `More than one vehicle found: ${vrn}.`;
                throw new Error(`More than one vehicle found: ${vrn}.`);
            } else {
                responseMessage = JSON.stringify(resultList[0]);
            }
        }, () => Log.info("Retrying due to OCC conflict..."));
    } catch (e) {
        Log.error(`Error displaying documents: ${e}`);
    } finally {
        closeQldbSession(session);
    }
    return responseMessage;
}

async function getVehicleByVRN(txn, vrn) {
    const query = `SELECT VRN, Make, Model, Colour FROM Vehicle as v WHERE v.VRN = ?`;
    return await txn.execute(query, vrn).then((result) => {
        return result;
    });;
}


const createVehicle = async (vrn, make, model, colour ) => {
    Log.debug("In createVehicle function");

    const VEHICLE = [{"VRN": vrn, "Make": make, "Model": model, "Colour": colour }];

    let session;
    let result;
    let responseMessage;

    try {
        session = await createQldbSession();
        await session.executeLambda(async (txn) => {
            const recordsReturned = await checkVRNUnique(txn, vrn);
            if (recordsReturned === 0) {
                result = await insertNewVehicleRecord(txn, VEHICLE);
                responseMessage = `New vehicle record with VRN ${vrn} created`;
            } else {
                responseMessage = `Vehicle record with VRN ${vrn} already exists. No new record created`;
            }
        }, () => Log.info("Retrying due to OCC conflict..."));
    } catch (e) {
        Log.error(`Unable to insert documents: ${e}`);
    } finally {
        closeQldbSession(session);
    }
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