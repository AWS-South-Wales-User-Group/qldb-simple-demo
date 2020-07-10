const Log = require('@dazn/lambda-powertools-logger');

const path = require('path');

const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))

/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS');



var esDomain = {
    region: 'eu-west-1',
    endpoint: 'https://search-qldb-search-lpcdkxcvuuf5ma5zetiweyd76q.eu-west-1.es.amazonaws.com',
    index: 'myindex',
    doctype: 'mytype'
};
var endpoint = new AWS.Endpoint(esDomain.endpoint);


const { TABLE_NAME } = process.env;

const createLicence = async (doc) => {
    Log.debug(`In createLicence function with doc ${doc}`);

    let req = new AWS.HttpRequest(endpoint);

    req.method = 'POST';
    req.path = path.join('/', esDomain.index, esDomain.doctype);
    req.region = esDomain.region;
    req.headers['presigned-expires'] = false;
    req.headers['Host'] = endpoint.host;
    req.body = doc;

    let signer = new AWS.Signers.V4(req , 'es');  // es: service code
    signer.addAuthorization(creds, new Date());

    let send = new AWS.NodeHttpClient();


    Log.debug(`About to call handleRequest`);

    send.handleRequest(req, null, function(httpResp) {
        var respBody = '';
        httpResp.on('data', function (chunk) {
            respBody += chunk;
        });
        httpResp.on('end', function (chunk) {
            console.log('Response: ' + respBody);
//            context.succeed('Lambda added document ' + doc);
        });
    }, function(err) {
        console.log('Error: ' + err);
//        context.fail('Lambda failed with error ' + err);
    });

    Log.debug(`Called handleRequest`);



};


const deleteLicence = async (id) => {
    Log.debug('In deleteLicence function');
    const params = {
        TableName: TABLE_NAME,
        Key: { 'pk': id }
    };
};


const getLicence = async (id) => {
    Log.debug('In getLicence function');
    return {}
};


const updateLicence = async (id, points, postcode) => {
    Log.debug('In updateLicence function');
};

module.exports = {
    createLicence,
    deleteLicence,
    updateLicence,
    getLicence
};