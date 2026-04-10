import logger from "../utils/logger.js";

export const requestLogger = (req, res, next) => {

  const start = Date.now();

  logger.info({
    method: req.method,
    route: req.originalUrl,
    ip: req.ip,
    body: req.method !== "GET" ? req.body : undefined
  }, "Incoming Request");

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`
    }, "Request Completed");
  });

  next();
};