const Log = require('@dazn/lambda-powertools-logger');

// see https://theburningmonk.com/2019/03/just-how-expensive-is-the-full-aws-sdk/
const DynamoDB = require('aws-sdk/clients/dynamodb');
const dynamodb = new DynamoDB.DocumentClient();

const { TABLE_NAME } = process.env;

const createLicence = async (id, points, postcode) => {
    Log.debug(`In createLicence function`);
    const params = {
        TableName: TABLE_NAME,
        Item: {
          'pk': id,
          'penaltyPoints': points,
          'postcode': postcode
        },
    };
    await dynamodb.put(params)
        .promise()
        .then(() => Log.debug('PutItem succeeded'))
        .catch(err => Log.debug(`Unable to create licence: ${id}. Error JSON: ${JSON.stringify(err, null, 2)}`))
};


const deleteLicence = async (id) => {
    Log.debug('In deleteLicence function');
    const params = {
        TableName: TABLE_NAME,
        Key: { 'pk': id }
    };
    await dynamodb.delete(params)
        .promise()
        .then(() => Log.debug('DeleteItem succeeded'))
        .catch(err => Log.debug(`Unable to delete licence: ${id}. Error JSON: ${JSON.stringify(err, null, 2)}`))
};


const getLicence = async (id) => {
    Log.debug('In getLicence function');
    const licence = await dynamodb.get({
        TableName: TABLE_NAME,
        Key: { 'pk': id },
      });
    return {
        'id': licence.Item.pk,
        'penaltyPoints': licence.Item.penaltyPoints,
        'postcode': licence.Item.postcode
    }
};


const updateLicence = async (id, points, postcode) => {
    Log.debug('In updateLicence function');
    const params = {
        TableName: TABLE_NAME,
        Key: { 'pk': id },
        UpdateExpression: 'set penaltyPoints=:points, postcode=:code',
        ExpressionAttributeValues:{
            ':points':points,
            ':code':postcode
        }
    };

    await dynamodb.update(params)
        .promise()
        .then(() => Log.debug('UpdateItem succeeded'))
        .catch(err => console.error(`Unable to update licence: ${id}. Error JSON: ${JSON.stringify(err, null, 2)}`))
};

module.exports = {
    createLicence,
    deleteLicence,
    updateLicence,
    getLicence
};