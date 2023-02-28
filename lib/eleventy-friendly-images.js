// This plug-in adds `loading="lazy"`, `width`, `height` attributes
// to `img` elements. By default it does this for every image on the
// page, but it can be restricted by selector as 
//---
// Local images are checked every build.
// Remote images are cached for a week.
well.
//---
// This plug-in does its best to handle the base element if it
// appears in the document head. 
//---
// TODO: cache sharp meta info instead of remote images. 
// TODO: cache sharp meta info for local images, which will save
//       time on images that appear on multiple pages.   
//---

const cheerio = require('cheerio');
const EleventyFetch = require("@11ty/eleventy-fetch");
const path = require('path');
const sharp = require('sharp');

module.exports = (eleventyConfig, options = {}) => {
  const selector = options.selector || 'img'; // default to all images
  // don't use arrow function so `this` is bound (for 11ty stuff)
  eleventyConfig.addTransform('friendly-images', async function (content) {
    const $ = cheerio.load(content);
    const resolveOptions = {
      base: $('base').attr('href'),
      outputPath: eleventyConfig.dir.output,
      pageUrl: this.page.url,
    };
    const $images = $(selector);
    const imageInfoPromises = [];
    $images.each((i, image) => {
      const $image = $(image);
      const src = _resolveSrc($image.attr('src'), resolveOptions);
      imageInfoPromises.push(_modifyImage($image, src));
    });
    await Promise.all(imageInfoPromises);
    return $.html();
  });
};

// resolve src as much as we can for either fs or fetch
function _resolveSrc (src, { base = '', outputPath = '', pageUrl = '' }) {
  // full url, trust it
  if (_isRemote(src)) return src;
  // base + src will be a full url, trust it
  if (_isRemote(base)) return base + src;
  // absolute path, use outputPath with optional base
  if (src.startsWith('/')) return path.join(outputPath, '/', base, '/', src);
  // relative path with base
  if (base) return path.join(outputPath, '/', base, '/', src);
  // relative path without base
  return path.join(outputPath, '/', pageUrl, '/', src);
}

// is this a remote path or a local path?
function _isRemote (src) {
  const safe = String(src);
  return safe.startsWith('//') || safe.includes('://');
}

async function _modifyImage ($image, src) {
  const imageInfo = await _getImageInfo(src);
  $image.attr('loading', 'lazy');
  $image.attr('width', imageInfo.width);
  $image.attr('height', imageInfo.height);
  return $image;
}

function _getImageInfo (src) {
  return _isRemote(src) ? _getRemoteImage(src) : _getImageMetadata(src);
}

async function _getRemoteImage (src) {
  const buffer = await EleventyFetch(src);
  return _getImageMetadata(buffer);
}

function _getImageMetadata (src) {
  return sharp(src).metadata();
}