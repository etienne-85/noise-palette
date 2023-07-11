
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


class ControlPoint extends Vec2 {

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
    { name: "contrast", value: [new ControlPoint(0, 0, null, new Vec2(1, 0)), new ControlPoint(1, 1, new Vec2(0, 1), null)] },
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
        this.dot_size = 10;
        this.context = null;
        this.moving_control = null;
        this.moving_bezier_control = null;
    }

    get_click_target(event, collisions=true) {
        let bounds = this.canvas.getBoundingClientRect();
        let target = new Vec2(
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
                    cc.bezier_prev = new Vec2(cc.x, cc.y);
                }
            } else {
                this.moving_bezier_control = { control: closest_control_index, index: BEZIER_NEXT };
                if (cc.bezier_next == null) {
                    cc.bezier_next = new Vec2(cc.x, cc.y);
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