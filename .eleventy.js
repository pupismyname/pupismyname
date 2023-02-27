const { DateTime } = require('luxon');
const getFileHash = require('./lib/get-file-hash');
const processStyles = require('./lib/process-styles.js');
const eleventyNavigation = require('@11ty/eleventy-navigation');
const eleventyPluginRss = require('@11ty/eleventy-plugin-rss');
const eleventyFriendlyImages = require('./lib/eleventy-friendly-images');

module.exports = ((eleventyConfig) => {

  eleventyConfig.setServerOptions({
    liveReload: false, // disable live reload so event listeners keep working
  });

  eleventyConfig.setWatchThrottleWaitTime(1000);

  eleventyConfig.addPlugin(eleventyNavigation);
  eleventyConfig.addPlugin(eleventyPluginRss);
  eleventyConfig.addPlugin(eleventyFriendlyImages, { selector: '.content img' });
  eleventyConfig.addWatchTarget('assets');
  eleventyConfig.addWatchTarget('styles');

  // eleventyConfig.addPassthroughCopy({ 'styles': '/s/styles' });
  eleventyConfig.addPassthroughCopy({ 'assets': '/s' });
  eleventyConfig.addPassthroughCopy('**/*.png');
  eleventyConfig.addPassthroughCopy('**/*.jpg');
  eleventyConfig.addPassthroughCopy('**/*.gif');
  eleventyConfig.addPassthroughCopy('**/*.webp');

  eleventyConfig.addFilter('metadataDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'America/Chicago' }).setZone('utc');
    return dt.toFormat('yyyy-LL-dd HH:mm:ss');
  });

  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en').toLocaleString(DateTime.DATETIME_FULL);
  });

  // addWatchTarget on 'styles' triggers this, which processes the styles and returns the
  // cachebusters for the templates
  eleventyConfig.addGlobalData('cacheBusters', async (eleventyConfig) => {
    await processStyles();
    return {
      styles: await getFileHash('_site/s/styles/styles.min.css'),
    }
  });

  return {
    dir: {
      input: 'content',
    },
  };

});
