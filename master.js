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


function sample_noise(x, y) {
    return Math.random() * 255;
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

function update() {
    let canvas = document.getElementById("canvas");
    let width = 512;
    let height = 512;
    canvas.width = width;
    canvas.height = height;
    let context = canvas.getContext("2d");
    let imagedata = new ImageData(width, height);
    
    let scale = 64;
    let draw_corners = false;
    let draw_gradient = false;
    
    let noise_grid = [];
    let noise_grid_width = Math.floor(width / scale) + 2;
    let noise_grid_height = Math.floor(height / scale) + 2;
    for (let i = 0; i < noise_grid_height; i++) {
        noise_grid.push([]);
        for (let j = 0; j < noise_grid_width; j++) {
            // let gradient = new Vect2(Math.random() - 0.5, Math.random() - 0.5);
            let gradient = new Vect2(0, 1).rot(Math.random() * 2 * Math.PI);
            noise_grid[i].push(gradient.unit());
        }
    }
    
    let vals = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let i = y / scale;
            let j = x / scale;
            let cell_i = Math.floor(i);
            let cell_j = Math.floor(j);
            let corners = [
                [cell_i, cell_j, 0],
                [cell_i + 1, cell_j, 0],
                [cell_i, cell_j + 1, 0],
                [cell_i + 1, cell_j + 1, 0]
            ];
            for (let k = 0; k < 4; k++) {
                let offset = new Vect2(j - corners[k][1], i - corners[k][0]);
                corners[k][2] = offset.dot(noise_grid[corners[k][0]][corners[k][1]]);
            }

            let itop = interp(i - cell_i, corners[0][2], corners[1][2]);
            let ibottom = interp(i - cell_i, corners[2][2], corners[3][2]);
            let ixy = interp(j - cell_j, itop, ibottom);

            // let color = [255, 255, 255];
            // if (ixy >= 0) {
            //     color = lerpa(ixy, [255, 255, 255], [0, 61, 24]);
            // } else {
            //     color = lerpa(-ixy, [255, 255, 255], [64, 0, 75]);
            // }
            let color = [255 * (ixy + 1) / 2, 255 * (ixy + 1) / 2, 255 * (ixy + 1) / 2];

            vals.push(ixy);

            let pxk = ((y * width) + x) * 4;
            imagedata.data[pxk] = color[0];
            imagedata.data[pxk + 1] = color[1];
            imagedata.data[pxk + 2] = color[2];
            imagedata.data[pxk + 3] = 255;
        }
    }

    context.putImageData(imagedata, 0, 0);

    if (draw_corners) {
        context.fillStyle = "blue";
        for (let i = 0; i < noise_grid_height; i++) {
            for (let j = 0; j < noise_grid_width; j++) {
                let x = j * scale;
                let y = i * scale;
                context.beginPath();
                context.arc(x, y, scale * 0.05, 0, 2 * Math.PI);
                context.fill();
            }
        }
    }

    if (draw_gradient) {
        context.strokeStyle = "red";
        context.lineWidth = 1;
        for (let i = 0; i < noise_grid_height; i++) {
            for (let j = 0; j < noise_grid_width; j++) {
                let x = j * scale;
                let y = i * scale;
                let origin = new Vect2(x, y);
                let gradient = new Vect2(noise_grid[i][j].x * scale * 0.5, noise_grid[i][j].y * scale * 0.5);
                draw_arrow(context, origin, gradient);
            }
        }
    }

}


function on_load() {
    console.log("Hello, World!");
    document.getElementById("button-refresh").addEventListener("click", update);
    update();
}

window.addEventListener("load", on_load);