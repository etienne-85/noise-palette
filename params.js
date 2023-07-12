function clear_context_menus() {
    let context_menus = document.querySelectorAll(".contextmenu");
    for (let i = 0; i < context_menus.length; i++) {
        document.body.removeChild(context_menus[i]);
    }
}

class ParameterInput {

    constructor(reference, name, label, default_value, level) {
        this.reference = reference;
        this.name = name;
        this.label = label;
        this.default_value = default_value;
        this.level = level;
        this.id = null;
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
        if (propagate) this.reference.on_input_update(this.level);
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

class RangeInput extends ParameterInput {

    constructor(reference, name, label, default_value, level, min, max, step, transform) {
        super(reference, name, label, default_value, level);
        this.input_range = null;
        this.input_number = null;
        this.min = min;
        this.max = max;
        this.step = step;
        this.transform = transform;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-range");
        let input_wrapper = document.createElement("div");
        input_wrapper.classList.add("input-wrapper");
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
        input_wrapper.appendChild(this.input_range);
        input_wrapper.appendChild(this.input_number);
        wrapper.appendChild(input_wrapper);
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

class SelectInput extends ParameterInput {

    constructor(reference, name, label, default_value, level, options) {
        super(reference, name, label, default_value, level)
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

class BooleanInput extends ParameterInput {

    constructor(reference, name, label, default_value, level) {
        super(reference, name, label, default_value, level);
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

class SeedInput extends ParameterInput {

    constructor(reference, name, label, default_value, level) {
        super(reference, name, label, default_value, level);
        this.input = null;
    }

    inflate(wrapper) {
        wrapper.classList.add("panel-input-seed");
        let input_wrapper = document.createElement("div");
        input_wrapper.classList.add("input-wrapper");
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
        input_wrapper.appendChild(this.input);
        input_wrapper.appendChild(button);
        wrapper.appendChild(input_wrapper);
    }

    read() {
        return parseInt(this.input.value);
    }

    write(value) {
        this.input.value = value;
    }

}