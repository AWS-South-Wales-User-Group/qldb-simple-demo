const { createVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');
const VehicleIntegrityError = require('./lib/VehicleIntegrityError'); 


module.exports.handler = async (event) => {
    const { VRN, Make, Model, Colour } = JSON.parse(event.body);
    Log.debug(`In the create vehicle handler with VRN: ${VRN} Make: ${Make} Model: ${Model} Colour: ${Colour}`);

    try {
        const response = await createVehicle(VRN, Make, Model, Colour);
        const responseBody = {
              status: 201,
              detail: response
        };
        return {
            statusCode: 201,
            body: JSON.stringify(responseBody)
        };    
    } catch (error) {
        if (error instanceof VehicleIntegrityError) {
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