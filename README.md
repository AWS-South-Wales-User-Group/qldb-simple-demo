# QLDB Simple Demo

This is a simple demo application to show the basics of Amazon QLDB. It is currently setup into two folders:

**Backend -** this contains the functionality to expose the following API's via AWS API Gateway and AWS Lambda:

* Create Licence
* Update Licence
* Update Contact
* Get Contact


**Streams -** this contains the functionality to setup a QLDB Stream (TBD)

More detailed instructions on how to run the demo is setout in separate README files in the relevant folder


## Major Updates

**Dec-2021**

* Update permissions mode to STANDARD from ALLOW_ALL
* Switch webpack to esbuild
* Update to new fine grained permissions
* Update to Node14


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
