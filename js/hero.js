import seedrandom from 'seedrandom';
import { Noise } from 'noisejs';
import { map } from './math.js';

customElements.define('hero-image', class extends HTMLElement {

  constructor () {
		super();
    this.toPng = (this.getAttribute('to-png') !== 'false');
    this.canvas = document.createElement('canvas');
    if (this.toPng) {
      this.canvas.classList.add('hero-src');
      this.img = document.createElement('img');
      this.img.classList.add('hero-image');
      this.img.setAttribute('alt', this.getAttribute('alt') || '');
      this.append(this.img);
    } else {
      this.canvas.classList.add('hero-image');
      this.append(this.canvas);
    }
    // draw
    (async () => {
      await this.render();
    })();
	}

  async render () {
    const type = this.getAttribute('type');
    const noiseType = this.getAttribute('noise-type');
    const randomType = this.getAttribute('random-type');
    const intensity = this.getAttribute('intensity');
    const tension = this.getAttribute('tension');
    const res = this.getAttribute('res');
    await this.createImage({
      canvas:     this.canvas,
      type:       (type?.length)       ? type                  : undefined,
      noiseType:  (noiseType?.length)  ? noiseType             : undefined,
      randomType: (randomType?.length) ? randomType            : undefined,
      intensity:  (intensity?.length)  ? parseFloat(intensity) : undefined,
      tension:    (tension?.length)    ? parseFloat(tension)   : undefined,
      res:        (res?.length)        ? parseFloat(res)       : undefined,
    });
    // copy canvas contents to img src
    if (this.toPng) {
      this.img.src = this.canvas.toDataURL();
    }
  }

  async createImage ({
    canvas = this.canvas,
    type = 'ggrid|nnoise|llines|llines-grid|fflow|splines', // what type of image to draw: 'grid|noise|lines-grid|lines|splines|flow'
    noiseType = '2d', // what type of noise: 'random', '1d', or '2d'
    randomType = 'seed', // random number generator: 'seed' or 'random'
    intensity = 5, // flow intensity, bigger means more intense waves (default 5)
    tension = 1, // spline tension, bigger is more curly (default 1)
    res = 12, // noise resolution, bigger is smoother (default 12)
  }) {

    if (!canvas) return;

    // set up initial variables
    const rows = 18;
    const cols = rows * 2;
    // width is double the parent element, or if that's not available, something very big
    const w = Math.round(this.parentElement.offsetWidth * (this.toPng ? 2 : 1) || cols * 60);
    const h = Math.round(w / 3);
    const sizeX = w / cols;
    const sizeY = h / rows;
    const lineWidth = Math.min(sizeX, sizeY) / 30;
    const color = 'oklch(67% 0.11 224)'; // --c-secondary

    // build initial points array (rows and cols)
    const points = this.createPoints(w, h, rows, cols, sizeX, sizeY, intensity, noiseType, randomType, res, tension);

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // promisify requestAnimationFrame
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        this.draw(w, h, ctx, points, lineWidth, color, type, tension);
        resolve();
      });
    });
  }

  createPoints (w, h, rows, cols, sizeX, sizeY, intensity, noiseType, randomType, res) {

    // what function to use for random numbers
    const random = (randomType === 'seed') ?
      seedrandom(window.location.pathname + '???') :
      Math.random;

    // initialize noise field
    const noise = (noiseType === '1d' || noiseType === '2d') ? new Noise(random()) : undefined;

    const paddingX = -sizeX * intensity / 1;
    const paddingY = 0;
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
        if (noiseType === 'random') {
          point.nx = map(random(), 0, 1, -1, 1) / 10; // map from (0 to 1) to (-1 to 1)
          point.ny = map(random(), 0, 1, -1, 1) / 10; // map from (0 to 1) to (-1 to 1)
        } else if (noiseType === '1d') {
          // translate to two different spots in the noise field so nx and ny aren't similar
          point.nx = this.getNoise(res, cols, rows, j, 0, noise, i * 100);
          point.ny = this.getNoise(res, cols, rows, j, 0, noise, i * -100);
        } else { // default to 2d noise
          // translate to two different spots in the noise field so nx and ny aren't similar
          point.nx = this.getNoise(res, cols, rows, j, i, noise, 100);
          point.ny = this.getNoise(res, cols, rows, j, i, noise, -100);
        }
        // use same value for both x and y noise radii
        point.cx = point.x + point.nx * intensity * radii;
        point.cy = point.y + point.ny * intensity * radii;
        row.push(point);
      }
      points.push(row);
    }
    return points;
  }

  draw (w, h, ctx, points, lineWidth, color, type, tension) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    const types = type.split('|');
    if (types.includes('grid')) {
      this.drawGrid(ctx, points, lineWidth, color, 'grid');
    }
    if (types.includes('noise')) {
      this.drawGrid(ctx, points, lineWidth, color, 'noise')
    }
    if (types.includes('lines-grid')) {
      this.drawLines(ctx, points, lineWidth, color, 'grid');
    }
    if (types.includes('lines')) {
      this.drawLines(ctx, points, lineWidth, color, 'noise');
    }
    if (types.includes('flow')) {
      this.drawFlow(ctx, points, lineWidth, color);
    }
    if (types.includes('splines')) {
      this.drawSplines(ctx, points, lineWidth, color, tension);
    }
  }

  drawGrid (ctx, points, lineWidth, color, target) {
    ctx.strokeStyle = color;
    ctx.lineWidth = (target === 'grid') ? lineWidth * 2 : lineWidth * 3;
    const radius = (target === 'grid') ? lineWidth * 4 : lineWidth * 6;
    const [ x, y ] = (target === 'grid') ? [ 'x', 'y' ] : [ 'cx', 'cy' ];
    for (let i = 0; i < points.length; i++) {
      const row = points[i];
      for (let j = 0; j < row.length; j++) {
        const point = row[j];
        ctx.beginPath();
        ctx.arc(point[x], point[y], radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
      }
    }
  }

  drawFlow (ctx, points, lineWidth, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i < points.length; i++) {
      const row = points[i];
      for (let j = 1; j < row.length; j++) {
        ctx.beginPath();
        const point = row[j];
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.cx, point.cy);
        ctx.stroke();
        ctx.closePath();
      }
    }
  }

  drawLines (ctx, points, lineWidth, color, target) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth * 2;
    const [ x, y ] = (target === 'grid') ? [ 'x', 'y' ] : [ 'cx', 'cy' ];
    for (let i = 0; i < points.length; i++) {
      const row = points[i];
      ctx.beginPath();
      ctx.moveTo(row[0][x], row[0][y]);
      for (let j = 1; j < row.length; j++) {
        const point = row[j];
        ctx.lineTo(point[x], point[y]);
      }
      ctx.stroke();
      ctx.closePath();
    }
  }

  drawSplines (ctx, points, lineWidth, color, tension) {
    for (let j = 0; j < points.length; j++) {
      const row = points[j];
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 2;
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

  getNoise (res, cols, rows, x, y, noise, translate) {
    // no noise function defined
    if (!noise) return Math.random() * 2 - 1; // value between -1 and 1
    // noise resolution, based on grid dimensions
    return noise.perlin2((x + translate / cols) / res, (y + translate / rows) / res);
  }

});
