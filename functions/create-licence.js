const { createLicence } = require('./helper/licence');
const Log = require('@dazn/lambda-powertools-logger');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');
const dateFormat = require('dateformat');


module.exports.handler = async (event) => {
    const { Name, Email, Telephone } = JSON.parse(event.body);
    Log.debug(`In the create licence handler with name ${Name} email ${Email} and telephone ${Telephone}`);

    try {
        const Event = [{"eventName": "LicenceHolderCreated", "eventDate": dateFormat(new Date(), "isoDateTime")}];
        const response = await createLicence(Name, Email, Telephone, Event);
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