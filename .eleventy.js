const { DateTime } = require('luxon');
const eleventyPluginRss = require('@11ty/eleventy-plugin-rss');
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

  // tags we want to filter out of tag pages and tag listings
  const filter = [ 'all', 'content', 'categories', 'filteredTags', 'articles', 'showcase' ];

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
    const tags = content.map((item) => {
      return item.data.tags;
    }).flat().filter((tag) => {
      // ignore duplicate categories
      if (!names.includes(tag)) {
        names.push(tag);
        return true;
      }
      return false;
    }).filter((tag) => {
      return !filter.includes(tag);
    }).sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    return tags;
  });

  // convert UTC date to something like `March 25, 2023, 5:56 PM CDT`
  // Not sure why, but Netlify outputs  `March 25, 2023 at 5:56 PM CDT`
  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en-US').toLocaleString(DateTime.DATETIME_FULL);
  });

  // transform tag to a more display-appropriate format
  eleventyConfig.addFilter('processTag', (tag, categories) => {
    // special handling of the 'all' tag
    if (tag === 'all') return 'Archive';
    // don't add "Regarding" to category names
    const isCategory = categories.some((category) => {
      return category.name === tag;
    });
    if (isCategory) {
      return capitalize(tag);
    }
    return `Regarding <em>${capitalize(tag)}</em>`;
  });

  // transform tag to a more display-appropriate format
  eleventyConfig.addFilter('filterTags', (tags) => {
    if (!tags) return;
    tags = (tags.length) ? tags : Object.keys(tags);
    return tags.filter((tag) => !filter.includes(tag));
  });

  function capitalize (word) {
    // These acronyms should be all caps
    if (word === 'css' || word === 'js') {
      return word.toUpperCase();
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
  }

  return {
    dir: {
      input: 'content',
    },
  };

});
