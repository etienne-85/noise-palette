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


class ParameterInput {

    constructor(reference, name, label, default_value) {
        this.reference = reference;
        this.name = name;
        this.label = label;
        this.id = null;
        this.default_value = default_value;
        this.initial_value = null;
        this.element = null;
    }

    inflate(wrapper) {
        throw new Error("Not implemented!");
    }

    setup(container) {
        this.id = `input-${this.reference.get_input_id()}`;
        this.initial_value = this.reference.config[this.name];
        let wrapper = document.createElement("div");
        wrapper.classList.add("panel-input");
        this.inflate(wrapper);
        container.appendChild(wrapper);
        var self = this;
        this.element.addEventListener("input", () => { self.oninput(); });
        wrapper.addEventListener("dblclick", () => { self.ondblclick(); });
    }

    read() {
        throw new Error("Not implemented!");
    }

    write(value) {
        throw new Error("Not implemented!");
    }

    update() {
        let value = this.read();
        this.reference.config[this.name] = value;
        this.reference.on_input_update();
    }

    oninput() {
        this.update(); 
    }

    ondblclick() {
        this.write(this.default_value);
        this.update();
    }

}


class RangeParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value, min, max, step, transform) {
        super(reference, name, label, default_value);
        this.min = min;
        this.max = max;
        this.step = step;
        this.transform = transform;
        this.value_span = null;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-range");
        this.element = document.createElement("input");
        this.element.id = this.id;
        this.element.type = "range";
        this.element.min = this.min;
        this.element.max = this.max;
        this.element.step = this.step;
        this.element.value = this.initial_value;
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.element);
        this.value_span = document.createElement("span");
        this.value_span.textContent = this.initial_value;
        wrapper.appendChild(this.value_span);
    }

    read() {
        let base = is_integer(this.step) ? parseInt(this.element.value) : parseFloat(this.element.value);
        if (this.transform != undefined) return this.transform(base);
        return base;
    }

    oninput() {
        super.oninput();
        this.value_span.textContent = this.read();
    }

    write(value) {
        this.element.value = value;
        this.value_span.textContent = value;
    }

}

class SelectParameterInput extends ParameterInput {

    constructor(reference, name, label, options) {
        super(reference, name, label, null)
        this.options = options;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-select");
        this.element = document.createElement("select");
        this.element.id = this.id;
        this.options.forEach(option_text => {
            let option = document.createElement("option");
            option.value = option_text;
            option.textContent = option_text;
            if (option_text == this.initial_value) {
                option.selected = true;
            }
            this.element.appendChild(option);
        });
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.element);
    }

    read() {
        let options = this.element.querySelectorAll("option");
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) return options[i].value;
        }
    }

    write(value) {
        this.element.querySelectorAll("option").forEach(option => {
            option.selected = option.value == value;
        });
    }

    ondblclick() {}

}

class BooleanParameterInput extends ParameterInput {

    inflate(wrapper) {
        wrapper.classList.add("panel-input-boolean");
        this.element = document.createElement("input");
        this.element.id = this.id;
        this.element.type = "checkbox";
        if (this.initial_value) {
            this.element.checked = true;
        }
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(this.element);
        wrapper.appendChild(label);
    }

    read() {
        return this.element.checked;
    }

    write(value) {
        this.element.checked = value;
    }

    ondblclick() {}

}

function random_seed() {
    return Math.floor(Math.random() * (2 ** 30));
}

class SeedParameterInput extends ParameterInput {

    inflate(wrapper) {
        wrapper.classList.add("panel-input-seed");
        this.element = document.createElement("input");
        this.element.id = this.id;
        this.element.type = "number";
        this.element.step = 1;
        this.element.value = this.initial_value;
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        let button = document.createElement("button");
        button.textContent = "Random";
        var self = this;
        button.addEventListener("click", () => {
            self.write(random_seed());
            self.update();
        });
        wrapper.appendChild(label);
        wrapper.appendChild(this.element);
        wrapper.appendChild(button);
    }

    read() {
        return parseInt(this.element.value);
    }

    write(value) {
        this.element.value = value;
    }

    ondblclick() {}

}


class Controller {
    
    constructor(config) {
        this.noises = [];
        this.config = {
            width: 400,
            height: 400
        };
        this.output = new Output(this, {});
        for (let key in config) {
            this.config[key] = config[key];
        }
        this.input_counter = 0;
    }

