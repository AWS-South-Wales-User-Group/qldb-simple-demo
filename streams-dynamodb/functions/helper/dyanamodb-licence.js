const Log = require('@dazn/lambda-powertools-logger');

// see https://theburningmonk.com/2019/03/just-how-expensive-is-the-full-aws-sdk/
const DynamoDB = require('aws-sdk/clients/dynamodb');

const dynamodb = new DynamoDB.DocumentClient();

const AWSXRay = require('aws-xray-sdk-core');
AWSXRay.captureAWS(require('aws-sdk'));

const { TABLE_NAME } = process.env;

const deleteLicence = async (id, version) => {
  Log.debug('In deleteLicence function');

  const params = {
    TableName: TABLE_NAME,
    Key: { pk: id },
    UpdateExpression: 'set version=:version, isDeleted=:isDeleted',
    ExpressionAttributeValues: {
      ':version': version,
      ':isDeleted': true,
    },
    ConditionExpression: 'attribute_not_exists(id) OR version <= :version',
  };

  await dynamodb.update(params)
    .promise()
    .then(() => Log.debug('UpdateItem succeeded'))
    .catch((err) => Log.debug(`Unable to update licence: ${id}. Error JSON: ${JSON.stringify(err, null, 2)}`));
};

const getLicence = async (id) => {
  Log.debug('In getLicence function');
  const licence = await dynamodb.get({
    TableName: TABLE_NAME,
    Key: { pk: id },
  });
  return {
    id: licence.Item.pk,
    penaltyPoints: licence.Item.penaltyPoints,
    postcode: licence.Item.postcode,
  };
};

const updateLicence = async (id, points, postcode, version) => {
  Log.debug('In updateLicence function');
  const params = {
    TableName: TABLE_NAME,
    Key: { pk: id },
    UpdateExpression: 'set penaltyPoints=:points, postcode=:code, version=:version',
    ExpressionAttributeValues: {
      ':points': points,
      ':code': postcode,
      ':version': version,
    },
    ConditionExpression: 'attribute_not_exists(id) OR version <= :version',
  };

  await dynamodb.update(params)
    .promise()
    .then(() => Log.debug('UpdateItem succeeded'))
    .catch((err) => Log.debug(`Unable to update licence: ${id}. Error JSON: ${JSON.stringify(err, null, 2)}`));
};

module.exports = {
  deleteLicence,
  updateLicence,
  getLicence,
};
