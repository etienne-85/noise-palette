import { PerlinNoise } from "./noise";
import { Palette, PaletteInput } from "./palette";
import { RangeInput, SeedInput, SelectInput } from "./params";
import { Spline, SplineInput } from "./spline";
import * as Utils from './utils';


const STORAGE_CONFIG_KEY = "noise_palette_config";

const LEVEL_NOISE = 0;
const LEVEL_TRANSFORM = 1;
const LEVEL_OUTPUT = 2;

class Controller {
  constructor(config = {}) {
    this.config = {
      width: 400,
      height: 300,
    };
    for (let key in config) {
      this.config[key] = config[key];
    }
    this.input_counter = 0;
    this.noise_counter = 0;
    this.noise_panels = [];
    this.output_panel = new OutputPanel(
      this,
      this.config.width,
      this.config.height
    );
  }

  get_config_string() {
    let config_dict = {
      controller: this.config,
      noise_panels: [],
      output_panel: this.output_panel.config,
    };
    this.noise_panels.forEach((panel) => {
      config_dict.noise_panels.push(panel.config);
    });
    return JSON.stringify(config_dict);
  }

  save_config() {
    let config_string = this.get_config_string();
    localStorage.setItem(STORAGE_CONFIG_KEY, config_string);
  }

  load_config_from_storage() {
    let item = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (item == null || item == "") return false;
    let data = JSON.parse(item);
    if (data == null) return false;
    this.load_config(data);
    return true;
  }

  load_config_from_url(url) {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        this.load_config(data);
      });
  }

  load_config_from_file() {
    let file_input = document.getElementById("input-load-file");
    let files = file_input.files;
    if (files.length > 0) {
      this.load_config_from_url(URL.createObjectURL(files[0]));
    }
    document.getElementById("modal-open").classList.remove("active");
  }

  load_config(config) {
    this.config = config.controller;
    this.noise_panels.forEach((panel) => {
      panel.panel.parentElement.removeChild(panel.panel);
    });
    this.input_counter = 0;
    this.noise_counter = 0;
    let panels_container = document.getElementById("panels");
    panels_container.innerHTML = "";
    this.noise_panels = [];
    config.noise_panels.forEach((noise_panel_config) => {
      let panel = new NoisePanel(
        this,
        this.config.width,
        this.config.height,
        this.noise_counter,
        noise_panel_config
      );
      this.noise_counter++;
      this.noise_panels.push(panel);
    });
    this.noise_panels.forEach((panel) => {
      panel.setup(panels_container);
    });
    this.output_panel = new OutputPanel(
      this,
      this.config.width,
      this.config.height,
      config.output_panel
    );
    this.output_panel.setup(panels_container);
    this.update();
  }

  export_config() {
    let config_string = this.get_config_string();
    let link = document.createElement("a");
    link.setAttribute(
      "download",
      `noise-palette-config-${parseInt(new Date() * 1)}.json`
    );
    link.href = "data:application/json;base64," + btoa(config_string);
    link.click();
  }

  setup() {
    let panels_container = document.getElementById("panels");
    this.noise_panels.forEach((panel) => {
      panel.setup(panels_container);
    });
    this.output_panel.setup(panels_container);
    let self = this;
    document.getElementById("button-export").addEventListener("click", () => {
      self.export();
    });
    document
      .getElementById("button-load-config-file")
      .addEventListener("click", () => {
        self.load_config_from_file();
      });
  }

  add_noise_panel() {
    let panel = new NoisePanel(
      this,
      this.config.width,
      this.config.height,
      this.noise_counter
    );
    this.noise_counter++;
    let panels_container = document.getElementById("panels");
    panel.setup(panels_container);
    panel.update();
    this.noise_panels.push(panel);
    this.output_panel.update(this.noise_panels);
  }

  update() {
    this.save_config();
    this.noise_panels.forEach((panel) => {
      panel.update();
    });
    this.output_panel.update(this.noise_panels);
  }

  on_noise_panel_input_update(level) {
    this.save_config();
    //Noise panel is responsible for updating itself beforehand
    this.output_panel.update(this.noise_panels);
  }

  on_output_panel_input_update(level) {
    this.save_config();
    this.output_panel.update(this.noise_panels);
  }

  get_input_id() {
    this.input_counter++;
    return this.input_counter;
  }

  reset() {
    this.noise_panels.forEach((panel) => {
      panel.reset();
    });
    this.output_panel.reset();
    this.save_config();
  }

  delete_noise_panel(index) {
    if (this.noise_panels.length == 1) {
      this.noise_panels[0].reset();
    } else {
      for (let i = 0; i < this.noise_panels.length; i++) {
        if (this.noise_panels[i].index != index) continue;
        this.noise_panels[i].panel.parentElement.removeChild(
          this.noise_panels[i].panel
        );
        this.noise_panels.splice(i, 1);
        this.output_panel.update(this.noise_panels);
        break;
      }
    }
    this.save_config();
  }

  export() {
    document.getElementById("modal-export").classList.remove("active");
    document.getElementById("modal-wait").classList.add("active");
    setTimeout(() => {
      let width = parseInt(document.getElementById("input-export-width").value);
      let height = parseInt(
        document.getElementById("input-export-height").value
      );
      let precook = document.getElementById("input-export-precook").checked;
      let export_noise_panels = [];
      let dummy_container = document.createElement("div");
      this.noise_panels.forEach((panel, i) => {
        export_noise_panels.push(
          new NoisePanel(this, width, height, null, panel.config)
        );
        export_noise_panels[i].setup(dummy_container);
        export_noise_panels[i].update(precook);
      });
      let export_output_panel = new OutputPanel(
        this,
        width,
        height,
        this.output_panel.config
      );
      export_output_panel.setup(dummy_container);
      export_output_panel.update(export_noise_panels, precook);
      let link = document.createElement("a");
      link.setAttribute(
        "download",
        `noise-palette-${parseInt(new Date() * 1)}.png`
      );
      link.href = export_output_panel.canvas.toDataURL("image/png");
      link.click();
      document.getElementById("modal-wait").classList.remove("active");
    }, 1);
  }
}

