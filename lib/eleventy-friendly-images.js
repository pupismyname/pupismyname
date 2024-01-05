// This plug-in adds the following attributes to images that do not have them:
// - loading="lazy"
// - width and height
// It will not overwrite attributes that already exist.
//---
// The default selector will find every `img` element on the page by default. It can be restricted
// with a selector, for example `.content img`.
//---
// Dimensions are added by using the sharp package to determine the image's width and height.
// Remote images must first be downloaded. EleventyFetch downloads and caches the remote images for
// subsequent builds.
//---
// Local images are checked every build.
// Remote images are cached for a week.
//---
// This plug-in does its best to handle the base element if it appears in the document head.
//---
// TODO:
// - test with svg
// - cache sharp meta info instead of remote images.
// - cache sharp meta info for local images, which will save time on images that appear on
//   multiple pages.
// - add picture element support
// - add srcset support
// - add sizes="auto"
//---

const cheerio = require('cheerio');
const EleventyFetch = require("@11ty/eleventy-fetch");
const path = require('path');
const sharp = require('sharp');

// selector defaults to 'img'
module.exports = (eleventyConfig, options = {}) => {
  // merge options
  options = Object.assign(
    {
      selector: 'img',
      lazy: true,
      dimensions: true,
    },
    options,
  );
  // don't use arrow function so `this` is bound (for 11ty stuff)
  eleventyConfig.addTransform('friendly-images', async function (content) {
    // only do this for html documents (don't break the atom feed)
    if (!content.trim().startsWith('<!DOCTYPE html>')) return content;
    // get all the images that match the selector
    const $ = cheerio.load(content);
    const resolveOptions = {
      base: $('base').attr('href'),
      outputPath: eleventyConfig.dir.output,
      pageUrl: this.page.url,
    };
    const $images = $(options.selector);
    // get the image info
    const imageInfoPromises = [];
    $images.each((i, image) => {
      const $image = $(image);
      const src = _resolveSrc($image.attr('src'), resolveOptions);
      if (!src) return;
      imageInfoPromises.push(_modifyImage($image, src, options));
    });
    await Promise.all(imageInfoPromises);
    return $.html();
  });
};

// resolve src as much as we can for either fs or fetch
function _resolveSrc (src, { base = '', outputPath = '', pageUrl = '' }) {
  // blank url, skip it
  if (!src || !src.length) return;
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

async function _modifyImage ($image, src, options) {
  // don't mess with `loading` attribute if it already exists
  if (options.lazy && !$image.attr('loading')) {
    $image.attr('loading', 'lazy');
  }
  // don't mess with `width` or `height` if either already exists
  if (options.dimensions && !$image.attr('width') && !$image.attr('height')) {
    try {
      const imageInfo = await _getImageInfo(src); // returns promise
      if (typeof imageInfo.width === 'number' && typeof imageInfo.height === 'number') {
        $image.attr('width', imageInfo.width);
        $image.attr('height', imageInfo.height);
      }
    } catch (e) {
      // something went wrong with sharp. log error and move on.
      console.log('eleventy-friendly-images:', e.message);
    }
  }
  return $image;
}

function _getImageInfo (src) {
  return _isRemote(src) ? _getRemoteImage(src) : _getImageMetadata(src);
}

async function _getRemoteImage (src) {
  const buffer = await EleventyFetch(src);
  if (!buffer) return;
  return _getImageMetadata(buffer);
}

function _getImageMetadata (src) {
  return sharp(src).metadata();
}
