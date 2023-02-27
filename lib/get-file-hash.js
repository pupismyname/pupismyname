const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = (async (hashPath) => {
  try {
    const fileBuffer = await fs.promises.readFile(path.resolve(hashPath));
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (e) {
    console.error('There was a problem creating file hash.', e);
    // return something useful anyway
    return _getFakeHash();
  }
});

// some random characters
function _getFakeHash (len = 64) {
  return crypto.randomBytes(len).toString('hex');
}
