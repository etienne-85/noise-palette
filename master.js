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

    distance(other) {
        return this.sub(other).norm();
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

    add(other) {
        return new Vect2(this.x + other.x, this.y + other.y);
    }

    add_inplace(other) {
        this.x += other.x;
        this.y += other.y;
    }

    sub(other) {
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
        this.noise_panels = [];
        this.config = {
            width: 400,
            height: 400
        };
        this.output_panel = new OutputPanel(this);
        for (let key in config) {
            this.config[key] = config[key];
        }
        this.input_counter = 0;
    }

    setup() {
        let panels_container = document.getElementById("panels");
        this.noise_panels.forEach(panel => {
            panel.setup(panels_container);
        });
        this.output_panel.setup(panels_container);
    }

    update() {
        this.noise_panels.forEach(panel => { panel.update(); });
        this.output_panel.update();
    }

    on_noise_panel_input_update() {
        //Noise panel is responsible for updating itself beforehand
        this.output_panel.update();
    }

    get_input_id() {
        this.input_counter++;
        return this.input_counter;
    }

}


function obj_arr_cpy(arr) {
    let out = [];
    arr.forEach(x => {
        out.push(x.copy());
    });
    return out;
}


function lerp(P0, P1, x) {
    let t = (x - P0.x) / (P1.x - P0.x);
    return (1 - t) * P0.y + t * P1.y;
}


function cubic_bezier(P0, P1, P2, P3, x, tol=.001) {
    let maxt = 1;
    let mint = 0;
    let t = 0.5;
    let z = 0;
    while (true) {
        t = (maxt + mint) / 2;
        z = P0.x * (1 - t) ** 3 + 3 * P1.x * t * (1 - t) ** 2 + 3 * P2.x * (1 - t) * t ** 2 + P3.x * t ** 3;
        if (Math.abs(z - x) < tol) break;
        if (z < x) {
            mint = t;
        } else {
            maxt = t;
        }
    }
    return P0.y * (1 - t) ** 3 + 3 * P1.y * t * (1 - t) ** 2 + 3 * P2.y * (1 - t) * t ** 2 + P3.y * t ** 3;
}

class Spline {
    constructor(controls) {
        this.controls = obj_arr_cpy(controls);
        this.controls.sort((a, b) => { return a.x - b.x });
        this.precooked = false;
        this.tol = 0.001;
        this.precooked_values = null;
    }

    precook() {
        this.precooked_values = [];
        let n = (1 / this.tol) + 1;
        for (let i = 0; i < n; i++) {
            let t = i / (n - 1);
            this.precooked_values.push(this.eval(t));
        }
        this.precooked = true;
    }

    interpolate(P0, P1, x) {
        if (P0.bezier_next == null && P1.bezier_prev == null) {
            return lerp(P0, P1, x);
        } else if (P0.bezier_next == null) {
            return cubic_bezier(P0, P0, P1.bezier_prev, P1, x, this.tol);
        } else if (P1.bezier_prev == null) {
            return cubic_bezier(P0, P0.bezier_next, P1, P1, x, this.tol);
        } else {
            return cubic_bezier(P0, P0.bezier_next, P1.bezier_prev, P1, x, this.tol);
        }
    }

    eval(t) {
        let x = Math.min(1, Math.max(0, t));
        if (this.precooked) {
            return this.precooked_values[Math.floor(x / this.tol)];
        }
        for (let i = 0; i < this.controls.length; i++) {
            if (this.controls[i].x == x) return this.controls[i].y;
            if (i < this.controls.length - 1 && this.controls[i].x < x && this.controls[i + 1].x > x) {
                return this.interpolate(this.controls[i], this.controls[i + 1], x);
            }
        }
    }
}


class ControlPoint extends Vect2 {

    constructor(x, y) {
        super(x, y);
        this.bezier_prev = null;
        this.bezier_next = null;
    }

    copy() {
        let cp = new ControlPoint(this.x, this.y);
        if (this.bezier_prev != null) {
            cp.bezier_prev = this.bezier_prev.copy();
        }
        if (this.bezier_next != null) {
            cp.bezier_next = this.bezier_next.copy();
        }
        return cp;
    }

