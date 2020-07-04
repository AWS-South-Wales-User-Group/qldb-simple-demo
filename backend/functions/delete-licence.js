/*
 * Lambda function that implements the delete licence functionality
 */

const { deleteLicence } = require('./helper/licence');
const Log = require('@dazn/lambda-powertools-logger');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError'); 


module.exports.handler = async (event) => {
    const { LicenceId } = JSON.parse(event.body);
    Log.debug(`In the delete licence handler for licenceid ${LicenceId}`);

    try {
        const response = await deleteLicence(LicenceId);
        const message = JSON.parse(response);

        return {
            statusCode: 201,
            body: JSON.stringify(message)
        };
    } catch (error) {
        if (error instanceof LicenceIntegrityError) {
            return error.getHttpResponse();
        } else {
            Log.error('Error returned: ' + error);
            const errorBody = {
                status: 500,
                title: error.name,
                detail: error.message,
            };
            return {
              statusCode: 500,
              body: JSON.stringify(errorBody),
            };
    }
}};