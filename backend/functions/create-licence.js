/*
 * Lambda function that implements the create licence functionality
 */
const Log = require('@dazn/lambda-powertools-logger');
const dateFormat = require('dateformat');
const { createLicence } = require('./helper/licence');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');

module.exports.handler = async (event) => {
  const {
    firstName, lastName, email, telephone, postcode,
  } = JSON.parse(event.body);
  Log.debug(`In the create licence handler with: first name ${firstName} last name ${lastName} email ${email} telephone ${telephone} and postcode ${postcode}`);

  try {
    const eventInfo = [{ eventName: 'LicenceHolderCreated', eventDate: dateFormat(new Date(), 'isoDateTime') }];
    const response = await createLicence(
      firstName, lastName, email, telephone, postcode, eventInfo,
    );
    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error) {
    if (error instanceof LicenceIntegrityError) {
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
