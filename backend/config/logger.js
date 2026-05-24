const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // All errors go to error.log
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    // Everything goes to combined.log
    new transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  ]
});

// In development, also log to console in readable format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

module.exports = logger;