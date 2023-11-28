// some useful math functions, many based on functions available in p5js (but not copied directly)

// force num to be between min and max
export function constrain (num, min, max) {
  return Math.max(Math.min(num, max), min);
}

// convert hex color string to {r,g,b} object
export function hex2rgb (hex) {
  hex = hex.replaceAll('#', '');
  if (hex.length === 3) {
    const [ r, g, b ] = hex.split();
    hex = r + r + g + g + b + b;
  }
  if (hex.length !== 6) hex = '000000';
  return {
    r: parseInt(hex.substr(0, 2), 16),
    g: parseInt(hex.substr(2, 2), 16),
    b: parseInt(hex.substr(4, 2), 16),
  }
}

// get the value that is [amt] of the distance between start and stop values
// amt is between 0 and 1
export function lerp (start, stop, amt) {
  return ((stop - start) * amt) + start;
}

// map num from an old min/max range to a new min/max range
export function map (num, min, max, newMin, newMax) {
  return (num - min) / (max - min) * (newMax - newMin) + newMin;
}

// shortcut for map that uses 0 and 1 as the new min and max
export function norm (num, min, max) {
  return map(num, min, max, 0, 1);
}

// convert {r,g,b} object to hex color string
export function rgb2hex (rgb) {
  const r = ('0' + Math.round(rgb.r).toString(16)).substr(-2);
  const g = ('0' + Math.round(rgb.g).toString(16)).substr(-2);
  const b = ('0' + Math.round(rgb.b).toString(16)).substr(-2);
  return `#${r}${g}${b}`;
}

// round with optional decimal places
export function round (val, p = 0) {
  const f = Math.pow(10, digits);
  return Math.round(val * f) / f;
}

export function distance (x1, y1, x2, y2) {
  return Math.sqrt(Math.pow((x2 - x1), 2), Math.pow((y2 - y1), 2));
}
