const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports.fromFile = async (hashPath) => {
  try {
    const fileBuffer = await fs.promises.readFile(path.resolve(hashPath));
    return _getHash(fileBuffer);
  } catch (e) {
    console.error('There was a problem creating file hash.', e);
    // return something useful anyway
    return _getFakeHash();
  }
};

module.exports.fromString = (hashString) => {
  try {
    return _getHash(hashString);
  } catch (e) {
    console.error('There was a problem creating string hash.', e);
    // return something useful anyway
    return _getFakeHash();
  }
};

// some random characters
function _getFakeHash (len = 64) {
  return crypto.randomBytes(len).toString('hex');
}

function _getHash (value) {
  const hashSum = crypto.createHash('sha256');
  hashSum.update(value);
  return hashSum.digest('hex');
}
