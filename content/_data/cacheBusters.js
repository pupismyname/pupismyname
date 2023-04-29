const getHash = require('../../lib/get-hash');
const processStyles = require('../../lib/process-styles.js');

// Any full build will trigger this, including the addWatchTarget on 'styles'
// a css build and returns the cachebusters for the templates
module.exports = async () => {
  // build the css and write the file to the 11ty output folder
  // TODO: Styles are rebuilt and hashes are recomputed on every rebuild.
  //       Is there a way to skip this if the styles haven't changed?
  const css = await processStyles();
  return {
    styles: getHash.fromString(css),
  }
};
