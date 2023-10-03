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

  // tags we want to filter out of tag pages and tag listings
  const filter = [ 'all', 'content', 'categories', 'filteredTags', 'articles', 'showcase' ];

  // generate a collection of categories, used to create category pages like /articles
  eleventyConfig.addCollection('categories', (collectionApi) => {
    // get all content
    const content = collectionApi.getFilteredByTag('content');
    const names = [];
    // loop through content
    const categories = content.map((item) => {
      return item.data.category;
    }).filter((category) => {
      // ignore duplicate categories
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
  eleventyConfig.addFilter('readableDateTime', (dateObj) => {
    const dt = DateTime.fromJSDate(dateObj, { zone: 'utc' }).setZone('America/Chicago');
    return dt.setLocale('en').toLocaleString(DateTime.DATETIME_FULL);
  });

  // transform tag to a more display-appropriate format
  eleventyConfig.addFilter('processTag', (tag) => {
    // special handling of the 'all' tag
    if (tag === 'all') return 'Archive';
    // don't add "Regarding" to these tags
    if (tag === 'articles' || tag === 'showcase') return capitalize(tag);
    let transformedTag = tag;
    // These acronyms should be all caps
    if (tag === 'css' || tag === 'js') {
      transformedTag = tag.toUpperCase();
    } else {
      // capitalize everything else
      transformedTag = capitalize(tag);
    }
    return `Regarding <em>${transformedTag}</em>`;
  });

  // transform tag to a more display-appropriate format
  eleventyConfig.addFilter('filterTags', (tags) => {
    if (!tags) return;
    tags = (tags.length) ? tags : Object.keys(tags);
    return tags.filter((tag) => !filter.includes(tag));
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
