const prettier = require('prettier');
const fs = require('fs');

module.exports = (eleventyConfig) => {
  eleventyConfig.on('eleventy.after', async ({ results }) => {
    let count = 0;
    let skipped = 0;
    let failed = 0;
    for (const result of results) {
      try {
        if (result.outputPath.endsWith('.html')) {
          // prettify data.toString() instead of result.content so this works with `toJSON` builds
          const data = await fs.promises.readFile(result.outputPath);
          const prettified = await prettier.format(data.toString(), {
            parser: 'html',
          });
          fs.promises.writeFile(result.outputPath, prettified);
          count++;
        } else {
          // not an html file
          skipped++;
        }
      } catch (error) {
        console.error(`Problem prettifying file: ${error.message}`);
        failed++;
      }
    }
    console.log(`Prettify HTML - Successful: ${count}, Skipped: ${skipped}, Failed: ${failed}`);
  });
};
