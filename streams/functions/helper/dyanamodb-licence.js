const https = require('https');

// see https://theburningmonk.com/2019/03/just-how-expensive-is-the-full-aws-sdk/
const DynamoDB = require('aws-sdk/clients/dynamodb');

const AWSXRay  = require('aws-xray-sdk');
const AWS      = require('aws-sdk');


// see https://theburningmonk.com/2019/02/lambda-optimization-tip-enable-http-keep-alive/
const sslAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  rejectUnauthorized: true,
});
sslAgent.setMaxListeners(0);

const dynamodb = new AWS.DynamoDB.DocumentClient({
  service: new DynamoDB({
    httpOptions: {
      agent: sslAgent
    },
  }),
});

const { TABLE_NAME } = process.env;


const createLicence = async (id, points, postcode) => {
    console.log("In createLicence function");
    const params = {
        TableName: TABLE_NAME,
        Item: {
          'pk': id,
          'penaltyPoints': points,
          'postcode': postcode
        },
    };

    console.log(`About to call dynamodb.put`);

    await dynamodb.put(params)
        .promise()
        .then(() => console.log('PutItem succeeded'))
        .catch(err => console.error('Unable to create licence', id, '. Error JSON:', JSON.stringify(err, null, 2)))

};

const deleteLicence = async (id) => {
    console.log("In deleteLicence function");
    const params = {
        TableName: TABLE_NAME,
        Key: { 'pk': id }
    };

    console.log(`About to call dynamodb.delete`);
    await dynamodb.delete(params)
        .promise()
        .then(() => console.log('DeleteItem succeeded'))
        .catch(err => console.error('Unable to delete licence', id, '. Error JSON:', JSON.stringify(err, null, 2)))

    console.log(`Return from call dynamodb.delete`);
    
};


const getLicence = async (id) => {
    console.log("In getLicence function");
    console.log(`About to call dynamodb.get`);
    const licence = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { 'pk': id },
      });
    console.log(`Return from call dynamodb.get`);
    return {
        'id': licence.Item.pk,
        'penaltyPoints': licence.Item.penaltyPoints,
        'postcode': licence.Item.postcode
    }
};


const updateLicence = async (id, points, postcode) => {
    console.log("In updateLicence function");
    const params = {
        TableName: TABLE_NAME,
        Key: { 'pk': id },
        UpdateExpression: 'set penaltyPoints=:points, postcode=:code',
        ExpressionAttributeValues:{
            ':points':points,
            ':code':postcode
        }
    };

    console.log(`About to call dynamodb.update`);
    await dynamodb.update(params)
        .promise()
        .then(() => console.log('UpdateItem succeeded'))
        .catch(err => console.error('Unable to update licence', id, '. Error JSON:', JSON.stringify(err, null, 2)))

        console.log(`Return from call dynamodb.update`);
};

module.exports = {
    createLicence,
    deleteLicence,
    updateLicence,
    getLicence
}