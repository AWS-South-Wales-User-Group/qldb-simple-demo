const { createVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');
const VehicleIntegrityError = require('./lib/VehicleIntegrityError'); 


module.exports.handler = async (event) => {
    Log.debug(`In the update licence handler`);
    return {
        statusCode: 200,
        body: JSON.stringify(`Success from update licence`)
    }; 
};