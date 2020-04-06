const { getVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');
const VehicleNotFoundError = require('./lib/VehicleNotFoundError'); 
const VehicleIntegrityError = require('./lib/VehicleIntegrityError'); 

module.exports.handler = async (event) => {
  const { vehicleId } = event.pathParameters;
  Log.debug('In getVehicle handler with ID: ' + vehicleId);

  try {
    const response = await getVehicle(vehicleId);
    const vehicle = JSON.parse(response);
    const responseBody = {
        VRN: vehicle.VRN,
        Make: vehicle.Make,
        Model: vehicle.Model,
        Colour: vehicle.Colour
    };
    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    if (error instanceof VehicleNotFoundError) {
      return error.getHttpResponse();
    } else if (error instanceof VehicleIntegrityError) {
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

}