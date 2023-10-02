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

  eleventyConfig.addCollection('categories', (collectionApi) => {
    const content = collectionApi.getFilteredByTag('content');
    const names = [];
    const categories = content.map((item) => {
      return item.data.category;
    }).filter((category) => {
      if (!names.includes(category.name)) {
        names.push(category.name);
        return true;
      }
      return false;
    }).sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return categories;
  });

  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en').toLocaleString(DateTime.DATETIME_FULL);
  });

  eleventyConfig.addFilter('processTag', (tag) => {
    if (tag === 'all') return 'Archive';
    if (tag === 'articles' || tag === 'showcase') return capitalize(tag);
    if (tag === 'showcase') return 'Showcase';
    let transformedTag = tag;
    if (tag === 'css' || tag === 'js') {
      transformedTag = tag.toUpperCase();
    } else {
      transformedTag = capitalize(tag);
    }
    return `Regarding <em>${transformedTag}</em>`;
  });

  function capitalize (word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  return {
    dir: {
      input: 'content',
    },
  };

});
