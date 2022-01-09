/*
 * Lambda function that implements the create licence functionality
 */
const { Logger, injectLambdaContext } = require('@aws-lambda-powertools/logger');
const { Tracer, captureLambdaHandler } = require('@aws-lambda-powertools/tracer');
const { Metrics, MetricUnits, logMetrics } = require('@aws-lambda-powertools/metrics');
const middy = require('@middy/core');
const dateFormat = require('dateformat');
const { createLicence } = require('./helper/licence');
const LicenceIntegrityError = require('./lib/LicenceIntegrityError');

//  Params fetched from the env vars
const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

tracer.captureAWS(require('aws-sdk'));

const handler = async (event) => {
  const {
    firstName, lastName, email, telephone, postcode,
  } = JSON.parse(event.body);

  logger.debug(`In the create licence handler with: first name ${firstName} last name ${lastName} email ${email} telephone ${telephone} and postcode ${postcode}`);

  try {
    const eventInfo = [{ eventName: 'LicenceHolderCreated', eventDate: dateFormat(new Date(), 'isoDateTime') }];
    const response = await createLicence(
      firstName, lastName, email, telephone, postcode, eventInfo, logger,
    );

    metrics.addMetric('createLicenceSucceeded', MetricUnits.Count, 1);

    return {
      statusCode: 201,
      body: JSON.stringify(response),
    };
  } catch (error) {
    metrics.addMetric('createLicenceFailed', MetricUnits.Count, 1);

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
