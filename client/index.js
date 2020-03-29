import 'ol/ol.css';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import View from 'ol/View';
import {LineString, Point} from 'ol/geom';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import {Circle as CircleStyle, Stroke, Style, Fill, Icon} from 'ol/style';
import {getVectorContext} from 'ol/render';
import tew from "./data/tew.csv";
import GeometryLayout from "ol/geom/GeometryLayout";
import "@polymer/paper-checkbox";
import "@polymer/paper-radio-group";
import "@polymer/paper-slider";
import place from "./assets/place-pin.svg";

const vectorSource = new VectorSource();
let trackClosest = false;

const NODE_API = process.env.NODE_API;
const QUARKUS_API = process.env.QUARKUS_API;

function get(url, callback) {
  const client = new XMLHttpRequest();
  client.open('GET', url);
  client.onload = function() {
    callback(client.responseText);
  };
  client.send();
}

get(tew, (csv) => {
  let coords = csv.split(/\n/);

  // Take lat and lon, skip height
  const route = new LineString(coords.map((coord, index) => {
    const point = coord.split(",");
    return fromLonLat([point[1], point[0]]);
  }), GeometryLayout.XY);

  const feature = new Feature(route);
  feature.setId("route");
  feature.set("type", "route");
  feature.setGeometry(route);
  vectorSource.addFeature(feature);
  map.render();
});

const styles = {
  'route': new Style({
    stroke: new Stroke({
      width: 3, color: [0, 0, 255, 0.7]
    })
  }),
  'position': new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({color: 'black'}),
      stroke: new Stroke({
        color: 'white', width: 2
      })
    })
  })
};

const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: (feature) => {
    return styles[feature.get("type")];
  }
});
const featureOverlay = new VectorLayer({
  source: new VectorSource(),
  map: map,
  style: (feature) => {
    return styles[feature.get("type")];
  }
});


const map = new Map({
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    vectorLayer,
    featureOverlay,
  ],
  target: 'map',
  view: new View({
    center: fromLonLat([24.83555, 59.46771]),
    zoom: 12
  })
});


let line = null;
let point = null;
const displaySnap = function(coordinate) {
  const closestFeature = vectorSource.getClosestFeatureToCoordinate(coordinate);
  if (closestFeature === null) {
    point = null;
    line = null;
  } else {
    const geometry = closestFeature.getGeometry();
    const closestPoint = geometry.getClosestPoint(coordinate);
    if (point === null) {
      point = new Point(closestPoint);
    } else {
      point.setCoordinates(closestPoint);
    }
    const coordinates = [coordinate, [closestPoint[0], closestPoint[1]]];
    if (line === null) {
      line = new LineString(coordinates);
    } else {
      line.setCoordinates(coordinates);
    }
  }
  map.render();
};

map.on('pointermove', function(evt) {
  if (evt.dragging || !trackClosest) {
    return;
  }
  displaySnap(map.getEventCoordinate(evt.originalEvent));
});

map.on('click', function(evt) {
  if (!trackClosest) {
    return;
  }
  displaySnap(evt.coordinate);
});

const stroke = new Stroke({
  color: 'rgba(255,0,0,0.9)',
  width: 1
});
const style = new Style({
  stroke: stroke,
  image: new CircleStyle({
    radius: 5,
    fill: null,
    stroke: stroke
  })
});
const iconFeature = new Feature({
  name: 'Current position',
  type: 'position',
});



vectorLayer.on('postrender', function(evt) {
  const vectorContext = getVectorContext(evt);
  vectorContext.setStyle(style);
  if (point !== null) {
    vectorContext.drawGeometry(point);
  }
  if (line !== null) {
    vectorContext.drawGeometry(line);
  }
});

const speed = document.getElementById('speed');
const speedLabel = document.getElementById('speed-indicator');
const showClosest = document.getElementById("show-closest");
const backend = document.getElementById("backend");
showClosest.addEventListener('click', () => {
  trackClosest = showClosest.checked;
  if (!showClosest.checked) {
    line = null;
    point = null;
    map.render();
  }
});

const evtSource = {
  connection: null
}

function onMessage(e) {
  const data = JSON.parse(e.data);
  if (!iconFeature.getGeometry()) {
    iconFeature.setGeometry(new Point(data.pos));
    featureOverlay.getSource().addFeature(iconFeature);
  } else {
    iconFeature.getGeometry().setCoordinates(data.pos);
  }
  map.render();
}

function onEnd() {
  evtSource.connection.close();
}

function backendUrl() {
  return (backend.selected === 'node' ? NODE_API : QUARKUS_API) + "?speed=" + speed.value;
}
function initEventSource() {
  evtSource.connection = new EventSource(backendUrl());
  evtSource.connection.addEventListener("pos", onMessage);
  evtSource.connection.addEventListener("end", onEnd);
}

initEventSource();

iconFeature.setStyle(new Style({
  image: new Icon({
    anchor: [0.5, 1],
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    scale: 1.4,
    src: place
  })
}));

speed.addEventListener('value-change', () => {
  evtSource.connection.close();
  speedLabel.innerHTML = String(speed.value) + " km/h";
  setTimeout(() => {
    initEventSource(speed.value);
  }, 1000);
});
backend.addEventListener('click' , () => {
  const url = backendUrl();
  if (evtSource.connection.url !== url) {
    initEventSource();
  }
  console.debug(backend.selected, backend.value);
});
