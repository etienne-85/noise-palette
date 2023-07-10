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
    }

    read() {
        throw new Error("Not implemented!");
    }

    write(value) {
        throw new Error("Not implemented!");
    }

    update(propagate=true) {
        let value = this.read();
        this.reference.config[this.name] = value;
        if (propagate) this.reference.on_input_update();
    }

    reset() {
        this.write(this.default_value);
        this.update(false);
    }

}

class RangeParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value, min, max, step, transform) {
        super(reference, name, label, default_value);
        this.input_range = null;
        this.input_number = null;
        this.min = min;
        this.max = max;
        this.step = step;
        this.transform = transform;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-range");
        this.input_number = document.createElement("input");
        this.input_number.id = this.id;
        this.input_number.type = "number";
        this.input_number.min = this.min;
        this.input_number.max = this.max;
        this.input_number.step = this.step;
        this.input_number.value = this.initial_value;
        this.input_range = document.createElement("input");
        this.input_range.type = "range";
        this.input_range.min = this.min;
        this.input_range.max = this.max;
        this.input_range.step = this.step;
        this.input_range.value = this.initial_value;
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.input_range);
        wrapper.appendChild(this.input_number);
        var self = this;
        this.input_range.addEventListener("input", () => {
            self.input_number.value = self.input_range.value;
            self.update();
        });
        this.input_range.addEventListener("dblclick", () => {
            self.write(self.default_value);
            self.update();
        });
        this.input_number.addEventListener("input", () => {
            self.input_range.value = self.input_number.value;
            self.update();
        });
    }

    read() {
        let base = is_integer(this.step) ? parseInt(this.input_number.value) : parseFloat(this.input_number.value);
        if (this.transform != undefined) return this.transform(base);
        return base;
    }

    write(value) {
        this.input_number.value = value;
        this.input_range.value = value;
    }

}

class SelectParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value, options) {
        super(reference, name, label, default_value)
        this.select = null;
        this.options = options;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-select");
        this.select = document.createElement("select");
        this.select.id = this.id;
        this.options.forEach(option_text => {
            let option = document.createElement("option");
            option.value = option_text;
            option.textContent = option_text;
            if (option_text == this.initial_value) {
                option.selected = true;
            }
            this.select.appendChild(option);
        });
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(label);
        wrapper.appendChild(this.select);
        var self = this;
        this.select.addEventListener("input", () => { self.update(); });
    }

    read() {
        let options = this.select.querySelectorAll("option");
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) return options[i].value;
        }
    }

    write(value) {
        this.select.querySelectorAll("option").forEach(option => {
            option.selected = option.value == value;
        });
    }

}

class BooleanParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.input = null;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-boolean");
        this.input = document.createElement("input");
        this.input.id = this.id;
        this.input.type = "checkbox";
        if (this.initial_value) {
            this.input.checked = true;
        }
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        wrapper.appendChild(this.input);
        wrapper.appendChild(label);
        var self = this;
        this.input.addEventListener("input", () => { self.update(); });
    }

    read() {
        return this.input.checked;
    }

    write(value) {
        this.input.checked = value;
    }
}

function random_seed() {
    return Math.floor(Math.random() * (2 ** 30));
}

class SeedParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.input = null;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-seed");
        this.input = document.createElement("input");
        this.input.id = this.id;
        this.input.type = "number";
        this.input.step = 1;
        this.input.value = this.initial_value;
        let label = document.createElement("label");
        label.setAttribute("for", this.id);
        label.textContent = this.label;
        let button = document.createElement("button");
        button.textContent = "Random";
        var self = this;
        this.input.addEventListener("input", () => { self.update(); })
        button.addEventListener("click", () => {
            self.write(random_seed());
            self.update();
        });
        wrapper.appendChild(label);
        wrapper.appendChild(this.input);
        wrapper.appendChild(button);
    }

    read() {
        return parseInt(this.input.value);
    }

    write(value) {
        this.input.value = value;
    }

}

class Controller {
    
    constructor(config={}) {
        this.config = {
            width: 400,
            height: 400
        };
        for (let key in config) {
            this.config[key] = config[key];
        }
        this.input_counter = 0;
        this.noise_counter = 0;
        this.header_bar = new HeaderBar(this);
        this.noise_panels = [];
        this.output_panel = new OutputPanel(this);
    }

    setup() {
        let header_container = document.getElementById("header");
        this.header_bar.setup(header_container);
        let panels_container = document.getElementById("panels");
        this.noise_panels.forEach(panel => {
            panel.setup(panels_container);
        });
        this.output_panel.setup(panels_container);
    }

