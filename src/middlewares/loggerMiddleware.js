const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "../logs");
fs.existsSync(logsDir) || fs.mkdirSync(logsDir);

const dailyRotateFileTransport = new transports.DailyRotateFile({
  level: "info",
  filename: path.join(logsDir, "application-%DATE%.log"),
  datePattern: "YYYY-MM-DD-HH",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.json()
  ),
  transports: [dailyRotateFileTransport],
});

const winstonLogMiddleware = (req, res, next) => {
  logger.info({
    method: req.method,
    url: req.originalUrl,
    protocol: req.protocol,
    host: req.hostname,
    status: res.statusCode,
    responseTime: res.get("X-Response-Time"),
    timestamp: new Date().toISOString(),
    userAgent: req.get("user-agent"),
    clientIP: req.ip,
    requestHeaders: req.headers,
    requestBody: req.body,
    queryParameters: req.query,
    route: req.route ? req.route.path : "",
    requestId: req.id,
  });
  next();
};

module.exports = {
  winstonLogMiddleware,
};
