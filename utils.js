/** General utilies */

function copy_object_array(array) {
    let out = [];
    array.forEach(x => {
        out.push(JSON.parse(JSON.stringify(x)));
    });
    return out;
}

function is_integer(x) {
    // Assumes x is a number
    return x % 1 === 0;
}

function random_seed() {
    return Math.floor(Math.random() * (2 ** 30));
}

/** Vector manipulations */

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function rotate(vec, theta) {
    return {
        x: vec.x * Math.cos(theta) + vec.y * Math.sin(theta),
        y: -vec.x * Math.sin(theta) + vec.y * Math.cos(theta)
    }
}

function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function collides(a, b, tol) {
    if (a == null || b == null) return false;
    return distance(a, b) < tol;
}

/** Interpolations */

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

/** Color manipulations */

function hex_to_rgb(hex) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255 ];
}

function rgb_component_to_hex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgb_to_hex(rgb) {
    return "#" + rgb_component_to_hex(rgb[0]) + rgb_component_to_hex(rgb[1]) + rgb_component_to_hex(rgb[2]);
}