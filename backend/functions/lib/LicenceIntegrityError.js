/*
 * Custom error when there is an issue with the details passed in
 */
class LicenceIntegrityError extends Error {
  constructor(status, message, description) {
    super(message);
    this.status = status;
    this.description = description;
  }

  getHttpResponse() {
    const responseBody = {
      status: this.status,
      title: this.message,
      detail: this.description,
    };

    return {
      statusCode: this.status,
      body: JSON.stringify(responseBody),
    };
  }
}

module.exports = LicenceIntegrityError;
