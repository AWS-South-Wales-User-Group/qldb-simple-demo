const { createQldbWriter, QldbSession, Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs');
const { closeQldbSession, createQldbSession } = require('./ConnectToLedger');
const { error, log } = require("./LogUtil");
const { writeValueAsIon, getFieldValue } = require("./Util");
const { decodeUtf8, makePrettyWriter, makeTextWriter, makeReader, Reader, Writer } = require("ion-js");


const getVehicle = async (vrn) => {
    console.log("In getVehicle function with id: " + vrn);

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
                const writer = makeTextWriter();
                resultList.forEach((reader) => {
                    writer.writeValues(reader);
                });
                writer.close();
        
                let ionReader = makeReader(decodeUtf8(writer.getBytes()));
                ionReader.next();
                ionReader.stepIn(); // Step into the list.
        
                let stringBuilder = '{';
                let FIRST_LOOP = true;
                while (ionReader.next() != null) {   
                    if (FIRST_LOOP) {
                        stringBuilder += `'${ionReader.fieldName()}':'${ionReader.stringValue()}'`;
                        FIRST_LOOP = false;
                    } else {
                        stringBuilder += `, '${ionReader.fieldName()}':'${ionReader.stringValue()}'`;
                    }  
                }
                stringBuilder += '}';
        
                log(`MESSAGE: ${stringBuilder}`);
                responseMessage = stringBuilder.toString();
            }

        }, () => log("Retrying due to OCC conflict..."));
    } catch (e) {
        log(`Error displaying documents: ${e}`);
    } finally {
        closeQldbSession(session);
    }
    return responseMessage;
}

async function getVehicleByVRN(txn, vrn) {
    const query = `SELECT VRN, Make, Model, Colour FROM Vehicle as v WHERE v.VRN = ?`;
    const qldbWriter = createQldbWriter();
    writeValueAsIon(vrn, qldbWriter);

    let response;
    await txn.executeInline(query, [qldbWriter]).then((result) => {
        response = result;
    });
    return response;
}


function prettyPrintResultList(resultList) {
    const writer = makePrettyWriter();
    resultList.forEach((reader) => {
        writer.writeValues(reader);
    });
    log(decodeUtf8(writer.getBytes()));
}


const createVehicle = async (vrn, make, model, colour ) => {
    console.log("In createVehicle function");

    const VEHICLE = [{"VRN": vrn, "Make": make, "Model": model, "Colour": colour }];

    let session;
    let result;
    let responseMessage;

    try {
        session = await createQldbSession();

        await session.executeLambda(async (txn) => {
            const recordsReturned = await checkVRNUnique(txn, vrn);
            log(`Number of records found for ${vrn} is ${recordsReturned}`);

            if (recordsReturned === 0) {
                result = await insertNewVehicleRecord(txn, VEHICLE);
                prettyPrintResultList(result.getResultList());
                responseMessage = `New vehicle record with VRN ${vrn} created`;
            } else {
                responseMessage = `Vehicle record with VRN ${vrn} already exists. No new record created`;
            }

        }, () => log("Retrying due to OCC conflict..."));
    } catch (e) {
        error(`Unable to insert documents: ${e}`);
    } finally {
        closeQldbSession(session);
    }
    return responseMessage;
}

async function checkVRNUnique(txn, vrn) {
    const query = `SELECT VRN FROM Vehicle AS v WHERE v.VRN = ?`;
    const vrnWriter = createQldbWriter();
    writeValueAsIon(vrn, vrnWriter);

    let recordsReturned;
    await txn.executeInline(query, [vrnWriter]).then((result) => {
        recordsReturned = result.getResultList().length;

        if (recordsReturned === 0) {
            log(`No records have been found for ${vrn}`);
        } else if (recordsReturned === 1) {
            log(`One record found for ${vrn}`);
        } else {
            log(`More than one record found for ${vrn}`);
        }
    });
    return recordsReturned;
}



async function insertNewVehicleRecord(txn, documents) {
    const statement = `INSERT INTO Vehicle ?`;
    const documentsWriter = createQldbWriter();
    writeValueAsIon(documents, documentsWriter);
    return await txn.executeInline(statement, [documentsWriter]);
}

module.exports = {
    getVehicle,
    createVehicle
}