class NoisePanel {
  constructor(controller, width, height, index, config = {}) {
    this.controller = controller;
    this.index = index;
    this.panel = null;
    this.context = null;
    this.inputs = [];
    this.raw_values = [];
    this.transformed_values = [];
    this.width = width;
    this.height = height;
    this.hist_values = [];
    this.hist_context = null;
    this.hist_width = this.width;
    this.hist_height = Math.floor(this.height / 6);
    this.hist_bin_width = 2;
    this.compositor = null;
    this.config = {
      seed: Utils.random_seed(),
      period: 64,
      interpolation: "smoother",
      spline: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      harmonics: 0,
      harmonic_spread: 2,
      harmonic_gain: 0.5,
      negative: false,
      blend_mode: "addition",
      blend_weight: 1,
      offset_x: 0,
      offset_y: 0,
      scale_x: 1,
      scale_y: 1,
      spread: 0,
    };
    for (let key in config) {
      this.config[key] = config[key];
    }
    for (let i = 0; i < this.height; i++) {
      this.raw_values.push([]);
      this.transformed_values.push([]);
      for (let j = 0; j < this.width; j++) {
        this.raw_values[i].push(0);
        this.transformed_values[i].push(0);
      }
    }
    for (let i = 0; i < this.hist_width; i += this.hist_bin_width) {
      this.hist_values.push(0);
    }
  }

  add_input_group(name, base_container, inputs) {
    let group_container = document.createElement("details");
    group_container.classList.add("input-group");
    let group_name = document.createElement("summary");
    group_name.textContent = name;
    group_container.appendChild(group_name);
    let inputs_container = document.createElement("div");
    inputs_container.classList.add("input-group-inputs");
    inputs.forEach((input) => {
      this.inputs.push(input);
      input.setup(inputs_container);
    });
    group_container.appendChild(inputs_container);
    base_container.appendChild(group_container);
  }

