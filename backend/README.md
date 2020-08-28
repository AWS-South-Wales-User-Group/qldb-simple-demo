# QLDB Simple Demo

This is a step by step simple application to demonstrate the basics of Amazon QLDB.

## Run the demo

This simple demo application is built using the [Serverless Framework](https://serverless.com/).

To run the application use the following command:

``` sls deploy ```

and this will create the CloudFormation stack and deploy all resources

## Updates

**Jul-01-2020**
Fundamental rewrite to a Bicycle Licence application that handles a number of events:
* Create Licence
* Update Licence
* Update Contact
* Delete Licence
* Get Licence

### Create Licence
Create Licence is an HTTP POST using the following JSON

```
{
	"firstName" : "firstName",
	"lastName" : "lastName",
	"email": "qldb@qldb.com",
	"telephone" : "01345456",
	"postcode": "AB12ABC"
}
```

### Update Licence
Update Licence is an HTTP PUT using the following JSON format

```
{
	"email" : "qldb@qldb.com",
	"eventInfo": {
		"eventName": "PenaltyPointsAdded",
		"eventDescription": "Speeding in a 30 Zone",
		"penaltyPoints": 3
	}
}
```

### Update Contact
Update Contact is an HTTP PUT using the following JSON format. It allows you to update either the Telephone and/or the Postcode of the contact

```
{
	"email" : "qldb@qldb.com",
	"telephone": "01367893",
	"postcode": "AB12CDE"
	"eventInfo": {
		"eventName": "ContactDetailsChanged",
		"eventDescription": "Telephone number and postcode updated"
	}
}
```

### Delete Licence
Delete Licence is an HTTP DELETE using the following JSON format

```
{
	"licenceId" : "licenceId"
}
```

### Get Licence
Get Licence is an HTTP GET using the licence ID


**Jun-27-2020**
Updated to use Amazon QLDB Nodejs Driver v1.0.0. Most significant update is the switch from `PooledQldbDriver` to the standard `QldbDriver` which now includes the pooling functionality. The `executeLambda` method is now made available on the driver instance, so all code to create `QldbSession` instance and close the session is removed.

**Apr-06-2020**
Significant updates to migrate to the new Amazon QLDB Driver for Nodejs. Overall updates include:

* Update to Amazon QLDB Nodejs Driver v1.0.0-rc
    * Update aws-sdk
    * Update ion-js
    * Install jsbi
* Update to nodejs12.x
* Install DAZN Lambda Powertools Logger to adopt structured log format
* Return JSON success and error responses for Create and Get Vehicle APIs
* Remove all redundant functions after refactoring


