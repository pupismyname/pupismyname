const getHash = require('../../lib/get-hash');

// Generate hashes for assets to use for cache busting
module.exports = async () => {
  return {
    // Generate a hash based on the minified css
    'styles': getHash.fromFile('_site/s/styles/styles.min.css'),
    // add individual scripts (probably the same list as `build-javascript`)
    'js/hero': getHash.fromFile('_site/s/js/hero.js'),
    'js/scroll-to-top': getHash.fromFile('_site/s/js/scroll-to-top.js'),
  };
};