    add_noise_panel() {
        let panel = new NoisePanel(this, this.noise_counter);
        this.noise_counter++;
        let panels_container = document.getElementById("panels");
        panel.setup(panels_container);
        panel.update();
        this.noise_panels.push(panel);
        this.output_panel.update();
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

    reset() {
        this.header_bar.reset();
        this.noise_panels.forEach(panel => {
            panel.reset();
        });
        this.output_panel.reset();
    }

    delete_noise_panel(index) {
        if (this.noise_panels.length == 1) {
            this.noise_panels[0].reset();
        } else {
            for (let i = 0; i < this.noise_panels.length; i++) {
                if (this.noise_panels[i].index != index) continue;
                this.noise_panels[i].panel.parentElement.removeChild(this.noise_panels[i].panel);
                this.noise_panels.splice(i, 1);
                this.output_panel.update();
                break;
            }
        }
    }

    export() {
        let scale = 1;
        let export_canvas = document.createElement("canvas");
        let width = scale * this.config.width;
        let height = scale * this.config.height;
        export_canvas.width = width;
        export_canvas.height = height;
        let source_imagedata = this.output_panel.context.getImageData(0, 0, this.config.width, this.config.height);
        let export_context = export_canvas.getContext("2d");
        let export_imagedata = export_context.getImageData(0, 0, width, height);
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                let sk = (Math.floor(i / scale) * this.config.width + Math.floor(j / scale)) * 4;
                let dk = (i * width + j) * 4;
                for (let l = 0; l < 4; l++) {
                    export_imagedata.data[dk + l] = source_imagedata.data[sk + l];
                }
            }
        }
        export_context.putImageData(export_imagedata, 0, 0);
        window.open(export_canvas.toDataURL("image/png"), "_blank").focus();
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

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
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
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        wrapper.appendChild(this.canvas);
        this.draw();
        var self = this;
        //this.canvas.addEventListener("click", (e) => { self.on_click(e) });
        this.canvas.addEventListener("dblclick", (e) => { self.on_dblclick(e) });
        wrapper.addEventListener("mousedown", (e) => { self.on_mousedown(e) });
        window.addEventListener("mousemove", (e) => { self.on_mousemove(e) });
        window.addEventListener("mouseup", (e) => { self.on_mouseup(e) });
    }

    on_dblclick(event) {
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
        } else {
            this.write(this.default_value);
            this.update();
        }
    }

    on_mousedown(event) {
        let target = this.get_click_target(event);
        if (target.control != null && !event.shiftKey) {
            if (event.ctrlKey && target.control > 1) {
                this.controls.splice(target.control, 1);
                this.update();
            } else {
                this.moving_control = target.control;
            }
        } else if (target.control == null && !event.shiftKey && target.bezier_control == null) {
            this.controls.push(new ControlPoint(target.x, target.y));
            this.update();
            this.moving_control = this.controls.length - 1;
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
        this.draw();
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

class HeaderBar {

    constructor(controller, config={}) {
        this.controller = controller;
    }

    setup(container) {
        let wrapper = document.createElement("div");
        wrapper.classList.add("header-bar");
        container.appendChild(wrapper);

        var self = this;

        let button_reset = document.createElement("button");
        button_reset.textContent = "Reset";
        button_reset.addEventListener("click", () => {
            self.controller.reset();
        });
        wrapper.appendChild(button_reset);

        let button_add = document.createElement("button");
        button_add.textContent = "Add noise";
        button_add.addEventListener("click", () => {
            self.controller.add_noise_panel();
        });
        wrapper.appendChild(button_add);

        let button_export = document.createElement("button");
        button_export.textContent = "Export";
        button_export.addEventListener("click", () => {
            self.controller.export();
        });
        wrapper.appendChild(button_export);
    }

    reset() { }

}

class NoisePanel {

    constructor(controller, index, config={}) {
        this.controller = controller;
        this.index = index;
        this.panel = null;
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
        var self = this;
        this.panel = document.createElement("div");
        this.panel.classList.add("panel");
        this.panel.classList.add("panel-noise");
        let buttons_container = document.createElement("div");
        buttons_container.classList.add("panel-buttons");
        let reset_button = document.createElement("button");
        reset_button.textContent = "Reset";
        reset_button.addEventListener("click", () => { self.reset(); });
        buttons_container.appendChild(reset_button);
        let delete_button = document.createElement("button");
        delete_button.textContent = "Delete";
        delete_button.addEventListener("click", () => { self.delete(); });
        buttons_container.appendChild(delete_button);
        this.panel.appendChild(buttons_container);
        let canvas = document.createElement("canvas");
        canvas.classList.add("panel-canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        this.panel.appendChild(canvas);
        this.context = canvas.getContext("2d");
        let panel_inputs = document.createElement("div");
        panel_inputs.classList.add("panel-inputs");
        this.inputs.push(new SeedParameterInput(this, "seed", "Seed", 0));
        this.inputs.push(new RangeParameterInput(this, "scale", "Scale", 64, 8, 512, 1));
        this.inputs.push(new RangeParameterInput(this, "harmonics", "Harmonics", 0, 0, 4, 1));
        this.inputs.push(new RangeParameterInput(this, "harmonic_spread", "Harmonic Spread", 2, 0, 4, 0.01));
        this.inputs.push(new RangeParameterInput(this, "harmonic_gain", "Harmonic Gain", 1, 0, 2, 0.01));
        this.inputs.push(new SelectParameterInput(this, "interpolation", "Interpolation", "smoother", ["linear", "smooth", "smoother"]));
        this.inputs.push(new SplineParameterInput(this, "spline", "Spline", [new ControlPoint(0, 0), new ControlPoint(1, 1)]));
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        this.panel.appendChild(panel_inputs);
        let panel_output = container.querySelector(".panel-output");
        if (panel_output == null) {
            container.appendChild(this.panel);
        } else {
            container.insertBefore(this.panel, panel_output);
        }
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

    reset() {
        this.inputs.forEach(input => {
            input.reset();
        });
        this.on_input_update();
    }

    delete() {
        this.controller.delete_noise_panel(this.index);
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
        panel.classList.add("panel-output");
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

    reset() {}

}

var controller;

function on_load() {
    console.log("Hello, World!");
    controller = new Controller();
    controller.setup();
    controller.add_noise_panel();
    controller.update();
}

window.addEventListener("load", on_load);