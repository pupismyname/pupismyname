const getHash = require('../../lib/get-hash');

// Generate hashes for assets to use for cache busting
module.exports = async () => {
  // Don't do this for dev.
  if (process.env.ENV === 'development') {
    return {
      styles: 1,
    };
  }
  return {
    // Generate a hash based on the minified css
    styles: getHash.fromFile('_site/s/styles/styles.min.css'),
  };
};
