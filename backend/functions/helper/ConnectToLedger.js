const { QldbDriver } = require('amazon-qldb-driver-nodejs');

const qldbDriver = createQldbDriver();

/**
 * Create a driver for creating sessions.
 * @param ledgerName The name of the ledger to create the driver on.
 * @param serviceConfigurationOptions The configurations for the AWS SDK client that the driver uses.
 * @returns The driver for creating sessions.
 */
function createQldbDriver(
  ledgerName = process.env.LEDGER_NAME,
  serviceConfigurationOptions = {}
) {
  const qldbDriver = new QldbDriver(ledgerName, serviceConfigurationOptions);
  return qldbDriver;
}

function getQldbDriver(){
  return qldbDriver;
};

module.exports = {
  createQldbDriver,
  getQldbDriver
}