    draw_bezier(context, height, inner_width, inner_height, padding, dot_size, x0, y0, point) {
        let x1 = point.x * inner_width + padding - dot_size / 2;
        let y1 = height - (point.y * inner_height + padding + dot_size / 2);
        context.fillStyle = "red";
        context.strokeStyle = "red";
        context.beginPath();
        context.arc(x1 + dot_size / 2, y1 + dot_size / 2, .45 * dot_size, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.moveTo(x0 + dot_size / 2, y0 + dot_size / 2);
        context.lineTo(x1 + dot_size / 2, y1 + dot_size / 2);
        context.stroke();
    }

    draw(context, height, inner_width, inner_height, padding, dot_size) {
        let x0 = this.x * inner_width + padding - dot_size / 2;
        let y0 = height - (this.y * inner_height + padding + dot_size / 2);
        if (this.bezier_prev != null) {
            this.draw_bezier(context, height, inner_width, inner_height, padding, dot_size, x0, y0, this.bezier_prev);
        }
        if (this.bezier_next != null) {
            this.draw_bezier(context, height, inner_width, inner_height, padding, dot_size, x0, y0, this.bezier_next);
        }
        context.fillStyle = "black";
        context.fillRect(x0, y0, dot_size, dot_size);
    }

}


const BEZIER_PREV = 0;
const BEZIER_NEXT = 1;


function collides(a, b, tol) {
    if (a == null || b == null) return false;
    return a.distance(b) < tol;
}


class SplineParameterInput extends ParameterInput {

    constructor(reference, name, label) {
        super(reference, name, label, [new ControlPoint(0, 0), new ControlPoint(1, 1)]);
        this.controls = null;
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
        let target = new Vect2(
            (event.clientX - bounds.left - this.padding) / (this.width - 2 * this.padding),
            1 - (event.clientY - bounds.top - this.padding) / (this.width - 2 * this.padding),
        );
        target.control = null;
        target.bezier_control = null;
        let hitbox = this.dot_size / (this.width - 2 * this.padding) / 1.5;
        if (collisions) {
            for (let i = 0; i < this.controls.length; i++) {
                if (collides(this.controls[i], target, hitbox)) {
                    target.control = i;
                }
                if (collides(this.controls[i].bezier_prev, target, hitbox)) {
                    target.bezier_control = { control: i, index: BEZIER_PREV };
                }
                if (collides(this.controls[i].bezier_next, target, hitbox)) {
                    target.bezier_control = { control: i, index: BEZIER_NEXT };
                }
            }
        }
        return target;
    }

    get_closest_control(target) {
        let controls = [];
        for (let i = 0; i < this.controls.length; i++) {
            controls.push({
                index: i,
                distance: this.controls[i].distance(target)
            });
        }
        controls.sort((a, b) => { return a.distance - b.distance });
        return controls[0].index;
    }

    inflate(wrapper) {
        this.controls = obj_arr_cpy(this.initial_value);
        this.element = document.createElement("canvas");
        this.element.width = this.width;
        this.element.height = this.height;
        this.context = this.element.getContext("2d");
        wrapper.appendChild(this.element);
        this.draw();
        var self = this;
        this.element.addEventListener("click", (e) => { self.on_click(e) });
        this.element.addEventListener("dblclick", (e) => { self.on_dblclick(e) });
        wrapper.addEventListener("mousedown", (e) => { self.on_mousedown(e) });
        window.addEventListener("mousemove", (e) => { self.on_mousemove(e) });
        window.addEventListener("mouseup", (e) => { self.on_mouseup(e) });
    }

    on_click(event) {
        let target = this.get_click_target(event);
        if (event.ctrlKey) {
            if (target.control != null && target.control > 1) {
                this.controls.splice(target.control, 1);
            } else if (target.control == null) {
                this.controls.push(new ControlPoint(target.x, target.y));
            }
        }
        this.update();
    }

    on_dblclick(event) {
        //TODO: check
        let target = this.get_click_target(event);
        if (target.bezier_control != null) {
            event.preventDefault();
            event.stopPropagation();
            if (target.bezier_control.index == 0) {
                this.controls[target.bezier_control.control].bezier_prev = null;
            } else {
                this.controls[target.bezier_control.control].bezier_next = null;
            }
            this.update();
            return false;
        }
    }

