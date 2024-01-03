// This plug-in creates a hero image and an og image for every html page.
// ---
// The images are published alongside each `index.html` as `hero.png` and `og.png`.
// ---
// In theory, the images should never change, so they are cached in the codebase to avoid redrawing
// them every build. This adds a bunch of files to the codebase, but it greatly speeds up builds.
// ---
// On a 2019 Macbook Pro, drawing, caching, and publishing images for 32 pages (64 images) takes
// 8.23 seconds (around 0.26 seconds per page). Skipping the drawing step and using cached images
// takes 0.03 seconds for all 32 pages.

const fs = require('fs');
const seedrandom = require('seedrandom');
const sharp = require('sharp');
const { AssetCache } = require('@11ty/eleventy-fetch');
const { createCanvas } = require('canvas');
const { Noise } = require('noisejs');

const cacheDuration = '100y'; // never rebuild if cached image
const htmlFile = '/index.html'; // path string that indicates where we need images

module.exports = async (eleventyConfig) => {
  eleventyConfig.on('eleventy.after', async ({ results }) => {
    const start = Date.now();
    console.log('Creating hero and og images');
    // build a list of images that need to be processed
    const images = [];
    results.map((result) => {
      if (result.outputPath.endsWith(htmlFile)) {
        const partialPath = result.outputPath.slice(0, result.outputPath.length - htmlFile.length);
        // hero image
        images.push({
          url: result.url,
          folder: partialPath,
          path: partialPath + '/hero.png',
          w: 2400,
          h: 800,
          transparent: true,
        });
        // og image
        images.push({
          url: result.url,
          folder: partialPath,
          path: partialPath + '/og.png',
          w: 1200,
          h: 630,
          transparent: false,
        });
      }
    });
    // track how many images came from cache or were drawn fresh
    let cached = 0;
    let created = 0;
    // loop through each image
    await Promise.allSettled(images.map(async (image) => {
      // make sure destination folder exists
      const mkdir = fs.promises.mkdir(image.folder, { recursive: true });
      // use cache if possible
      const asset = new AssetCache(image.path, '_cache');
      if (asset.isCacheValid(cacheDuration)) {
        cached++;
        image.buffer = await asset.getCachedValue();
      } else {
        created++;
        // cache isn't valid, create a new image
        image.buffer = await createImage(image);
        // cache the result
        asset.save(image.buffer, 'buffer');
      }
      // publish the image to the destination folder
      await mkdir; // make sure the mkdir command from earlier is finished
      return fs.promises.writeFile(image.path, image.buffer);
    }));
    const elapsed = Math.round((Date.now() - start) / 10) / 100;
    console.log(`Processed ${images.length} images in ${elapsed} seconds (${created} created, ${cached} from cache)`);
  });
};

// returns a compressed image buffer
function createImage (image) {
  const rows = 18;
  const cols = rows * 2;
  const sizeX = image.w / cols;
  const sizeY = image.h / rows;
  const lineWidth = Math.min(sizeX, sizeY) / 30;
  const fg = '#34a3c7'; // --c-secondary
  const bg = (image.transparent) ? 'transparent' : '#001728'; // --c-bg
  // build initial points array (rows and cols)
  const points = createPoints(image.w, image.h, rows, cols, sizeX, sizeY, image.url);
  const canvas = createCanvas(image.w, image.h);
  const ctx = canvas.getContext('2d');
  draw(image.w, image.h, ctx, points, lineWidth, fg, bg);
  const buffer = canvas.toBuffer('image/png');
  return sharp(buffer).png({ quality: 90, compressionLevel: 9 }).toBuffer();
}

function createPoints (w, h, rows, cols, sizeX, sizeY, permalink) {
  const intensity = 5;
  const res = 12;
  // seed random number generator
  const random = seedrandom(permalink + '???');
  // initialize noise field
  const noise = new Noise(random());
  const paddingX = -sizeX * intensity / 1;
  const paddingY = (h - (w / 3)) / 2;
  const radii = Math.max(sizeX, sizeY); // larger of these determines how far point can move
  const points = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      const startX = j * sizeX + sizeX / 2;
      const startY = i * sizeY + sizeY / 2;
      const point = {
        x: map(startX, 0, w, paddingX, w - paddingX),
        y: map(startY, 0, h, paddingY, h - paddingY),
      };
      // translate to two different spots in the noise field so nx and ny aren't similar
      point.nx = getNoise(res, cols, rows, j, i, noise, 100);
      point.ny = getNoise(res, cols, rows, j, i, noise, -100);
      // use same value for both x and y noise radii
      point.cx = point.x + point.nx * intensity * radii;
      point.cy = point.y + point.ny * intensity * radii;
      row.push(point);
    }
    points.push(row);
  }
  return points;
}

function map (num, min, max, newMin, newMax) {
  return (num - min) / (max - min) * (newMax - newMin) + newMin;
}

function getNoise (res, cols, rows, x, y, noise, translate) {
  // no noise function defined
  if (!noise) return Math.random() * 2 - 1; // value between -1 and 1
  // noise resolution, based on grid dimensions
  return noise.perlin2((x + translate / cols) / res, (y + translate / rows) / res);
}

function draw (w, h, ctx, points, lineWidth, fg, bg) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  drawSplines(ctx, points, lineWidth, fg);
}

function drawSplines (ctx, points, lineWidth, fg) {
  const tension = 1;
  ctx.strokeStyle = fg;
  ctx.lineWidth = lineWidth * 2;
  for (let j = 0; j < points.length; j++) {
    const row = points[j];
    // catmull-rom splines adapted from https://codepen.io/osublake/pen/BowJed
    // row contains points with x and y coordinates (cx and cy)
    // this function expects an 1d array with x and y in series
    const data = [];
    row.forEach((point) => {
      data.push(point.cx, point.cy);
    });
    const size = data.length;
    const last = size - 4;
    ctx.moveTo(data[0], data[1]);
    for (let i = 0; i < size - 2; i +=2) {
      const x0 = i ? data[i - 2] : data[0];
      const y0 = i ? data[i - 1] : data[1];
      const x1 = data[i + 0];
      const y1 = data[i + 1];
      const x2 = data[i + 2];
      const y2 = data[i + 3];
      const x3 = i !== last ? data[i + 4] : x2;
      const y3 = i !== last ? data[i + 5] : y2;
      const cp1x = x1 + (x2 - x0) / 6 * tension;
      const cp1y = y1 + (y2 - y0) / 6 * tension;
      const cp2x = x2 - (x3 - x1) / 6 * tension;
      const cp2y = y2 - (y3 - y1) / 6 * tension;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    }
    ctx.stroke();
  }
}
