const { DateTime } = require('luxon');
const eleventyPluginRss = require('@11ty/eleventy-plugin-rss');
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const eleventyFriendlyImages = require('./lib/eleventy-friendly-images');
const eleventyGenerateHeroes = require('./lib/eleventy-generate-heroes');
const eleventyInjectSvg = require('./lib/eleventy-inject-svg');
// const eleventyPrettifyHtml = require('./lib/eleventy-prettify-html');

module.exports = ((eleventyConfig) => {

  eleventyConfig.setServerOptions({
    port: 8169,
    domDiff: false,
    watch: ['_site/s/**/*'],
  });

  eleventyConfig.addPlugin(eleventyPluginRss);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(eleventyFriendlyImages, { selector: '.content img', lazy: false, });
  eleventyConfig.addPlugin(eleventyGenerateHeroes);
  eleventyConfig.addPlugin(eleventyInjectSvg);
  // eleventyConfig.addPlugin(eleventyPrettifyHtml);

  eleventyConfig.addPassthroughCopy({ 'assets': '/s' });
  // copy any images and styles that go along with content
  eleventyConfig.addPassthroughCopy('content/**/*.png');
  eleventyConfig.addPassthroughCopy('content/**/*.jpg');
  eleventyConfig.addPassthroughCopy('content/**/*.gif');
  eleventyConfig.addPassthroughCopy('content/**/*.webp');
  eleventyConfig.addPassthroughCopy('content/**/*.svg');
  eleventyConfig.addPassthroughCopy('content/**/*.css');
  eleventyConfig.addPassthroughCopy('content/**/*.js');

  // generate a collection of categories, used to create category pages like /articles
  eleventyConfig.addCollection('categories', (collectionApi) => {
    // get all content
    const content = collectionApi.getFilteredByTag('content');
    const names = new Set();
    // loop through content
    const categories = content.map((item) => {
      return item.data.category;
    }).filter((item) => {
      const has = !names.has(item.name);
      names.add(item.name);
      return has;
    }).sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return categories;
  });

  // generate a collection of tags, used to list all the tags
  eleventyConfig.addCollection('filteredTags', (collectionApi) => {
    // get all content
    const content = collectionApi.getFilteredByTag('content');
    const names = [];
    // loop through content
    const allTags = content.map((item) => item.data.tags);
    const flattenedTags = allTags.flat();
    const uniqueTags = Array.from(new Set(flattenedTags));
    const filteredTags = filterTags(uniqueTags);
    const sortedTags = filteredTags.sort();
    return sortedTags;
  });

  // convert UTC date to something like `March 25, 2023, 5:56 PM CDT`
  // Not sure why, but Netlify outputs  `March 25, 2023 at 5:56 PM CDT`
  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en-US').toLocaleString(DateTime.DATETIME_FULL);
  });

  // remove tags we don't want to display
  eleventyConfig.addFilter('filterTags', (tags) => {
    if (!tags) return;
    tags = (tags.length) ? tags : Object.keys(tags);
    return filterTags(tags);
  });

  function capitalize (word) {
    // These acronyms should be all caps
    if (word === 'css' || word === 'js') {
      return word.toUpperCase();
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
  }

  function filterTags (tags) {
    // tags we want to filter out of tag pages and tag listings
    const filteredTagList = [ 'content', 'articles', 'showcase' ];
    return tags.filter((tag) => !filteredTagList.includes(tag));
  }

  return {
    dir: {
      input: 'content',
    },
  };

});
