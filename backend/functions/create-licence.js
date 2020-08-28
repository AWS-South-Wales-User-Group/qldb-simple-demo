/*
 * Lambda function that implements the create licence functionality
 */

const { createLicence } = require('./helper/licence');
const Log = require('@dazn/lambda-powertools-logger');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');
const dateFormat = require('dateformat');


module.exports.handler = async (event) => {
    const { firstName, lastName, email, telephone, postcode } = JSON.parse(event.body);
    Log.debug(`In the create licence handler with: first name ${firstName} last name ${lastName} email ${email} telephone ${telephone} and postcode ${postcode}`);

    try {
        const event = [{"eventName": "LicenceHolderCreated", "eventDate": dateFormat(new Date(), "isoDateTime")}];
        const response = await createLicence(firstName, lastName, email, telephone, postcode, event);
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