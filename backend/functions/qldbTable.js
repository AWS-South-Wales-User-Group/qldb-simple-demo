/*
 * Lambda function used as a custom resource to create the table
 * in QLDB using CloudFormation
 */

const { Logger } = require('@aws-lambda-powertools/logger');
const response = require('cfn-response-promise');
const { getQldbDriver } = require('./helper/ConnectToLedger');

// Logger parameters fetched from the environment variables
const logger = new Logger();

async function createTable(txn, tableName) {
  const statement = `CREATE TABLE ${tableName}`;
  return txn.execute(statement).then((result) => {
    logger.debug(`Successfully created table ${tableName}.`);
    return result;
  });
}

module.exports.handler = async (event, context) => {
  logger.addContext(context);
  logger.debug(`QLDB Table request received:\n${JSON.stringify(event, null, 2)}`);

  try {
    if (event.RequestType === 'Create') {
      logger.debug('Attempting to create QLDB table');

      try {
        const qldbDriver = await getQldbDriver();
        await qldbDriver.executeLambda(async (txn) => {
          await createTable(txn, process.env.TABLE_NAME);
        }, () => logger.info('Retrying due to OCC conflict...'));
      } catch (e) {
        logger.error(`Unable to connect: ${e}`);
        await response.send(event, context, response.FAILED);
      }

      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else if (event.RequestType === 'Delete') {
      logger.debug('Request received to delete QLDB table');
      // Do nothing as table will be deleted as part of deleting QLDB Ledger
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else {
      logger.error('Did not recognise event type resource');
      await response.send(event, context, response.FAILED);
    }
  } catch (error) {
    logger.error(`Failed to create table in custom resource: ${JSON.stringify(error)}`);
    await response.send(event, context, response.FAILED);
  }
};
