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

function is_integer(x) {
    // Assumes x is a number
    return x % 1 === 0;
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

function spiral_index(j, i) {
    /** @see https://superzhu.gitbooks.io/bigdata/content/algo/get_spiral_index_from_location.html */
    let index = 0;
    if (j * j >= i * i) {
        index = 4 * j * j  - j - i;
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

function seed_at(master_seed, j, i) {
    return master_seed + spiral_index(j, i);
}

function gradient_at(master_seed, j, i) {
    /** @see https://github.com/davidbau/seedrandom */
    let local_seed = seed_at(master_seed, j, i);
    let prng = (new Math.seedrandom(local_seed))();
    return new Vect2(0, 1).rot(prng * 2 * Math.PI);
}

class RangeParameterInput {
    constructor(reference, name, label, min, max, step, default_) {
        this.reference = reference;
        this.name = name;
        this.label = label;
        this.min = min;
        this.max = max;
        this.step = step;
        this.default = default_;
        this.element = null;
    }

    setup(container) {
        let wrapper = document.createElement("div");
        wrapper.classList.add("panel-input");
        wrapper.classList.add("panel-input-range");
        this.element = document.createElement("input");
        this.element.id = `input-${this.reference.get_input_id()}`;
        this.element.type = "range";
        this.element.min = this.min;
        this.element.max = this.max;
        this.element.step = this.step;
        this.element.value = this.reference.config[this.name];
        let label = document.createElement("label");
        label.setAttribute("for", this.element.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.element);
        container.appendChild(wrapper);
        var self = this;
        this.element.addEventListener("input", () => {self.update()});
    }

    update() {
        let new_value = 0;
        if (is_integer(this.step)) {
            new_value = parseInt(this.element.value);
        } else {
            new_value = parseFloat(this.element.value);
        }
        this.reference.config[this.name] = new_value;
        this.reference.on_input_update();
    }

}

class SelectParameterInput {
    constructor(reference, name, label, options) {
        this.reference = reference;
        this.name = name;
        this.label = label;
        this.options = options;
        this.element = null;
    }

    setup(container) {
        let wrapper = document.createElement("div");
        wrapper.classList.add("panel-input");
        wrapper.classList.add("panel-input-select");
        this.element = document.createElement("select");
        this.element.id = `input-${this.reference.get_input_id()}`;
        this.options.forEach(option_text => {
            let option = document.createElement("option");
            option.value = option_text;
            option.textContent = option_text;
            if (option_text == this.reference.config[this.name]) {
                option.selected = true;
            }
            this.element.appendChild(option);
        });
        let label = document.createElement("label");
        label.setAttribute("for", this.element.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.element);
        container.appendChild(wrapper);
        var self = this;
        this.element.addEventListener("input", () => {self.update()});
    }

    update() {
        let new_value = "";
        this.element.querySelectorAll("option").forEach(option => {
            if (option.selected) {
                new_value = option.value;
            }
        });
        this.reference.config[this.name] = new_value;
        this.reference.on_input_update();
    }
}

class BooleanParameterInput {
    constructor(reference, name, label) {
        this.reference = reference;
        this.name = name;
        this.label = label;
        this.element = null;
    }

    setup(container) {
        let wrapper = document.createElement("div");
        wrapper.classList.add("panel-input");
        wrapper.classList.add("panel-input-boolean");
        this.element = document.createElement("input");
        this.element.id = `input-${this.reference.get_input_id()}`;
        this.element.type = "checkbox";
        if (this.reference.config[this.name]) {
            this.element.checked = true;
        }
        let label = document.createElement("label");
        label.setAttribute("for", this.element.id);
        label.textContent = this.label;
        wrapper.appendChild(this.element);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
        var self = this;
        this.element.addEventListener("input", () => {self.update()});
    }

    update() {
        let new_value = this.element.checked;
        this.reference.config[this.name] = new_value;
        this.reference.on_input_update();
    }
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
        this.input_counter = 0;
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

    get_input_id() {
        this.input_counter++;
        return this.input_counter;
    }

}

class PerlinNoise {

    constructor(controller, config) {
        this.controller = controller;
        this.canvas = null;
        this.context = null;
        this.inputs = [];
        this.gradients = null;
        this.values = null;
        this.width = this.controller.config.width;
        this.height = this.controller.config.height;
        this.config = {
            seed: Math.floor(Math.random() * (2 ** 30)),
            scale: 64,
            interpolation: "smoother",
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
        this.canvas.classList.add("panel-canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        panel.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        let panel_inputs = document.createElement("div");
        panel_inputs.classList.add("panel-inputs");
        this.inputs.push(new RangeParameterInput(this, "seed", "Seed", 1, 1000, 1, 500));
        this.inputs.push(new RangeParameterInput(this, "scale", "Scale", 8, 512, 1, 64));
        this.inputs.push(new SelectParameterInput(this, "interpolation", "Interpolation", ["linear", "smooth", "smoother"]));
        this.inputs.push(new BooleanParameterInput(this, "draw_grid", "Draw grid"));
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        panel.appendChild(panel_inputs);
        container.appendChild(panel);
    }

    setup(container) {
        this.create_dom_element(container);
    }

    update_gradients() {
        this.gradients = [];
        let jstart = Math.floor(-this.width / 2 / this.config.scale) - 1;
        let jend = Math.floor(this.width / 2 / this.config.scale) + 1;
        let istart = Math.floor(-this.height / 2 / this.config.scale) - 1;
        let iend = Math.floor(this.height / 2 / this.config.scale) + 1;
        for (let i = istart; i <= iend; i++) {
            this.gradients.push([]);
            for (let j = jstart; j <= jend; j++) {
                this.gradients[i - istart].push(gradient_at(this.config.seed, j, i));
            }
        }
    }

    update_values() {
        let interp = null;
        if (this.config.interpolation == "linear") {
            interp = interp_linear;
        } else if (this.config.interpolation == "smooth") {
            interp = interp_smooth;
        } else if (this.config.interpolation == "smoother") {
            interp = interp_smoother;
        }
        this.values = [];
        let jstart = Math.floor(-this.width / 2 / this.config.scale) - 1;
        let istart = Math.floor(-this.height / 2 / this.config.scale) - 1;
        for (let py = 0; py < this.height; py++) {
            this.values.push([]);
            for (let px = 0; px < this.width; px++) {
                let j = (px - this.width / 2) / this.config.scale - jstart;
                let i = (py - this.height / 2) / this.config.scale - istart;
                let j0 = Math.floor(j);
                let i0 = Math.floor(i);
                let j1 = j0 + 1;
                let i1 = i0 + 1;
                let dot_ul = this.gradients[i0][j0].dot(new Vect2(j - j0, i - i0));
                let dot_bl = this.gradients[i1][j0].dot(new Vect2(j - j0, i - i1));
                let interp_left = interp(i - i0, dot_ul, dot_bl);
                let dot_ur = this.gradients[i0][j1].dot(new Vect2(j - j1, i - i0));
                let dot_br = this.gradients[i1][j1].dot(new Vect2(j - j1, i - i1));
                let interp_right = interp(i - i0, dot_ur, dot_br);
                let interp_vert = (interp(j - j0, interp_left, interp_right) * 0.5) + 0.5;
                this.values[py].push(interp_vert);
            }
        }
    }

    draw_grid() {
        this.context.fillStyle = "blue";
        this.context.strokeStyle = "red";
        this.context.lineWidth = 1;
        this.context.textAlign = "center";
        let jstart = Math.floor(-this.width / 2 / this.config.scale) - 1;
        let jend = Math.floor(this.width / 2 / this.config.scale) + 1;
        let istart = Math.floor(-this.height / 2 / this.config.scale) - 1;
        let iend = Math.floor(this.height / 2 / this.config.scale) + 1;
        for (let i = istart; i <= iend; i++) {
            for (let j = jstart; j <= jend; j++) {
                let x = j * this.config.scale + this.width / 2;
                let y = i * this.config.scale + this.height / 2;
                this.context.beginPath();
                this.context.arc(x, y, this.config.scale * 0.05, 0, 2 * Math.PI);
                this.context.fill();
                let origin = new Vect2(x, y);
                let gradient = this.gradients[i - istart][j - jstart].copy().mult(this.config.scale * 0.5);
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

    get_input_id() {
        return this.controller.get_input_id();
    }

    on_input_update() {
        this.controller.update();
    }

}

function on_load() {
    console.log("Hello, World!");
    let controller = new Controller();
    controller.setup();
    controller.update();
}

window.addEventListener("load", on_load);