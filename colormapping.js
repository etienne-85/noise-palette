
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


class ColorMappingInput extends ParameterInput {

    constructor(reference, name, label, default_value) {
        super(reference, name, label, default_value);
        this.stops = null;
        this.context = null;
        this.canvas = null;
        this.width = 336;
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
                stop.color = hex_to_rgb(input.value);
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