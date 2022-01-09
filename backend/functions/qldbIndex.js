/*
 * Lambda function used as a custom resource to create the indexes
 * in QLDB using CloudFormation
 */
const { Logger } = require('@aws-lambda-powertools/logger');
const response = require('cfn-response-promise');
const { getQldbDriver } = require('./helper/ConnectToLedger');

// Logger parameters fetched from the environment variables
const logger = new Logger();

async function createIndex(txn, tableName, indexAttribute) {
  const statement = `CREATE INDEX on ${tableName} (${indexAttribute})`;
  return txn.execute(statement).then((result) => {
    logger.debug(`Successfully created index ${indexAttribute} on table ${tableName}.`);
    return result;
  });
}

module.exports.handler = async (event, context) => {
  try {
    if (event.RequestType === 'Create') {
      logger.addContext(context);
      logger.debug(`QLDB Index create request received:\n${JSON.stringify(event, null, 2)}`);
      try {
        const qldbDriver = await getQldbDriver();
        await qldbDriver.executeLambda(async (txn) => {
          Promise.all([
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_1),
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_2),
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_3),
          ]);
        }, () => logger.info('Retrying due to OCC conflict...'));
      } catch (e) {
        logger.error(`Unable to connect: ${e}`);
        throw e;
      }
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else if (event.RequestType === 'Delete') {
      logger.debug('Request received to delete QLDB index');
      // Do nothing as table will be deleted as part of deleting QLDB Ledger
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else {
      logger.error('Did not recognise event type resource');
      await response.send(event, context, response.FAILED);
    }
  } catch (error) {
    logger.error(`catch all error: ${error}`);
    await response.send(event, context, response.FAILED, { Error: error });
  }
};