    setup() {
        let panels_container = document.getElementById("panels");
        this.noises.push(new PerlinNoise(this, {}));
        this.noises.push(new PerlinNoise(this, {}));
        this.noises.forEach(noise => {
            noise.setup(panels_container);
        });
        this.output.setup(panels_container);
    }

    update() {
        this.noises.forEach(noise => { noise.update(); });
        this.output.update();
    }

    get_input_id() {
        this.input_counter++;
        return this.input_counter;
    }

}


function cubic_bezier(P0, P1, P2, P3, x, tol=0.0001) {
    let maxt = 1;
    let mint = 0;
    let t = 0.5;
    while (true) {
        t = (maxt + mint) / 2;
        let z = P0[0] * (1 - t) ** 3 + 3 * P1[0] * t * (1 - t) ** 2 + 3 * P2[0] * (1 - t) * t ** 2 + P3[0] * t ** 3;
        if (Math.abs(z - x) < tol) break;
        if (z < x) {
            mint = t;
        } else {
            maxt = t;
        }
    }
    return P0[1] * (1 - t) ** 3 + 3 * P1[1] * t * (1 - t) ** 2 + 3 * P2[1] * (1 - t) * t ** 2 + P3[1] * t ** 3;
}


class Spline {
    constructor(controls) {
        this.controls = [...controls];
        this.controls.sort((a, b) => { return a[0] - b[0] });
    }

    eval(t) {
        let x = Math.min(1, Math.max(0, t));
        let i0 = 0;
        for (let i = 0; i < this.controls.length; i++) {
            if (this.controls[i][0] == x) return this.controls[i][1];
            if (i < this.controls.length - 1 && this.controls[i][0] < x && this.controls[i + 1][0] > x) {
                i0 = i;
                break;
            }
        }
        let i1 = i0 + 1;
        let y = cubic_bezier(
            [this.controls[i0][0], this.controls[i0][1]],
            [this.controls[i0][4], this.controls[i0][5]],
            [this.controls[i1][2], this.controls[i1][3]],
            [this.controls[i1][0], this.controls[i1][1]],
            x,
        )
        return y;
    }
}

class SplineParameterInput extends ParameterInput {

    constructor(reference, name, label) {
        super(reference, name, label, [[0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1]]);
        this.controls = [[0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1]];
        this.padding = 8;
        this.width = 256;
        this.height = 256;
        this.dot_size = 10;
        this.context = null;
        this.moving_control = null;
        this.moving_bezier_control = null;
    }

    get_click_target(event, collisions=true) {
        let bounds = event.target.getBoundingClientRect();
        let x = (event.clientX - bounds.left - this.padding) / (this.width - 2 * this.padding);
        let y = 1 - (event.clientY - bounds.top - this.padding) / (this.width - 2 * this.padding);
        let hitbox = this.dot_size / (this.width - 2 * this.padding) / 1.5;
        let control = null;
        let bezier_control = null;
        if (collisions) {
            for (let i = 0; i < this.controls.length; i++) {
                if (Math.abs(this.controls[i][0] - x) < hitbox && Math.abs(this.controls[i][1] - y) < hitbox) {
                    control = i;
                }
                if (Math.abs(this.controls[i][2] - x) < hitbox && Math.abs(this.controls[i][3] - y) < hitbox) {
                    bezier_control = { control: i, index: 0 };
                }
                if (Math.abs(this.controls[i][4] - x) < hitbox && Math.abs(this.controls[i][5] - y) < hitbox) {
                    bezier_control = { control: i, index: 1 };
                }
            }
        }
        return {
            x: x,
            y: y,
            control: control,
            bezier_control: bezier_control,
        }
    }

    get_closest_control(target) {
        let controls = [];
        for (let i = 0; i < this.controls.length; i++) {
            controls.push({
                index: i,
                distance: Math.abs(this.controls[i][0] - target.x) + Math.abs(this.controls[i][1] - target.y)
            });
        }
        controls.sort((a, b) => { return a.distance - b.distance });
        return controls[0].index;
    }

    get_closest_bezier_control(target) {
        let bezier_controls = [];
        for (let i = 0; i < this.controls.length; i++) {
            bezier_controls.push({
                control: i,
                index: 0,
                distance: Math.abs(this.controls[i][2] - target.x) + Math.abs(this.controls[i][3] - target.y)
            });
            bezier_controls.push({
                control: i,
                index: 1,
                distance: Math.abs(this.controls[i][4] - target.x) + Math.abs(this.controls[i][5] - target.y)
            });
        }
        bezier_controls.sort((a, b) => { return a.distance - b.distance });
        return bezier_controls[0];
    }

