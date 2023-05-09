const { DateTime } = require('luxon');
const eleventyNavigation = require('@11ty/eleventy-navigation');
const eleventyPluginRss = require('@11ty/eleventy-plugin-rss');
const eleventyFriendlyImages = require('./lib/eleventy-friendly-images');

module.exports = ((eleventyConfig) => {

  eleventyConfig.setServerOptions({
    port: 8169,
    domDiff: false,
    watch: ['_site/s/**/*'],
  });

  eleventyConfig.addPlugin(eleventyNavigation);
  eleventyConfig.addPlugin(eleventyPluginRss);
  eleventyConfig.addPlugin(eleventyFriendlyImages, { selector: '.content img' });

  eleventyConfig.addPassthroughCopy({ 'assets': '/s' });
  // copy any images and styles that go along with content
  eleventyConfig.addPassthroughCopy('content/**/*.png');
  eleventyConfig.addPassthroughCopy('content/**/*.jpg');
  eleventyConfig.addPassthroughCopy('content/**/*.gif');
  eleventyConfig.addPassthroughCopy('content/**/*.webp');
  eleventyConfig.addPassthroughCopy('content/**/*.svg');
  eleventyConfig.addPassthroughCopy('content/**/*.css');
  eleventyConfig.addPassthroughCopy('content/**/*.js');

  eleventyConfig.addFilter('metadataDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'America/Chicago' }).setZone('utc');
    return dt.toFormat('yyyy-LL-dd HH:mm:ss');
  });

  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en').toLocaleString(DateTime.DATETIME_FULL);
  });

  return {
    dir: {
      input: 'content',
    },
  };

});
