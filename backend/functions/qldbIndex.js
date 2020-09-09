/*
 * Lambda function used as a custom resource to create the indexes
 * in QLDB using CloudFormation
 */
const Log = require('@dazn/lambda-powertools-logger');
const response = require('cfn-response-promise');
const { getQldbDriver } = require('./helper/ConnectToLedger');

async function createIndex(txn, tableName, indexAttribute) {
  const statement = `CREATE INDEX on ${tableName} (${indexAttribute})`;
  return txn.execute(statement).then((result) => {
    Log.debug(`Successfully created index ${indexAttribute} on table ${tableName}.`);
    return result;
  });
}

module.exports.handler = async (event, context) => {
  try {
    if (event.RequestType === 'Create') {
      Log.debug(`QLDB Index create request received:\n${JSON.stringify(event, null, 2)}`);
      try {
        const qldbDriver = await getQldbDriver();
        await qldbDriver.executeLambda(async (txn) => {
          Promise.all([
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_1),
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_2),
            createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME_3),
          ]);
        }, () => Log.info('Retrying due to OCC conflict...'));
      } catch (e) {
        Log.error(`Unable to connect: ${e}`);
        throw e;
      }
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else if (event.RequestType === 'Delete') {
      Log.debug('Request received to delete QLDB index');
      // Do nothing as table will be deleted as part of deleting QLDB Ledger
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else {
      Log.error('Did not recognise event type resource');
      await response.send(event, context, response.FAILED);
    }
  } catch (error) {
    Log.error(`catch all error: ${error}`);
    await response.send(event, context, response.FAILED, { Error: error });
  }
};