    inflate(wrapper) {
        this.controls = [...this.initial_value];
        this.element = document.createElement("canvas");
        this.element.width = this.width;
        this.element.height = this.height;
        this.context = this.element.getContext("2d");
        wrapper.appendChild(this.element);
        this.draw();
        var self = this;
        this.element.addEventListener("click", (event) => {
            let target = self.get_click_target(event);
            if (event.ctrlKey) {
                self.on_ctrl_click(target);
            }
            self.update();
        });
        this.element.addEventListener("dblclick", (event) => {
            let target = self.get_click_target(event);
            if (target.bezier_control != null) {
                event.preventDefault();
                event.stopPropagation();
                if (target.bezier_control.index == 0) {
                    self.controls[target.bezier_control.control][2] = self.controls[target.bezier_control.control][0];
                    self.controls[target.bezier_control.control][3] = self.controls[target.bezier_control.control][1];
                } else {
                    self.controls[target.bezier_control.control][4] = self.controls[target.bezier_control.control][0];
                    self.controls[target.bezier_control.control][5] = self.controls[target.bezier_control.control][1];
                }
                self.update();
                return false;
            }
        });
        window.addEventListener("mousedown", (event) => {
            let target = self.get_click_target(event);
            if (target.control != null && !event.shiftKey) {
                self.moving_control = target.control;
            } else if (target.bezier_control != null) {
                self.moving_bezier_control = target.bezier_control;
            } else if (event.shiftKey) {
                let closest_control = self.get_closest_control(target);
                if (self.controls[closest_control][0] > target.x) {
                    self.moving_bezier_control = { control: closest_control, index: 0 };
                } else {
                    self.moving_bezier_control = { control: closest_control, index: 1 };
                }
            }
        });
        wrapper.addEventListener("mousemove", (event) => {
            if (self.moving_control != null) {
                let target = self.get_click_target(event, false);
                let prevx = self.controls[self.moving_control][0];
                let prevy = self.controls[self.moving_control][1];
                if (self.moving_control > 1) {
                    self.controls[self.moving_control][0] = Math.min(1, Math.max(0, target.x));
                }
                self.controls[self.moving_control][1] = Math.min(1, Math.max(0, target.y));
                let dx = self.controls[self.moving_control][0] - prevx;
                let dy = self.controls[self.moving_control][1] - prevy;
                self.controls[self.moving_control][2] += dx;
                self.controls[self.moving_control][3] += dy;
                self.controls[self.moving_control][4] += dx;
                self.controls[self.moving_control][5] += dy;
                self.update();
            } else if (self.moving_bezier_control != null) {
                let target = self.get_click_target(event, false);
                if (self.moving_bezier_control.index == 0) {
                    self.controls[self.moving_bezier_control.control][2] = target.x;
                    self.controls[self.moving_bezier_control.control][3] = target.y;
                } else {
                    self.controls[self.moving_bezier_control.control][4] = target.x;
                    self.controls[self.moving_bezier_control.control][5] = target.y;
                }
                self.update();
            }
        });
        window.addEventListener("mouseup", (event) => {
            self.moving_control = null;
            self.moving_bezier_control = null;
            //TODO: also make the final move
        });
    }

    on_ctrl_click(target) {
        if (target.control != null && target.control > 1) {
            this.controls.splice(target.control, 1);
        } else if (target.control == null) {
            this.controls.push([target.x, target.y, target.x, target.y, target.x, target.y]);
        }
    }

