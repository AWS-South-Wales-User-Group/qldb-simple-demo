const Log = require('@dazn/lambda-powertools-logger');


const AWS = require('aws-sdk');
const path = require('path');

const AWS_REGION = 'eu-west-1';
const { ELASTICSEARCH_DOMAIN } = process.env;
const endpoint = new AWS.Endpoint(ELASTICSEARCH_DOMAIN);
const httpClient = new AWS.HttpClient();
const credentialsProvider = new AWS.CredentialProviderChain();


/**
 * Sends a request to Elasticsearch
 *
 * @param {string} httpMethod - The HTTP method, e.g. 'GET', 'PUT', 'DELETE', etc
 * @param {string} requestPath - The HTTP path (relative to the Elasticsearch domain), e.g. '.kibana'
 * @param {Object} [payload] - An optional JavaScript object that will be serialized to the HTTP request body
 * @returns {Promise} Promise - object with the result of the HTTP response
 */
async function sendRequest({ httpMethod, requestPath, payload }) {
    console.log(`In sendRequest with method ${httpMethod} path ${requestPath} and payload ${payload}`);
    const credentials = await credentialsProvider.resolvePromise();
    const request = new AWS.HttpRequest(endpoint, AWS_REGION);

    request.method = httpMethod;
    request.path = path.join(request.path, requestPath);
    request.body = JSON.stringify(payload);
    request.headers['Content-Type'] = 'application/json';
    request.headers.Host = `${ELASTICSEARCH_DOMAIN}`;

    const signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(credentials, new Date());

    return new Promise((resolve, reject) => {
        console.log("about to make the request to ES");
        httpClient.handleRequest(
            request,
            null,
            (response) => {
                const { statusCode, statusMessage, headers } = response;
                console.log(`statusCode ${statusCode} statusMessage ${statusMessage} headers ${headers}`);

                let body = '';
                response.on('data', (chunk) => {
                    body += chunk;
                    console.log(`body ${body}`);
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
                    console.log(`data ${data}`);
                });
            },
            (err) => {
                console.log('Error inserting into ES: ' + err);
                reject(err);
            }
        );
    });
}
module.exports.sendRequest = sendRequest;