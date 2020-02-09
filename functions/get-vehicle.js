const { getVehicle } = require('./helper/vehicle');
const { error, log } = require("./helper/LogUtil");

module.exports.handler = async (event) => {
  const { vehicleId } = event.pathParameters;
  log('In getVehicle handler with ID: ' + vehicleId);

  const vehicle = await getVehicle(vehicleId);

  return {
    statusCode: 200,
    body: JSON.stringify(vehicle)
  }

}