  add_input(container, input) {
    this.inputs.push(input);
    input.setup(container);
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
    reset_button.addEventListener("click", () => {
      self.reset();
      self.on_input_update(LEVEL_NOISE);
    });
    buttons_container.appendChild(reset_button);
    let delete_button = document.createElement("button");
    delete_button.textContent = "Delete";
    delete_button.addEventListener("click", () => {
      self.delete();
    });
    buttons_container.appendChild(delete_button);
    this.panel.appendChild(buttons_container);
    let canvas = document.createElement("canvas");
    canvas.classList.add("panel-canvas");
    canvas.classList.add("panel-canvas-img");
    canvas.width = this.width;
    canvas.height = this.height;
    this.panel.appendChild(canvas);
    this.context = canvas.getContext("2d");
    let hist_canvas = document.createElement("canvas");
    hist_canvas.classList.add("panel-canvas");
    hist_canvas.classList.add("panel-canvas-hist");
    hist_canvas.width = this.hist_width;
    hist_canvas.height = this.hist_height;
    this.panel.appendChild(hist_canvas);
    this.hist_context = hist_canvas.getContext("2d");
    let panel_inputs = document.createElement("div");
    panel_inputs.classList.add("panel-inputs");
    this.add_input_group("World", panel_inputs, [
      new SeedInput(this, "seed", "Seed", 0, LEVEL_NOISE),
      new RangeInput(this, "period", "Period", 64, LEVEL_NOISE, 8, 512, 1),
      new RangeInput(
        this,
        "offset_x",
        "Offset X",
        0,
        LEVEL_NOISE,
        -4 * this.width,
        4 * this.width,
        1
      ),
      new RangeInput(
        this,
        "offset_y",
        "Offset Y",
        0,
        LEVEL_NOISE,
        -4 * this.height,
        4 * this.height,
        1
      ),
      new RangeInput(this, "scale_x", "Scale X", 1, LEVEL_NOISE, 0, 3, 0.01),
      new RangeInput(this, "scale_y", "Scale Y", 1, LEVEL_NOISE, 0, 3, 0.01),
      new SelectInput(
        this,
        "interpolation",
        "Interpolation",
        "smoother",
        LEVEL_NOISE,
        ["linear", "smooth", "smoother"]
      ),
    ]);
    this.add_input_group("Harmonics", panel_inputs, [
      new RangeInput(
        this,
        "harmonics",
        "Harmonic Count",
        0,
        LEVEL_NOISE,
        0,
        7,
        1
      ),
      new RangeInput(
        this,
        "harmonic_spread",
        "Harmonic Spread",
        2,
        LEVEL_NOISE,
        0,
        4,
        0.01
      ),
      new RangeInput(
        this,
        "harmonic_gain",
        "Harmonic Gain",
        0.5,
        LEVEL_NOISE,
        0,
        2,
        0.01
      ),
    ]);
    this.add_input_group("Transform", panel_inputs, [
      new RangeInput(this, "spread", "Spread", 0, LEVEL_TRANSFORM, -3, 3, 0.01),
      new SplineInput(
        this,
        "spline",
        "Spline",
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        LEVEL_TRANSFORM
      ),
    ]);
    this.add_input_group("Blending", panel_inputs, [
      new SelectInput(
        this,
        "blend_mode",
        "Blend Mode",
        "addition",
        LEVEL_OUTPUT,
        ["addition", "difference", "product", "division", "brighter", "darker"]
      ),
      new RangeInput(
        this,
        "blend_weight",
        "Blend Weight",
        1,
        LEVEL_OUTPUT,
        0,
        10,
        0.01
      ),
    ]);
    this.panel.appendChild(panel_inputs);
    let panel_output = container.querySelector(".panel-output");
    if (panel_output == null) {
      container.appendChild(this.panel);
    } else {
      container.insertBefore(this.panel, panel_output);
    }
  }

