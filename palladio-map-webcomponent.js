import PalladioWebComponentAbstractBase from "./palladio-webcomponent-abstract.js";

window.customElements.define(
  "palladio-map-component",
  class extends PalladioWebComponentAbstractBase {
    constructor() {
      super();
      this.stylesheets = ["https://unpkg.com/leaflet@1.6.0/dist/leaflet.css"];
      this.scripts = ["https://unpkg.com/leaflet@1.6.0/dist/leaflet.js"];

      this.mapConfig = {
        center: [45.464, 9.1916],
        zoom: 3,
        minZoom: 2,
        maxZoom: 20,
        accessToken:
          "pk.eyJ1IjoiY2VzdGEiLCJhIjoiMFo5dmlVZyJ9.Io52RcCMMnYukT77GjDJGA",
      };
    }

    initMap() {
      this.element = this.body.querySelector("div.map-view");

      this.map = L.map(this.element).setView(
        new L.LatLng(...this.mapConfig.center),
        this.mapConfig.zoom,
      );

      this.map.attributionControl.addAttribution(
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      );
      L.control.scale().addTo(this.map);
    }

    addTileSets(tileSets) {
      // iterate tile set layers in reverse order
      // (see palladio-map-view.js:1138)
      [...tileSets].reverse().forEach((tileSet, i) => {
        if ("mbId" in tileSet && tileSet.mbId) {
          const layer = L.tileLayer(
            // The Palladio tilesets are MapBox "Classic Projects" that contain raster tiles.
            // see: https://docs.mapbox.com/api/maps/#raster-tiles
            "https://api.mapbox.com/v4/{id}/{z}/{x}/{y}@2x.png?access_token={accessToken}",
            {
              maxZoom: this.mapConfig.maxZoom,
              minZoom: this.mapConfig.minZoom,
              id: tileSet.mbId,
              tileSize: 512,
              zoomOffset: -1,
              accessToken: this.mapConfig.accessToken,
              detectRetina: true,
            },
          ).addTo(this.map);
        }
        if ("wmsUrl" in tileSet) {
          const layer = L.tileLayer
            .wms(tileSet.wmsUrl, {
              layers: tileSet.wmsLayers,
              format: "image/png",
              transparent: true,
            })
            .addTo(this.map);
        }
      });
    }

    addLayers(layers, rows) {
      layers.forEach((layer) => {
        if (layer.layerType === "data") {
          rows.forEach((row) => {
            L.circle(row[layer.mapping.sourceCoordinatesKey].split(","), {
              color: layer.color,
              fillColor: layer.color,
              fillOpacity: 0.5,
              radius: 100,
            })
              .bindPopup(row[layer.descriptiveDimKey])
              .addTo(this.map);
          });

          // this needs to be more sophisticated if there are multiple data layers
          this.map.fitBounds(
            rows.map((row) =>
              row[layer.mapping.sourceCoordinatesKey].split(","),
            ),
          );
        }
      });
    }

    render(data) {
      if (!data) {
        return this.renderError("No Data!");
      }

      const rows = this.getRows(data);
      if (!rows) {
        return this.renderError(`
        <details>
          <summary>Malformed project data!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      const settings = this.getSettings(data, "mapView");
      if (!settings) {
        return this.renderError(`
        <details>
          <summary>Map Visualization not available!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      const view = document
        .createRange()
        .createContextualFragment(`<div class="map-view"></div>`);

      this.body.innerHTML = "";
      this.body.appendChild(view);
      this.body.querySelector("div.map-view").style.height = "100%";

      this.scriptsReady.then(() => {
        this.initMap();
        if ("tileSets" in settings) {
          this.addTileSets(settings.tileSets);
          this.addLayers(settings.layers, rows);
        }
      });
    }
  },
);
