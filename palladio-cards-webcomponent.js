import cardsComponentStyles from "bundle-text:./palladio-cards-webcomponent.css";
import PalladioWebComponentAbstractBase from "./palladio-webcomponent-abstract.js";

window.customElements.define(
  "palladio-cards-component",
  class extends PalladioWebComponentAbstractBase {
    constructor() {
      super();
      this.externalStylesheets = [
        "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/css/bootstrap.min.css",
      ];
      this.inlineStylesheets = [cardsComponentStyles];
    }

    render(data) {
      if (!data) {
        this.renderError("No Data!");
      }

      const rows = this.constructor.getRows(data);
      if (!rows) {
        this.renderError(`
        <details>
          <summary>Malformed project data!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      const settings = this.constructor.getSettings(data, "listView");
      if (!settings) {
        this.renderError(`
        <details>
          <summary>Gallery Visualization not available!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      const defaultTemplate = `
        <div class="col-lg-3 col-md-4 col-sm-6 list-wrap">
          <a target="_blank" class="list-link">
            <div class="list-box">
              <div class="list-image"></div>
              <div class="list-title"></div>
              <div class="list-subtitle"></div>
              <div class="list-text margin-top"></div>
            </div>
          </a>
        </div>
        `;

      const row = document.createElement("div");
      row.classList.add("row");
      row.setAttribute("id", "list-display");

      if ("sortDim" in settings) {
        // Need some logic here to sort on non-string types
        rows.sort((a, b) =>
          a[settings.sortDim].localeCompare(b[settings.sortDim]),
        );
      }

      rows.forEach((datum) => {
        const node = document
          .createRange()
          .createContextualFragment(defaultTemplate);
        if (datum[settings.linkDim])
          node.querySelector(".list-link").href = datum[settings.linkDim];
        if (datum[settings.imgurlDim])
          node.querySelector(".list-image").style.backgroundImage = `url(${
            datum[settings.imgurlDim]
          })`;
        node.querySelector(".list-title").innerText = datum[settings.titleDim];
        node.querySelector(".list-subtitle").innerText =
          datum[settings.subtitleDim];
        node.querySelector(".list-text").innerText = datum[settings.textDim];
        row.appendChild(node);
      });

      this.body.innerHTML = "";
      this.body.appendChild(row);
    }
  },
);
