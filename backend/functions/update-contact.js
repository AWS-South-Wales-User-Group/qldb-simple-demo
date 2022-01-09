/*
 * Lambda function that implements the update contact functionality
 */
const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger');
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer');
const { Metrics, logMetrics } = require('@aws-lambda-powertools/metrics');
const middy = require('@middy/core');
const dateFormat = require('dateformat');
const { updateContact } = require('./helper/licence');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');

//  Params fetched from the env vars
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

tracer.captureAWS(require('aws-sdk'));

const handler = async (event) => {
  const {
    telephone, postcode, email, eventInfo,
  } = JSON.parse(event.body);
  logger.debug(`In the update contact handler with: telephone ${telephone} postcode ${postcode} Email ${email} and eventInfo ${eventInfo}`);
  eventInfo.eventDate = dateFormat(new Date(), 'isoDateTime');

  try {
    const response = await updateContact(telephone, postcode, email, eventInfo, logger);
    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error) {
    if (error instanceof LicenceIntegrityError) {
      return error.getHttpResponse();
    }
    logger.error(`Error returned: ${error}`);
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

module.exports.handler = middy(handler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics, { captureColdStartMetric: true }));
