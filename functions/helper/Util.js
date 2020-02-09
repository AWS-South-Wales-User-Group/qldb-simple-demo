const { createQldbWriter, QldbWriter, Result, TransactionExecutor } = require("amazon-qldb-driver-nodejs");
const { GetBlockResponse, GetDigestResponse, ValueHolder } = require("aws-sdk/clients/qldb");
const { Decimal, decodeUtf8, IonTypes, makePrettyWriter, makeReader, Reader, Timestamp, toBase64, Writer } = require("ion-js");

const { error } = require("./LogUtil");


/**
 * Converts a given value to Ion using the provided writer.
 * @param value The value to covert to Ion.
 * @param ionWriter The Writer to pass the value into.
 * @throws Error: If the given value cannot be converted to Ion.
 */
function writeValueAsIon(value, ionWriter) {
    switch (typeof value) {
        case "string":
            ionWriter.writeString(value);
            break;
        case "boolean":
            ionWriter.writeBoolean(value);
            break;
        case "number":
                ionWriter.writeInt(value);
                break;
        case "object":
            if (Array.isArray(value)) {
                // Object is an array.
                ionWriter.stepIn(IonTypes.LIST);

                for (const element of value) {
                    writeValueAsIon(element, ionWriter);
                }

                ionWriter.stepOut();
            } else if (value instanceof Date) {
                // Object is a Date.
                ionWriter.writeTimestamp(Timestamp.parse(value.toISOString()));
            } else if (value instanceof Decimal) {
                // Object is a Decimal.
                ionWriter.writeDecimal(value);
            } else if (value === null) {
                ionWriter.writeNull(IonTypes.NULL);
            } else {
                // Object is a struct.
                ionWriter.stepIn(IonTypes.STRUCT);

                for (const key of Object.keys(value)) {
                    ionWriter.writeFieldName(key);
                    writeValueAsIon(value[key], ionWriter);
                }
                ionWriter.stepOut();
            }
            break;
        default:
            throw new Error(`Cannot convert to Ion for type: ${(typeof value)}.`);
    }
}

function getFieldValue(ionReader, path) {
    ionReader.next();
    ionReader.stepIn();
    return recursivePathLookup(ionReader, path);
}

function recursivePathLookup(ionReader, path) {
    if (path.length === 0) {
        // If the path's length is 0, the current ionReader node is the value which should be returned.
        if (ionReader.type() === IonTypes.LIST) {
            const list = [];
            ionReader.stepIn(); // Step into the list.
            while (ionReader.next() != null) {
                const itemInList = recursivePathLookup(ionReader, []);
                list.push(itemInList);
            }

            return list;
        } else if (ionReader.type() === IonTypes.STRUCT) {
            const structToReturn = {};

            let type;
            const currentDepth = ionReader.depth();
            ionReader.stepIn();
            while (ionReader.depth() > currentDepth) {
                // In order to get all values within the struct, we need to visit every node.
                type = ionReader.next();
                if (type === null) {
                    // End of the container indicates that we need to step out.
                    ionReader.stepOut();
                } else {
                    structToReturn[ionReader.fieldName()] = recursivePathLookup(ionReader, []);
                }
            }
            return structToReturn;
        }
        return ionReader.value();
    } else if (path.length === 1) {
        // If the path's length is 1, the single value in the path list is the field should to be returned.

        while (ionReader.next() != null) {
            if (ionReader.fieldName() === path[0]) {
                path.shift(); // Remove the path node which we just entered.
                return recursivePathLookup(ionReader, path);
            }
        }
    } else {
        // If the path's length >= 2, the Ion tree needs to be traversed more to find the value we're looking for.

        while (ionReader.next() != null) {

            if (ionReader.fieldName() === path[0]) {
                ionReader.stepIn(); // Step into the IonStruct.
                path.shift(); // Remove the path node which we just entered.
                return recursivePathLookup(ionReader, path);
            }
        }
    }
    // If the path doesn't exist, return undefined.
    return undefined;
}


module.exports = {
    writeValueAsIon,
    getFieldValue
}