  update_raw_values() {
    let period = this.config.period;
    let amplitude = 1;
    let total_amplitude = 0;
    let harmonics = [];
    for (let k = 0; k <= this.config.harmonics; k++) {
      let harmonic = new PerlinNoise(
        this.width,
        this.height,
        this.config.seed * (k + 1),
        period,
        this.config.interpolation,
        this.config.offset_x,
        this.config.offset_y,
        this.config.scale_x,
        this.config.scale_y
      );
      harmonic.compute();
      harmonics.push(harmonic);
      period /= this.config.harmonic_spread;
      total_amplitude += amplitude;
      amplitude *= this.config.harmonic_gain;
    }
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let base = 0;
        amplitude = 1;
        harmonics.forEach((harmonic) => {
          base += amplitude * harmonic.values[i][j];
          amplitude *= this.config.harmonic_gain;
        });
        base /= total_amplitude;
        this.raw_values[i][j] = base;
      }
    }
  }

  update_transformed_values(precook = true) {
    let spline = new Spline(this.config.spline);
    if (precook) spline.precook();
    for (let i = 0; i < this.hist_width; i++) {
      this.hist_values[i] = 0;
    }
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        this.transformed_values[i][j] = spline.eval(
          (this.raw_values[i][j] - 0.5) * 2 ** this.config.spread + 0.5
        );
        let bin = Math.round(
          (Math.max(0, Math.min(1, this.transformed_values[i][j])) *
            this.hist_width) /
            this.hist_bin_width
        );
        this.hist_values[bin]++;
      }
    }
  }

  update_canvas() {
    let imagedata = new ImageData(this.width, this.height);
    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        let k = (py * this.width + px) * 4;
        let noise = this.transformed_values[py][px];
        imagedata.data[k] = 255 * noise;
        imagedata.data[k + 1] = 255 * noise;
        imagedata.data[k + 2] = 255 * noise;
        imagedata.data[k + 3] = 255;
      }
    }
    this.context.putImageData(imagedata, 0, 0);
    this.hist_context.clearRect(0, 0, this.hist_width, this.hist_height);
    this.hist_context.beginPath();
    this.hist_context.moveTo(0, 0);
    let hist_max = Math.max(...this.hist_values);
    let j = 0;
    for (let i = 0; i <= this.hist_width; i += this.hist_bin_width) {
      let y = (this.hist_values[j] / hist_max) * this.hist_height;
      this.hist_context.lineTo(i + this.hist_bin_width / 2 - 1, y);
      j++;
    }
    this.hist_context.lineTo(this.hist_width, 0);
    this.hist_context.lineTo(0, 0);
    this.hist_context.fill();
  }

  update_compositor() {
    if (this.config.blend_mode == "addition") {
      this.compositor = (base, x, w) => base + w * x;
    } else if (this.config.blend_mode == "difference") {
      this.compositor = (base, x, w) => base - w * x;
    } else if (this.config.blend_mode == "product") {
      this.compositor = (base, x, w) => base * w * x;
    } else if (this.config.blend_mode == "division") {
      this.compositor = (base, x, w) => base / (w * x);
    } else if (this.config.blend_mode == "brighter") {
      this.compositor = (base, x, w) => Math.max(base, w * x);
    } else if (this.config.blend_mode == "darker") {
      this.compositor = (base, x, w) => Math.min(base, w * x);
    }
  }

  update(precook = true) {
    this.update_compositor();
    this.update_raw_values();
    this.update_transformed_values(precook);
    this.update_canvas();
  }

  get_input_id() {
    return this.controller.get_input_id();
  }

  on_input_update(level) {
    this.update_compositor();
    if (level == LEVEL_NOISE) {
      this.update_raw_values();
    }
    if (level == LEVEL_NOISE || level == LEVEL_TRANSFORM) {
      this.update_transformed_values();
    }
    this.update_canvas();
    this.controller.on_noise_panel_input_update(level);
  }

  reset() {
    this.inputs.forEach((input) => {
      input.reset();
    });
    this.update();
  }

  delete() {
    this.controller.delete_noise_panel(this.index);
  }
}

class OutputPanel {
  constructor(controller, width, height, config = {}) {
    this.controller = controller;
    this.canvas = null;
    this.context = null;
    this.inputs = [];
    this.values = null;
    this.width = width;
    this.height = height;
    this.hist_values = [];
    this.hist_context = null;
    this.hist_width = this.width;
    this.hist_height = Math.floor(this.height / 6);
    this.hist_bin_width = 2;
    this.config = {
      palette: [
        { t: 0, color: [0, 0, 0] },
        { t: 1, color: [255, 255, 255] },
      ],
    };
    for (let key in config) {
      this.config[key] = config[key];
    }
    for (let i = 0; i < this.hist_width; i += this.hist_bin_width) {
      this.hist_values.push(0);
    }
  }

