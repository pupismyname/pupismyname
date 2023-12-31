// expose environment variables to 11ty
module.exports = function() {
  return {
    env: process.env.ENV || 'production'
  };
};