    on_mousedown(event) {
        let target = this.get_click_target(event);
        if (target.control != null && !event.shiftKey) {
            this.moving_control = target.control;
        } else if (target.bezier_control != null) {
            this.moving_bezier_control = target.bezier_control;
        } else if (event.shiftKey) {
            let closest_control_index = this.get_closest_control(target);
            let cc = this.controls[closest_control_index];
            if (cc.x > target.x) {
                this.moving_bezier_control = { control: closest_control_index, index: BEZIER_PREV };
                if (cc.bezier_prev == null) {
                    cc.bezier_prev = new Vect2(cc.x, cc.y);
                }
            } else {
                this.moving_bezier_control = { control: closest_control_index, index: BEZIER_NEXT };
                if (cc.bezier_next == null) {
                    cc.bezier_next = new Vect2(cc.x, cc.y);
                }
            }
        }
    }

    on_control_drag(target) {
        let prev = this.controls[this.moving_control].copy();
        if (this.moving_control > 1) {
            this.controls[this.moving_control].x = Math.min(1, Math.max(0, target.x));
        }
        this.controls[this.moving_control].y = Math.min(1, Math.max(0, target.y));
        let dxy = this.controls[this.moving_control].sub(prev);
        if (this.controls[this.moving_control].bezier_prev != null) {
            this.controls[this.moving_control].bezier_prev.add_inplace(dxy);
        }
        if (this.controls[this.moving_control].bezier_next != null) {
            this.controls[this.moving_control].bezier_next.add_inplace(dxy);
        }
    }

    on_bezier_control_drag(target) {
        if (this.moving_bezier_control.index == BEZIER_PREV) {
            this.controls[this.moving_bezier_control.control].bezier_prev = target.copy();
        } else {
            this.controls[this.moving_bezier_control.control].bezier_next = target.copy();
        }
    }

    on_mousemove(event) {
        if (this.moving_control != null || this.moving_bezier_control != null) {
            let target = this.get_click_target(event, false);
            if (this.moving_control != null) {
                this.on_control_drag(target);
            } else {
                this.on_bezier_control_drag(target);
            }
            this.update();
        }
    }

    on_mouseup(event) {
        this.moving_control = null;
        this.moving_bezier_control = null;
    }

    draw_grid() {
        this.context.strokeStyle = "grey";
        this.context.lineWidth = 0.75;
        this.context.beginPath();
        this.context.moveTo(this.padding, this.padding);
        this.context.lineTo(this.width - this.padding, this.padding);
        this.context.lineTo(this.width - this.padding, this.height - this.padding);
        this.context.lineTo(this.padding, this.height - this.padding);
        this.context.lineTo(this.padding, this.padding);
        this.context.moveTo(this.width / 2, this.padding);
        this.context.lineTo(this.width / 2, this.height - this.padding);
        this.context.moveTo(this.padding, this.height / 2);
        this.context.lineTo(this.width - this.padding, this.height / 2);
        this.context.stroke();
        this.context.lineWidth = 0.3;
        this.context.beginPath();
        this.context.moveTo(this.width / 4, this.padding);
        this.context.lineTo(this.width / 4, this.height - this.padding);
        this.context.moveTo(3 * this.width / 4, this.padding);
        this.context.lineTo(3 * this.width / 4, this.height - this.padding);
        this.context.moveTo(this.padding, this.height / 4);
        this.context.lineTo(this.width - this.padding, this.height / 4);
        this.context.moveTo(this.padding, 3 * this.height / 4);
        this.context.lineTo(this.width - this.padding, 3 * this.height / 4);
        this.context.stroke();
    }

    draw() {
        let spline = new Spline(this.controls);
        this.context.clearRect(0, 0, this.width, this.height);
        this.draw_grid();
        this.context.lineWidth = 1;
        this.context.strokeStyle = "black";
        let inner_width = this.width - 2 * this.padding;
        let inner_height = this.height - 2 * this.padding;
        let ystart = spline.eval(0) * inner_height;
        this.context.beginPath();
        this.context.moveTo(this.padding, this.height - ystart - this.padding);
        for (let i = 1; i < inner_width; i++) {
            let y = spline.eval(i / (inner_width - 1)) * inner_height + this.padding;
            this.context.lineTo(i + this.padding, this.height - y);
        }
        this.context.stroke();
        this.controls.forEach(control => {
            control.draw(this.context, this.height, inner_width, inner_height, this.padding, this.dot_size);
        });
    }

