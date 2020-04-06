const { QldbSession, Result, TransactionExecutor } = require('amazon-qldb-driver-nodejs')
const { closeQldbSession, createQldbSession } = require('./helper/ConnectToLedger');
const Log = require('@dazn/lambda-powertools-logger');
const response = require('cfn-response-promise');


module.exports.handler = async (event,context) => {
  try {

    if (event.RequestType === 'Create') {

      let session;
      try {
          session = await createQldbSession();
          await session.executeLambda(async (txn) => {
            Promise.all([
              createIndex(txn, process.env.TABLE_NAME, process.env.INDEX_NAME)
            ]);
        }, () => Log.info("Retrying due to OCC conflict..."));
      } catch (e) {
          Log.error(`Unable to connect: ${e}`);
          throw e;
      } finally {
          closeQldbSession(session);
      }
    }
    const responseData = {'requestType': event.RequestType};
    await response.send(event, context, response.SUCCESS, responseData);
  }
  catch(error) {
    Log.error(`catch all error: ${error}`);
    await response.send(event, context, response.FAILED, {'Error': error});
  }
};

async function createIndex(txn, tableName, indexAttribute){
  const statement = `CREATE INDEX on ${tableName} (${indexAttribute})`;
  return await txn.execute(statement).then((result) => {
      Log.debug(`Successfully created table ${tableName}.`);
      return result.getResultList().length;
  });
}