// import { seedrandom } from "seedrandom";
import {prng_alea} from 'esm-seedrandom';
import * as Utils from './utils';

function spiral_index(j, i) {
  /** @see https://superzhu.gitbooks.io/bigdata/content/algo/get_spiral_index_from_location.html */
  let index = 0;
  if (j * j >= i * i) {
    index = 4 * j * j - j - i;
    if (j < i) {
      index -= 2 * (j - i);
    }
  } else {
    index = 4 * i * i - j - i;
    if (j < i) {
      index += 2 * (j - i);
    }
  }
  return index;
}

function gradient_at(master_seed, j, i) {
  /** @see https://github.com/davidbau/seedrandom */
  let local_seed = master_seed + spiral_index(j, i);
  let prng = prng_alea(local_seed)(); //seedrandom(local_seed)();
  return Utils.rotate({ x: 0, y: 1 }, prng * 2 * Math.PI);
}

function interp_linear(t, x0, x1) {
  return (1 - t) * x0 + t * x1;
}

function interp_smooth(t, x0, x1) {
  return (x1 - x0) * (3.0 - t * 2.0) * t * t + x0;
}

function interp_smoother(t, x0, x1) {
  return (x1 - x0) * ((t * (t * 6.0 - 15.0) + 10.0) * t * t * t) + x0;
}

class PerlinNoise {
  constructor(
    width,
    height,
    seed,
    period,
    interpolation,
    offset_x,
    offset_y,
    scale_x,
    scale_y
  ) {
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.period = period;
    this.interpolation = interpolation;
    this.offset_x = offset_x;
    this.offset_y = offset_y;
    (this.scale_x = scale_x), (this.scale_y = scale_y);
    this.gradients = null;
    this.values = null;
  }

  compute_gradients() {
    this.gradients = [];
    let jstart =
      Math.floor(
        ((-this.width / 2 - this.offset_x) * this.scale_x) / this.period
      ) - 1;
    let jend =
      Math.floor(
        ((this.width / 2 - this.offset_x) * this.scale_x) / this.period
      ) + 1;
    let istart =
      Math.floor(
        ((-this.height / 2 - this.offset_y) * this.scale_y) / this.period
      ) - 1;
    let iend =
      Math.floor(
        ((this.height / 2 - this.offset_y) * this.scale_y) / this.period
      ) + 1;
    for (let i = istart; i <= iend; i++) {
      this.gradients.push([]);
      for (let j = jstart; j <= jend; j++) {
        this.gradients[i - istart].push(gradient_at(this.seed, j, i));
      }
    }
  }

  compute_values() {
    let interp = null;
    if (this.interpolation == "linear") {
      interp = interp_linear;
    } else if (this.interpolation == "smooth") {
      interp = interp_smooth;
    } else if (this.interpolation == "smoother") {
      interp = interp_smoother;
    }
    this.values = [];
    let jstart =
      Math.floor(
        ((-this.width / 2 - this.offset_x) * this.scale_x) / this.period
      ) - 1;
    let istart =
      Math.floor(
        ((-this.height / 2 - this.offset_y) * this.scale_y) / this.period
      ) - 1;
    for (let py = 0; py < this.height; py++) {
      this.values.push([]);
      for (let px = 0; px < this.width; px++) {
        let j =
          ((px - this.width / 2 - this.offset_x) * this.scale_x) / this.period -
          jstart;
        let i =
          ((py - this.height / 2 - this.offset_y) * this.scale_y) /
            this.period -
          istart;
        let j0 = Math.floor(j);
        let i0 = Math.floor(i);
        let j1 = j0 + 1;
        let i1 = i0 + 1;
        let dot_ul = Utils.dot(this.gradients[i0][j0], { x: j - j0, y: i - i0 });
        let dot_bl = Utils.dot(this.gradients[i1][j0], { x: j - j0, y: i - i1 });
        let interp_left = interp(i - i0, dot_ul, dot_bl);
        let dot_ur = Utils.dot(this.gradients[i0][j1], { x: j - j1, y: i - i0 });
        let dot_br = Utils.dot(this.gradients[i1][j1], { x: j - j1, y: i - i1 });
        let interp_right = interp(i - i0, dot_ur, dot_br);
        let interp_vert = interp(j - j0, interp_left, interp_right) * 0.5 + 0.5;
        this.values[py].push(interp_vert);
      }
    }
  }

  compute() {
    this.compute_gradients();
    this.compute_values();
  }
}

export { PerlinNoise };
