import React from "react";
import { useEffect, useMemo } from "react";
import { Controller } from "./master";
import "./style.css"

export const NoisePalette = () => {
    const controller = useMemo(() => new Controller(), [])

    useEffect(() => {
        controller.setup();
        if (!controller.load_config_from_storage()) {
            controller.add_noise_panel();
            controller.update();
        }
        // document.querySelector("#modal-export .modal-overlay").addEventListener("click", () => {
        //     document.getElementById("modal-export").classList.remove("active");
        // });
        // document.querySelector("#modal-open .modal-overlay").addEventListener("click", () => {
        //     document.getElementById("modal-open").classList.remove("active");
        // });
        // window.addEventListener("click", clear_context_menus);

    }, [])
    return (<>
        <div id="panels"></div>

        <div className="modal" id="modal-export">
            <span className="modal-overlay" onClick={() => console.log('onclick')}></span>
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Export output</div>
                </div>
                <div className="modal-body">
                    <div className="panel-input">
                        <label for="input-export-width">Width (px)</label>
                        <input id="input-export-width" min="1" max="3840" step="1" type="number" value="400" />
                    </div>
                    <div className="panel-input">
                        <label for="input-export-height">Height (px)</label>
                        <input id="input-export-height" min="1" max="3840" step="1" type="number" value="400" />
                    </div>
                    <div className="panel-input panel-input-boolean">
                        <input id="input-export-precook" type="checkbox" checked />
                        <label for="input-export-precook">Use precooked values</label>
                    </div>
                </div>
                <div className="modal-footer">
                    <button id="button-export">Export as PNG</button>
                </div>
            </div>
        </div>

        <div className="modal" id="modal-open">
            <span className="modal-overlay"></span>
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Load configuration from a file</div>
                </div>
                <div className="modal-body">
                    <div className="panel-input">
                        <input id="input-load-file" type="file" accept="application/json" />
                    </div>
                </div>
                <div className="modal-footer">
                    <button id="button-load-config-file">Load</button>
                </div>
            </div>
        </div>

        <div className="modal" id="modal-wait">
            <span className="modal-overlay"></span>
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Please wait</div>
                </div>
                <div className="modal-body">
                    This make take some time…
                </div>
            </div>
        </div>
    </>)
}