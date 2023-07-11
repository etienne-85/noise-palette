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

    create_context_menu(event, preset_list) {
        event.preventDefault();
        clear_context_menus();
        let menu = document.createElement("div");
        menu.classList.add("contextmenu");
        var self = this;
        preset_list.forEach(preset => {
            let option = document.createElement("span");
            option.classList.add("contextmenu-entry");
            option.textContent = preset.name;
            option.addEventListener("click", () => {
                document.body.removeChild(menu);
                self.write(preset.value);
                self.update();
            });
            menu.appendChild(option);
        });
        document.body.appendChild(menu);
        let bounds = menu.getBoundingClientRect();
        menu.style.left = event.clientX + "px";
        menu.style.top = Math.min(event.clientY, window.innerHeight - bounds.height) + "px";
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
        let input_group = document.createElement("div");
        input_group.classList.add("input-group");
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
        input_group.appendChild(this.input_range);
        input_group.appendChild(this.input_number);
        wrapper.appendChild(input_group);
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
        let input_group = document.createElement("div");
        input_group.classList.add("input-group");
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
        input_group.appendChild(this.input);
        input_group.appendChild(button);
        wrapper.appendChild(input_group);
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
        this.output_panel = new OutputPanel(this, this.config.width, this.config.height);
    }

    setup() {
        let header_container = document.getElementById("header");
        this.header_bar.setup(header_container);
        let panels_container = document.getElementById("panels");
        this.noise_panels.forEach(panel => {
            panel.setup(panels_container);
        });
        this.output_panel.setup(panels_container);
        let self = this;
        document.getElementById("button-export").addEventListener("click", () => { self.export(); })
    }

    add_noise_panel() {
        let panel = new NoisePanel(this, this.config.width, this.config.height, this.noise_counter);
        this.noise_counter++;
        let panels_container = document.getElementById("panels");
        panel.setup(panels_container);
        panel.update();
        this.noise_panels.push(panel);
        this.output_panel.update(this.noise_panels);
    }

    update() {
        this.noise_panels.forEach(panel => { panel.update(); });
        this.output_panel.update(this.noise_panels);
    }

    on_noise_panel_input_update() {
        //Noise panel is responsible for updating itself beforehand
        this.output_panel.update(this.noise_panels);
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
                this.output_panel.update(this.noise_panels);
                break;
            }
        }
    }

    export() {
        document.getElementById("modal-export").classList.remove("active");
        document.getElementById("modal-wait").classList.add("active");
        setTimeout(() => {
            let width = parseInt(document.getElementById("input-export-width").value);
            let height = parseInt(document.getElementById("input-export-height").value);
            let precook = document.getElementById("input-export-precook").checked;
            let export_noise_panels = [];
            let dummy_container = document.createElement("div");
            this.noise_panels.forEach((panel, i) => {
                export_noise_panels.push(new NoisePanel(this, width, height, null, panel.config));
                export_noise_panels[i].setup(dummy_container);
                export_noise_panels[i].update(precook);
            });
            let export_output_panel = new OutputPanel(this, width, height, this.output_panel.config);
            export_output_panel.setup(dummy_container);
            export_output_panel.update(export_noise_panels, precook);
            let link = document.createElement("a");
            link.setAttribute("download", `noise-palette-${parseInt((new Date()) * 1)}.png`);
            link.href = export_output_panel.canvas.toDataURL("image/png");
            link.click();
            document.getElementById("modal-wait").classList.remove("active");
        }, 1);
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

    constructor(x, y, bprev=null, bnext=null) {
        super(x, y);
        this.bezier_prev = bprev;
        this.bezier_next = bnext;
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


function generate_step_controls(n) {
    let controls = [new ControlPoint(0, 0)];
    let y = 0;
    for (let i = 0; i < n; i++) {
        let x = (i + 1) / (n + 1); 
        controls.push(new ControlPoint(x - 0.0001, y));
        y = (i + 1) / n;
        controls.push(new ControlPoint(x, y));
    }
    controls.push(new ControlPoint(1, 1));
    return controls;
}


function generate_contours_controls(n) {
    let width = Math.min(0.05, 1 / n / 4);
    let controls = [new ControlPoint(0, 0)];
    for (let i = 0; i < n; i++) {
        let x = (i + 1) / (n + 1);
        controls.push(new ControlPoint(x - width, 0));
        controls.push(new ControlPoint(x, 1));
        controls.push(new ControlPoint(x + width, 0));
    }
    controls.push(new ControlPoint(1, 0));
    return controls;
}


const PRESETS_SPLINES = [
    { name: "default", value: [new ControlPoint(0, 0), new ControlPoint(1, 1)] },
    { name: "step1", value: generate_step_controls(1)},
    { name: "step2", value: generate_step_controls(2)},
    { name: "step3", value: generate_step_controls(3)},
    { name: "contrast", value: [new ControlPoint(0, 0, null, new Vect2(1, 0)), new ControlPoint(1, 1, new Vect2(0, 1), null)] },
    { name: "contours1", value: generate_contours_controls(1) },
    { name: "contours5", value: generate_contours_controls(5) },
    { name: "contours11", value: generate_contours_controls(11) },
    { name: "contours15", value: generate_contours_controls(15) },
];


class SplineParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.controls = null;
        this.canvas = null;
        this.padding = 8;
        this.width = 256;
        this.height = 171;
        this.dot_size = 10;
        this.context = null;
        this.moving_control = null;
        this.moving_bezier_control = null;
    }

    get_click_target(event, collisions=true) {
        let bounds = this.canvas.getBoundingClientRect();
        let target = new Vect2(
            (event.clientX - bounds.left - this.padding) / (this.width - 2 * this.padding),
            1 - (event.clientY - bounds.top - this.padding) / (this.height - 2 * this.padding),
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
        wrapper.classList.add("panel-input-spline");
        this.controls = obj_arr_cpy(this.initial_value);
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        wrapper.appendChild(this.canvas);
        this.draw();
        var self = this;
        this.canvas.addEventListener("dblclick", (e) => { self.on_dblclick(e) });
        wrapper.addEventListener("mousedown", (e) => { if (e.button == 0) self.on_mousedown(e) });
        window.addEventListener("mousemove", (e) => { self.on_mousemove(e) });
        window.addEventListener("mouseup", (e) => { if (e.button == 0) self.on_mouseup(e) });
        wrapper.addEventListener("contextmenu", (e) => { self.on_contextmenu(e); });
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

    on_contextmenu(event) {
        this.create_context_menu(event, PRESETS_SPLINES);
    }

    draw_grid() {
        this.context.strokeStyle = "grey";
        this.context.lineWidth = 0.75;
        this.context.beginPath();
        //this.context.moveTo(this.padding, this.padding);
        //this.context.lineTo(this.width - this.padding, this.padding);
        //this.context.lineTo(this.width - this.padding, this.height - this.padding);
        //this.context.lineTo(this.padding, this.height - this.padding);
        //this.context.lineTo(this.padding, this.padding);
        this.context.moveTo(this.width / 2, 0);
        this.context.lineTo(this.width / 2, this.height);
        this.context.moveTo(0, this.height / 2);
        this.context.lineTo(this.width, this.height / 2);
        this.context.stroke();
        this.context.lineWidth = 0.3;
        this.context.beginPath();
        this.context.moveTo(this.width / 4, 0);
        this.context.lineTo(this.width / 4, this.height);
        this.context.moveTo(3 * this.width / 4, 0);
        this.context.lineTo(3 * this.width / 4, this.height);
        this.context.moveTo(0, this.height / 4);
        this.context.lineTo(this.width - 0, this.height / 4);
        this.context.moveTo(0, 3 * this.height / 4);
        this.context.lineTo(this.width - 0, 3 * this.height / 4);
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

    constructor(width, height, seed, period, interpolation) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.period = period;
        this.interpolation = interpolation;
        this.gradients = null;
        this.values = null;
    }

    compute_gradients() {
        this.gradients = [];
        let jstart = Math.floor(-this.width / 2 / this.period) - 1;
        let jend = Math.floor(this.width / 2 / this.period) + 1;
        let istart = Math.floor(-this.height / 2 / this.period) - 1;
        let iend = Math.floor(this.height / 2 / this.period) + 1;
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
        let jstart = Math.floor(-this.width / 2 / this.period) - 1;
        let istart = Math.floor(-this.height / 2 / this.period) - 1;
        for (let py = 0; py < this.height; py++) {
            this.values.push([]);
            for (let px = 0; px < this.width; px++) {
                let j = (px - this.width / 2) / this.period - jstart;
                let i = (py - this.height / 2) / this.period - istart;
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
            document.getElementById("modal-export").classList.add("active");
        });
        wrapper.appendChild(button_export);
    }

    reset() { }

}


function cmp_addition(base, x, w) {
    return base + w * x;
}

function cmp_difference(base, x, w) {
    return base - w * x;
}

function cmp_product(base, x, w) {
    return base * x * w;
}

function cmp_brighter(base, x, w) {
    return Math.max(base, x * w);
}

function cmp_darker(base, x, w) {
    return Math.min(base, x, w);
}


class NoisePanel {

    constructor(controller, width, height, index, config={}) {
        this.controller = controller;
        this.index = index;
        this.panel = null;
        this.context = null;
        this.inputs = [];
        this.values = null;
        this.width = width;
        this.height = height;
        if (this.width == null || this.width == undefined || this.height == null || this.height == undefined) {
            throw new Error();
        }
        this.compositor = null;
        this.config = {
            seed: random_seed(),
            period: 64,
            interpolation: "smoother",
            spline: [new ControlPoint(0, 0), new ControlPoint(1, 1)],
            harmonics: 0,
            harmonic_spread: 2,
            harmonic_gain: 0.5,
            negative: false,
            blend_mode: "addition",
            blend_weight: 1,
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
        this.inputs.push(new RangeParameterInput(this, "period", "Period", 64, 8, 512, 1));
        this.inputs.push(new RangeParameterInput(this, "harmonics", "Harmonics", 0, 0, 7, 1));
        this.inputs.push(new RangeParameterInput(this, "harmonic_spread", "Harmonic Spread", 2, 0, 4, 0.01));
        this.inputs.push(new RangeParameterInput(this, "harmonic_gain", "Harmonic Gain", 0.5, 0, 2, 0.01));
        this.inputs.push(new SelectParameterInput(this, "interpolation", "Interpolation", "smoother", ["linear", "smooth", "smoother"]));
        this.inputs.push(new SplineParameterInput(this, "spline", "Spline", [new ControlPoint(0, 0), new ControlPoint(1, 1)]));
        this.inputs.push(new BooleanParameterInput(this, "negative", "Negative", false));
        this.inputs.push(new SelectParameterInput(this, "blend_mode", "Blend Mode", "addition", ["addition", "difference", "product", "brighter", "darker"]));
        this.inputs.push(new RangeParameterInput(this, "blend_weight", "Blend Weight", 1, 0, 9, 0.01));
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

    update_values(precook=true) {
        let spline = new Spline(this.config.spline);
        if (precook) spline.precook();
        let period = this.config.period;
        let amplitude = 1;
        let total_amplitude = 0;
        let harmonics = [];
        for (let k = 0; k <= this.config.harmonics; k++) {
            let harmonic = new PerlinNoise(this.width, this.height, this.config.seed * (k + 1), period, this.config.interpolation);
            harmonic.compute();
            harmonics.push(harmonic);
            period /= this.config.harmonic_spread;
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

    update(precook=true) {
        if (this.config.blend_mode == "addition") {
            this.compositor = cmp_addition;
        } else if (this.config.blend_mode == "difference") {
            this.compositor = cmp_difference;
        } else if (this.config.blend_mode == "product") {
            this.compositor = cmp_product;
        } else if (this.config.blend_mode == "brighter") {
            this.compositor = cmp_brighter;
        } else if (this.config.blend_mode == "darker") {
            this.compositor = cmp_darker;
        } 
        this.update_values(precook);
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


function lerp1(t, l, r) {
    return (1 - t) * l + t * r;
}


function lerpN(t, l, r) {
    let out = [];
    for (let i = 0; i < l.length; i++) {
        out.push(lerp1(t, l[i], r[i]));
    }
    return out;
}


class ColorStop {

    constructor(t, color) {
        this.t = t;
        this.color = color;
    }

    copy() {
        return new ColorStop(this.t, this.color);
    }

    hex() {
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + componentToHex(this.color[0]) + componentToHex(this.color[1]) + componentToHex(this.color[2]);
    }

}


class ColorMapping {

    constructor(stops) {
        this.stops = obj_arr_cpy(stops);
        this.stops.sort((a, b) => { return a.t - b.t });
        this.precooked = false;
        this.tol = 0.001;
        this.precooked_values = null;
    }

    precook() {
        this.precooked = false;
        this.precooked_values = [];
        let n = (1 / this.tol) + 1;
        for (let i = 0; i < n; i++) {
            let t = i / (n - 1);
            this.precooked_values.push(this.eval(t));
        }
        this.precooked = true;
    }

    eval(t) {
        let x = Math.min(1, Math.max(0, t));
        if (this.precooked) {
            return this.precooked_values[Math.floor(x / this.tol)];
        }
        if (this.stops[0].t > x) return this.stops[0].color;
        if (this.stops[this.stops.length - 1].t < x) return this.stops[this.stops.length - 1].color;
        for (let i = 0; i < this.stops.length; i++) {
            if (this.stops[i].t == x) return this.stops[i].color;
            if (i < this.stops.length - 1 && this.stops[i].t < x && this.stops[i + 1].t > x) {
                let z = (x - this.stops[i].t) / (this.stops[i + 1].t - this.stops[i].t);
                return lerpN(z, this.stops[i].color, this.stops[i+1].color);
            }
        }
    }

}


function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255 ];
}


const PRESETS_COLORMAPPINGS = [
    {
        name: "default",
        value: [
            new ColorStop(0, [0, 0, 0, 255]),
            new ColorStop(1, [255, 255, 255, 255])
        ]
    },
    {
        name: "rainbow",
        value: [
            new ColorStop(0, [102, 48, 144, 255]),
            new ColorStop(0.1667, [8, 115, 187, 255]),
            new ColorStop(0.3333, [0, 173, 241, 255]),
            new ColorStop(0.5, [117, 212, 66, 255]),
            new ColorStop(0.6667, [253, 249, 20, 255]),
            new ColorStop(0.8333, [252, 162, 22, 255]),
            new ColorStop(1, [254, 19, 26, 255]),
        ]
    },
    {
        name: "terrain",
        value: [
            new ColorStop(0, [13, 29, 55, 255]), // deep sea
            new ColorStop(0.49, [8, 115, 187, 255]), // water
            new ColorStop(0.5, [249, 209, 153, 255]), // beach
            new ColorStop(0.53, [65, 152, 10, 255]), // grass
            new ColorStop(0.69, [127, 112, 83, 255]), // grass-dirt frontier
            new ColorStop(0.7, [155, 118, 83, 255]), // dirt
            new ColorStop(0.75, [176, 169, 163, 255]), // stone
            new ColorStop(0.76, [255, 255, 255, 255]), // snow
        ]
    }
]


class ColorMappingParameterInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.stops = null;
        this.context = null;
        this.canvas = null;
        this.width = 256;
        this.height = 32;
        this.stops_container_up = null;
        this.stops_container_down = null;
        this.grabbing = null;
        this.grabstart = null;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-colormapping");
        this.stops = obj_arr_cpy(this.initial_value);
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext("2d");
        this.stops_container_up = document.createElement("div");
        this.stops_container_up.classList.add("panel-input-colormapping-stops-up")
        this.stops_container_down = document.createElement("div");
        this.stops_container_down.classList.add("panel-input-colormapping-stops-down")
        wrapper.appendChild(this.stops_container_up);
        wrapper.appendChild(this.canvas);
        wrapper.appendChild(this.stops_container_down);
        this.draw();
        var self = this;
        window.addEventListener("mousemove", (event) => {
            if (self.grabbing != null) {
                self.grabbing.t += (event.clientX - self.grabstart) / self.width;
                self.grabstart = event.clientX;
                self.update();
            }
        });
        window.addEventListener("mouseup", (event) => {
            self.grabbing = null;
        });
        wrapper.addEventListener("click", (event) => {
            if (event.button == 0 && event.ctrlKey) {
                let bounds = self.canvas.getBoundingClientRect();
                let stop = new ColorStop((event.clientX - bounds.left) / self.width, [0, 0, 0, 255]);
                self.stops.push(stop);
                self.update();
            }
        });
        wrapper.addEventListener("contextmenu", (event) => {
            self.create_context_menu(event, PRESETS_COLORMAPPINGS);
        });
    }

    draw() {
        let mapping = new ColorMapping(this.stops);
        this.context.clearRect(0, 0, this.width, this.height);
        let imagedata = new ImageData(this.width, this.height);
        for (let j = 0; j < this.width; j++) {
            let t = j / (this.width - 1);
            let color = [...mapping.eval(t)];
            if (j == Math.floor(this.width / 4)
                || j == Math.floor(this.width / 2)
                || j == Math.floor(3 * this.width / 4)) {
                    color[0] = (color[0] + 64) % 256;
                    color[1] = (color[1] + 64) % 256;
                    color[2] = (color[2] + 64) % 256;
            }
            for (let i = 0; i < this.height; i++) {
                let k = ((i * this.width) + j) * 4;
                imagedata.data[k] = color[0];
                imagedata.data[k + 1] = color[1];
                imagedata.data[k + 2] = color[2];
                imagedata.data[k + 3] = color[3];
            }
        }
        this.context.putImageData(imagedata, 0, 0);
        this.stops_container_up.innerHTML = "";
        this.stops_container_down.innerHTML = "";
        var self = this;
        this.stops.forEach(stop => {
            let cursor = document.createElement("div");
            cursor.classList.add("colorstop-cursor");
            cursor.style.left = `${ (stop.t * 100).toFixed(3) }%`;
            cursor.addEventListener("mousedown", (event) => {
                if (event.button == 0) {
                    if (event.ctrlKey) {
                        self.delete_stop(stop.t);
                    } else {
                        self.grabbing = stop;
                        self.grabstart = event.clientX;
                    }
                }
            });
            this.stops_container_up.appendChild(cursor);
            let input = document.createElement("input");
            input.classList.add("colorstop-input");
            input.type = "color";
            input.value = stop.hex();
            input.style.left = `${ (stop.t * 100).toFixed(3) }%`;
            this.stops_container_down.appendChild(input);
            input.addEventListener("input", () => {
                stop.color = hexToRgb(input.value);
                self.update();
            });
        });
    }

    delete_stop(t) {
        for (let i = 0; i < this.stops.length; i++) {
            if (this.stops[i].t == t) {
                this.stops.splice(i, 1);
                break;
            }
        }
        this.update();
    }

    read() {
        return this.stops;
    }

    write(value) {
        this.stops = obj_arr_cpy(value);
        this.draw();
    }

    update() {
        super.update();
        this.draw();
    }

}

class OutputPanel {

    constructor(controller, width, height, config={}) {
        this.controller = controller;
        this.canvas = null;
        this.context = null;
        this.inputs = [];
        this.values = null;
        this.width = width;
        this.height = height;
        if (this.width == null || this.width == undefined || this.height == null || this.height == undefined) {
            throw new Error();
        }
        this.config = {
            colormapping: [new ColorStop(0, [0, 0, 0, 255]), new ColorStop(1, [255, 255, 255, 255])],
        }
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
        this.inputs.push(new ColorMappingParameterInput(this, "colormapping", "Color Mapping", [new ColorStop(0, [0, 0, 0, 255]), new ColorStop(1, [255, 255, 255, 255])]));
        this.inputs.forEach(input => {
            input.setup(panel_inputs);
        });
        panel.appendChild(panel_inputs);
        container.appendChild(panel);
    }

    update(noise_panels, precook=true) {
        let imagedata = new ImageData(this.width, this.height);
        let mapping = new ColorMapping(this.config.colormapping);
        if (precook) mapping.precook();
        for (let py = 0; py < this.height; py++) {
            for (let px = 0; px < this.width; px++) {
                let k = ((py * this.width) + px) * 4;
                let value = 0;
                noise_panels.forEach(panel => {
                    let z = panel.values[py][px];
                    value = panel.compositor(value, z, panel.config.blend_weight);
                });
                let color = mapping.eval(value);
                imagedata.data[k] = color[0];
                imagedata.data[k + 1] = color[1];
                imagedata.data[k + 2] = color[2];
                imagedata.data[k + 3] = color[3];
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

    reset() {
        this.inputs.forEach(input => { input.reset() });
        this.update();
    }

}

function clear_context_menus() {
    let context_menus = document.querySelectorAll(".contextmenu");
    for (let i = 0; i < context_menus.length; i++) {
        document.body.removeChild(context_menus[i]);
    }
}

var controller;

function on_load() {
    console.log("Hello, World!");
    controller = new Controller();
    controller.setup();
    controller.add_noise_panel();
    controller.update();
    document.querySelector("#modal-export .modal-overlay").addEventListener("click", () => {
        document.getElementById("modal-export").classList.remove("active");
    });
    window.addEventListener("click", clear_context_menus);
}

window.addEventListener("load", on_load);