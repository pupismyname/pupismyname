// This plug-in creates a hero image for every html page

const { createCanvas } = require('canvas');
const fs = require('fs');
const seedrandom = require('seedrandom');
const { Noise } = require('noisejs');
const sharp = require('sharp');

const alwaysRebuild = false;

module.exports = async (eleventyConfig) => {
  eleventyConfig.on('eleventy.after', async ({ results }) => {
    console.log('Creating hero and og images');
    let images = 0;
    const start = Date.now();
    await Promise.allSettled(results.map(async (result) => {
      const htmlFile = '/index.html';
      const heroFile = '/hero.png';
      const ogFile = '/og.png';
      if (result.outputPath.endsWith(htmlFile)) {
        const partialPath = result.outputPath.slice(0, result.outputPath.length - htmlFile.length);
        const heroPath = partialPath + heroFile;
        const ogPath = partialPath + ogFile;
        let rebuild = alwaysRebuild;
        if (!rebuild) {
          // if the images already exist, don't create them again
          await Promise.all([
            fs.promises.access(heroPath),
            fs.promises.access(ogPath),
          ]).catch((e) => {
            rebuild = true;
          });
        }
        if (rebuild) {
          // images don't exist, create them
          await fs.promises.mkdir(partialPath, { recursive: true });
          await Promise.all(createImages(heroPath, ogPath, result.url));
          images+=2;
        }
      }
      return;
    }));
    console.log(`Created ${images} images in ${Math.round((Date.now() - start) / 10) / 100} seconds`);
  });
};

function createImages (heroPath, ogPath, url) {
  const rows = 18;
  const cols = rows * 2;
  const w = 2400;
  const h = Math.round(w / 3);
  const sizeX = w / cols;
  const sizeY = h / rows;
  const lineWidth = Math.min(sizeX, sizeY) / 30;
  // const fg = 'oklch(67% 0.11 224)'; // --c-secondary
  // const bg = 'oklch(19.45% 0.046 242.68)'; // --c-bg
  const fg = '#34a3c7'; // --c-secondary
  const bg = '#001728'; // --c-bg
  // build initial points array (rows and cols)
  const points = createPoints(w, h, rows, cols, sizeX, sizeY, url);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  draw(w, h, ctx, points, lineWidth, fg, 'transparent');
  const ogw = 1200;
  const ogh = 630;
  const ogCanvas = createCanvas(ogw, ogh);
  const ogCtx = ogCanvas.getContext('2d');
  ogCtx.fillStyle = bg;
  ogCtx.fillRect(0, 0, ogw, ogh);
  ogCtx.drawImage(canvas, 0, 0, w, h, 0, 0, ogw, ogh);
  const heroPromise = save(heroPath, canvas.toBuffer('image/png'));
  const ogPromise = save(ogPath, ogCanvas.toBuffer('image/png'));
  return [ heroPromise, ogPromise ];
}

async function save (path, buffer) {
  return sharp(buffer).png({ quality: 90, compressionLevel: 9 }).toFile(path);
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
    ctx.beginPath();
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
    ctx.closePath();
  }
}


