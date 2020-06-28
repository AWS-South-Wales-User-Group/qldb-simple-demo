const { getVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');
const VehicleNotFoundError = require('./lib/VehicleNotFoundError'); 
const VehicleIntegrityError = require('./lib/VehicleIntegrityError'); 

module.exports.handler = async (event) => {
  Log.debug(`In the get licence handler`);
  return {
      statusCode: 200,
      body: JSON.stringify(`Success from get licence`)
  }; 
}