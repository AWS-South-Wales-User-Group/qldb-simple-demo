const { config } = require("aws-sdk");

config.logger = console;

/**
 * Logs an error level message.
 * @param line The message to be logged.
 */
function error(line) {
    if (isLoggerSet()) {
        _prepend(line, "ERROR");
    }
}

/**
 * Logs a message.
 * @param line The message to be logged.
 */
function log(line) {
    if (isLoggerSet()) {
        _prepend(line, "LOG");
    }
}

/**
 * @returns A boolean indicating whether a logger has been set within the AWS SDK.
 */
function isLoggerSet() {
    return config.logger !== null;
}

/**
 * Prepends a string identifier indicating the log level to the given log message, & writes or logs the given message
 * using the logger set in the AWS SDK.
 * @param line The message to be logged.
 * @param level The log level.
 */
function _prepend(line, level) {
    if (config.logger) {
        if (typeof config.logger.log === "function") {
            config.logger.log(`[${level}][Node.js QLDB Sample Code] ${line}`);
        } else if (typeof config.logger.write === "function") {
            config.logger.write(`[${level}][Node.js QLDB Sample Code] ${line}\n`);
        }
    }
}

module.exports = {
    error,
    log
}