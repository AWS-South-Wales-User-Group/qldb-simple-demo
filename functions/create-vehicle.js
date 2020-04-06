const { createVehicle } = require('./helper/vehicle');
const Log = require('@dazn/lambda-powertools-logger');

module.exports.handler = async (event) => {
    const { vrn, make, model, colour } = JSON.parse(event.body);
    Log.debug(`In the create vehicle handler with VRN: ${vrn} Make: ${make} Model: ${model} Colour: ${colour}`);

    const response = await createVehicle(vrn, make, model, colour);

    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};