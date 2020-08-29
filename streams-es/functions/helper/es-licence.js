const Log = require('@dazn/lambda-powertools-logger');
const AWS = require('aws-sdk');
const path = require('path');

const { ELASTICSEARCH_DOMAIN, REGION } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const creds = new AWS.EnvironmentCredentials('AWS');

/**
 * Sends a request to Elasticsearch
 *
 * @param {string} httpMethod - The HTTP method, e.g. 'GET', 'PUT', 'DELETE', etc
 * @param {string} requestPath - The HTTP path (relative to Elasticsearch domain), e.g. '.kibana'
 * @param {Object} [payload] - Optional JavaScript object serialized to the HTTP request body
 * @returns {Promise} Promise - object with the result of the HTTP response
 */
async function sendRequest({ httpMethod, requestPath, payload }) {
  Log.debug(`In sendRequest with method ${httpMethod} path ${requestPath} and payload ${payload}`);
  const request = new AWS.HttpRequest(endpoint, REGION);

  request.method = httpMethod;
  request.path = path.join(request.path, requestPath);
  request.body = JSON.stringify(payload);
  request.headers['Content-Type'] = 'application/json';
  request.headers.Host = `${ELASTICSEARCH_DOMAIN}`;

  const signer = new AWS.Signers.V4(request, 'es');
  signer.addAuthorization(creds, new Date());

  return new Promise((resolve, reject) => {
    httpClient.handleRequest(
      request,
      null,
      (response) => {
        const { statusCode, statusMessage, headers } = response;
        Log.debug(`statusCode ${statusCode} statusMessage ${statusMessage} headers ${headers}`);

        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          const data = {
            statusCode,
            statusMessage,
            headers,
          };
          if (body) {
            data.body = JSON.parse(body);
          }
          resolve(data);
        });
      },
      (err) => {
        Log.error(`Error inserting into ES: ${err}`);
        reject(err);
      },
    );
  });
}
module.exports.sendRequest = sendRequest;
