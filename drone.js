const map = L.map("map").setView([43.3, -0.366667], 15);
import { getAllDrones, create, remove } from "./back/dronesRequests.js";
import { fromEvent } from "rxjs";
import {io} from 'socket.io-client'
const socket = io("http://localhost:3000");




L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

class LeafletMarker {
  long;
  lat;
  marker;
  currentMovingMarker;
  id;
  name;
  polyline;

  constructor(drone) {
    this.id = drone.id;
    this.long = drone.long;
    this.lat = drone.lat;
    this.name = drone.name;
    this.type = drone.type;
    if (this.type === "drone") {
      this.icon = L.icon({
        iconUrl: "drone.png",
        iconSize: [50, 50],
      });
    } else if (this.type === "entrepot") {
      this.icon = L.icon({
        iconUrl: "warehouse.png",
        iconSize: [50, 50],
      });
    }
  }

  create() {
    if (!this.customText) {
      this.customText = `${this.name}`;
    }
    const marker = L.marker([this.long, this.lat])
      .addTo(map)
      .bindPopup(this.customText)
      .openPopup();
      
    if (this.marker) {
      map.removeLayer(this.marker);
    }
    this.marker = marker;
    return marker;
  }

  async startMovement(direction) {
    map.removeLayer(this.marker);

    if (this.currentMovingMarker) {
      map.removeLayer(this.currentMovingMarker);
    }

    let destArrived = [
      [this.long, this.lat],
      [direction.long, direction.lat],
      [this.long, this.lat]
    ];
    

    let distance = map.distance(destArrived[0], destArrived[1],destArrived[0]);
    const distanceTotalKm = (distance / 1000).toFixed(1);
    let durationAnim = 1500 * distanceTotalKm;
  

    const iconData = { 
      icon: this.icon,
    }

    let dataToSend = {
      destArrived,
      durationAnim,
      iconData
    }

    this.currentMovingMarker = L.Marker.movingMarker(
      destArrived,
      durationAnim,
      iconData
    ).addTo(map);

   
    await fetch("http://localhost:3000/startMovement?marker="+JSON.stringify(dataToSend))
    this.currentMovingMarker.start();
    const p = L.polyline(destArrived).addTo(map);

    let playInterval;
    let isMoving = () => {
      if (this.currentMovingMarker.isRunning()) {
        const res = this.currentMovingMarker.getLatLng();
        this.currentMovingMarker
          .bindPopup(`lat : ${res.lat}, lng:${res.lng}`)
          .openPopup();
      } else {
        if (playInterval) {
          clearInterval(playInterval);
        }
      }
    };

    const latLngTimeout = 150;
    playInterval = setInterval(isMoving, latLngTimeout);
    this.currentMovingMarker.on("end", () => {
      if (this.type === "drone") {
        this.customText = `Le drone numéro ${this.id} est bien arrivé à sa destination`;
      }
      this.currentMovingMarker.bindPopup(
        `${distanceTotalKm * 2} km parcourus`
      );
    });
  }
}

let drones;
let markers = [];
let dronesObjects = [];
let warehouses = [];
let isAnimated = false;

const addDronesPositions = async () => {
  drones = [];
  drones = await getAllDrones();


  socket.emit('welcome', { message: 'Welcome!', id: socket.id });
  dronesObjects = [];
  warehouses = [];

  if (markers.length > 0) {
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
  }
  drones.forEach((drone, index) => {
    const currDrone = new LeafletMarker(drone);
    const marker = currDrone.create();
    markers.push(marker);
    if (drone.type === "drone") {
      dronesObjects.push(currDrone);
    } else if (drone.type === "entrepot") {
      warehouses.push(currDrone);
    }
  });

  const data = markers.map((currMarket) => {
    return {lat:currMarket._latlng.lat,lng: currMarket._latlng.lng} 
  })


  fetch("http://localhost:3000/markersPosition?markers="+JSON.stringify(data))
  addSelectOptions();
};

const displayAddedItems = async () => {
  await addDronesPositions();
  if (drones?.length > 0) {
    let dronesContainer = document.querySelector(".drones");
    let entrepotContainer = document.querySelector(".entrepotAdded");

    Array.from(dronesContainer.children).forEach((item) => {
      if (item.tagName === "DIV") {
        dronesContainer.removeChild(item);
      }
    });

    Array.from(entrepotContainer.children).forEach((item) => {
      if (item.tagName === "DIV") {
        entrepotContainer.removeChild(item);
      }
    });

    // console.log("dronesdrones",drones)
    // debugger;

    drones.forEach((currData) => {
      const div = document.createElement("div");
      div.classList.add("card");
      const div2 = document.createElement("div");
      div2.innerHTML = `Nom : ${currData.name} `;
      const div3 = document.createElement("div");
      if (currData.adresse) {
        div3.innerHTML = `Adresse : ${currData.adresse} `;
      }
      const button = document.createElement("button");
      button.classList.add("removeItem");
      button.innerHTML = "Supprimer";
      button.setAttribute("obj_id", currData.id);

      div.appendChild(div2);
      div.appendChild(div3);
      div.appendChild(button);

      if (currData.type === "drone") {
        dronesContainer.appendChild(div);
      } else if (currData.type === "entrepot") {
        entrepotContainer.appendChild(div);
      }
    });

    document.querySelectorAll("button.removeItem").forEach((eachItem) => {
      fromEvent(eachItem, "click").subscribe(async (event) => {
        const idElem = event.target.getAttribute("obj_id");
        await remove(idElem);
        await displayAddedItems();
      });
    });
  }
};

