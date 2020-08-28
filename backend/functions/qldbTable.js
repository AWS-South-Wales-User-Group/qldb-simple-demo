/*
 * Lambda function used as a custom resource to create the table
 * in QLDB using CloudFormation
 */

const Log = require('@dazn/lambda-powertools-logger');
const response = require('cfn-response-promise');
const { getQldbDriver } = require('./helper/ConnectToLedger');

async function createTable(txn, tableName) {
  const statement = `CREATE TABLE ${tableName}`;
  return txn.execute(statement).then((result) => {
    Log.debug(`Successfully created table ${tableName}.`);
    return result;
  });
}

module.exports.handler = async (event, context) => {
  Log.debug(`QLDB Table request received:\n${JSON.stringify(event, null, 2)}`);

  try {
    if (event.RequestType === 'Create') {
      Log.debug('Attempting to create QLDB table');
      try {
        const qldbDriver = await getQldbDriver();
        await qldbDriver.executeLambda(async (txn) => {
          await createTable(txn, process.env.TABLE_NAME);
        }, () => Log.info('Retrying due to OCC conflict...'));
      } catch (e) {
        Log.error(`Unable to connect: ${e}`);
        throw e;
      }
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else if (event.RequestType === 'Delete') {
      Log.debug('Request received to delete QLDB table');
      // Do nothing as table will be deleted as part of deleting QLDB Ledger
      const responseData = { requestType: event.RequestType };
      await response.send(event, context, response.SUCCESS, responseData);
    } else {
      Log.error('Did not recognise event type resource');
      await response.send(event, context, response.FAILED);
    }
  } catch (error) {
    Log.error(`Failed to create table in custom resource: ${JSON.stringify(error)}`);
    await response.send(event, context, response.FAILED);
  }
};
