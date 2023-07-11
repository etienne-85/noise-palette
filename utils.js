class Vec2 {
    
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
        return new Vec2(this.x, this.y);
    }

    unit() {
        return this.copy().div(this.norm());
    }

    rot(theta) {
        return new Vec2(
            this.x * Math.cos(theta) + this.y * Math.sin(theta),
            -this.x * Math.sin(theta) + this.y * Math.cos(theta));
    }

    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    add_inplace(other) {
        this.x += other.x;
        this.y += other.y;
    }

    sub(other) {
        // returns this - other
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

}

function is_integer(x) {
    // Assumes x is a number
    return x % 1 === 0;
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
    return new Vec2(0, 1).rot(prng * 2 * Math.PI);
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


function collides(a, b, tol) {
    if (a == null || b == null) return false;
    return a.distance(b) < tol;
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


function random_seed() {
    return Math.floor(Math.random() * (2 ** 30));
}


function hex_to_rgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255 ];
}