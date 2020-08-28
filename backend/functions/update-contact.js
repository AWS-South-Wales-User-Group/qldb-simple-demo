/*
 * Lambda function that implements the update contact functionality
 */

const Log = require('@dazn/lambda-powertools-logger');
const dateFormat = require('dateformat');
const { updateContact } = require('./helper/licence');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');

module.exports.handler = async (event) => {
  const {
    telephone, postcode, email, eventInfo,
  } = JSON.parse(event.body);
  Log.debug(`In the update contact handler with: telephone ${telephone} postcode ${postcode} Email ${email} and eventInfo ${eventInfo}`);
  eventInfo.eventDate = dateFormat(new Date(), 'isoDateTime');

  try {
    const response = await updateContact(telephone, postcode, email, eventInfo);
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
