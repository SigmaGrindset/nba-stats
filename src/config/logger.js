const winston = require("winston");

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.prettyPrint(),
    winston.format.splat(),
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json(),
    // winston.format.align(),
    winston.format.printf((info) => {
      if (typeof info.message === 'object') {
        info.message = JSON.stringify(info.message, null, 3)
      }

      return `${info.timestamp} [${info.level}]:\n${info.message}`
    })
    // winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`),
  ),
  transports: [
    new winston.transports.File({ filename: "./logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "./logs/combined.log" }),
  ]
});

if (process.env.NODE_ENV != "production") {
  logger.add(new winston.transports.Console({}));
}

module.exports = logger;
