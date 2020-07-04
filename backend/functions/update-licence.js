const { updateLicence } = require('./helper/licence');
/*
 * Lambda function that implements the update licence functionality
 */

const Log = require('@dazn/lambda-powertools-logger');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError'); 
const dateFormat = require('dateformat');


module.exports.handler = async (event) => {
    const { Email, Event } = JSON.parse(event.body);
    Log.debug(`In the update licence handler with Email ${Email} and event ${Event}`);
    Event.eventDate = dateFormat(new Date(), "isoDateTime");

    try {
        const response = await updateLicence(Email, Event);
        return {
            statusCode: 201,
            body: JSON.stringify(response)
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
    }
};