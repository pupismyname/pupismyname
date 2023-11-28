// This plug-in adds `loading="lazy"`, `width`, `height` attributes to `img` elements. By default
// it does this for every image on the page, but it can be restricted by selector as well.
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
//---

const cheerio = require('cheerio');
const EleventyFetch = require("@11ty/eleventy-fetch");
const path = require('path');
const sharp = require('sharp');

// selector defaults to 'img'
module.exports = (eleventyConfig, { selector = 'img' } = { selector: 'img' }) => {
  // don't use arrow function so `this` is bound (for 11ty stuff)
  eleventyConfig.addTransform('friendly-images', async function (content) {
    // only do this for html documents (don't break the atom feed)
    if (!content.trim().startsWith('<!DOCTYPE html>')) return content;
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
      if (!src) return;
      imageInfoPromises.push(_modifyImage($image, src));
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

async function _modifyImage ($image, src) {
  // don't override existing attributes
  // if (!$image.attr('loading')) {
  //   $image.attr('loading', 'lazy');
  // }
  if ($image.attr('width') || $image.attr('height')) {
    return $image;
  }
  try {
    const imageInfo = await _getImageInfo(src); // returns promise
    if (typeof imageInfo.width === 'number' && typeof imageInfo.height === 'number') {
      $image.attr('width', imageInfo.width);
      $image.attr('height', imageInfo.height);
    }
    return $image;
  } catch (e) {
    // something went wrong with sharp. log error and move on.
    console.log('eleventy-friendly-images:', e);
    return $image;
  }
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
