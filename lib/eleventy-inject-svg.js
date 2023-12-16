const fs = require('fs');

module.exports = (eleventyConfig) => {
  eleventyConfig.addShortcode('svg', async (file, title) => {
    try {
      return (await fs.promises.readFile(file)).toString('utf8');
    } catch (e) {
      return '[svg not found]';
    }
  });
}
