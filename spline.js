class Spline {
    constructor(controls) {
        this.controls = copy_object_array(controls);
        this.controls.sort((a, b) => a.x - b.x);
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
        if (P0.hr == null && P1.hl == null) {
            return lerp(P0, P1, x);
        } else if (P0.hr == null) {
            return cubic_bezier(P0, P0, P1.hl, P1, x, this.tol);
        } else if (P1.hl == null) {
            return cubic_bezier(P0, P0.hr, P1, P1, x, this.tol);
        } else {
            return cubic_bezier(P0, P0.hr, P1.hl, P1, x, this.tol);
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

const HANDLE_LEFT = 0;
const HANDLE_RIGHT = 1;


function generate_step_controls(n) {
    let controls = [{x: 0, y: 0}, {x: 1, y: 1}];
    let y = 0;
    for (let i = 0; i < n; i++) {
        let x = (i + 1) / (n + 1); 
        controls.push({x: x - 0.0001, y: y});
        y = (i + 1) / n;
        controls.push({x: x, y: y});
    }
    return controls;
}


function generate_contours_controls(n) {
    let width = Math.min(0.05, 1 / n / 4);
    let controls = [{x: 0, y: 0}, {x: 1, y: 1}];
    for (let i = 0; i < n; i++) {
        let x = (i + 1) / (n + 1);
        controls.push({x: x - width, y: 0});
        controls.push({x: x, y: 1});
        controls.push({x: x + width, y: 0});
    }
    return controls;
}


const PRESETS_SPLINES = [
    { name: "default", value: [{x: 0, y: 0}, {x: 1, y: 1}] },
    { name: "step1", value: generate_step_controls(1)},
    { name: "step2", value: generate_step_controls(2)},
    { name: "step3", value: generate_step_controls(3)},
    { name: "contrast", value: [{x: 0, y: 0, hr: {x: 1, y: 0}}, {x: 1, y: 1, hl: {x: 0, y: 1}}] },
    { name: "contours1", value: generate_contours_controls(1) },
    { name: "contours5", value: generate_contours_controls(5) },
    { name: "contours11", value: generate_contours_controls(11) },
    { name: "contours15", value: generate_contours_controls(15) },
];


class SplineInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.controls = null;
        this.canvas = null;
        this.padding = 8;
        this.width = 256;
        this.height = 171;
        this.inner_width = this.width - 2 * this.padding;
        this.inner_height = this.height - 2 * this.padding;
        this.dot_size = 10;
        this.context = null;
        this.moving_control = null;
        this.moving_handle = null;
    }

    get_click_target(event, collisions=true) {
        let bounds = this.canvas.getBoundingClientRect();
        let target = {
            x: (event.clientX - bounds.left - this.padding) / (this.width - 2 * this.padding),
            y: 1 - (event.clientY - bounds.top - this.padding) / (this.height - 2 * this.padding),
            control: null,
            handle: null,
        };
        let hitbox = this.dot_size / this.inner_width / 1.5;
        if (collisions) {
            for (let i = 0; i < this.controls.length; i++) {
                if (collides(this.controls[i], target, hitbox)) {
                    target.control = i;
                }
                if (collides(this.controls[i].hl, target, hitbox)) {
                    target.handle = { control: i, index: HANDLE_LEFT };
                }
                if (collides(this.controls[i].hr, target, hitbox)) {
                    target.handle = { control: i, index: HANDLE_RIGHT };
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
                distance: distance(this.controls[i], target)
            });
        }
        controls.sort((a, b) => a.distance - b.distance);
        return controls[0].index;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-spline");
        this.controls = copy_object_array(this.initial_value);
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
        if (target.handle != null) {
            event.preventDefault();
            event.stopPropagation();
            if (target.handle.index == HANDLE_LEFT) {
                this.controls[target.handle.control].hl = null;
            } else {
                this.controls[target.handle.control].hr = null;
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
        } else if (target.control == null && !event.shiftKey && target.handle == null) {
            this.controls.push({x: target.x, y: target.y, hl: null, hr: null});
            this.update();
            this.moving_control = this.controls.length - 1;
        } else if (target.handle != null) {
            this.moving_handle = target.handle;
        } else if (event.shiftKey) {
            let closest = this.get_closest_control(target);
            let cc = this.controls[closest];
            if (cc.x > target.x) {
                this.moving_handle = { control: closest, index: HANDLE_LEFT };
                if (cc.hl == null) {
                    cc.hl = {x: cc.x, y: cc.y};
                }
            } else {
                this.moving_handle = { control: closest, index: HANDLE_RIGHT };
                if (cc.hr == null) {
                    cc.hr = {x: cc.x, y: cc.y};
                }
            }
        }
    }

    on_control_drag(target) {
        let ox = this.controls[this.moving_control].x;
        let oy = this.controls[this.moving_control].y;
        if (this.moving_control > 1) {
            this.controls[this.moving_control].x = Math.min(1, Math.max(0, target.x));
        }
        this.controls[this.moving_control].y = Math.min(1, Math.max(0, target.y));
        let dx = this.controls[this.moving_control].x - ox;
        let dy = this.controls[this.moving_control].y - oy;
        if (this.controls[this.moving_control].hl != null) {
            this.controls[this.moving_control].hl.x += dx;
            this.controls[this.moving_control].hl.y += dy;
        }
        if (this.controls[this.moving_control].hr != null) {
            this.controls[this.moving_control].hr.x += dx;
            this.controls[this.moving_control].hr.y += dy;
        }
    }

    on_handle_drag(target) {
        if (this.moving_handle.index == HANDLE_LEFT) {
            this.controls[this.moving_handle.control].hl = {x: target.x, y: target.y};
        } else {
            this.controls[this.moving_handle.control].hr = {x: target.x, y: target.y};
        }
    }

    on_mousemove(event) {
        if (this.moving_control != null || this.moving_handle != null) {
            let target = this.get_click_target(event, false);
            if (this.moving_control != null) {
                this.on_control_drag(target);
            } else {
                this.on_handle_drag(target);
            }
            this.update();
        }
    }

    on_mouseup(event) {
        this.moving_control = null;
        this.moving_handle = null;
    }

    on_contextmenu(event) {
        this.create_context_menu(event, PRESETS_SPLINES);
    }

    draw_control_handle(x0, y0, handle) {
        let x1 = handle.x * this.inner_width + this.padding - this.dot_size / 2;
        let y1 = this.height - (handle.y * this.inner_height + this.padding + this.dot_size / 2);
        this.context.fillStyle = "red";
        this.context.strokeStyle = "red";
        this.context.beginPath();
        this.context.arc(x1 + this.dot_size / 2, y1 + this.dot_size / 2, .45 * this.dot_size, 0, 2 * Math.PI);
        this.context.fill();
        this.context.beginPath();
        this.context.moveTo(x0 + this.dot_size / 2, y0 + this.dot_size / 2);
        this.context.lineTo(x1 + this.dot_size / 2, y1 + this.dot_size / 2);
        this.context.stroke();
    }

    draw_control(control) {
        let x0 = control.x * this.inner_width + this.padding - this.dot_size / 2;
        let y0 = this.height - (control.y * this.inner_height + this.padding + this.dot_size / 2);
        if (control.hl != null) {
            this.draw_control_handle(x0, y0, control.hl);
        }
        if (control.hr != null) {
            this.draw_control_handle(x0, y0, control.hr);
        }
        this.context.fillStyle = "black";
        this.context.fillRect(x0, y0, this.dot_size, this.dot_size);
    }
    
    draw_grid() {
        this.context.strokeStyle = "grey";
        this.context.lineWidth = 0.75;
        this.context.beginPath();
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
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.width, this.height);
        this.draw_grid();
        this.context.lineWidth = 1;
        this.context.strokeStyle = "black";
        let ystart = spline.eval(0) * this.inner_height;
        this.context.beginPath();
        this.context.moveTo(this.padding, this.height - ystart - this.padding);
        for (let i = 1; i < this.inner_width; i++) {
            let y = spline.eval(i / (this.inner_width - 1)) * this.inner_height + this.padding;
            this.context.lineTo(i + this.padding, this.height - y);
        }
        this.context.stroke();
        this.controls.forEach(control => {
            this.draw_control(control);
        });
    }

    read() {
        return this.controls;
    }

    write(value) {
        this.controls = copy_object_array(value);
        this.draw();
    }

    update() {
        super.update();
        this.draw();
    }

}