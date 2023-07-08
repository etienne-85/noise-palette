class Vect2 {
    
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    mult(a) {
        this.x *= a;
        this.y *= a;
        return this;
    }

    div(a) {
        this.x /= a;
        this.y /= a;
        return this;
    }

    norm(p=2) {
        return Math.pow(Math.pow(this.x, p) + Math.pow(this.y, p), 1/p);
    }

    copy() {
        return new Vect2(this.x, this.y);
    }

    unit() {
        return this.copy().div(this.norm());
    }

    rot(theta) {
        return new Vect2(
            this.x * Math.cos(theta) + this.y * Math.sin(theta),
            -this.x * Math.sin(theta) + this.y * Math.cos(theta));
    }

    minus(other) {
        // returns this - other
        return new Vect2(this.x - other.x, this.y - other.y);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

}

function draw_arrow(context, origin, gradient, tip=0.2, theta=3*Math.PI/4) {
    let arrow_down = gradient.rot(-theta).mult(tip);
    let arrow_up = gradient.rot(theta).mult(tip);
    context.beginPath();
    context.moveTo(origin.x, origin.y);
    context.lineTo(origin.x + gradient.x, origin.y + gradient.y);
    context.lineTo(origin.x + gradient.x + arrow_down.x, origin.y + gradient.y + arrow_down.y);
    context.moveTo(origin.x + gradient.x, origin.y + gradient.y);
    context.lineTo(origin.x + gradient.x + arrow_up.x, origin.y + gradient.y + arrow_up.y);
    context.stroke();
}

function lerp(t, left, right) {
    return (1 - t) * left + t * right;
}

function lerpa(t, left, right) {
    let result = [];
    for (let k = 0; k < left.length; k++) {
        result.push(lerp(t, left[k], right[k]));
    }
    return result;
}

function interp(t, x0, x1) {
    return (x1 - x0) * ((t * (t * 6.0 - 15.0) + 10.0) * t * t * t) + x0;
}

function spiral_index(x, y) {
    /** @see https://superzhu.gitbooks.io/bigdata/content/algo/get_spiral_index_from_location.html */
    let index = 0;
    if (x * x >= y * y) {
        index = 4 * x * x  - x - y;
        if (x < y) {
            index -= 2 * (x - y);
        }
    } else {
        index = 4 * y * y - x - y;
        if (x < y) {
            index += 2 * (x - y);
        }
    }
    return index;
}

function seed_at(master_seed, x, y) {
    return master_seed + spiral_index(x, y);
}

function gradient_at(master_seed, x, y) {
    /** @see https://github.com/davidbau/seedrandom */
    let local_seed = seed_at(master_seed, x, y);
    let prng = (new Math.seedrandom(local_seed))();
    return new Vect2(0, 1).rot(prng * 2 * Math.PI);
}

class Controller {
    
    constructor(config) {
        this.noises = [];
        this.config = {
            width: 512,
            height: 512
        };
        for (let key in config) {
            this.config[key] = config[key];
        }
    }

    setup() {
        let panels_container = document.getElementById("panels");
        let default_noise = new PerlinNoise(this, {});
        default_noise.setup(panels_container);
        this.noises.push(default_noise);
    }

    update() {
        this.noises.forEach(noise => { noise.update(); });
    }

}

class PerlinNoise {

    constructor(controller, config) {
        this.controller = controller;
        this.canvas = null;
        this.context = null;
        this.gradients = null;
        this.values = null;
        this.width = this.controller.config.width;
        this.height = this.controller.config.height;
        this.config = {
            seed: Math.floor(Math.random() * (2 ** 30)),
            scale: 64,
            draw_grid: false,
        }
        for (let key in config) {
            this.config[key] = config[key];
        }
    }

    create_dom_element(container) {
        let panel = document.createElement("div");
        panel.classList.add("panel");
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        panel.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        container.appendChild(panel);
    }

    setup(container) {
        this.create_dom_element(container);
    }

    update_gradients() {
        this.gradients = [];
        let grid_width = Math.floor(this.width / this.config.scale) + 2;
        let grid_height = Math.floor(this.height / this.config.scale) + 2;
        for (let y = 0; y < grid_height; y++) {
            this.gradients.push([]);
            for (let x = 0; x < grid_width; x++) {
                this.gradients[y].push(gradient_at(this.config.seed, x, y));
            }
        }
    }

    update_values() {
        this.values = [];
        for (let py = 0; py < this.height; py++) {
            this.values.push([]);
            for (let px = 0; px < this.width; px++) {
                let x = px / this.config.scale;
                let y = py / this.config.scale;
                let x0 = Math.floor(x);
                let y0 = Math.floor(y);
                let x1 = x0 + 1;
                let y1 = y0 + 1;
                let dot_ul = this.gradients[y0][x0].dot(new Vect2(x - x0, y - y0));
                let dot_bl = this.gradients[y1][x0].dot(new Vect2(x - x0, y - y1));
                let il = interp(y - y0, dot_ul, dot_bl);
                let dot_ur = this.gradients[y0][x1].dot(new Vect2(x - x1, y - y0));
                let dot_br = this.gradients[y1][x1].dot(new Vect2(x - x1, y - y1));
                let ir = interp(y - y0, dot_ur, dot_br);
                let i = (interp(x - x0, il, ir) * 0.5) + 0.5;
                this.values[py].push(i);
            }
        }
    }

    draw_grid() {
        this.context.fillStyle = "blue";
        this.context.strokeStyle = "red";
        this.context.lineWidth = 1;
        let grid_width = Math.floor(this.width / this.config.scale) + 2;
        let grid_height = Math.floor(this.height / this.config.scale) + 2;
        for (let i = 0; i < grid_height; i++) {
            for (let j = 0; j < grid_width; j++) {
                let x = j * this.config.scale;
                let y = i * this.config.scale;
                this.context.beginPath();
                this.context.arc(x, y, this.config.scale * 0.05, 0, 2 * Math.PI);
                this.context.fill();
                let origin = new Vect2(x, y);
                let gradient = new Vect2(this.gradients[i][j].x * this.config.scale * 0.5, this.gradients[i][j].y * this.config.scale * 0.5);
                draw_arrow(this.context, origin, gradient);
            }
        }
    }

    update_canvas() {
        let imagedata = new ImageData(this.width, this.height);
        for (let py = 0; py < this.height; py++) {
            for (let px = 0; px < this.width; px++) {
                let k = ((py * this.width) + px) * 4;
                let noise = this.values[py][px];
                imagedata.data[k] = 255 * noise;
                imagedata.data[k + 1] = 255 * noise;
                imagedata.data[k + 2] = 255 * noise;
                imagedata.data[k + 3] = 255;
            }
        }
        this.context.putImageData(imagedata, 0, 0);
    }

    update() {
        this.update_gradients();
        this.update_values();
        this.update_canvas();
        if (this.config.draw_grid) {
            this.draw_grid();
        }
    }

}

function on_load() {
    console.log("Hello, World!");
    let controller = new Controller();
    controller.setup();
    controller.update();
}

window.addEventListener("load", on_load);