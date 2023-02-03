const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DateTime } = require("luxon");
const eleventyNavigationPlugin = require('@11ty/eleventy-navigation');
const pluginRss = require("@11ty/eleventy-plugin-rss");
const processStyles = require('./lib/processStyles.js');

module.exports = ((eleventyConfig) => {

  eleventyConfig.setWatchThrottleWaitTime(1000);

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addWatchTarget('assets');
  eleventyConfig.addWatchTarget('styles');

  eleventyConfig.addPassthroughCopy({ 'styles': '/s/styles' });
  eleventyConfig.addPassthroughCopy({ 'assets': '/s' });

  eleventyConfig.addFilter('metadataDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'America/Chicago' }).setZone('utc');
    return dt.toFormat('yyyy-LL-dd HH:mm:ss');
  });

  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en').toLocaleString(DateTime.DATETIME_FULL);
  });

  eleventyConfig.addGlobalData('cacheBusters', async (eleventyConfig) => {
    await processStyles();
    return {
      styles: await getFileHash('_site/s/styles/styles.min.css'),
    }
  });

  async function getFileHash (hashPath) {
    try {
      if (!hashPath) return;
      const fileBuffer = await fs.promises.readFile(path.resolve(hashPath));
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const digest = hashSum.digest('hex');
      return digest;
    } catch (e) {
      console.error('There was a problem creating cacheBusters.');
      console.error(e);
    }
  }

  return {
    dir: {
      input: 'content',
    },
  };

});
