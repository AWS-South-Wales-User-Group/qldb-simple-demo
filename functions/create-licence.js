const { createLicence } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');
const VehicleIntegrityError = require('./lib/VehicleIntegrityError'); 
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');


module.exports.handler = async (event) => {
    const { Name, Email, Telephone } = JSON.parse(event.body);
    Log.debug(`In the create licence handler with name ${Name} email ${Email} and telephone ${Telephone}`);

    try {
        const response = await createLicence(Name, Email, Telephone);
        const responseBody = {
              status: 201,
              detail: response
        };
        return {
            statusCode: 201,
            body: JSON.stringify(responseBody)
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