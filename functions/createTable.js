const { closeQldbSession, createQldbSession } = require('./helper/ConnectToLedger');
const Log = require('@dazn/lambda-powertools-logger');
const response = require('cfn-response-promise');


module.exports.handler = async (event,context) => {
  Log.debug('Create Table request received:\n' + JSON.stringify(event));

  try {
    if (event.RequestType === 'Create') {
      let session;
      try {
          session = await createQldbSession();
          await session.executeLambda(async (txn) => {
            Promise.all([
                createTable(txn, process.env.TABLE_NAME)
            ]);
        }, () => Log.info("Retrying due to OCC conflict..."));
      } catch (e) {
          Log.error(`Unable to connect: ${e}`);
          throw e;
      } finally {
          closeQldbSession(session);
      } 
      const responseData = {'requestType': event.RequestType};
      await response.send(event, context, response.SUCCESS, responseData);
    } else {
      Log.error('Failed to create table in custom resource');
      await response.send(event, context, response.FAILED);
    }
  } catch (error) {
    Log.error('Failed to create table in custom resource: ' + JSON.stringify(error));
    await response.send(event, context, response.SUCCESS);
  }
};


async function createTable(txn, tableName){
  const statement = `CREATE TABLE ${tableName}`;
  return await txn.execute(statement).then((result) => {
      Log.debug(`Successfully created table ${tableName}.`);
      return result.getResultList().length;
  }); 
}