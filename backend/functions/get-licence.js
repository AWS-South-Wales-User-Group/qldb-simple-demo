/*
 * Lambda function that implements the get licence functionality
 */
const Log = require('@dazn/lambda-powertools-logger');
const { getLicence } = require('./helper/licence');
const LicenceNotFoundError = require('./lib/LicenceNotFoundError');

module.exports.handler = async (event) => {
  const { licenceid } = event.pathParameters;
  Log.debug(`In the get-licence handler with licenceid ${licenceid}`);

  try {
    const response = await getLicence(licenceid.toUpperCase());
    const licence = JSON.parse(response);

    return {
      statusCode: 200,
      body: JSON.stringify(licence),
    };
  } catch (error) {
    if (error instanceof LicenceNotFoundError) {
      return error.getHttpResponse();
    }
    Log.error(`Error returned: ${error}`);
    const errorBody = {
      status: 500,
      title: error.name,
      detail: error.message,
    };
    return {
      statusCode: 500,
      body: JSON.stringify(errorBody),
    };
  }
};
