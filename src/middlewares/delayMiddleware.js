const delayMiddleware = (delay) => {
    return (req, res, next) => {
      setTimeout(() => {
        next();
      }, delay);
    };
  };
  
  module.exports = delayMiddleware;
  