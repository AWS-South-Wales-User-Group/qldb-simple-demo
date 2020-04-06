const { getVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');

module.exports.handler = async (event) => {
  const { vehicleId } = event.pathParameters;
  Log.debug('In getVehicle handler with ID: ' + vehicleId);

  const vehicle = await getVehicle(vehicleId);

  return {
    statusCode: 200,
    body: JSON.stringify(vehicle)
  }

}