  setup(container) {
    let panel = document.createElement("div");
    panel.classList.add("panel");
    panel.classList.add("panel-output");

    var self = this;

    let buttons_container = document.createElement("div");
    buttons_container.classList.add("panel-buttons");
    panel.appendChild(buttons_container);

    let button_reset = document.createElement("button");
    button_reset.textContent = "Reset";
    button_reset.addEventListener("click", () => {
      self.controller.reset();
    });
    buttons_container.appendChild(button_reset);

    let button_add = document.createElement("button");
    button_add.textContent = "Add";
    button_add.addEventListener("click", () => {
      self.controller.add_noise_panel();
    });
    buttons_container.appendChild(button_add);

    let button_export = document.createElement("button");
    button_export.textContent = "Export";
    button_export.addEventListener("click", () => {
      document.getElementById("modal-export").classList.add("active");
    });
    buttons_container.appendChild(button_export);

    let button_open = document.createElement("button");
    button_open.textContent = "Open";
    button_open.addEventListener("click", () => {
      document.getElementById("modal-open").classList.add("active");
    });
    buttons_container.appendChild(button_open);

    let button_save = document.createElement("button");
    button_save.textContent = "Save";
    button_save.addEventListener("click", () => {
      self.controller.export_config();
    });
    buttons_container.appendChild(button_save);

    this.canvas = document.createElement("canvas");
    this.canvas.classList.add("panel-canvas");
    this.canvas.classList.add("panel-canvas-img");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    panel.appendChild(this.canvas);
    this.context = this.canvas.getContext("2d");
    let hist_canvas = document.createElement("canvas");
    hist_canvas.classList.add("panel-canvas");
    hist_canvas.classList.add("panel-canvas-hist");
    hist_canvas.width = this.hist_width;
    hist_canvas.height = this.hist_height;
    panel.appendChild(hist_canvas);
    this.hist_context = hist_canvas.getContext("2d");
    let panel_inputs = document.createElement("div");
    panel_inputs.classList.add("panel-inputs");
    this.inputs.push(
      new PaletteInput(
        this,
        "palette",
        "Palette",
        [
          { t: 0, color: [0, 0, 0] },
          { t: 1, color: [255, 255, 255] },
        ],
        LEVEL_OUTPUT
      )
    );
    this.inputs.forEach((input) => {
      input.setup(panel_inputs);
    });
    panel.appendChild(panel_inputs);
    container.appendChild(panel);
  }

  update(noise_panels, precook = true) {
    let imagedata = new ImageData(this.width, this.height);
    let palette = new Palette(this.config.palette);
    if (precook) palette.precook();
    for (let i = 0; i < this.hist_width; i++) {
      this.hist_values[i] = 0;
    }
    for (let py = 0; py < this.height; py++) {
      for (let px = 0; px < this.width; px++) {
        let k = (py * this.width + px) * 4;
        let value = 0;
        noise_panels.forEach((panel) => {
          let z = panel.transformed_values[py][px];
          value = panel.compositor(value, z, panel.config.blend_weight);
          let bin = Math.round(
            (Math.max(0, Math.min(1, value)) * this.hist_width) /
              this.hist_bin_width
          );
          this.hist_values[bin]++;
        });
        let color = palette.eval(value);
        imagedata.data[k] = color[0];
        imagedata.data[k + 1] = color[1];
        imagedata.data[k + 2] = color[2];
        imagedata.data[k + 3] = 255;
      }
    }
    this.context.putImageData(imagedata, 0, 0);
    this.hist_context.clearRect(0, 0, this.hist_width, this.hist_height);
    this.hist_context.beginPath();
    this.hist_context.moveTo(0, 0);
    let hist_max = Math.max(...this.hist_values);
    let j = 0;
    for (let i = 0; i <= this.hist_width; i += this.hist_bin_width) {
      let y = (this.hist_values[j] / hist_max) * this.hist_height;
      this.hist_context.lineTo(i + this.hist_bin_width / 2 - 1, y);
      j++;
    }
    this.hist_context.lineTo(this.hist_width, 0);
    this.hist_context.lineTo(0, 0);
    this.hist_context.fill();
  }

  get_input_id() {
    return this.controller.get_input_id();
  }

  on_input_update(level) {
    this.controller.on_output_panel_input_update(level);
  }

  reset() {
    this.inputs.forEach((input) => {
      input.reset();
    });
    this.controller.on_output_panel_input_update(LEVEL_OUTPUT);
  }
}

// var controller;

// function on_load() {
//     console.log("Hello, World!");
//     controller = new Controller();
//     controller.setup();
//     if (!controller.load_config_from_storage()) {
//         controller.add_noise_panel();
//         controller.update();
//     }
//     document.querySelector("#modal-export .modal-overlay").addEventListener("click", () => {
//         document.getElementById("modal-export").classList.remove("active");
//     });
//     document.querySelector("#modal-open .modal-overlay").addEventListener("click", () => {
//         document.getElementById("modal-open").classList.remove("active");
//     });
//     window.addEventListener("click", clear_context_menus);
// }

// window.addEventListener("load", on_load);

export { Controller };
