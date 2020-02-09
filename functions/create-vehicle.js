const { createVehicle } = require('./helper/vehicle');
const { log } = require("./helper/LogUtil");

module.exports.handler = async (event) => {
    const { vrn, make, model, colour } = JSON.parse(event.body);
    log(`In the create vehicle handler with VRN: ${vrn} Make: ${make} Model: ${model} Colour: ${colour}`);

    const response = await createVehicle(vrn, make, model, colour);

    return {
        statusCode: 200,
        body: JSON.stringify(response)
    };
};