    read() {
        return this.controls;
    }

    write(value) {
        this.controls = obj_arr_cpy(value);
    }

    update() {
        super.update();
        this.draw();
    }

}

class PerlinNoise {

    constructor(width, height, seed, scale, interpolation) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.scale = scale;
        this.interpolation = interpolation;
        this.gradients = null;
        this.values = null;
    }

    compute_gradients() {
        this.gradients = [];
        let jstart = Math.floor(-this.width / 2 / this.scale) - 1;
        let jend = Math.floor(this.width / 2 / this.scale) + 1;
        let istart = Math.floor(-this.height / 2 / this.scale) - 1;
        let iend = Math.floor(this.height / 2 / this.scale) + 1;
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
        let jstart = Math.floor(-this.width / 2 / this.scale) - 1;
        let istart = Math.floor(-this.height / 2 / this.scale) - 1;
        for (let py = 0; py < this.height; py++) {
            this.values.push([]);
            for (let px = 0; px < this.width; px++) {
                let j = (px - this.width / 2) / this.scale - jstart;
                let i = (py - this.height / 2) / this.scale - istart;
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

    compute() {
        this.compute_gradients();
        this.compute_values();
    }

}

class NoisePanel {

    constructor(controller, config={}) {
        this.controller = controller;
        this.canvas = null;
        this.context = null;
        this.inputs = [];
        this.values = null;
        this.width = this.controller.config.width;
        this.height = this.controller.config.height;
        this.config = {
            seed: random_seed(),
            scale: 64,
            interpolation: "smoother",
            spline: [new ControlPoint(0, 0), new ControlPoint(1, 1)],
            harmonics: 0,
            harmonic_spread: 2,
            harmonic_gain: 0.5,
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
        this.inputs.push(new RangeParameterInput(this, "harmonics", "Harmonics", 0, 0, 4, 1));
        this.inputs.push(new RangeParameterInput(this, "harmonic_spread", "Harmonic Spread", 2, 0, 4, 0.01));
        this.inputs.push(new RangeParameterInput(this, "harmonic_gain", "Harmonic Gain", 1, 0, 2, 0.01));
        this.inputs.push(new SelectParameterInput(this, "interpolation", "Interpolation", ["linear", "smooth", "smoother"]));
        this.inputs.push(new SplineParameterInput(this, "spline", "Spline"));
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        panel.appendChild(panel_inputs);
        container.appendChild(panel);
    }

    update_values() {
        let spline = new Spline(this.config.spline);
        spline.precook();
        let scale = this.config.scale;
        let amplitude = 1;
        let total_amplitude = 0;
        let harmonics = [];
        for (let k = 0; k <= this.config.harmonics; k++) {
            let harmonic = new PerlinNoise(this.width, this.height, this.config.seed * (k + 1), scale, this.config.interpolation);
            harmonic.compute();
            harmonics.push(harmonic);
            scale /= this.config.harmonic_spread;
            total_amplitude += amplitude;
            amplitude *= this.config.harmonic_gain;
        }
        this.values = [];
        for (let i = 0; i < this.height; i++) {
            this.values.push([]);
            for (let j = 0; j < this.width; j++) {
                this.values[i].push(0);
                amplitude = 1;
                harmonics.forEach(harmonic => {
                    this.values[i][j] += amplitude * harmonic.values[i][j];
                    amplitude *= this.config.harmonic_gain;
                });
                this.values[i][j] = spline.eval(this.values[i][j] / total_amplitude);
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
        this.update();
        this.controller.on_noise_panel_input_update();
    }

}

class OutputPanel {

    constructor(controller, config={}) {
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
                this.controller.noise_panels.forEach(panel => {
                    total_value += panel.values[py][px];
                })
                total_value /= this.controller.noise_panels.length;
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
    controller.noise_panels.push(new NoisePanel(controller));
    controller.noise_panels.push(new NoisePanel(controller));
    controller.setup();
    controller.update();
}

window.addEventListener("load", on_load);