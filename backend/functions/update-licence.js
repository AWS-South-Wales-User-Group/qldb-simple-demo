/*
 * Lambda function that implements the update licence functionality
 */

const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger');
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer');
const { Metrics, logMetrics } = require('@aws-lambda-powertools/metrics');
const middy = require('@middy/core');
const dateFormat = require('dateformat');
const { updateLicence } = require('./helper/licence');

//  Params fetched from the env vars
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

tracer.captureAWS(require('aws-sdk'));

const LicenceIntegrityError = require('./lib/LicenceIntegrityError');

const handler = async (event) => {
  const { email, eventInfo } = JSON.parse(event.body);
  logger.debug(`In the update licence handler with email ${email} and eventInfo ${eventInfo}`);
  eventInfo.eventDate = dateFormat(new Date(), 'isoDateTime');

  try {
    const response = await updateLicence(email, eventInfo, logger);
    return {
      statusCode: 200,
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
