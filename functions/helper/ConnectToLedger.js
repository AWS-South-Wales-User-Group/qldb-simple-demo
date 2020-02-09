const { PooledQldbDriver } = require('amazon-qldb-driver-nodejs');

const pooledQldbDriver = createQldbDriver();

/**
 * Create a pooled driver for creating sessions.
 * @param ledgerName The name of the ledger to create the driver on.
 * @param serviceConfigurationOptions The configurations for the AWS SDK client that the driver uses.
 * @returns PooledQldbDriver pooled driver for creating sessions.
 */
function createQldbDriver(
  ledgerName = process.env.LEDGER_NAME,
  serviceConfigurationOptions = {}
) {
  const qldbDriver = new PooledQldbDriver(ledgerName, serviceConfigurationOptions);
  return qldbDriver;
}

/**
 * Retrieve a QLDB session object.
 * @returns Promise which fufills with a {@linkcode QldbSession} object.
 */
async function createQldbSession() {
  const qldbSession = await pooledQldbDriver.getSession();
  return qldbSession;
}

function closeQldbSession(session) {
  if (null != session) {
      session.close();
  }
}

module.exports = {
  createQldbSession,
  closeQldbSession
}