    draw() {
        let spline = new Spline(this.controls);
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.strokeStyle = "black";
        this.context.beginPath();
        let inner_width = this.width - 2 * this.padding;
        let inner_height = this.height - 2 * this.padding;
        let ystart = spline.eval(0) * inner_height;
        this.context.moveTo(this.padding, this.height - ystart - this.padding);
        for (let i = 1; i < inner_width; i++) {
            let y = spline.eval(i / (inner_width - 1)) * inner_height + this.padding;
            this.context.lineTo(i + this.padding, this.height - y);
        }
        this.context.stroke();
        this.controls.forEach(control => {
            let x0 = control[0] * inner_width + this.padding - this.dot_size / 2;
            let y0 = this.height - (control[1] * inner_height + this.padding + this.dot_size / 2);
            let x1 = control[2] * inner_width + this.padding - this.dot_size / 2;
            let y1 = this.height - (control[3] * inner_height + this.padding + this.dot_size / 2);
            let x2 = control[4] * inner_width + this.padding - this.dot_size / 2;
            let y2 = this.height - (control[5] * inner_height + this.padding + this.dot_size / 2);
            this.context.fillStyle = "red";
            this.context.strokeStyle = "red";
            this.context.beginPath();
            this.context.arc(x1 + this.dot_size / 2, y1 + this.dot_size / 2, .45 * this.dot_size, 0, 2 * Math.PI);
            this.context.fill();
            this.context.beginPath();
            this.context.moveTo(x0 + this.dot_size / 2, y0 + this.dot_size / 2);
            this.context.lineTo(x1 + this.dot_size / 2, y1 + this.dot_size / 2);
            this.context.stroke();
            this.context.beginPath();
            this.context.arc(x2 + this.dot_size / 2, y2 + this.dot_size / 2, .45 * this.dot_size, 0, 2 * Math.PI);
            this.context.fill();
            this.context.beginPath();
            this.context.moveTo(x0 + this.dot_size / 2, y0 + this.dot_size / 2);
            this.context.lineTo(x2 + this.dot_size / 2, y2 + this.dot_size / 2);
            this.context.stroke();
            this.context.fillStyle = "black";
            this.context.fillRect(x0, y0, this.dot_size, this.dot_size);
        });
    }

    read() {
        return this.controls;
    }

    write(value) {
        this.controls = [...value];
    }

    update() {
        super.update();
        this.draw();
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
            seed: random_seed(),
            scale: 64,
            interpolation: "smoother",
            draw_grid: false,
            spline: [[0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1]],
        }
        for (let key in config) {
            this.config[key] = config[key];
        }
    }

    setup(container) {
        let panel = document.createElement("div");
        panel.classList.add("panel");
        panel.classList.add("panel-noise");
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("panel-canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        panel.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        let panel_inputs = document.createElement("div");
        panel_inputs.classList.add("panel-inputs");
        this.inputs.push(new SeedParameterInput(this, "seed", "Seed"));
        this.inputs.push(new RangeParameterInput(this, "scale", "Scale", 64, 8, 512, 1));
        this.inputs.push(new SelectParameterInput(this, "interpolation", "Interpolation", ["linear", "smooth", "smoother"]));
        this.inputs.push(new BooleanParameterInput(this, "draw_grid", "Draw grid"));
        this.inputs.push(new SplineParameterInput(this, "spline", "Spline"));
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        panel.appendChild(panel_inputs);
        container.appendChild(panel);
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
        let spline = new Spline(this.config.spline);
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
                let interp_splined = spline.eval(interp_vert);
                this.values[py].push(interp_splined);
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

class Output {

    constructor(controller, config) {
        this.controller = controller;
        this.canvas = null;
        this.context = null;
        this.inputs = [];
        this.values = null;
        this.width = this.controller.config.width;
        this.height = this.controller.config.height;
        this.config = {}
        for (let key in config) {
            this.config[key] = config[key];
        }
    }

    setup(container) {
        let panel = document.createElement("div");
        panel.classList.add("panel");
        panel.classList.add("panel-ouput");
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("panel-canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        panel.appendChild(this.canvas);
        this.context = this.canvas.getContext("2d");
        let panel_inputs = document.createElement("div");
        panel_inputs.classList.add("panel-inputs");
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        panel.appendChild(panel_inputs);
        container.appendChild(panel);
    }

    update() {
        let imagedata = new ImageData(this.width, this.height);
        for (let py = 0; py < this.height; py++) {
            for (let px = 0; px < this.width; px++) {
                let k = ((py * this.width) + px) * 4;
                let total_value = 0;
                this.controller.noises.forEach(noise => {
                    total_value += noise.values[py][px];
                })
                total_value /= this.controller.noises.length;
                let noise = total_value;
                imagedata.data[k] = 255 * noise;
                imagedata.data[k + 1] = 255 * noise;
                imagedata.data[k + 2] = 255 * noise;
                imagedata.data[k + 3] = 255;
            }
        }
        this.context.putImageData(imagedata, 0, 0);
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