function addSelectOptions() {
  const currInterface = document.querySelector(".interface");
  const btn = currInterface.querySelector("button");

  const selectDrones = currInterface.querySelector("#drones-select");
  const warehouseSelect = currInterface.querySelector("#warehouse-select");

  Array.from(selectDrones.children).forEach((item) => {
    if (
      item.tagName === "OPTION" &&
      !item.classList.contains("defaultChoice")
    ) {
      selectDrones.removeChild(item);
    }
  });
  Array.from(warehouseSelect.children).forEach((item) => {
    if (
      item.tagName === "OPTION" &&
      !item.classList.contains("defaultChoice")
    ) {
      warehouseSelect.removeChild(item);
    }
  });
  const creteSelection = (data) => {
    var opt = document.createElement("option");
    opt.value = data.id;
    return opt;
  };

  drones.forEach((data, index) => {
    const opt = creteSelection(data);
    if (index == 0) {
      opt.selected = "selected";
    }
    opt.innerHTML = data.name;
    if (data.type === "drone") {
      selectDrones.appendChild(opt);
    } else if (data.type === "entrepot") {
      warehouseSelect.appendChild(opt);
    }
  });

  let droneSelected;
  let polyline;

  let showDirection = (droneSelected, direction) => {
    if (direction) {
      const destArrived = [
        [droneSelected.long, droneSelected.lat],
        [direction.long, direction.lat],
      ];
      droneSelected.currentMovingMarker = L.Marker.movingMarker(
        destArrived,
        [2000],
        { icon: droneSelected.icon }
      ).addTo(map);


      polyline = L.polyline(destArrived).addTo(map);
      droneSelected.currentMovingMarker.on("end", (elem) => {
        if (polyline) {
          map.removeLayer(polyline);
        }
      });
    }
  };
  selectDrones.addEventListener("change", (event) => {
    if (polyline) {
      map.removeLayer(polyline);
    }

    droneSelected = dronesObjects.find(
      (drone) => drone.id == event.target.value
    );
    if (droneSelected.currentMovingMarker) {
      map.removeLayer(droneSelected.currentMovingMarker);
    }

    const directionValue = document.querySelector("#warehouse-select")?.value;
    const warehouse = warehouses.find(
      (warehouse) => warehouse.id === directionValue
    );
    showDirection(droneSelected, warehouse);
  });

  warehouseSelect.addEventListener("change", (event) => {
    if (polyline) {
      map.removeLayer(polyline);
    }
    const dronesValue = document.querySelector("#drones-select")?.value;
    droneSelected = dronesObjects.find((drone) => drone.id == dronesValue);
    if (droneSelected.currentMovingMarker) {
      map.removeLayer(droneSelected.currentMovingMarker);
    }
    const warehouse = warehouses.find(
      (warehouse) => warehouse.id == event.target.value
    );
    showDirection(droneSelected, warehouse);
  });

  btn.addEventListener("click", formValidated.bind(this));
}

function formValidated() {
  const droneValue = document.querySelector("#drones-select")?.value;
  const directionValue = document.querySelector("#warehouse-select")?.value;
  const droneSelected = dronesObjects.find((drone) => drone.id === droneValue);
  const direction = warehouses.find((dir) => dir.id == directionValue);
  if (direction) {
    droneSelected.startMovement(direction);
  }
}

let dronesAdded = [];
let warehousesAdded = [];

const submitForm = () => {
  document
    .querySelector(".entrepot button")
    .addEventListener("click", (event) => {
      event.preventDefault();
      const result = getFormTypeDajout();
      const name = document.querySelector("[name=nomEntr]");
      const adresse = document.querySelector("[name=AdresseEnt]");

      if (result === "drone") {
        dronesAdded.push({ name: name.value, adresse: adresse.value });
      } else if (result === "entrepot") {
        warehousesAdded.push({ name: name.value, adresse: adresse.value });
      }
      updateStoredData();
      name.value = "";
      adresse.value = "";
    });
};

async function updateStoredData() {
  if (dronesAdded.length > 0 || warehousesAdded.length > 0) {
    let currArray = dronesAdded.length > 0 ? dronesAdded : warehousesAdded;
    let coord;
    console.log("coordcoord", coord);
    if (currArray[0].adresse?.length > 0) {
      try {
        coord = await getAdressCoords(currArray[0].adresse);
      } catch (err) {
        console.error("no coords available");
      }
    }
    console.log("coordcoordcoordcoordcoord")
    if (coord) {
      let newLeafletObj = {};

      if (dronesAdded.length > 0) {
        newLeafletObj = {
          name: currArray[0].name,
          long: coord.lat,
          lat: coord.lng,
          adresse: currArray[0].adresse,
          type: "drone",
        };
      } else {
        newLeafletObj = {
          name: currArray[0].name,
          long: coord.lat,
          lat: coord.lng,
          adresse: currArray[0].adresse,
          type: "entrepot",
        };
      }

      await create(newLeafletObj);
      await displayAddedItems();
      dronesAdded = [];
      warehousesAdded = [];
    }
  }
}

async function getAdressCoords(adresse) {
  return new Promise((resolve, reject) => {
    console.log("adresse",adresse)
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${adresse}&key=AIzaSyBmzrfAtBj3pSQDMa1AG4dAmeP5cUBpziA`;
    fetch(geocodingUrl)
      .then((result) => result.json())
      .then((geocodeResult) => {
        if(geocodeResult.results.length === 0) {
          reject();
        }else{
            geocodeResult.results.forEach((coord) => {
                resolve(coord.geometry.location);
              });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getFormTypeDajout() {
  var ele = document.getElementsByName("typeAjout");
  let itemSelected;
  for (let i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      itemSelected = ele[i];
    }
  }
  return itemSelected.value;
}

addDronesPositions();
displayAddedItems();
submitForm();
