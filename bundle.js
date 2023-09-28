(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.create = create;
exports.getAllDrones = getAllDrones;
exports.remove = remove;
const apiUrl = "http://localhost:5000";
async function getAllDrones() {
  return new Promise((resolve, reject) => {
    fetch(`${apiUrl}/allDrones`).then(async result => {
      const data = await result.json();
      data.result.forEach((element, index) => {
        let temp = data.result[index]._id;
        data.result[index].id = temp;
        delete data.result[index]._id;
      });
      resolve(data.result);
    });
  });
}
async function create(body) {
  return new Promise((resolve, reject) => {
    fetch(`${apiUrl}/save`, {
      method: "post",
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async result => {
      const data = await result.json();
      let temp = data.result._id;
      data.result.id = temp;
      delete data.result._id;
      resolve(data.result);
    }).catch(err => {
      reject(err);
    });
  });
}
async function remove(id) {
  return new Promise((resolve, reject) => {
    fetch(`${apiUrl}/delete/${id}`, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(async result => {
      resolve(true);
    }).catch(err => {
      reject(err);
    });
  });
}

},{}],2:[function(require,module,exports){
"use strict";

var _dronesRequests = require("./back/dronesRequests.js");
var _rxjs = require("rxjs");
const map = L.map("map").setView([43.3, -0.366667], 15);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
        iconSize: [50, 50]
      });
    } else if (this.type === "entrepot") {
      this.icon = L.icon({
        iconUrl: "warehouse.png",
        iconSize: [50, 50]
      });
    }
  }
  create() {
    if (!this.customText) {
      this.customText = `${this.name}`;
    }
    const marker = L.marker([this.long, this.lat], {
      icon: this.icon
    }).addTo(map).bindPopup(this.customText).openPopup();
    if (this.marker) {
      map.removeLayer(this.marker);
    }
    this.marker = marker;
    return marker;
  }
  startMovement(direction) {
    map.removeLayer(this.marker);
    if (this.currentMovingMarker) {
      map.removeLayer(this.currentMovingMarker);
    }
    let destArrived = [[this.long, this.lat], [direction.long, direction.lat]];
    let back = [[direction.long, direction.lat], [this.long, this.lat]];
    let distance = map.distance(destArrived[0], destArrived[1]);
    const distanceTotalKm = (distance / 1000).toFixed(1);
    let durationAnim = 1500 * distanceTotalKm;
    this.currentMovingMarker = L.Marker.movingMarker(destArrived, durationAnim, {
      icon: this.icon
    }).addTo(map);
    this.currentMovingMarker.start();
    const p = L.polyline(destArrived).addTo(map);
    let playInterval;
    let value = 0;
    let isMoving = () => {
      if (this.currentMovingMarker.isRunning()) {
        const res = this.currentMovingMarker.getLatLng();
        this.currentMovingMarker.bindPopup(`lat : ${res.lat}, lng:${res.lng}`).openPopup();
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
      setTimeout(() => {
        if (this.currentMovingMarker) {
          map.removeLayer(this.currentMovingMarker);
        }
        this.currentMovingMarker = L.Marker.movingMarker(back, [durationAnim], {
          icon: this.icon
        }).addTo(map);
        this.currentMovingMarker.start();
        playInterval = setInterval(isMoving, latLngTimeout);
        this.currentMovingMarker.on("end", elem => {
          this.currentMovingMarker.bindPopup(`${distanceTotalKm * 2} km parcourus`);
          map.removeLayer(p);
        });
      }, 2000);
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
  drones = await (0, _dronesRequests.getAllDrones)();
  dronesObjects = [];
  warehouses = [];
  if (markers.length > 0) {
    markers.forEach(marker => {
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
  addSelectOptions();
};
const displayAddedItems = async () => {
  await addDronesPositions();
  if (drones?.length > 0) {
    let dronesContainer = document.querySelector(".drones");
    let entrepotContainer = document.querySelector(".entrepotAdded");
    Array.from(dronesContainer.children).forEach(item => {
      if (item.tagName === "DIV") {
        dronesContainer.removeChild(item);
      }
    });
    Array.from(entrepotContainer.children).forEach(item => {
      if (item.tagName === "DIV") {
        entrepotContainer.removeChild(item);
      }
    });

    // console.log("dronesdrones",drones)
    // debugger;

    drones.forEach(currData => {
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
    document.querySelectorAll("button.removeItem").forEach(eachItem => {
      (0, _rxjs.fromEvent)(eachItem, "click").subscribe(async event => {
        const idElem = event.target.getAttribute("obj_id");
        await (0, _dronesRequests.remove)(idElem);
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
  Array.from(selectDrones.children).forEach(item => {
    if (item.tagName === "OPTION" && !item.classList.contains("defaultChoice")) {
      selectDrones.removeChild(item);
    }
  });
  Array.from(warehouseSelect.children).forEach(item => {
    if (item.tagName === "OPTION" && !item.classList.contains("defaultChoice")) {
      warehouseSelect.removeChild(item);
    }
  });
  const creteSelection = data => {
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
      const destArrived = [[droneSelected.long, droneSelected.lat], [direction.long, direction.lat]];
      droneSelected.currentMovingMarker = L.Marker.movingMarker(destArrived, [2000], {
        icon: droneSelected.icon
      }).addTo(map);

      //   droneSelected.currentMovingMarker._icon.style.MozTransform = 'rotate(' + this.options.iconAngle + 'deg)';

      polyline = L.polyline(destArrived).addTo(map);
      droneSelected.currentMovingMarker.on("end", elem => {
        if (polyline) {
          map.removeLayer(polyline);
        }
      });
    }
  };
  selectDrones.addEventListener("change", event => {
    if (polyline) {
      map.removeLayer(polyline);
    }
    droneSelected = dronesObjects.find(drone => drone.id == event.target.value);
    if (droneSelected.currentMovingMarker) {
      map.removeLayer(droneSelected.currentMovingMarker);
    }
    const directionValue = document.querySelector("#warehouse-select")?.value;
    const warehouse = warehouses.find(warehouse => warehouse.id === directionValue);
    showDirection(droneSelected, warehouse);
  });
  warehouseSelect.addEventListener("change", event => {
    if (polyline) {
      map.removeLayer(polyline);
    }
    const dronesValue = document.querySelector("#drones-select")?.value;
    droneSelected = dronesObjects.find(drone => drone.id == dronesValue);
    if (droneSelected.currentMovingMarker) {
      map.removeLayer(droneSelected.currentMovingMarker);
    }
    const warehouse = warehouses.find(warehouse => warehouse.id == event.target.value);
    showDirection(droneSelected, warehouse);
  });
  btn.addEventListener("click", formValidated.bind(this));
}
function formValidated() {
  const droneValue = document.querySelector("#drones-select")?.value;
  const directionValue = document.querySelector("#warehouse-select")?.value;
  const droneSelected = dronesObjects.find(drone => drone.id === droneValue);
  const direction = warehouses.find(dir => dir.id == directionValue);
  if (direction) {
    droneSelected.startMovement(direction);
  }
}
let dronesAdded = [];
let warehousesAdded = [];
const submitForm = () => {
  document.querySelector(".entrepot button").addEventListener("click", event => {
    event.preventDefault();
    const result = getFormTypeDajout();
    const name = document.querySelector("[name=nomEntr]");
    const adresse = document.querySelector("[name=AdresseEnt]");
    if (result === "drone") {
      dronesAdded.push({
        name: name.value,
        adresse: adresse.value
      });
    } else if (result === "entrepot") {
      warehousesAdded.push({
        name: name.value,
        adresse: adresse.value
      });
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
    console.log("coordcoordcoordcoordcoord");
    if (coord) {
      let newLeafletObj = {};
      if (dronesAdded.length > 0) {
        newLeafletObj = {
          name: currArray[0].name,
          long: coord.lat,
          lat: coord.lng,
          adresse: currArray[0].adresse,
          type: "drone"
        };
      } else {
        newLeafletObj = {
          name: currArray[0].name,
          long: coord.lat,
          lat: coord.lng,
          adresse: currArray[0].adresse,
          type: "entrepot"
        };
      }
      await (0, _dronesRequests.create)(newLeafletObj);
      await displayAddedItems();
      dronesAdded = [];
      warehousesAdded = [];
    }
  }
}
async function getAdressCoords(adresse) {
  return new Promise((resolve, reject) => {
    console.log("adresse", adresse);
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${adresse}&key=AIzaSyBmzrfAtBj3pSQDMa1AG4dAmeP5cUBpziA`;
    fetch(geocodingUrl).then(result => result.json()).then(geocodeResult => {
      if (geocodeResult.results.length === 0) {
        reject();
      } else {
        geocodeResult.results.forEach(coord => {
          resolve(coord.geometry.location);
        });
      }
    }).catch(err => {
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

},{"./back/dronesRequests.js":1,"rxjs":4}],3:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  Observable: true,
  ConnectableObservable: true,
  observable: true,
  animationFrames: true,
  Subject: true,
  BehaviorSubject: true,
  ReplaySubject: true,
  AsyncSubject: true,
  asap: true,
  asapScheduler: true,
  async: true,
  asyncScheduler: true,
  queue: true,
  queueScheduler: true,
  animationFrame: true,
  animationFrameScheduler: true,
  VirtualTimeScheduler: true,
  VirtualAction: true,
  Scheduler: true,
  Subscription: true,
  Subscriber: true,
  Notification: true,
  NotificationKind: true,
  pipe: true,
  noop: true,
  identity: true,
  isObservable: true,
  lastValueFrom: true,
  firstValueFrom: true,
  ArgumentOutOfRangeError: true,
  EmptyError: true,
  NotFoundError: true,
  ObjectUnsubscribedError: true,
  SequenceError: true,
  TimeoutError: true,
  timeout: true,
  UnsubscriptionError: true,
  bindCallback: true,
  bindNodeCallback: true,
  combineLatest: true,
  concat: true,
  connectable: true,
  defer: true,
  empty: true,
  EMPTY: true,
  forkJoin: true,
  from: true,
  fromEvent: true,
  fromEventPattern: true,
  generate: true,
  iif: true,
  interval: true,
  merge: true,
  never: true,
  NEVER: true,
  of: true,
  onErrorResumeNext: true,
  pairs: true,
  partition: true,
  race: true,
  range: true,
  throwError: true,
  timer: true,
  using: true,
  zip: true,
  scheduled: true,
  config: true,
  audit: true,
  auditTime: true,
  buffer: true,
  bufferCount: true,
  bufferTime: true,
  bufferToggle: true,
  bufferWhen: true,
  catchError: true,
  combineAll: true,
  combineLatestAll: true,
  combineLatestWith: true,
  concatAll: true,
  concatMap: true,
  concatMapTo: true,
  concatWith: true,
  connect: true,
  count: true,
  debounce: true,
  debounceTime: true,
  defaultIfEmpty: true,
  delay: true,
  delayWhen: true,
  dematerialize: true,
  distinct: true,
  distinctUntilChanged: true,
  distinctUntilKeyChanged: true,
  elementAt: true,
  endWith: true,
  every: true,
  exhaust: true,
  exhaustAll: true,
  exhaustMap: true,
  expand: true,
  filter: true,
  finalize: true,
  find: true,
  findIndex: true,
  first: true,
  groupBy: true,
  ignoreElements: true,
  isEmpty: true,
  last: true,
  map: true,
  mapTo: true,
  materialize: true,
  max: true,
  mergeAll: true,
  flatMap: true,
  mergeMap: true,
  mergeMapTo: true,
  mergeScan: true,
  mergeWith: true,
  min: true,
  multicast: true,
  observeOn: true,
  onErrorResumeNextWith: true,
  pairwise: true,
  pluck: true,
  publish: true,
  publishBehavior: true,
  publishLast: true,
  publishReplay: true,
  raceWith: true,
  reduce: true,
  repeat: true,
  repeatWhen: true,
  retry: true,
  retryWhen: true,
  refCount: true,
  sample: true,
  sampleTime: true,
  scan: true,
  sequenceEqual: true,
  share: true,
  shareReplay: true,
  single: true,
  skip: true,
  skipLast: true,
  skipUntil: true,
  skipWhile: true,
  startWith: true,
  subscribeOn: true,
  switchAll: true,
  switchMap: true,
  switchMapTo: true,
  switchScan: true,
  take: true,
  takeLast: true,
  takeUntil: true,
  takeWhile: true,
  tap: true,
  throttle: true,
  throttleTime: true,
  throwIfEmpty: true,
  timeInterval: true,
  timeoutWith: true,
  timestamp: true,
  toArray: true,
  window: true,
  windowCount: true,
  windowTime: true,
  windowToggle: true,
  windowWhen: true,
  withLatestFrom: true,
  zipAll: true,
  zipWith: true
};
Object.defineProperty(exports, "ArgumentOutOfRangeError", {
  enumerable: true,
  get: function () {
    return _ArgumentOutOfRangeError.ArgumentOutOfRangeError;
  }
});
Object.defineProperty(exports, "AsyncSubject", {
  enumerable: true,
  get: function () {
    return _AsyncSubject.AsyncSubject;
  }
});
Object.defineProperty(exports, "BehaviorSubject", {
  enumerable: true,
  get: function () {
    return _BehaviorSubject.BehaviorSubject;
  }
});
Object.defineProperty(exports, "ConnectableObservable", {
  enumerable: true,
  get: function () {
    return _ConnectableObservable.ConnectableObservable;
  }
});
Object.defineProperty(exports, "EMPTY", {
  enumerable: true,
  get: function () {
    return _empty.EMPTY;
  }
});
Object.defineProperty(exports, "EmptyError", {
  enumerable: true,
  get: function () {
    return _EmptyError.EmptyError;
  }
});
Object.defineProperty(exports, "NEVER", {
  enumerable: true,
  get: function () {
    return _never.NEVER;
  }
});
Object.defineProperty(exports, "NotFoundError", {
  enumerable: true,
  get: function () {
    return _NotFoundError.NotFoundError;
  }
});
Object.defineProperty(exports, "Notification", {
  enumerable: true,
  get: function () {
    return _Notification.Notification;
  }
});
Object.defineProperty(exports, "NotificationKind", {
  enumerable: true,
  get: function () {
    return _Notification.NotificationKind;
  }
});
Object.defineProperty(exports, "ObjectUnsubscribedError", {
  enumerable: true,
  get: function () {
    return _ObjectUnsubscribedError.ObjectUnsubscribedError;
  }
});
Object.defineProperty(exports, "Observable", {
  enumerable: true,
  get: function () {
    return _Observable.Observable;
  }
});
Object.defineProperty(exports, "ReplaySubject", {
  enumerable: true,
  get: function () {
    return _ReplaySubject.ReplaySubject;
  }
});
Object.defineProperty(exports, "Scheduler", {
  enumerable: true,
  get: function () {
    return _Scheduler.Scheduler;
  }
});
Object.defineProperty(exports, "SequenceError", {
  enumerable: true,
  get: function () {
    return _SequenceError.SequenceError;
  }
});
Object.defineProperty(exports, "Subject", {
  enumerable: true,
  get: function () {
    return _Subject.Subject;
  }
});
Object.defineProperty(exports, "Subscriber", {
  enumerable: true,
  get: function () {
    return _Subscriber.Subscriber;
  }
});
Object.defineProperty(exports, "Subscription", {
  enumerable: true,
  get: function () {
    return _Subscription.Subscription;
  }
});
Object.defineProperty(exports, "TimeoutError", {
  enumerable: true,
  get: function () {
    return _timeout.TimeoutError;
  }
});
Object.defineProperty(exports, "UnsubscriptionError", {
  enumerable: true,
  get: function () {
    return _UnsubscriptionError.UnsubscriptionError;
  }
});
Object.defineProperty(exports, "VirtualAction", {
  enumerable: true,
  get: function () {
    return _VirtualTimeScheduler.VirtualAction;
  }
});
Object.defineProperty(exports, "VirtualTimeScheduler", {
  enumerable: true,
  get: function () {
    return _VirtualTimeScheduler.VirtualTimeScheduler;
  }
});
Object.defineProperty(exports, "animationFrame", {
  enumerable: true,
  get: function () {
    return _animationFrame.animationFrame;
  }
});
Object.defineProperty(exports, "animationFrameScheduler", {
  enumerable: true,
  get: function () {
    return _animationFrame.animationFrameScheduler;
  }
});
Object.defineProperty(exports, "animationFrames", {
  enumerable: true,
  get: function () {
    return _animationFrames.animationFrames;
  }
});
Object.defineProperty(exports, "asap", {
  enumerable: true,
  get: function () {
    return _asap.asap;
  }
});
Object.defineProperty(exports, "asapScheduler", {
  enumerable: true,
  get: function () {
    return _asap.asapScheduler;
  }
});
Object.defineProperty(exports, "async", {
  enumerable: true,
  get: function () {
    return _async.async;
  }
});
Object.defineProperty(exports, "asyncScheduler", {
  enumerable: true,
  get: function () {
    return _async.asyncScheduler;
  }
});
Object.defineProperty(exports, "audit", {
  enumerable: true,
  get: function () {
    return _audit.audit;
  }
});
Object.defineProperty(exports, "auditTime", {
  enumerable: true,
  get: function () {
    return _auditTime.auditTime;
  }
});
Object.defineProperty(exports, "bindCallback", {
  enumerable: true,
  get: function () {
    return _bindCallback.bindCallback;
  }
});
Object.defineProperty(exports, "bindNodeCallback", {
  enumerable: true,
  get: function () {
    return _bindNodeCallback.bindNodeCallback;
  }
});
Object.defineProperty(exports, "buffer", {
  enumerable: true,
  get: function () {
    return _buffer.buffer;
  }
});
Object.defineProperty(exports, "bufferCount", {
  enumerable: true,
  get: function () {
    return _bufferCount.bufferCount;
  }
});
Object.defineProperty(exports, "bufferTime", {
  enumerable: true,
  get: function () {
    return _bufferTime.bufferTime;
  }
});
Object.defineProperty(exports, "bufferToggle", {
  enumerable: true,
  get: function () {
    return _bufferToggle.bufferToggle;
  }
});
Object.defineProperty(exports, "bufferWhen", {
  enumerable: true,
  get: function () {
    return _bufferWhen.bufferWhen;
  }
});
Object.defineProperty(exports, "catchError", {
  enumerable: true,
  get: function () {
    return _catchError.catchError;
  }
});
Object.defineProperty(exports, "combineAll", {
  enumerable: true,
  get: function () {
    return _combineAll.combineAll;
  }
});
Object.defineProperty(exports, "combineLatest", {
  enumerable: true,
  get: function () {
    return _combineLatest.combineLatest;
  }
});
Object.defineProperty(exports, "combineLatestAll", {
  enumerable: true,
  get: function () {
    return _combineLatestAll.combineLatestAll;
  }
});
Object.defineProperty(exports, "combineLatestWith", {
  enumerable: true,
  get: function () {
    return _combineLatestWith.combineLatestWith;
  }
});
Object.defineProperty(exports, "concat", {
  enumerable: true,
  get: function () {
    return _concat.concat;
  }
});
Object.defineProperty(exports, "concatAll", {
  enumerable: true,
  get: function () {
    return _concatAll.concatAll;
  }
});
Object.defineProperty(exports, "concatMap", {
  enumerable: true,
  get: function () {
    return _concatMap.concatMap;
  }
});
Object.defineProperty(exports, "concatMapTo", {
  enumerable: true,
  get: function () {
    return _concatMapTo.concatMapTo;
  }
});
Object.defineProperty(exports, "concatWith", {
  enumerable: true,
  get: function () {
    return _concatWith.concatWith;
  }
});
Object.defineProperty(exports, "config", {
  enumerable: true,
  get: function () {
    return _config.config;
  }
});
Object.defineProperty(exports, "connect", {
  enumerable: true,
  get: function () {
    return _connect.connect;
  }
});
Object.defineProperty(exports, "connectable", {
  enumerable: true,
  get: function () {
    return _connectable.connectable;
  }
});
Object.defineProperty(exports, "count", {
  enumerable: true,
  get: function () {
    return _count.count;
  }
});
Object.defineProperty(exports, "debounce", {
  enumerable: true,
  get: function () {
    return _debounce.debounce;
  }
});
Object.defineProperty(exports, "debounceTime", {
  enumerable: true,
  get: function () {
    return _debounceTime.debounceTime;
  }
});
Object.defineProperty(exports, "defaultIfEmpty", {
  enumerable: true,
  get: function () {
    return _defaultIfEmpty.defaultIfEmpty;
  }
});
Object.defineProperty(exports, "defer", {
  enumerable: true,
  get: function () {
    return _defer.defer;
  }
});
Object.defineProperty(exports, "delay", {
  enumerable: true,
  get: function () {
    return _delay.delay;
  }
});
Object.defineProperty(exports, "delayWhen", {
  enumerable: true,
  get: function () {
    return _delayWhen.delayWhen;
  }
});
Object.defineProperty(exports, "dematerialize", {
  enumerable: true,
  get: function () {
    return _dematerialize.dematerialize;
  }
});
Object.defineProperty(exports, "distinct", {
  enumerable: true,
  get: function () {
    return _distinct.distinct;
  }
});
Object.defineProperty(exports, "distinctUntilChanged", {
  enumerable: true,
  get: function () {
    return _distinctUntilChanged.distinctUntilChanged;
  }
});
Object.defineProperty(exports, "distinctUntilKeyChanged", {
  enumerable: true,
  get: function () {
    return _distinctUntilKeyChanged.distinctUntilKeyChanged;
  }
});
Object.defineProperty(exports, "elementAt", {
  enumerable: true,
  get: function () {
    return _elementAt.elementAt;
  }
});
Object.defineProperty(exports, "empty", {
  enumerable: true,
  get: function () {
    return _empty.empty;
  }
});
Object.defineProperty(exports, "endWith", {
  enumerable: true,
  get: function () {
    return _endWith.endWith;
  }
});
Object.defineProperty(exports, "every", {
  enumerable: true,
  get: function () {
    return _every.every;
  }
});
Object.defineProperty(exports, "exhaust", {
  enumerable: true,
  get: function () {
    return _exhaust.exhaust;
  }
});
Object.defineProperty(exports, "exhaustAll", {
  enumerable: true,
  get: function () {
    return _exhaustAll.exhaustAll;
  }
});
Object.defineProperty(exports, "exhaustMap", {
  enumerable: true,
  get: function () {
    return _exhaustMap.exhaustMap;
  }
});
Object.defineProperty(exports, "expand", {
  enumerable: true,
  get: function () {
    return _expand.expand;
  }
});
Object.defineProperty(exports, "filter", {
  enumerable: true,
  get: function () {
    return _filter.filter;
  }
});
Object.defineProperty(exports, "finalize", {
  enumerable: true,
  get: function () {
    return _finalize.finalize;
  }
});
Object.defineProperty(exports, "find", {
  enumerable: true,
  get: function () {
    return _find.find;
  }
});
Object.defineProperty(exports, "findIndex", {
  enumerable: true,
  get: function () {
    return _findIndex.findIndex;
  }
});
Object.defineProperty(exports, "first", {
  enumerable: true,
  get: function () {
    return _first.first;
  }
});
Object.defineProperty(exports, "firstValueFrom", {
  enumerable: true,
  get: function () {
    return _firstValueFrom.firstValueFrom;
  }
});
Object.defineProperty(exports, "flatMap", {
  enumerable: true,
  get: function () {
    return _flatMap.flatMap;
  }
});
Object.defineProperty(exports, "forkJoin", {
  enumerable: true,
  get: function () {
    return _forkJoin.forkJoin;
  }
});
Object.defineProperty(exports, "from", {
  enumerable: true,
  get: function () {
    return _from.from;
  }
});
Object.defineProperty(exports, "fromEvent", {
  enumerable: true,
  get: function () {
    return _fromEvent.fromEvent;
  }
});
Object.defineProperty(exports, "fromEventPattern", {
  enumerable: true,
  get: function () {
    return _fromEventPattern.fromEventPattern;
  }
});
Object.defineProperty(exports, "generate", {
  enumerable: true,
  get: function () {
    return _generate.generate;
  }
});
Object.defineProperty(exports, "groupBy", {
  enumerable: true,
  get: function () {
    return _groupBy.groupBy;
  }
});
Object.defineProperty(exports, "identity", {
  enumerable: true,
  get: function () {
    return _identity.identity;
  }
});
Object.defineProperty(exports, "ignoreElements", {
  enumerable: true,
  get: function () {
    return _ignoreElements.ignoreElements;
  }
});
Object.defineProperty(exports, "iif", {
  enumerable: true,
  get: function () {
    return _iif.iif;
  }
});
Object.defineProperty(exports, "interval", {
  enumerable: true,
  get: function () {
    return _interval.interval;
  }
});
Object.defineProperty(exports, "isEmpty", {
  enumerable: true,
  get: function () {
    return _isEmpty.isEmpty;
  }
});
Object.defineProperty(exports, "isObservable", {
  enumerable: true,
  get: function () {
    return _isObservable.isObservable;
  }
});
Object.defineProperty(exports, "last", {
  enumerable: true,
  get: function () {
    return _last.last;
  }
});
Object.defineProperty(exports, "lastValueFrom", {
  enumerable: true,
  get: function () {
    return _lastValueFrom.lastValueFrom;
  }
});
Object.defineProperty(exports, "map", {
  enumerable: true,
  get: function () {
    return _map.map;
  }
});
Object.defineProperty(exports, "mapTo", {
  enumerable: true,
  get: function () {
    return _mapTo.mapTo;
  }
});
Object.defineProperty(exports, "materialize", {
  enumerable: true,
  get: function () {
    return _materialize.materialize;
  }
});
Object.defineProperty(exports, "max", {
  enumerable: true,
  get: function () {
    return _max.max;
  }
});
Object.defineProperty(exports, "merge", {
  enumerable: true,
  get: function () {
    return _merge.merge;
  }
});
Object.defineProperty(exports, "mergeAll", {
  enumerable: true,
  get: function () {
    return _mergeAll.mergeAll;
  }
});
Object.defineProperty(exports, "mergeMap", {
  enumerable: true,
  get: function () {
    return _mergeMap.mergeMap;
  }
});
Object.defineProperty(exports, "mergeMapTo", {
  enumerable: true,
  get: function () {
    return _mergeMapTo.mergeMapTo;
  }
});
Object.defineProperty(exports, "mergeScan", {
  enumerable: true,
  get: function () {
    return _mergeScan.mergeScan;
  }
});
Object.defineProperty(exports, "mergeWith", {
  enumerable: true,
  get: function () {
    return _mergeWith.mergeWith;
  }
});
Object.defineProperty(exports, "min", {
  enumerable: true,
  get: function () {
    return _min.min;
  }
});
Object.defineProperty(exports, "multicast", {
  enumerable: true,
  get: function () {
    return _multicast.multicast;
  }
});
Object.defineProperty(exports, "never", {
  enumerable: true,
  get: function () {
    return _never.never;
  }
});
Object.defineProperty(exports, "noop", {
  enumerable: true,
  get: function () {
    return _noop.noop;
  }
});
Object.defineProperty(exports, "observable", {
  enumerable: true,
  get: function () {
    return _observable.observable;
  }
});
Object.defineProperty(exports, "observeOn", {
  enumerable: true,
  get: function () {
    return _observeOn.observeOn;
  }
});
Object.defineProperty(exports, "of", {
  enumerable: true,
  get: function () {
    return _of.of;
  }
});
Object.defineProperty(exports, "onErrorResumeNext", {
  enumerable: true,
  get: function () {
    return _onErrorResumeNext.onErrorResumeNext;
  }
});
Object.defineProperty(exports, "onErrorResumeNextWith", {
  enumerable: true,
  get: function () {
    return _onErrorResumeNextWith.onErrorResumeNextWith;
  }
});
Object.defineProperty(exports, "pairs", {
  enumerable: true,
  get: function () {
    return _pairs.pairs;
  }
});
Object.defineProperty(exports, "pairwise", {
  enumerable: true,
  get: function () {
    return _pairwise.pairwise;
  }
});
Object.defineProperty(exports, "partition", {
  enumerable: true,
  get: function () {
    return _partition.partition;
  }
});
Object.defineProperty(exports, "pipe", {
  enumerable: true,
  get: function () {
    return _pipe.pipe;
  }
});
Object.defineProperty(exports, "pluck", {
  enumerable: true,
  get: function () {
    return _pluck.pluck;
  }
});
Object.defineProperty(exports, "publish", {
  enumerable: true,
  get: function () {
    return _publish.publish;
  }
});
Object.defineProperty(exports, "publishBehavior", {
  enumerable: true,
  get: function () {
    return _publishBehavior.publishBehavior;
  }
});
Object.defineProperty(exports, "publishLast", {
  enumerable: true,
  get: function () {
    return _publishLast.publishLast;
  }
});
Object.defineProperty(exports, "publishReplay", {
  enumerable: true,
  get: function () {
    return _publishReplay.publishReplay;
  }
});
Object.defineProperty(exports, "queue", {
  enumerable: true,
  get: function () {
    return _queue.queue;
  }
});
Object.defineProperty(exports, "queueScheduler", {
  enumerable: true,
  get: function () {
    return _queue.queueScheduler;
  }
});
Object.defineProperty(exports, "race", {
  enumerable: true,
  get: function () {
    return _race.race;
  }
});
Object.defineProperty(exports, "raceWith", {
  enumerable: true,
  get: function () {
    return _raceWith.raceWith;
  }
});
Object.defineProperty(exports, "range", {
  enumerable: true,
  get: function () {
    return _range.range;
  }
});
Object.defineProperty(exports, "reduce", {
  enumerable: true,
  get: function () {
    return _reduce.reduce;
  }
});
Object.defineProperty(exports, "refCount", {
  enumerable: true,
  get: function () {
    return _refCount.refCount;
  }
});
Object.defineProperty(exports, "repeat", {
  enumerable: true,
  get: function () {
    return _repeat.repeat;
  }
});
Object.defineProperty(exports, "repeatWhen", {
  enumerable: true,
  get: function () {
    return _repeatWhen.repeatWhen;
  }
});
Object.defineProperty(exports, "retry", {
  enumerable: true,
  get: function () {
    return _retry.retry;
  }
});
Object.defineProperty(exports, "retryWhen", {
  enumerable: true,
  get: function () {
    return _retryWhen.retryWhen;
  }
});
Object.defineProperty(exports, "sample", {
  enumerable: true,
  get: function () {
    return _sample.sample;
  }
});
Object.defineProperty(exports, "sampleTime", {
  enumerable: true,
  get: function () {
    return _sampleTime.sampleTime;
  }
});
Object.defineProperty(exports, "scan", {
  enumerable: true,
  get: function () {
    return _scan.scan;
  }
});
Object.defineProperty(exports, "scheduled", {
  enumerable: true,
  get: function () {
    return _scheduled.scheduled;
  }
});
Object.defineProperty(exports, "sequenceEqual", {
  enumerable: true,
  get: function () {
    return _sequenceEqual.sequenceEqual;
  }
});
Object.defineProperty(exports, "share", {
  enumerable: true,
  get: function () {
    return _share.share;
  }
});
Object.defineProperty(exports, "shareReplay", {
  enumerable: true,
  get: function () {
    return _shareReplay.shareReplay;
  }
});
Object.defineProperty(exports, "single", {
  enumerable: true,
  get: function () {
    return _single.single;
  }
});
Object.defineProperty(exports, "skip", {
  enumerable: true,
  get: function () {
    return _skip.skip;
  }
});
Object.defineProperty(exports, "skipLast", {
  enumerable: true,
  get: function () {
    return _skipLast.skipLast;
  }
});
Object.defineProperty(exports, "skipUntil", {
  enumerable: true,
  get: function () {
    return _skipUntil.skipUntil;
  }
});
Object.defineProperty(exports, "skipWhile", {
  enumerable: true,
  get: function () {
    return _skipWhile.skipWhile;
  }
});
Object.defineProperty(exports, "startWith", {
  enumerable: true,
  get: function () {
    return _startWith.startWith;
  }
});
Object.defineProperty(exports, "subscribeOn", {
  enumerable: true,
  get: function () {
    return _subscribeOn.subscribeOn;
  }
});
Object.defineProperty(exports, "switchAll", {
  enumerable: true,
  get: function () {
    return _switchAll.switchAll;
  }
});
Object.defineProperty(exports, "switchMap", {
  enumerable: true,
  get: function () {
    return _switchMap.switchMap;
  }
});
Object.defineProperty(exports, "switchMapTo", {
  enumerable: true,
  get: function () {
    return _switchMapTo.switchMapTo;
  }
});
Object.defineProperty(exports, "switchScan", {
  enumerable: true,
  get: function () {
    return _switchScan.switchScan;
  }
});
Object.defineProperty(exports, "take", {
  enumerable: true,
  get: function () {
    return _take.take;
  }
});
Object.defineProperty(exports, "takeLast", {
  enumerable: true,
  get: function () {
    return _takeLast.takeLast;
  }
});
Object.defineProperty(exports, "takeUntil", {
  enumerable: true,
  get: function () {
    return _takeUntil.takeUntil;
  }
});
Object.defineProperty(exports, "takeWhile", {
  enumerable: true,
  get: function () {
    return _takeWhile.takeWhile;
  }
});
Object.defineProperty(exports, "tap", {
  enumerable: true,
  get: function () {
    return _tap.tap;
  }
});
Object.defineProperty(exports, "throttle", {
  enumerable: true,
  get: function () {
    return _throttle.throttle;
  }
});
Object.defineProperty(exports, "throttleTime", {
  enumerable: true,
  get: function () {
    return _throttleTime.throttleTime;
  }
});
Object.defineProperty(exports, "throwError", {
  enumerable: true,
  get: function () {
    return _throwError.throwError;
  }
});
Object.defineProperty(exports, "throwIfEmpty", {
  enumerable: true,
  get: function () {
    return _throwIfEmpty.throwIfEmpty;
  }
});
Object.defineProperty(exports, "timeInterval", {
  enumerable: true,
  get: function () {
    return _timeInterval.timeInterval;
  }
});
Object.defineProperty(exports, "timeout", {
  enumerable: true,
  get: function () {
    return _timeout.timeout;
  }
});
Object.defineProperty(exports, "timeoutWith", {
  enumerable: true,
  get: function () {
    return _timeoutWith.timeoutWith;
  }
});
Object.defineProperty(exports, "timer", {
  enumerable: true,
  get: function () {
    return _timer.timer;
  }
});
Object.defineProperty(exports, "timestamp", {
  enumerable: true,
  get: function () {
    return _timestamp.timestamp;
  }
});
Object.defineProperty(exports, "toArray", {
  enumerable: true,
  get: function () {
    return _toArray.toArray;
  }
});
Object.defineProperty(exports, "using", {
  enumerable: true,
  get: function () {
    return _using.using;
  }
});
Object.defineProperty(exports, "window", {
  enumerable: true,
  get: function () {
    return _window.window;
  }
});
Object.defineProperty(exports, "windowCount", {
  enumerable: true,
  get: function () {
    return _windowCount.windowCount;
  }
});
Object.defineProperty(exports, "windowTime", {
  enumerable: true,
  get: function () {
    return _windowTime.windowTime;
  }
});
Object.defineProperty(exports, "windowToggle", {
  enumerable: true,
  get: function () {
    return _windowToggle.windowToggle;
  }
});
Object.defineProperty(exports, "windowWhen", {
  enumerable: true,
  get: function () {
    return _windowWhen.windowWhen;
  }
});
Object.defineProperty(exports, "withLatestFrom", {
  enumerable: true,
  get: function () {
    return _withLatestFrom.withLatestFrom;
  }
});
Object.defineProperty(exports, "zip", {
  enumerable: true,
  get: function () {
    return _zip.zip;
  }
});
Object.defineProperty(exports, "zipAll", {
  enumerable: true,
  get: function () {
    return _zipAll.zipAll;
  }
});
Object.defineProperty(exports, "zipWith", {
  enumerable: true,
  get: function () {
    return _zipWith.zipWith;
  }
});
var _Observable = require("./internal/Observable");
var _ConnectableObservable = require("./internal/observable/ConnectableObservable");
var _observable = require("./internal/symbol/observable");
var _animationFrames = require("./internal/observable/dom/animationFrames");
var _Subject = require("./internal/Subject");
var _BehaviorSubject = require("./internal/BehaviorSubject");
var _ReplaySubject = require("./internal/ReplaySubject");
var _AsyncSubject = require("./internal/AsyncSubject");
var _asap = require("./internal/scheduler/asap");
var _async = require("./internal/scheduler/async");
var _queue = require("./internal/scheduler/queue");
var _animationFrame = require("./internal/scheduler/animationFrame");
var _VirtualTimeScheduler = require("./internal/scheduler/VirtualTimeScheduler");
var _Scheduler = require("./internal/Scheduler");
var _Subscription = require("./internal/Subscription");
var _Subscriber = require("./internal/Subscriber");
var _Notification = require("./internal/Notification");
var _pipe = require("./internal/util/pipe");
var _noop = require("./internal/util/noop");
var _identity = require("./internal/util/identity");
var _isObservable = require("./internal/util/isObservable");
var _lastValueFrom = require("./internal/lastValueFrom");
var _firstValueFrom = require("./internal/firstValueFrom");
var _ArgumentOutOfRangeError = require("./internal/util/ArgumentOutOfRangeError");
var _EmptyError = require("./internal/util/EmptyError");
var _NotFoundError = require("./internal/util/NotFoundError");
var _ObjectUnsubscribedError = require("./internal/util/ObjectUnsubscribedError");
var _SequenceError = require("./internal/util/SequenceError");
var _timeout = require("./internal/operators/timeout");
var _UnsubscriptionError = require("./internal/util/UnsubscriptionError");
var _bindCallback = require("./internal/observable/bindCallback");
var _bindNodeCallback = require("./internal/observable/bindNodeCallback");
var _combineLatest = require("./internal/observable/combineLatest");
var _concat = require("./internal/observable/concat");
var _connectable = require("./internal/observable/connectable");
var _defer = require("./internal/observable/defer");
var _empty = require("./internal/observable/empty");
var _forkJoin = require("./internal/observable/forkJoin");
var _from = require("./internal/observable/from");
var _fromEvent = require("./internal/observable/fromEvent");
var _fromEventPattern = require("./internal/observable/fromEventPattern");
var _generate = require("./internal/observable/generate");
var _iif = require("./internal/observable/iif");
var _interval = require("./internal/observable/interval");
var _merge = require("./internal/observable/merge");
var _never = require("./internal/observable/never");
var _of = require("./internal/observable/of");
var _onErrorResumeNext = require("./internal/observable/onErrorResumeNext");
var _pairs = require("./internal/observable/pairs");
var _partition = require("./internal/observable/partition");
var _race = require("./internal/observable/race");
var _range = require("./internal/observable/range");
var _throwError = require("./internal/observable/throwError");
var _timer = require("./internal/observable/timer");
var _using = require("./internal/observable/using");
var _zip = require("./internal/observable/zip");
var _scheduled = require("./internal/scheduled/scheduled");
var _types = require("./internal/types");
Object.keys(_types).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _types[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _types[key];
    }
  });
});
var _config = require("./internal/config");
var _audit = require("./internal/operators/audit");
var _auditTime = require("./internal/operators/auditTime");
var _buffer = require("./internal/operators/buffer");
var _bufferCount = require("./internal/operators/bufferCount");
var _bufferTime = require("./internal/operators/bufferTime");
var _bufferToggle = require("./internal/operators/bufferToggle");
var _bufferWhen = require("./internal/operators/bufferWhen");
var _catchError = require("./internal/operators/catchError");
var _combineAll = require("./internal/operators/combineAll");
var _combineLatestAll = require("./internal/operators/combineLatestAll");
var _combineLatestWith = require("./internal/operators/combineLatestWith");
var _concatAll = require("./internal/operators/concatAll");
var _concatMap = require("./internal/operators/concatMap");
var _concatMapTo = require("./internal/operators/concatMapTo");
var _concatWith = require("./internal/operators/concatWith");
var _connect = require("./internal/operators/connect");
var _count = require("./internal/operators/count");
var _debounce = require("./internal/operators/debounce");
var _debounceTime = require("./internal/operators/debounceTime");
var _defaultIfEmpty = require("./internal/operators/defaultIfEmpty");
var _delay = require("./internal/operators/delay");
var _delayWhen = require("./internal/operators/delayWhen");
var _dematerialize = require("./internal/operators/dematerialize");
var _distinct = require("./internal/operators/distinct");
var _distinctUntilChanged = require("./internal/operators/distinctUntilChanged");
var _distinctUntilKeyChanged = require("./internal/operators/distinctUntilKeyChanged");
var _elementAt = require("./internal/operators/elementAt");
var _endWith = require("./internal/operators/endWith");
var _every = require("./internal/operators/every");
var _exhaust = require("./internal/operators/exhaust");
var _exhaustAll = require("./internal/operators/exhaustAll");
var _exhaustMap = require("./internal/operators/exhaustMap");
var _expand = require("./internal/operators/expand");
var _filter = require("./internal/operators/filter");
var _finalize = require("./internal/operators/finalize");
var _find = require("./internal/operators/find");
var _findIndex = require("./internal/operators/findIndex");
var _first = require("./internal/operators/first");
var _groupBy = require("./internal/operators/groupBy");
var _ignoreElements = require("./internal/operators/ignoreElements");
var _isEmpty = require("./internal/operators/isEmpty");
var _last = require("./internal/operators/last");
var _map = require("./internal/operators/map");
var _mapTo = require("./internal/operators/mapTo");
var _materialize = require("./internal/operators/materialize");
var _max = require("./internal/operators/max");
var _mergeAll = require("./internal/operators/mergeAll");
var _flatMap = require("./internal/operators/flatMap");
var _mergeMap = require("./internal/operators/mergeMap");
var _mergeMapTo = require("./internal/operators/mergeMapTo");
var _mergeScan = require("./internal/operators/mergeScan");
var _mergeWith = require("./internal/operators/mergeWith");
var _min = require("./internal/operators/min");
var _multicast = require("./internal/operators/multicast");
var _observeOn = require("./internal/operators/observeOn");
var _onErrorResumeNextWith = require("./internal/operators/onErrorResumeNextWith");
var _pairwise = require("./internal/operators/pairwise");
var _pluck = require("./internal/operators/pluck");
var _publish = require("./internal/operators/publish");
var _publishBehavior = require("./internal/operators/publishBehavior");
var _publishLast = require("./internal/operators/publishLast");
var _publishReplay = require("./internal/operators/publishReplay");
var _raceWith = require("./internal/operators/raceWith");
var _reduce = require("./internal/operators/reduce");
var _repeat = require("./internal/operators/repeat");
var _repeatWhen = require("./internal/operators/repeatWhen");
var _retry = require("./internal/operators/retry");
var _retryWhen = require("./internal/operators/retryWhen");
var _refCount = require("./internal/operators/refCount");
var _sample = require("./internal/operators/sample");
var _sampleTime = require("./internal/operators/sampleTime");
var _scan = require("./internal/operators/scan");
var _sequenceEqual = require("./internal/operators/sequenceEqual");
var _share = require("./internal/operators/share");
var _shareReplay = require("./internal/operators/shareReplay");
var _single = require("./internal/operators/single");
var _skip = require("./internal/operators/skip");
var _skipLast = require("./internal/operators/skipLast");
var _skipUntil = require("./internal/operators/skipUntil");
var _skipWhile = require("./internal/operators/skipWhile");
var _startWith = require("./internal/operators/startWith");
var _subscribeOn = require("./internal/operators/subscribeOn");
var _switchAll = require("./internal/operators/switchAll");
var _switchMap = require("./internal/operators/switchMap");
var _switchMapTo = require("./internal/operators/switchMapTo");
var _switchScan = require("./internal/operators/switchScan");
var _take = require("./internal/operators/take");
var _takeLast = require("./internal/operators/takeLast");
var _takeUntil = require("./internal/operators/takeUntil");
var _takeWhile = require("./internal/operators/takeWhile");
var _tap = require("./internal/operators/tap");
var _throttle = require("./internal/operators/throttle");
var _throttleTime = require("./internal/operators/throttleTime");
var _throwIfEmpty = require("./internal/operators/throwIfEmpty");
var _timeInterval = require("./internal/operators/timeInterval");
var _timeoutWith = require("./internal/operators/timeoutWith");
var _timestamp = require("./internal/operators/timestamp");
var _toArray = require("./internal/operators/toArray");
var _window = require("./internal/operators/window");
var _windowCount = require("./internal/operators/windowCount");
var _windowTime = require("./internal/operators/windowTime");
var _windowToggle = require("./internal/operators/windowToggle");
var _windowWhen = require("./internal/operators/windowWhen");
var _withLatestFrom = require("./internal/operators/withLatestFrom");
var _zipAll = require("./internal/operators/zipAll");
var _zipWith = require("./internal/operators/zipWith");

},{"./internal/AsyncSubject":5,"./internal/BehaviorSubject":6,"./internal/Notification":7,"./internal/Observable":9,"./internal/ReplaySubject":10,"./internal/Scheduler":11,"./internal/Subject":12,"./internal/Subscriber":13,"./internal/Subscription":14,"./internal/config":15,"./internal/firstValueFrom":16,"./internal/lastValueFrom":17,"./internal/observable/ConnectableObservable":18,"./internal/observable/bindCallback":19,"./internal/observable/bindNodeCallback":21,"./internal/observable/combineLatest":22,"./internal/observable/concat":23,"./internal/observable/connectable":24,"./internal/observable/defer":25,"./internal/observable/dom/animationFrames":26,"./internal/observable/empty":27,"./internal/observable/forkJoin":28,"./internal/observable/from":29,"./internal/observable/fromEvent":30,"./internal/observable/fromEventPattern":31,"./internal/observable/generate":33,"./internal/observable/iif":34,"./internal/observable/interval":36,"./internal/observable/merge":37,"./internal/observable/never":38,"./internal/observable/of":39,"./internal/observable/onErrorResumeNext":40,"./internal/observable/pairs":41,"./internal/observable/partition":42,"./internal/observable/race":43,"./internal/observable/range":44,"./internal/observable/throwError":45,"./internal/observable/timer":46,"./internal/observable/using":47,"./internal/observable/zip":48,"./internal/operators/audit":50,"./internal/operators/auditTime":51,"./internal/operators/buffer":52,"./internal/operators/bufferCount":53,"./internal/operators/bufferTime":54,"./internal/operators/bufferToggle":55,"./internal/operators/bufferWhen":56,"./internal/operators/catchError":57,"./internal/operators/combineAll":58,"./internal/operators/combineLatestAll":60,"./internal/operators/combineLatestWith":61,"./internal/operators/concatAll":63,"./internal/operators/concatMap":64,"./internal/operators/concatMapTo":65,"./internal/operators/concatWith":66,"./internal/operators/connect":67,"./internal/operators/count":68,"./internal/operators/debounce":69,"./internal/operators/debounceTime":70,"./internal/operators/defaultIfEmpty":71,"./internal/operators/delay":72,"./internal/operators/delayWhen":73,"./internal/operators/dematerialize":74,"./internal/operators/distinct":75,"./internal/operators/distinctUntilChanged":76,"./internal/operators/distinctUntilKeyChanged":77,"./internal/operators/elementAt":78,"./internal/operators/endWith":79,"./internal/operators/every":80,"./internal/operators/exhaust":81,"./internal/operators/exhaustAll":82,"./internal/operators/exhaustMap":83,"./internal/operators/expand":84,"./internal/operators/filter":85,"./internal/operators/finalize":86,"./internal/operators/find":87,"./internal/operators/findIndex":88,"./internal/operators/first":89,"./internal/operators/flatMap":90,"./internal/operators/groupBy":91,"./internal/operators/ignoreElements":92,"./internal/operators/isEmpty":93,"./internal/operators/last":95,"./internal/operators/map":96,"./internal/operators/mapTo":97,"./internal/operators/materialize":98,"./internal/operators/max":99,"./internal/operators/mergeAll":101,"./internal/operators/mergeMap":103,"./internal/operators/mergeMapTo":104,"./internal/operators/mergeScan":105,"./internal/operators/mergeWith":106,"./internal/operators/min":107,"./internal/operators/multicast":108,"./internal/operators/observeOn":109,"./internal/operators/onErrorResumeNextWith":110,"./internal/operators/pairwise":111,"./internal/operators/pluck":112,"./internal/operators/publish":113,"./internal/operators/publishBehavior":114,"./internal/operators/publishLast":115,"./internal/operators/publishReplay":116,"./internal/operators/raceWith":117,"./internal/operators/reduce":118,"./internal/operators/refCount":119,"./internal/operators/repeat":120,"./internal/operators/repeatWhen":121,"./internal/operators/retry":122,"./internal/operators/retryWhen":123,"./internal/operators/sample":124,"./internal/operators/sampleTime":125,"./internal/operators/scan":126,"./internal/operators/sequenceEqual":128,"./internal/operators/share":129,"./internal/operators/shareReplay":130,"./internal/operators/single":131,"./internal/operators/skip":132,"./internal/operators/skipLast":133,"./internal/operators/skipUntil":134,"./internal/operators/skipWhile":135,"./internal/operators/startWith":136,"./internal/operators/subscribeOn":137,"./internal/operators/switchAll":138,"./internal/operators/switchMap":139,"./internal/operators/switchMapTo":140,"./internal/operators/switchScan":141,"./internal/operators/take":142,"./internal/operators/takeLast":143,"./internal/operators/takeUntil":144,"./internal/operators/takeWhile":145,"./internal/operators/tap":146,"./internal/operators/throttle":147,"./internal/operators/throttleTime":148,"./internal/operators/throwIfEmpty":149,"./internal/operators/timeInterval":150,"./internal/operators/timeout":151,"./internal/operators/timeoutWith":152,"./internal/operators/timestamp":153,"./internal/operators/toArray":154,"./internal/operators/window":155,"./internal/operators/windowCount":156,"./internal/operators/windowTime":157,"./internal/operators/windowToggle":158,"./internal/operators/windowWhen":159,"./internal/operators/withLatestFrom":160,"./internal/operators/zipAll":162,"./internal/operators/zipWith":163,"./internal/scheduled/scheduled":170,"./internal/scheduler/VirtualTimeScheduler":180,"./internal/scheduler/animationFrame":181,"./internal/scheduler/asap":183,"./internal/scheduler/async":184,"./internal/scheduler/queue":189,"./internal/symbol/observable":192,"./internal/types":193,"./internal/util/ArgumentOutOfRangeError":194,"./internal/util/EmptyError":195,"./internal/util/NotFoundError":197,"./internal/util/ObjectUnsubscribedError":198,"./internal/util/SequenceError":199,"./internal/util/UnsubscriptionError":200,"./internal/util/identity":209,"./internal/util/isObservable":216,"./internal/util/noop":222,"./internal/util/pipe":224}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsyncSubject = void 0;
var _tslib = require("tslib");
var _Subject = require("./Subject");
var AsyncSubject = exports.AsyncSubject = function (_super) {
  (0, _tslib.__extends)(AsyncSubject, _super);
  function AsyncSubject() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this._value = null;
    _this._hasValue = false;
    _this._isComplete = false;
    return _this;
  }
  AsyncSubject.prototype._checkFinalizedStatuses = function (subscriber) {
    var _a = this,
      hasError = _a.hasError,
      _hasValue = _a._hasValue,
      _value = _a._value,
      thrownError = _a.thrownError,
      isStopped = _a.isStopped,
      _isComplete = _a._isComplete;
    if (hasError) {
      subscriber.error(thrownError);
    } else if (isStopped || _isComplete) {
      _hasValue && subscriber.next(_value);
      subscriber.complete();
    }
  };
  AsyncSubject.prototype.next = function (value) {
    if (!this.isStopped) {
      this._value = value;
      this._hasValue = true;
    }
  };
  AsyncSubject.prototype.complete = function () {
    var _a = this,
      _hasValue = _a._hasValue,
      _value = _a._value,
      _isComplete = _a._isComplete;
    if (!_isComplete) {
      this._isComplete = true;
      _hasValue && _super.prototype.next.call(this, _value);
      _super.prototype.complete.call(this);
    }
  };
  return AsyncSubject;
}(_Subject.Subject);

},{"./Subject":12,"tslib":227}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BehaviorSubject = void 0;
var _tslib = require("tslib");
var _Subject = require("./Subject");
var BehaviorSubject = exports.BehaviorSubject = function (_super) {
  (0, _tslib.__extends)(BehaviorSubject, _super);
  function BehaviorSubject(_value) {
    var _this = _super.call(this) || this;
    _this._value = _value;
    return _this;
  }
  Object.defineProperty(BehaviorSubject.prototype, "value", {
    get: function () {
      return this.getValue();
    },
    enumerable: false,
    configurable: true
  });
  BehaviorSubject.prototype._subscribe = function (subscriber) {
    var subscription = _super.prototype._subscribe.call(this, subscriber);
    !subscription.closed && subscriber.next(this._value);
    return subscription;
  };
  BehaviorSubject.prototype.getValue = function () {
    var _a = this,
      hasError = _a.hasError,
      thrownError = _a.thrownError,
      _value = _a._value;
    if (hasError) {
      throw thrownError;
    }
    this._throwIfClosed();
    return _value;
  };
  BehaviorSubject.prototype.next = function (value) {
    _super.prototype.next.call(this, this._value = value);
  };
  return BehaviorSubject;
}(_Subject.Subject);

},{"./Subject":12,"tslib":227}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotificationKind = exports.Notification = void 0;
exports.observeNotification = observeNotification;
var _empty = require("./observable/empty");
var _of = require("./observable/of");
var _throwError = require("./observable/throwError");
var _isFunction = require("./util/isFunction");
var NotificationKind;
(function (NotificationKind) {
  NotificationKind["NEXT"] = "N";
  NotificationKind["ERROR"] = "E";
  NotificationKind["COMPLETE"] = "C";
})(NotificationKind || (exports.NotificationKind = NotificationKind = {}));
var Notification = exports.Notification = function () {
  function Notification(kind, value, error) {
    this.kind = kind;
    this.value = value;
    this.error = error;
    this.hasValue = kind === 'N';
  }
  Notification.prototype.observe = function (observer) {
    return observeNotification(this, observer);
  };
  Notification.prototype.do = function (nextHandler, errorHandler, completeHandler) {
    var _a = this,
      kind = _a.kind,
      value = _a.value,
      error = _a.error;
    return kind === 'N' ? nextHandler === null || nextHandler === void 0 ? void 0 : nextHandler(value) : kind === 'E' ? errorHandler === null || errorHandler === void 0 ? void 0 : errorHandler(error) : completeHandler === null || completeHandler === void 0 ? void 0 : completeHandler();
  };
  Notification.prototype.accept = function (nextOrObserver, error, complete) {
    var _a;
    return (0, _isFunction.isFunction)((_a = nextOrObserver) === null || _a === void 0 ? void 0 : _a.next) ? this.observe(nextOrObserver) : this.do(nextOrObserver, error, complete);
  };
  Notification.prototype.toObservable = function () {
    var _a = this,
      kind = _a.kind,
      value = _a.value,
      error = _a.error;
    var result = kind === 'N' ? (0, _of.of)(value) : kind === 'E' ? (0, _throwError.throwError)(function () {
      return error;
    }) : kind === 'C' ? _empty.EMPTY : 0;
    if (!result) {
      throw new TypeError("Unexpected notification kind " + kind);
    }
    return result;
  };
  Notification.createNext = function (value) {
    return new Notification('N', value);
  };
  Notification.createError = function (err) {
    return new Notification('E', undefined, err);
  };
  Notification.createComplete = function () {
    return Notification.completeNotification;
  };
  Notification.completeNotification = new Notification('C');
  return Notification;
}();
function observeNotification(notification, observer) {
  var _a, _b, _c;
  var _d = notification,
    kind = _d.kind,
    value = _d.value,
    error = _d.error;
  if (typeof kind !== 'string') {
    throw new TypeError('Invalid notification, missing "kind"');
  }
  kind === 'N' ? (_a = observer.next) === null || _a === void 0 ? void 0 : _a.call(observer, value) : kind === 'E' ? (_b = observer.error) === null || _b === void 0 ? void 0 : _b.call(observer, error) : (_c = observer.complete) === null || _c === void 0 ? void 0 : _c.call(observer);
}

},{"./observable/empty":27,"./observable/of":39,"./observable/throwError":45,"./util/isFunction":213}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.COMPLETE_NOTIFICATION = void 0;
exports.createNotification = createNotification;
exports.errorNotification = errorNotification;
exports.nextNotification = nextNotification;
var COMPLETE_NOTIFICATION = exports.COMPLETE_NOTIFICATION = function () {
  return createNotification('C', undefined, undefined);
}();
function errorNotification(error) {
  return createNotification('E', undefined, error);
}
function nextNotification(value) {
  return createNotification('N', value, undefined);
}
function createNotification(kind, value, error) {
  return {
    kind: kind,
    value: value,
    error: error
  };
}

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Observable = void 0;
var _Subscriber = require("./Subscriber");
var _Subscription = require("./Subscription");
var _observable = require("./symbol/observable");
var _pipe = require("./util/pipe");
var _config = require("./config");
var _isFunction = require("./util/isFunction");
var _errorContext = require("./util/errorContext");
var Observable = exports.Observable = function () {
  function Observable(subscribe) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }
  Observable.prototype.lift = function (operator) {
    var observable = new Observable();
    observable.source = this;
    observable.operator = operator;
    return observable;
  };
  Observable.prototype.subscribe = function (observerOrNext, error, complete) {
    var _this = this;
    var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new _Subscriber.SafeSubscriber(observerOrNext, error, complete);
    (0, _errorContext.errorContext)(function () {
      var _a = _this,
        operator = _a.operator,
        source = _a.source;
      subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
    });
    return subscriber;
  };
  Observable.prototype._trySubscribe = function (sink) {
    try {
      return this._subscribe(sink);
    } catch (err) {
      sink.error(err);
    }
  };
  Observable.prototype.forEach = function (next, promiseCtor) {
    var _this = this;
    promiseCtor = getPromiseCtor(promiseCtor);
    return new promiseCtor(function (resolve, reject) {
      var subscriber = new _Subscriber.SafeSubscriber({
        next: function (value) {
          try {
            next(value);
          } catch (err) {
            reject(err);
            subscriber.unsubscribe();
          }
        },
        error: reject,
        complete: resolve
      });
      _this.subscribe(subscriber);
    });
  };
  Observable.prototype._subscribe = function (subscriber) {
    var _a;
    return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
  };
  Observable.prototype[_observable.observable] = function () {
    return this;
  };
  Observable.prototype.pipe = function () {
    var operations = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      operations[_i] = arguments[_i];
    }
    return (0, _pipe.pipeFromArray)(operations)(this);
  };
  Observable.prototype.toPromise = function (promiseCtor) {
    var _this = this;
    promiseCtor = getPromiseCtor(promiseCtor);
    return new promiseCtor(function (resolve, reject) {
      var value;
      _this.subscribe(function (x) {
        return value = x;
      }, function (err) {
        return reject(err);
      }, function () {
        return resolve(value);
      });
    });
  };
  Observable.create = function (subscribe) {
    return new Observable(subscribe);
  };
  return Observable;
}();
function getPromiseCtor(promiseCtor) {
  var _a;
  return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : _config.config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
  return value && (0, _isFunction.isFunction)(value.next) && (0, _isFunction.isFunction)(value.error) && (0, _isFunction.isFunction)(value.complete);
}
function isSubscriber(value) {
  return value && value instanceof _Subscriber.Subscriber || isObserver(value) && (0, _Subscription.isSubscription)(value);
}

},{"./Subscriber":13,"./Subscription":14,"./config":15,"./symbol/observable":192,"./util/errorContext":207,"./util/isFunction":213,"./util/pipe":224}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ReplaySubject = void 0;
var _tslib = require("tslib");
var _Subject = require("./Subject");
var _dateTimestampProvider = require("./scheduler/dateTimestampProvider");
var ReplaySubject = exports.ReplaySubject = function (_super) {
  (0, _tslib.__extends)(ReplaySubject, _super);
  function ReplaySubject(_bufferSize, _windowTime, _timestampProvider) {
    if (_bufferSize === void 0) {
      _bufferSize = Infinity;
    }
    if (_windowTime === void 0) {
      _windowTime = Infinity;
    }
    if (_timestampProvider === void 0) {
      _timestampProvider = _dateTimestampProvider.dateTimestampProvider;
    }
    var _this = _super.call(this) || this;
    _this._bufferSize = _bufferSize;
    _this._windowTime = _windowTime;
    _this._timestampProvider = _timestampProvider;
    _this._buffer = [];
    _this._infiniteTimeWindow = true;
    _this._infiniteTimeWindow = _windowTime === Infinity;
    _this._bufferSize = Math.max(1, _bufferSize);
    _this._windowTime = Math.max(1, _windowTime);
    return _this;
  }
  ReplaySubject.prototype.next = function (value) {
    var _a = this,
      isStopped = _a.isStopped,
      _buffer = _a._buffer,
      _infiniteTimeWindow = _a._infiniteTimeWindow,
      _timestampProvider = _a._timestampProvider,
      _windowTime = _a._windowTime;
    if (!isStopped) {
      _buffer.push(value);
      !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
    }
    this._trimBuffer();
    _super.prototype.next.call(this, value);
  };
  ReplaySubject.prototype._subscribe = function (subscriber) {
    this._throwIfClosed();
    this._trimBuffer();
    var subscription = this._innerSubscribe(subscriber);
    var _a = this,
      _infiniteTimeWindow = _a._infiniteTimeWindow,
      _buffer = _a._buffer;
    var copy = _buffer.slice();
    for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
      subscriber.next(copy[i]);
    }
    this._checkFinalizedStatuses(subscriber);
    return subscription;
  };
  ReplaySubject.prototype._trimBuffer = function () {
    var _a = this,
      _bufferSize = _a._bufferSize,
      _timestampProvider = _a._timestampProvider,
      _buffer = _a._buffer,
      _infiniteTimeWindow = _a._infiniteTimeWindow;
    var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
    _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
    if (!_infiniteTimeWindow) {
      var now = _timestampProvider.now();
      var last = 0;
      for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
        last = i;
      }
      last && _buffer.splice(0, last + 1);
    }
  };
  return ReplaySubject;
}(_Subject.Subject);

},{"./Subject":12,"./scheduler/dateTimestampProvider":185,"tslib":227}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Scheduler = void 0;
var _dateTimestampProvider = require("./scheduler/dateTimestampProvider");
var Scheduler = exports.Scheduler = function () {
  function Scheduler(schedulerActionCtor, now) {
    if (now === void 0) {
      now = Scheduler.now;
    }
    this.schedulerActionCtor = schedulerActionCtor;
    this.now = now;
  }
  Scheduler.prototype.schedule = function (work, delay, state) {
    if (delay === void 0) {
      delay = 0;
    }
    return new this.schedulerActionCtor(this, work).schedule(state, delay);
  };
  Scheduler.now = _dateTimestampProvider.dateTimestampProvider.now;
  return Scheduler;
}();

},{"./scheduler/dateTimestampProvider":185}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Subject = exports.AnonymousSubject = void 0;
var _tslib = require("tslib");
var _Observable = require("./Observable");
var _Subscription = require("./Subscription");
var _ObjectUnsubscribedError = require("./util/ObjectUnsubscribedError");
var _arrRemove = require("./util/arrRemove");
var _errorContext = require("./util/errorContext");
var Subject = exports.Subject = function (_super) {
  (0, _tslib.__extends)(Subject, _super);
  function Subject() {
    var _this = _super.call(this) || this;
    _this.closed = false;
    _this.currentObservers = null;
    _this.observers = [];
    _this.isStopped = false;
    _this.hasError = false;
    _this.thrownError = null;
    return _this;
  }
  Subject.prototype.lift = function (operator) {
    var subject = new AnonymousSubject(this, this);
    subject.operator = operator;
    return subject;
  };
  Subject.prototype._throwIfClosed = function () {
    if (this.closed) {
      throw new _ObjectUnsubscribedError.ObjectUnsubscribedError();
    }
  };
  Subject.prototype.next = function (value) {
    var _this = this;
    (0, _errorContext.errorContext)(function () {
      var e_1, _a;
      _this._throwIfClosed();
      if (!_this.isStopped) {
        if (!_this.currentObservers) {
          _this.currentObservers = Array.from(_this.observers);
        }
        try {
          for (var _b = (0, _tslib.__values)(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
            var observer = _c.value;
            observer.next(value);
          }
        } catch (e_1_1) {
          e_1 = {
            error: e_1_1
          };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      }
    });
  };
  Subject.prototype.error = function (err) {
    var _this = this;
    (0, _errorContext.errorContext)(function () {
      _this._throwIfClosed();
      if (!_this.isStopped) {
        _this.hasError = _this.isStopped = true;
        _this.thrownError = err;
        var observers = _this.observers;
        while (observers.length) {
          observers.shift().error(err);
        }
      }
    });
  };
  Subject.prototype.complete = function () {
    var _this = this;
    (0, _errorContext.errorContext)(function () {
      _this._throwIfClosed();
      if (!_this.isStopped) {
        _this.isStopped = true;
        var observers = _this.observers;
        while (observers.length) {
          observers.shift().complete();
        }
      }
    });
  };
  Subject.prototype.unsubscribe = function () {
    this.isStopped = this.closed = true;
    this.observers = this.currentObservers = null;
  };
  Object.defineProperty(Subject.prototype, "observed", {
    get: function () {
      var _a;
      return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
    },
    enumerable: false,
    configurable: true
  });
  Subject.prototype._trySubscribe = function (subscriber) {
    this._throwIfClosed();
    return _super.prototype._trySubscribe.call(this, subscriber);
  };
  Subject.prototype._subscribe = function (subscriber) {
    this._throwIfClosed();
    this._checkFinalizedStatuses(subscriber);
    return this._innerSubscribe(subscriber);
  };
  Subject.prototype._innerSubscribe = function (subscriber) {
    var _this = this;
    var _a = this,
      hasError = _a.hasError,
      isStopped = _a.isStopped,
      observers = _a.observers;
    if (hasError || isStopped) {
      return _Subscription.EMPTY_SUBSCRIPTION;
    }
    this.currentObservers = null;
    observers.push(subscriber);
    return new _Subscription.Subscription(function () {
      _this.currentObservers = null;
      (0, _arrRemove.arrRemove)(observers, subscriber);
    });
  };
  Subject.prototype._checkFinalizedStatuses = function (subscriber) {
    var _a = this,
      hasError = _a.hasError,
      thrownError = _a.thrownError,
      isStopped = _a.isStopped;
    if (hasError) {
      subscriber.error(thrownError);
    } else if (isStopped) {
      subscriber.complete();
    }
  };
  Subject.prototype.asObservable = function () {
    var observable = new _Observable.Observable();
    observable.source = this;
    return observable;
  };
  Subject.create = function (destination, source) {
    return new AnonymousSubject(destination, source);
  };
  return Subject;
}(_Observable.Observable);
var AnonymousSubject = exports.AnonymousSubject = function (_super) {
  (0, _tslib.__extends)(AnonymousSubject, _super);
  function AnonymousSubject(destination, source) {
    var _this = _super.call(this) || this;
    _this.destination = destination;
    _this.source = source;
    return _this;
  }
  AnonymousSubject.prototype.next = function (value) {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
  };
  AnonymousSubject.prototype.error = function (err) {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
  };
  AnonymousSubject.prototype.complete = function () {
    var _a, _b;
    (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
  };
  AnonymousSubject.prototype._subscribe = function (subscriber) {
    var _a, _b;
    return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : _Subscription.EMPTY_SUBSCRIPTION;
  };
  return AnonymousSubject;
}(Subject);

},{"./Observable":9,"./Subscription":14,"./util/ObjectUnsubscribedError":198,"./util/arrRemove":204,"./util/errorContext":207,"tslib":227}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Subscriber = exports.SafeSubscriber = exports.EMPTY_OBSERVER = void 0;
var _tslib = require("tslib");
var _isFunction = require("./util/isFunction");
var _Subscription = require("./Subscription");
var _config = require("./config");
var _reportUnhandledError = require("./util/reportUnhandledError");
var _noop = require("./util/noop");
var _NotificationFactories = require("./NotificationFactories");
var _timeoutProvider = require("./scheduler/timeoutProvider");
var _errorContext = require("./util/errorContext");
var Subscriber = exports.Subscriber = function (_super) {
  (0, _tslib.__extends)(Subscriber, _super);
  function Subscriber(destination) {
    var _this = _super.call(this) || this;
    _this.isStopped = false;
    if (destination) {
      _this.destination = destination;
      if ((0, _Subscription.isSubscription)(destination)) {
        destination.add(_this);
      }
    } else {
      _this.destination = EMPTY_OBSERVER;
    }
    return _this;
  }
  Subscriber.create = function (next, error, complete) {
    return new SafeSubscriber(next, error, complete);
  };
  Subscriber.prototype.next = function (value) {
    if (this.isStopped) {
      handleStoppedNotification((0, _NotificationFactories.nextNotification)(value), this);
    } else {
      this._next(value);
    }
  };
  Subscriber.prototype.error = function (err) {
    if (this.isStopped) {
      handleStoppedNotification((0, _NotificationFactories.errorNotification)(err), this);
    } else {
      this.isStopped = true;
      this._error(err);
    }
  };
  Subscriber.prototype.complete = function () {
    if (this.isStopped) {
      handleStoppedNotification(_NotificationFactories.COMPLETE_NOTIFICATION, this);
    } else {
      this.isStopped = true;
      this._complete();
    }
  };
  Subscriber.prototype.unsubscribe = function () {
    if (!this.closed) {
      this.isStopped = true;
      _super.prototype.unsubscribe.call(this);
      this.destination = null;
    }
  };
  Subscriber.prototype._next = function (value) {
    this.destination.next(value);
  };
  Subscriber.prototype._error = function (err) {
    try {
      this.destination.error(err);
    } finally {
      this.unsubscribe();
    }
  };
  Subscriber.prototype._complete = function () {
    try {
      this.destination.complete();
    } finally {
      this.unsubscribe();
    }
  };
  return Subscriber;
}(_Subscription.Subscription);
var _bind = Function.prototype.bind;
function bind(fn, thisArg) {
  return _bind.call(fn, thisArg);
}
var ConsumerObserver = function () {
  function ConsumerObserver(partialObserver) {
    this.partialObserver = partialObserver;
  }
  ConsumerObserver.prototype.next = function (value) {
    var partialObserver = this.partialObserver;
    if (partialObserver.next) {
      try {
        partialObserver.next(value);
      } catch (error) {
        handleUnhandledError(error);
      }
    }
  };
  ConsumerObserver.prototype.error = function (err) {
    var partialObserver = this.partialObserver;
    if (partialObserver.error) {
      try {
        partialObserver.error(err);
      } catch (error) {
        handleUnhandledError(error);
      }
    } else {
      handleUnhandledError(err);
    }
  };
  ConsumerObserver.prototype.complete = function () {
    var partialObserver = this.partialObserver;
    if (partialObserver.complete) {
      try {
        partialObserver.complete();
      } catch (error) {
        handleUnhandledError(error);
      }
    }
  };
  return ConsumerObserver;
}();
var SafeSubscriber = exports.SafeSubscriber = function (_super) {
  (0, _tslib.__extends)(SafeSubscriber, _super);
  function SafeSubscriber(observerOrNext, error, complete) {
    var _this = _super.call(this) || this;
    var partialObserver;
    if ((0, _isFunction.isFunction)(observerOrNext) || !observerOrNext) {
      partialObserver = {
        next: observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : undefined,
        error: error !== null && error !== void 0 ? error : undefined,
        complete: complete !== null && complete !== void 0 ? complete : undefined
      };
    } else {
      var context_1;
      if (_this && _config.config.useDeprecatedNextContext) {
        context_1 = Object.create(observerOrNext);
        context_1.unsubscribe = function () {
          return _this.unsubscribe();
        };
        partialObserver = {
          next: observerOrNext.next && bind(observerOrNext.next, context_1),
          error: observerOrNext.error && bind(observerOrNext.error, context_1),
          complete: observerOrNext.complete && bind(observerOrNext.complete, context_1)
        };
      } else {
        partialObserver = observerOrNext;
      }
    }
    _this.destination = new ConsumerObserver(partialObserver);
    return _this;
  }
  return SafeSubscriber;
}(Subscriber);
function handleUnhandledError(error) {
  if (_config.config.useDeprecatedSynchronousErrorHandling) {
    (0, _errorContext.captureError)(error);
  } else {
    (0, _reportUnhandledError.reportUnhandledError)(error);
  }
}
function defaultErrorHandler(err) {
  throw err;
}
function handleStoppedNotification(notification, subscriber) {
  var onStoppedNotification = _config.config.onStoppedNotification;
  onStoppedNotification && _timeoutProvider.timeoutProvider.setTimeout(function () {
    return onStoppedNotification(notification, subscriber);
  });
}
var EMPTY_OBSERVER = exports.EMPTY_OBSERVER = {
  closed: true,
  next: _noop.noop,
  error: defaultErrorHandler,
  complete: _noop.noop
};

},{"./NotificationFactories":8,"./Subscription":14,"./config":15,"./scheduler/timeoutProvider":190,"./util/errorContext":207,"./util/isFunction":213,"./util/noop":222,"./util/reportUnhandledError":225,"tslib":227}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Subscription = exports.EMPTY_SUBSCRIPTION = void 0;
exports.isSubscription = isSubscription;
var _tslib = require("tslib");
var _isFunction = require("./util/isFunction");
var _UnsubscriptionError = require("./util/UnsubscriptionError");
var _arrRemove = require("./util/arrRemove");
var Subscription = exports.Subscription = function () {
  function Subscription(initialTeardown) {
    this.initialTeardown = initialTeardown;
    this.closed = false;
    this._parentage = null;
    this._finalizers = null;
  }
  Subscription.prototype.unsubscribe = function () {
    var e_1, _a, e_2, _b;
    var errors;
    if (!this.closed) {
      this.closed = true;
      var _parentage = this._parentage;
      if (_parentage) {
        this._parentage = null;
        if (Array.isArray(_parentage)) {
          try {
            for (var _parentage_1 = (0, _tslib.__values)(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
              var parent_1 = _parentage_1_1.value;
              parent_1.remove(this);
            }
          } catch (e_1_1) {
            e_1 = {
              error: e_1_1
            };
          } finally {
            try {
              if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
        } else {
          _parentage.remove(this);
        }
      }
      var initialFinalizer = this.initialTeardown;
      if ((0, _isFunction.isFunction)(initialFinalizer)) {
        try {
          initialFinalizer();
        } catch (e) {
          errors = e instanceof _UnsubscriptionError.UnsubscriptionError ? e.errors : [e];
        }
      }
      var _finalizers = this._finalizers;
      if (_finalizers) {
        this._finalizers = null;
        try {
          for (var _finalizers_1 = (0, _tslib.__values)(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
            var finalizer = _finalizers_1_1.value;
            try {
              execFinalizer(finalizer);
            } catch (err) {
              errors = errors !== null && errors !== void 0 ? errors : [];
              if (err instanceof _UnsubscriptionError.UnsubscriptionError) {
                errors = (0, _tslib.__spreadArray)((0, _tslib.__spreadArray)([], (0, _tslib.__read)(errors)), (0, _tslib.__read)(err.errors));
              } else {
                errors.push(err);
              }
            }
          }
        } catch (e_2_1) {
          e_2 = {
            error: e_2_1
          };
        } finally {
          try {
            if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
      }
      if (errors) {
        throw new _UnsubscriptionError.UnsubscriptionError(errors);
      }
    }
  };
  Subscription.prototype.add = function (teardown) {
    var _a;
    if (teardown && teardown !== this) {
      if (this.closed) {
        execFinalizer(teardown);
      } else {
        if (teardown instanceof Subscription) {
          if (teardown.closed || teardown._hasParent(this)) {
            return;
          }
          teardown._addParent(this);
        }
        (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
      }
    }
  };
  Subscription.prototype._hasParent = function (parent) {
    var _parentage = this._parentage;
    return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
  };
  Subscription.prototype._addParent = function (parent) {
    var _parentage = this._parentage;
    this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
  };
  Subscription.prototype._removeParent = function (parent) {
    var _parentage = this._parentage;
    if (_parentage === parent) {
      this._parentage = null;
    } else if (Array.isArray(_parentage)) {
      (0, _arrRemove.arrRemove)(_parentage, parent);
    }
  };
  Subscription.prototype.remove = function (teardown) {
    var _finalizers = this._finalizers;
    _finalizers && (0, _arrRemove.arrRemove)(_finalizers, teardown);
    if (teardown instanceof Subscription) {
      teardown._removeParent(this);
    }
  };
  Subscription.EMPTY = function () {
    var empty = new Subscription();
    empty.closed = true;
    return empty;
  }();
  return Subscription;
}();
var EMPTY_SUBSCRIPTION = exports.EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(value) {
  return value instanceof Subscription || value && 'closed' in value && (0, _isFunction.isFunction)(value.remove) && (0, _isFunction.isFunction)(value.add) && (0, _isFunction.isFunction)(value.unsubscribe);
}
function execFinalizer(finalizer) {
  if ((0, _isFunction.isFunction)(finalizer)) {
    finalizer();
  } else {
    finalizer.unsubscribe();
  }
}

},{"./util/UnsubscriptionError":200,"./util/arrRemove":204,"./util/isFunction":213,"tslib":227}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = void 0;
var config = exports.config = {
  onUnhandledError: null,
  onStoppedNotification: null,
  Promise: undefined,
  useDeprecatedSynchronousErrorHandling: false,
  useDeprecatedNextContext: false
};

},{}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.firstValueFrom = firstValueFrom;
var _EmptyError = require("./util/EmptyError");
var _Subscriber = require("./Subscriber");
function firstValueFrom(source, config) {
  var hasConfig = typeof config === 'object';
  return new Promise(function (resolve, reject) {
    var subscriber = new _Subscriber.SafeSubscriber({
      next: function (value) {
        resolve(value);
        subscriber.unsubscribe();
      },
      error: reject,
      complete: function () {
        if (hasConfig) {
          resolve(config.defaultValue);
        } else {
          reject(new _EmptyError.EmptyError());
        }
      }
    });
    source.subscribe(subscriber);
  });
}

},{"./Subscriber":13,"./util/EmptyError":195}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.lastValueFrom = lastValueFrom;
var _EmptyError = require("./util/EmptyError");
function lastValueFrom(source, config) {
  var hasConfig = typeof config === 'object';
  return new Promise(function (resolve, reject) {
    var _hasValue = false;
    var _value;
    source.subscribe({
      next: function (value) {
        _value = value;
        _hasValue = true;
      },
      error: reject,
      complete: function () {
        if (_hasValue) {
          resolve(_value);
        } else if (hasConfig) {
          resolve(config.defaultValue);
        } else {
          reject(new _EmptyError.EmptyError());
        }
      }
    });
  });
}

},{"./util/EmptyError":195}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConnectableObservable = void 0;
var _tslib = require("tslib");
var _Observable = require("../Observable");
var _Subscription = require("../Subscription");
var _refCount = require("../operators/refCount");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
var _lift = require("../util/lift");
var ConnectableObservable = exports.ConnectableObservable = function (_super) {
  (0, _tslib.__extends)(ConnectableObservable, _super);
  function ConnectableObservable(source, subjectFactory) {
    var _this = _super.call(this) || this;
    _this.source = source;
    _this.subjectFactory = subjectFactory;
    _this._subject = null;
    _this._refCount = 0;
    _this._connection = null;
    if ((0, _lift.hasLift)(source)) {
      _this.lift = source.lift;
    }
    return _this;
  }
  ConnectableObservable.prototype._subscribe = function (subscriber) {
    return this.getSubject().subscribe(subscriber);
  };
  ConnectableObservable.prototype.getSubject = function () {
    var subject = this._subject;
    if (!subject || subject.isStopped) {
      this._subject = this.subjectFactory();
    }
    return this._subject;
  };
  ConnectableObservable.prototype._teardown = function () {
    this._refCount = 0;
    var _connection = this._connection;
    this._subject = this._connection = null;
    _connection === null || _connection === void 0 ? void 0 : _connection.unsubscribe();
  };
  ConnectableObservable.prototype.connect = function () {
    var _this = this;
    var connection = this._connection;
    if (!connection) {
      connection = this._connection = new _Subscription.Subscription();
      var subject_1 = this.getSubject();
      connection.add(this.source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subject_1, undefined, function () {
        _this._teardown();
        subject_1.complete();
      }, function (err) {
        _this._teardown();
        subject_1.error(err);
      }, function () {
        return _this._teardown();
      })));
      if (connection.closed) {
        this._connection = null;
        connection = _Subscription.Subscription.EMPTY;
      }
    }
    return connection;
  };
  ConnectableObservable.prototype.refCount = function () {
    return (0, _refCount.refCount)()(this);
  };
  return ConnectableObservable;
}(_Observable.Observable);

},{"../Observable":9,"../Subscription":14,"../operators/OperatorSubscriber":49,"../operators/refCount":119,"../util/lift":220,"tslib":227}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bindCallback = bindCallback;
var _bindCallbackInternals = require("./bindCallbackInternals");
function bindCallback(callbackFunc, resultSelector, scheduler) {
  return (0, _bindCallbackInternals.bindCallbackInternals)(false, callbackFunc, resultSelector, scheduler);
}

},{"./bindCallbackInternals":20}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bindCallbackInternals = bindCallbackInternals;
var _tslib = require("tslib");
var _isScheduler = require("../util/isScheduler");
var _Observable = require("../Observable");
var _subscribeOn = require("../operators/subscribeOn");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var _observeOn = require("../operators/observeOn");
var _AsyncSubject = require("../AsyncSubject");
function bindCallbackInternals(isNodeStyle, callbackFunc, resultSelector, scheduler) {
  if (resultSelector) {
    if ((0, _isScheduler.isScheduler)(resultSelector)) {
      scheduler = resultSelector;
    } else {
      return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return bindCallbackInternals(isNodeStyle, callbackFunc, scheduler).apply(this, args).pipe((0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector));
      };
    }
  }
  if (scheduler) {
    return function () {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return bindCallbackInternals(isNodeStyle, callbackFunc).apply(this, args).pipe((0, _subscribeOn.subscribeOn)(scheduler), (0, _observeOn.observeOn)(scheduler));
    };
  }
  return function () {
    var _this = this;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var subject = new _AsyncSubject.AsyncSubject();
    var uninitialized = true;
    return new _Observable.Observable(function (subscriber) {
      var subs = subject.subscribe(subscriber);
      if (uninitialized) {
        uninitialized = false;
        var isAsync_1 = false;
        var isComplete_1 = false;
        callbackFunc.apply(_this, (0, _tslib.__spreadArray)((0, _tslib.__spreadArray)([], (0, _tslib.__read)(args)), [function () {
          var results = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            results[_i] = arguments[_i];
          }
          if (isNodeStyle) {
            var err = results.shift();
            if (err != null) {
              subject.error(err);
              return;
            }
          }
          subject.next(1 < results.length ? results : results[0]);
          isComplete_1 = true;
          if (isAsync_1) {
            subject.complete();
          }
        }]));
        if (isComplete_1) {
          subject.complete();
        }
        isAsync_1 = true;
      }
      return subs;
    });
  };
}

},{"../AsyncSubject":5,"../Observable":9,"../operators/observeOn":109,"../operators/subscribeOn":137,"../util/isScheduler":219,"../util/mapOneOrManyArgs":221,"tslib":227}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bindNodeCallback = bindNodeCallback;
var _bindCallbackInternals = require("./bindCallbackInternals");
function bindNodeCallback(callbackFunc, resultSelector, scheduler) {
  return (0, _bindCallbackInternals.bindCallbackInternals)(true, callbackFunc, resultSelector, scheduler);
}

},{"./bindCallbackInternals":20}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineLatest = combineLatest;
exports.combineLatestInit = combineLatestInit;
var _Observable = require("../Observable");
var _argsArgArrayOrObject = require("../util/argsArgArrayOrObject");
var _from = require("./from");
var _identity = require("../util/identity");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var _args = require("../util/args");
var _createObject = require("../util/createObject");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
var _executeSchedule = require("../util/executeSchedule");
function combineLatest() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(args);
  var resultSelector = (0, _args.popResultSelector)(args);
  var _a = (0, _argsArgArrayOrObject.argsArgArrayOrObject)(args),
    observables = _a.args,
    keys = _a.keys;
  if (observables.length === 0) {
    return (0, _from.from)([], scheduler);
  }
  var result = new _Observable.Observable(combineLatestInit(observables, scheduler, keys ? function (values) {
    return (0, _createObject.createObject)(keys, values);
  } : _identity.identity));
  return resultSelector ? result.pipe((0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector)) : result;
}
function combineLatestInit(observables, scheduler, valueTransform) {
  if (valueTransform === void 0) {
    valueTransform = _identity.identity;
  }
  return function (subscriber) {
    maybeSchedule(scheduler, function () {
      var length = observables.length;
      var values = new Array(length);
      var active = length;
      var remainingFirstValues = length;
      var _loop_1 = function (i) {
        maybeSchedule(scheduler, function () {
          var source = (0, _from.from)(observables[i], scheduler);
          var hasFirstValue = false;
          source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
            values[i] = value;
            if (!hasFirstValue) {
              hasFirstValue = true;
              remainingFirstValues--;
            }
            if (!remainingFirstValues) {
              subscriber.next(valueTransform(values.slice()));
            }
          }, function () {
            if (! --active) {
              subscriber.complete();
            }
          }));
        }, subscriber);
      };
      for (var i = 0; i < length; i++) {
        _loop_1(i);
      }
    }, subscriber);
  };
}
function maybeSchedule(scheduler, execute, subscription) {
  if (scheduler) {
    (0, _executeSchedule.executeSchedule)(subscription, scheduler, execute);
  } else {
    execute();
  }
}

},{"../Observable":9,"../operators/OperatorSubscriber":49,"../util/args":201,"../util/argsArgArrayOrObject":202,"../util/createObject":206,"../util/executeSchedule":208,"../util/identity":209,"../util/mapOneOrManyArgs":221,"./from":29}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concat = concat;
var _concatAll = require("../operators/concatAll");
var _args = require("../util/args");
var _from = require("./from");
function concat() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  return (0, _concatAll.concatAll)()((0, _from.from)(args, (0, _args.popScheduler)(args)));
}

},{"../operators/concatAll":63,"../util/args":201,"./from":29}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.connectable = connectable;
var _Subject = require("../Subject");
var _Observable = require("../Observable");
var _defer = require("./defer");
var DEFAULT_CONFIG = {
  connector: function () {
    return new _Subject.Subject();
  },
  resetOnDisconnect: true
};
function connectable(source, config) {
  if (config === void 0) {
    config = DEFAULT_CONFIG;
  }
  var connection = null;
  var connector = config.connector,
    _a = config.resetOnDisconnect,
    resetOnDisconnect = _a === void 0 ? true : _a;
  var subject = connector();
  var result = new _Observable.Observable(function (subscriber) {
    return subject.subscribe(subscriber);
  });
  result.connect = function () {
    if (!connection || connection.closed) {
      connection = (0, _defer.defer)(function () {
        return source;
      }).subscribe(subject);
      if (resetOnDisconnect) {
        connection.add(function () {
          return subject = connector();
        });
      }
    }
    return connection;
  };
  return result;
}

},{"../Observable":9,"../Subject":12,"./defer":25}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defer = defer;
var _Observable = require("../Observable");
var _innerFrom = require("./innerFrom");
function defer(observableFactory) {
  return new _Observable.Observable(function (subscriber) {
    (0, _innerFrom.innerFrom)(observableFactory()).subscribe(subscriber);
  });
}

},{"../Observable":9,"./innerFrom":35}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.animationFrames = animationFrames;
var _Observable = require("../../Observable");
var _performanceTimestampProvider = require("../../scheduler/performanceTimestampProvider");
var _animationFrameProvider = require("../../scheduler/animationFrameProvider");
function animationFrames(timestampProvider) {
  return timestampProvider ? animationFramesFactory(timestampProvider) : DEFAULT_ANIMATION_FRAMES;
}
function animationFramesFactory(timestampProvider) {
  return new _Observable.Observable(function (subscriber) {
    var provider = timestampProvider || _performanceTimestampProvider.performanceTimestampProvider;
    var start = provider.now();
    var id = 0;
    var run = function () {
      if (!subscriber.closed) {
        id = _animationFrameProvider.animationFrameProvider.requestAnimationFrame(function (timestamp) {
          id = 0;
          var now = provider.now();
          subscriber.next({
            timestamp: timestampProvider ? now : timestamp,
            elapsed: now - start
          });
          run();
        });
      }
    };
    run();
    return function () {
      if (id) {
        _animationFrameProvider.animationFrameProvider.cancelAnimationFrame(id);
      }
    };
  });
}
var DEFAULT_ANIMATION_FRAMES = animationFramesFactory();

},{"../../Observable":9,"../../scheduler/animationFrameProvider":182,"../../scheduler/performanceTimestampProvider":188}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EMPTY = void 0;
exports.empty = empty;
var _Observable = require("../Observable");
var EMPTY = exports.EMPTY = new _Observable.Observable(function (subscriber) {
  return subscriber.complete();
});
function empty(scheduler) {
  return scheduler ? emptyScheduled(scheduler) : EMPTY;
}
function emptyScheduled(scheduler) {
  return new _Observable.Observable(function (subscriber) {
    return scheduler.schedule(function () {
      return subscriber.complete();
    });
  });
}

},{"../Observable":9}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forkJoin = forkJoin;
var _Observable = require("../Observable");
var _argsArgArrayOrObject = require("../util/argsArgArrayOrObject");
var _innerFrom = require("./innerFrom");
var _args = require("../util/args");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var _createObject = require("../util/createObject");
function forkJoin() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var resultSelector = (0, _args.popResultSelector)(args);
  var _a = (0, _argsArgArrayOrObject.argsArgArrayOrObject)(args),
    sources = _a.args,
    keys = _a.keys;
  var result = new _Observable.Observable(function (subscriber) {
    var length = sources.length;
    if (!length) {
      subscriber.complete();
      return;
    }
    var values = new Array(length);
    var remainingCompletions = length;
    var remainingEmissions = length;
    var _loop_1 = function (sourceIndex) {
      var hasValue = false;
      (0, _innerFrom.innerFrom)(sources[sourceIndex]).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
        if (!hasValue) {
          hasValue = true;
          remainingEmissions--;
        }
        values[sourceIndex] = value;
      }, function () {
        return remainingCompletions--;
      }, undefined, function () {
        if (!remainingCompletions || !hasValue) {
          if (!remainingEmissions) {
            subscriber.next(keys ? (0, _createObject.createObject)(keys, values) : values);
          }
          subscriber.complete();
        }
      }));
    };
    for (var sourceIndex = 0; sourceIndex < length; sourceIndex++) {
      _loop_1(sourceIndex);
    }
  });
  return resultSelector ? result.pipe((0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector)) : result;
}

},{"../Observable":9,"../operators/OperatorSubscriber":49,"../util/args":201,"../util/argsArgArrayOrObject":202,"../util/createObject":206,"../util/mapOneOrManyArgs":221,"./innerFrom":35}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.from = from;
var _scheduled = require("../scheduled/scheduled");
var _innerFrom = require("./innerFrom");
function from(input, scheduler) {
  return scheduler ? (0, _scheduled.scheduled)(input, scheduler) : (0, _innerFrom.innerFrom)(input);
}

},{"../scheduled/scheduled":170,"./innerFrom":35}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromEvent = fromEvent;
var _tslib = require("tslib");
var _innerFrom = require("../observable/innerFrom");
var _Observable = require("../Observable");
var _mergeMap = require("../operators/mergeMap");
var _isArrayLike = require("../util/isArrayLike");
var _isFunction = require("../util/isFunction");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var nodeEventEmitterMethods = ['addListener', 'removeListener'];
var eventTargetMethods = ['addEventListener', 'removeEventListener'];
var jqueryMethods = ['on', 'off'];
function fromEvent(target, eventName, options, resultSelector) {
  if ((0, _isFunction.isFunction)(options)) {
    resultSelector = options;
    options = undefined;
  }
  if (resultSelector) {
    return fromEvent(target, eventName, options).pipe((0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector));
  }
  var _a = (0, _tslib.__read)(isEventTarget(target) ? eventTargetMethods.map(function (methodName) {
      return function (handler) {
        return target[methodName](eventName, handler, options);
      };
    }) : isNodeStyleEventEmitter(target) ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName)) : isJQueryStyleEventEmitter(target) ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName)) : [], 2),
    add = _a[0],
    remove = _a[1];
  if (!add) {
    if ((0, _isArrayLike.isArrayLike)(target)) {
      return (0, _mergeMap.mergeMap)(function (subTarget) {
        return fromEvent(subTarget, eventName, options);
      })((0, _innerFrom.innerFrom)(target));
    }
  }
  if (!add) {
    throw new TypeError('Invalid event target');
  }
  return new _Observable.Observable(function (subscriber) {
    var handler = function () {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return subscriber.next(1 < args.length ? args : args[0]);
    };
    add(handler);
    return function () {
      return remove(handler);
    };
  });
}
function toCommonHandlerRegistry(target, eventName) {
  return function (methodName) {
    return function (handler) {
      return target[methodName](eventName, handler);
    };
  };
}
function isNodeStyleEventEmitter(target) {
  return (0, _isFunction.isFunction)(target.addListener) && (0, _isFunction.isFunction)(target.removeListener);
}
function isJQueryStyleEventEmitter(target) {
  return (0, _isFunction.isFunction)(target.on) && (0, _isFunction.isFunction)(target.off);
}
function isEventTarget(target) {
  return (0, _isFunction.isFunction)(target.addEventListener) && (0, _isFunction.isFunction)(target.removeEventListener);
}

},{"../Observable":9,"../observable/innerFrom":35,"../operators/mergeMap":103,"../util/isArrayLike":210,"../util/isFunction":213,"../util/mapOneOrManyArgs":221,"tslib":227}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromEventPattern = fromEventPattern;
var _Observable = require("../Observable");
var _isFunction = require("../util/isFunction");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
function fromEventPattern(addHandler, removeHandler, resultSelector) {
  if (resultSelector) {
    return fromEventPattern(addHandler, removeHandler).pipe((0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector));
  }
  return new _Observable.Observable(function (subscriber) {
    var handler = function () {
      var e = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        e[_i] = arguments[_i];
      }
      return subscriber.next(e.length === 1 ? e[0] : e);
    };
    var retValue = addHandler(handler);
    return (0, _isFunction.isFunction)(removeHandler) ? function () {
      return removeHandler(handler, retValue);
    } : undefined;
  });
}

},{"../Observable":9,"../util/isFunction":213,"../util/mapOneOrManyArgs":221}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromSubscribable = fromSubscribable;
var _Observable = require("../Observable");
function fromSubscribable(subscribable) {
  return new _Observable.Observable(function (subscriber) {
    return subscribable.subscribe(subscriber);
  });
}

},{"../Observable":9}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generate = generate;
var _tslib = require("tslib");
var _identity = require("../util/identity");
var _isScheduler = require("../util/isScheduler");
var _defer = require("./defer");
var _scheduleIterable = require("../scheduled/scheduleIterable");
function generate(initialStateOrOptions, condition, iterate, resultSelectorOrScheduler, scheduler) {
  var _a, _b;
  var resultSelector;
  var initialState;
  if (arguments.length === 1) {
    _a = initialStateOrOptions, initialState = _a.initialState, condition = _a.condition, iterate = _a.iterate, _b = _a.resultSelector, resultSelector = _b === void 0 ? _identity.identity : _b, scheduler = _a.scheduler;
  } else {
    initialState = initialStateOrOptions;
    if (!resultSelectorOrScheduler || (0, _isScheduler.isScheduler)(resultSelectorOrScheduler)) {
      resultSelector = _identity.identity;
      scheduler = resultSelectorOrScheduler;
    } else {
      resultSelector = resultSelectorOrScheduler;
    }
  }
  function gen() {
    var state;
    return (0, _tslib.__generator)(this, function (_a) {
      switch (_a.label) {
        case 0:
          state = initialState;
          _a.label = 1;
        case 1:
          if (!(!condition || condition(state))) return [3, 4];
          return [4, resultSelector(state)];
        case 2:
          _a.sent();
          _a.label = 3;
        case 3:
          state = iterate(state);
          return [3, 1];
        case 4:
          return [2];
      }
    });
  }
  return (0, _defer.defer)(scheduler ? function () {
    return (0, _scheduleIterable.scheduleIterable)(gen(), scheduler);
  } : gen);
}

},{"../scheduled/scheduleIterable":166,"../util/identity":209,"../util/isScheduler":219,"./defer":25,"tslib":227}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.iif = iif;
var _defer = require("./defer");
function iif(condition, trueResult, falseResult) {
  return (0, _defer.defer)(function () {
    return condition() ? trueResult : falseResult;
  });
}

},{"./defer":25}],35:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromArrayLike = fromArrayLike;
exports.fromAsyncIterable = fromAsyncIterable;
exports.fromInteropObservable = fromInteropObservable;
exports.fromIterable = fromIterable;
exports.fromPromise = fromPromise;
exports.fromReadableStreamLike = fromReadableStreamLike;
exports.innerFrom = innerFrom;
var _tslib = require("tslib");
var _isArrayLike = require("../util/isArrayLike");
var _isPromise = require("../util/isPromise");
var _Observable = require("../Observable");
var _isInteropObservable = require("../util/isInteropObservable");
var _isAsyncIterable = require("../util/isAsyncIterable");
var _throwUnobservableError = require("../util/throwUnobservableError");
var _isIterable = require("../util/isIterable");
var _isReadableStreamLike = require("../util/isReadableStreamLike");
var _isFunction = require("../util/isFunction");
var _reportUnhandledError = require("../util/reportUnhandledError");
var _observable = require("../symbol/observable");
function innerFrom(input) {
  if (input instanceof _Observable.Observable) {
    return input;
  }
  if (input != null) {
    if ((0, _isInteropObservable.isInteropObservable)(input)) {
      return fromInteropObservable(input);
    }
    if ((0, _isArrayLike.isArrayLike)(input)) {
      return fromArrayLike(input);
    }
    if ((0, _isPromise.isPromise)(input)) {
      return fromPromise(input);
    }
    if ((0, _isAsyncIterable.isAsyncIterable)(input)) {
      return fromAsyncIterable(input);
    }
    if ((0, _isIterable.isIterable)(input)) {
      return fromIterable(input);
    }
    if ((0, _isReadableStreamLike.isReadableStreamLike)(input)) {
      return fromReadableStreamLike(input);
    }
  }
  throw (0, _throwUnobservableError.createInvalidObservableTypeError)(input);
}
function fromInteropObservable(obj) {
  return new _Observable.Observable(function (subscriber) {
    var obs = obj[_observable.observable]();
    if ((0, _isFunction.isFunction)(obs.subscribe)) {
      return obs.subscribe(subscriber);
    }
    throw new TypeError('Provided object does not correctly implement Symbol.observable');
  });
}
function fromArrayLike(array) {
  return new _Observable.Observable(function (subscriber) {
    for (var i = 0; i < array.length && !subscriber.closed; i++) {
      subscriber.next(array[i]);
    }
    subscriber.complete();
  });
}
function fromPromise(promise) {
  return new _Observable.Observable(function (subscriber) {
    promise.then(function (value) {
      if (!subscriber.closed) {
        subscriber.next(value);
        subscriber.complete();
      }
    }, function (err) {
      return subscriber.error(err);
    }).then(null, _reportUnhandledError.reportUnhandledError);
  });
}
function fromIterable(iterable) {
  return new _Observable.Observable(function (subscriber) {
    var e_1, _a;
    try {
      for (var iterable_1 = (0, _tslib.__values)(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
        var value = iterable_1_1.value;
        subscriber.next(value);
        if (subscriber.closed) {
          return;
        }
      }
    } catch (e_1_1) {
      e_1 = {
        error: e_1_1
      };
    } finally {
      try {
        if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    subscriber.complete();
  });
}
function fromAsyncIterable(asyncIterable) {
  return new _Observable.Observable(function (subscriber) {
    process(asyncIterable, subscriber).catch(function (err) {
      return subscriber.error(err);
    });
  });
}
function fromReadableStreamLike(readableStream) {
  return fromAsyncIterable((0, _isReadableStreamLike.readableStreamLikeToAsyncGenerator)(readableStream));
}
function process(asyncIterable, subscriber) {
  var asyncIterable_1, asyncIterable_1_1;
  var e_2, _a;
  return (0, _tslib.__awaiter)(this, void 0, void 0, function () {
    var value, e_2_1;
    return (0, _tslib.__generator)(this, function (_b) {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 5, 6, 11]);
          asyncIterable_1 = (0, _tslib.__asyncValues)(asyncIterable);
          _b.label = 1;
        case 1:
          return [4, asyncIterable_1.next()];
        case 2:
          if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
          value = asyncIterable_1_1.value;
          subscriber.next(value);
          if (subscriber.closed) {
            return [2];
          }
          _b.label = 3;
        case 3:
          return [3, 1];
        case 4:
          return [3, 11];
        case 5:
          e_2_1 = _b.sent();
          e_2 = {
            error: e_2_1
          };
          return [3, 11];
        case 6:
          _b.trys.push([6,, 9, 10]);
          if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
          return [4, _a.call(asyncIterable_1)];
        case 7:
          _b.sent();
          _b.label = 8;
        case 8:
          return [3, 10];
        case 9:
          if (e_2) throw e_2.error;
          return [7];
        case 10:
          return [7];
        case 11:
          subscriber.complete();
          return [2];
      }
    });
  });
}

}).call(this)}).call(this,require('_process'))
},{"../Observable":9,"../symbol/observable":192,"../util/isArrayLike":210,"../util/isAsyncIterable":211,"../util/isFunction":213,"../util/isInteropObservable":214,"../util/isIterable":215,"../util/isPromise":217,"../util/isReadableStreamLike":218,"../util/reportUnhandledError":225,"../util/throwUnobservableError":226,"_process":3,"tslib":227}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.interval = interval;
var _async = require("../scheduler/async");
var _timer = require("./timer");
function interval(period, scheduler) {
  if (period === void 0) {
    period = 0;
  }
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  if (period < 0) {
    period = 0;
  }
  return (0, _timer.timer)(period, period, scheduler);
}

},{"../scheduler/async":184,"./timer":46}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
var _mergeAll = require("../operators/mergeAll");
var _innerFrom = require("./innerFrom");
var _empty = require("./empty");
var _args = require("../util/args");
var _from = require("./from");
function merge() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(args);
  var concurrent = (0, _args.popNumber)(args, Infinity);
  var sources = args;
  return !sources.length ? _empty.EMPTY : sources.length === 1 ? (0, _innerFrom.innerFrom)(sources[0]) : (0, _mergeAll.mergeAll)(concurrent)((0, _from.from)(sources, scheduler));
}

},{"../operators/mergeAll":101,"../util/args":201,"./empty":27,"./from":29,"./innerFrom":35}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NEVER = void 0;
exports.never = never;
var _Observable = require("../Observable");
var _noop = require("../util/noop");
var NEVER = exports.NEVER = new _Observable.Observable(_noop.noop);
function never() {
  return NEVER;
}

},{"../Observable":9,"../util/noop":222}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.of = of;
var _args = require("../util/args");
var _from = require("./from");
function of() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(args);
  return (0, _from.from)(args, scheduler);
}

},{"../util/args":201,"./from":29}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.onErrorResumeNext = onErrorResumeNext;
var _Observable = require("../Observable");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
var _noop = require("../util/noop");
var _innerFrom = require("./innerFrom");
function onErrorResumeNext() {
  var sources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    sources[_i] = arguments[_i];
  }
  var nextSources = (0, _argsOrArgArray.argsOrArgArray)(sources);
  return new _Observable.Observable(function (subscriber) {
    var sourceIndex = 0;
    var subscribeNext = function () {
      if (sourceIndex < nextSources.length) {
        var nextSource = void 0;
        try {
          nextSource = (0, _innerFrom.innerFrom)(nextSources[sourceIndex++]);
        } catch (err) {
          subscribeNext();
          return;
        }
        var innerSubscriber = new _OperatorSubscriber.OperatorSubscriber(subscriber, undefined, _noop.noop, _noop.noop);
        nextSource.subscribe(innerSubscriber);
        innerSubscriber.add(subscribeNext);
      } else {
        subscriber.complete();
      }
    };
    subscribeNext();
  });
}

},{"../Observable":9,"../operators/OperatorSubscriber":49,"../util/argsOrArgArray":203,"../util/noop":222,"./innerFrom":35}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pairs = pairs;
var _from = require("./from");
function pairs(obj, scheduler) {
  return (0, _from.from)(Object.entries(obj), scheduler);
}

},{"./from":29}],42:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.partition = partition;
var _not = require("../util/not");
var _filter = require("../operators/filter");
var _innerFrom = require("./innerFrom");
function partition(source, predicate, thisArg) {
  return [(0, _filter.filter)(predicate, thisArg)((0, _innerFrom.innerFrom)(source)), (0, _filter.filter)((0, _not.not)(predicate, thisArg))((0, _innerFrom.innerFrom)(source))];
}

},{"../operators/filter":85,"../util/not":223,"./innerFrom":35}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.race = race;
exports.raceInit = raceInit;
var _Observable = require("../Observable");
var _innerFrom = require("./innerFrom");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
function race() {
  var sources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    sources[_i] = arguments[_i];
  }
  sources = (0, _argsOrArgArray.argsOrArgArray)(sources);
  return sources.length === 1 ? (0, _innerFrom.innerFrom)(sources[0]) : new _Observable.Observable(raceInit(sources));
}
function raceInit(sources) {
  return function (subscriber) {
    var subscriptions = [];
    var _loop_1 = function (i) {
      subscriptions.push((0, _innerFrom.innerFrom)(sources[i]).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
        if (subscriptions) {
          for (var s = 0; s < subscriptions.length; s++) {
            s !== i && subscriptions[s].unsubscribe();
          }
          subscriptions = null;
        }
        subscriber.next(value);
      })));
    };
    for (var i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
      _loop_1(i);
    }
  };
}

},{"../Observable":9,"../operators/OperatorSubscriber":49,"../util/argsOrArgArray":203,"./innerFrom":35}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.range = range;
var _Observable = require("../Observable");
var _empty = require("./empty");
function range(start, count, scheduler) {
  if (count == null) {
    count = start;
    start = 0;
  }
  if (count <= 0) {
    return _empty.EMPTY;
  }
  var end = count + start;
  return new _Observable.Observable(scheduler ? function (subscriber) {
    var n = start;
    return scheduler.schedule(function () {
      if (n < end) {
        subscriber.next(n++);
        this.schedule();
      } else {
        subscriber.complete();
      }
    });
  } : function (subscriber) {
    var n = start;
    while (n < end && !subscriber.closed) {
      subscriber.next(n++);
    }
    subscriber.complete();
  });
}

},{"../Observable":9,"./empty":27}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throwError = throwError;
var _Observable = require("../Observable");
var _isFunction = require("../util/isFunction");
function throwError(errorOrErrorFactory, scheduler) {
  var errorFactory = (0, _isFunction.isFunction)(errorOrErrorFactory) ? errorOrErrorFactory : function () {
    return errorOrErrorFactory;
  };
  var init = function (subscriber) {
    return subscriber.error(errorFactory());
  };
  return new _Observable.Observable(scheduler ? function (subscriber) {
    return scheduler.schedule(init, 0, subscriber);
  } : init);
}

},{"../Observable":9,"../util/isFunction":213}],46:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timer = timer;
var _Observable = require("../Observable");
var _async = require("../scheduler/async");
var _isScheduler = require("../util/isScheduler");
var _isDate = require("../util/isDate");
function timer(dueTime, intervalOrScheduler, scheduler) {
  if (dueTime === void 0) {
    dueTime = 0;
  }
  if (scheduler === void 0) {
    scheduler = _async.async;
  }
  var intervalDuration = -1;
  if (intervalOrScheduler != null) {
    if ((0, _isScheduler.isScheduler)(intervalOrScheduler)) {
      scheduler = intervalOrScheduler;
    } else {
      intervalDuration = intervalOrScheduler;
    }
  }
  return new _Observable.Observable(function (subscriber) {
    var due = (0, _isDate.isValidDate)(dueTime) ? +dueTime - scheduler.now() : dueTime;
    if (due < 0) {
      due = 0;
    }
    var n = 0;
    return scheduler.schedule(function () {
      if (!subscriber.closed) {
        subscriber.next(n++);
        if (0 <= intervalDuration) {
          this.schedule(undefined, intervalDuration);
        } else {
          subscriber.complete();
        }
      }
    }, due);
  });
}

},{"../Observable":9,"../scheduler/async":184,"../util/isDate":212,"../util/isScheduler":219}],47:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.using = using;
var _Observable = require("../Observable");
var _innerFrom = require("./innerFrom");
var _empty = require("./empty");
function using(resourceFactory, observableFactory) {
  return new _Observable.Observable(function (subscriber) {
    var resource = resourceFactory();
    var result = observableFactory(resource);
    var source = result ? (0, _innerFrom.innerFrom)(result) : _empty.EMPTY;
    source.subscribe(subscriber);
    return function () {
      if (resource) {
        resource.unsubscribe();
      }
    };
  });
}

},{"../Observable":9,"./empty":27,"./innerFrom":35}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zip = zip;
var _tslib = require("tslib");
var _Observable = require("../Observable");
var _innerFrom = require("./innerFrom");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _empty = require("./empty");
var _OperatorSubscriber = require("../operators/OperatorSubscriber");
var _args = require("../util/args");
function zip() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var resultSelector = (0, _args.popResultSelector)(args);
  var sources = (0, _argsOrArgArray.argsOrArgArray)(args);
  return sources.length ? new _Observable.Observable(function (subscriber) {
    var buffers = sources.map(function () {
      return [];
    });
    var completed = sources.map(function () {
      return false;
    });
    subscriber.add(function () {
      buffers = completed = null;
    });
    var _loop_1 = function (sourceIndex) {
      (0, _innerFrom.innerFrom)(sources[sourceIndex]).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
        buffers[sourceIndex].push(value);
        if (buffers.every(function (buffer) {
          return buffer.length;
        })) {
          var result = buffers.map(function (buffer) {
            return buffer.shift();
          });
          subscriber.next(resultSelector ? resultSelector.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(result))) : result);
          if (buffers.some(function (buffer, i) {
            return !buffer.length && completed[i];
          })) {
            subscriber.complete();
          }
        }
      }, function () {
        completed[sourceIndex] = true;
        !buffers[sourceIndex].length && subscriber.complete();
      }));
    };
    for (var sourceIndex = 0; !subscriber.closed && sourceIndex < sources.length; sourceIndex++) {
      _loop_1(sourceIndex);
    }
    return function () {
      buffers = completed = null;
    };
  }) : _empty.EMPTY;
}

},{"../Observable":9,"../operators/OperatorSubscriber":49,"../util/args":201,"../util/argsOrArgArray":203,"./empty":27,"./innerFrom":35,"tslib":227}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OperatorSubscriber = void 0;
exports.createOperatorSubscriber = createOperatorSubscriber;
var _tslib = require("tslib");
var _Subscriber = require("../Subscriber");
function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
  return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
}
var OperatorSubscriber = exports.OperatorSubscriber = function (_super) {
  (0, _tslib.__extends)(OperatorSubscriber, _super);
  function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
    var _this = _super.call(this, destination) || this;
    _this.onFinalize = onFinalize;
    _this.shouldUnsubscribe = shouldUnsubscribe;
    _this._next = onNext ? function (value) {
      try {
        onNext(value);
      } catch (err) {
        destination.error(err);
      }
    } : _super.prototype._next;
    _this._error = onError ? function (err) {
      try {
        onError(err);
      } catch (err) {
        destination.error(err);
      } finally {
        this.unsubscribe();
      }
    } : _super.prototype._error;
    _this._complete = onComplete ? function () {
      try {
        onComplete();
      } catch (err) {
        destination.error(err);
      } finally {
        this.unsubscribe();
      }
    } : _super.prototype._complete;
    return _this;
  }
  OperatorSubscriber.prototype.unsubscribe = function () {
    var _a;
    if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
      var closed_1 = this.closed;
      _super.prototype.unsubscribe.call(this);
      !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
    }
  };
  return OperatorSubscriber;
}(_Subscriber.Subscriber);

},{"../Subscriber":13,"tslib":227}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.audit = audit;
var _lift = require("../util/lift");
var _innerFrom = require("../observable/innerFrom");
var _OperatorSubscriber = require("./OperatorSubscriber");
function audit(durationSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    var lastValue = null;
    var durationSubscriber = null;
    var isComplete = false;
    var endDuration = function () {
      durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
      durationSubscriber = null;
      if (hasValue) {
        hasValue = false;
        var value = lastValue;
        lastValue = null;
        subscriber.next(value);
      }
      isComplete && subscriber.complete();
    };
    var cleanupDuration = function () {
      durationSubscriber = null;
      isComplete && subscriber.complete();
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      hasValue = true;
      lastValue = value;
      if (!durationSubscriber) {
        (0, _innerFrom.innerFrom)(durationSelector(value)).subscribe(durationSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, endDuration, cleanupDuration));
      }
    }, function () {
      isComplete = true;
      (!hasValue || !durationSubscriber || durationSubscriber.closed) && subscriber.complete();
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.auditTime = auditTime;
var _async = require("../scheduler/async");
var _audit = require("./audit");
var _timer = require("../observable/timer");
function auditTime(duration, scheduler) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  return (0, _audit.audit)(function () {
    return (0, _timer.timer)(duration, scheduler);
  });
}

},{"../observable/timer":46,"../scheduler/async":184,"./audit":50}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buffer = buffer;
var _lift = require("../util/lift");
var _noop = require("../util/noop");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function buffer(closingNotifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    var currentBuffer = [];
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return currentBuffer.push(value);
    }, function () {
      subscriber.next(currentBuffer);
      subscriber.complete();
    }));
    (0, _innerFrom.innerFrom)(closingNotifier).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      var b = currentBuffer;
      currentBuffer = [];
      subscriber.next(b);
    }, _noop.noop));
    return function () {
      currentBuffer = null;
    };
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bufferCount = bufferCount;
var _tslib = require("tslib");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _arrRemove = require("../util/arrRemove");
function bufferCount(bufferSize, startBufferEvery) {
  if (startBufferEvery === void 0) {
    startBufferEvery = null;
  }
  startBufferEvery = startBufferEvery !== null && startBufferEvery !== void 0 ? startBufferEvery : bufferSize;
  return (0, _lift.operate)(function (source, subscriber) {
    var buffers = [];
    var count = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var e_1, _a, e_2, _b;
      var toEmit = null;
      if (count++ % startBufferEvery === 0) {
        buffers.push([]);
      }
      try {
        for (var buffers_1 = (0, _tslib.__values)(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
          var buffer = buffers_1_1.value;
          buffer.push(value);
          if (bufferSize <= buffer.length) {
            toEmit = toEmit !== null && toEmit !== void 0 ? toEmit : [];
            toEmit.push(buffer);
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      if (toEmit) {
        try {
          for (var toEmit_1 = (0, _tslib.__values)(toEmit), toEmit_1_1 = toEmit_1.next(); !toEmit_1_1.done; toEmit_1_1 = toEmit_1.next()) {
            var buffer = toEmit_1_1.value;
            (0, _arrRemove.arrRemove)(buffers, buffer);
            subscriber.next(buffer);
          }
        } catch (e_2_1) {
          e_2 = {
            error: e_2_1
          };
        } finally {
          try {
            if (toEmit_1_1 && !toEmit_1_1.done && (_b = toEmit_1.return)) _b.call(toEmit_1);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
      }
    }, function () {
      var e_3, _a;
      try {
        for (var buffers_2 = (0, _tslib.__values)(buffers), buffers_2_1 = buffers_2.next(); !buffers_2_1.done; buffers_2_1 = buffers_2.next()) {
          var buffer = buffers_2_1.value;
          subscriber.next(buffer);
        }
      } catch (e_3_1) {
        e_3 = {
          error: e_3_1
        };
      } finally {
        try {
          if (buffers_2_1 && !buffers_2_1.done && (_a = buffers_2.return)) _a.call(buffers_2);
        } finally {
          if (e_3) throw e_3.error;
        }
      }
      subscriber.complete();
    }, undefined, function () {
      buffers = null;
    }));
  });
}

},{"../util/arrRemove":204,"../util/lift":220,"./OperatorSubscriber":49,"tslib":227}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bufferTime = bufferTime;
var _tslib = require("tslib");
var _Subscription = require("../Subscription");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _arrRemove = require("../util/arrRemove");
var _async = require("../scheduler/async");
var _args = require("../util/args");
var _executeSchedule = require("../util/executeSchedule");
function bufferTime(bufferTimeSpan) {
  var _a, _b;
  var otherArgs = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    otherArgs[_i - 1] = arguments[_i];
  }
  var scheduler = (_a = (0, _args.popScheduler)(otherArgs)) !== null && _a !== void 0 ? _a : _async.asyncScheduler;
  var bufferCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
  var maxBufferSize = otherArgs[1] || Infinity;
  return (0, _lift.operate)(function (source, subscriber) {
    var bufferRecords = [];
    var restartOnEmit = false;
    var emit = function (record) {
      var buffer = record.buffer,
        subs = record.subs;
      subs.unsubscribe();
      (0, _arrRemove.arrRemove)(bufferRecords, record);
      subscriber.next(buffer);
      restartOnEmit && startBuffer();
    };
    var startBuffer = function () {
      if (bufferRecords) {
        var subs = new _Subscription.Subscription();
        subscriber.add(subs);
        var buffer = [];
        var record_1 = {
          buffer: buffer,
          subs: subs
        };
        bufferRecords.push(record_1);
        (0, _executeSchedule.executeSchedule)(subs, scheduler, function () {
          return emit(record_1);
        }, bufferTimeSpan);
      }
    };
    if (bufferCreationInterval !== null && bufferCreationInterval >= 0) {
      (0, _executeSchedule.executeSchedule)(subscriber, scheduler, startBuffer, bufferCreationInterval, true);
    } else {
      restartOnEmit = true;
    }
    startBuffer();
    var bufferTimeSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var e_1, _a;
      var recordsCopy = bufferRecords.slice();
      try {
        for (var recordsCopy_1 = (0, _tslib.__values)(recordsCopy), recordsCopy_1_1 = recordsCopy_1.next(); !recordsCopy_1_1.done; recordsCopy_1_1 = recordsCopy_1.next()) {
          var record = recordsCopy_1_1.value;
          var buffer = record.buffer;
          buffer.push(value);
          maxBufferSize <= buffer.length && emit(record);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (recordsCopy_1_1 && !recordsCopy_1_1.done && (_a = recordsCopy_1.return)) _a.call(recordsCopy_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }, function () {
      while (bufferRecords === null || bufferRecords === void 0 ? void 0 : bufferRecords.length) {
        subscriber.next(bufferRecords.shift().buffer);
      }
      bufferTimeSubscriber === null || bufferTimeSubscriber === void 0 ? void 0 : bufferTimeSubscriber.unsubscribe();
      subscriber.complete();
      subscriber.unsubscribe();
    }, undefined, function () {
      return bufferRecords = null;
    });
    source.subscribe(bufferTimeSubscriber);
  });
}

},{"../Subscription":14,"../scheduler/async":184,"../util/args":201,"../util/arrRemove":204,"../util/executeSchedule":208,"../util/lift":220,"./OperatorSubscriber":49,"tslib":227}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bufferToggle = bufferToggle;
var _tslib = require("tslib");
var _Subscription = require("../Subscription");
var _lift = require("../util/lift");
var _innerFrom = require("../observable/innerFrom");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _noop = require("../util/noop");
var _arrRemove = require("../util/arrRemove");
function bufferToggle(openings, closingSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var buffers = [];
    (0, _innerFrom.innerFrom)(openings).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (openValue) {
      var buffer = [];
      buffers.push(buffer);
      var closingSubscription = new _Subscription.Subscription();
      var emitBuffer = function () {
        (0, _arrRemove.arrRemove)(buffers, buffer);
        subscriber.next(buffer);
        closingSubscription.unsubscribe();
      };
      closingSubscription.add((0, _innerFrom.innerFrom)(closingSelector(openValue)).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, emitBuffer, _noop.noop)));
    }, _noop.noop));
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var e_1, _a;
      try {
        for (var buffers_1 = (0, _tslib.__values)(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
          var buffer = buffers_1_1.value;
          buffer.push(value);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }, function () {
      while (buffers.length > 0) {
        subscriber.next(buffers.shift());
      }
      subscriber.complete();
    }));
  });
}

},{"../Subscription":14,"../observable/innerFrom":35,"../util/arrRemove":204,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49,"tslib":227}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bufferWhen = bufferWhen;
var _lift = require("../util/lift");
var _noop = require("../util/noop");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function bufferWhen(closingSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var buffer = null;
    var closingSubscriber = null;
    var openBuffer = function () {
      closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
      var b = buffer;
      buffer = [];
      b && subscriber.next(b);
      (0, _innerFrom.innerFrom)(closingSelector()).subscribe(closingSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, openBuffer, _noop.noop));
    };
    openBuffer();
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return buffer === null || buffer === void 0 ? void 0 : buffer.push(value);
    }, function () {
      buffer && subscriber.next(buffer);
      subscriber.complete();
    }, undefined, function () {
      return buffer = closingSubscriber = null;
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.catchError = catchError;
var _innerFrom = require("../observable/innerFrom");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _lift = require("../util/lift");
function catchError(selector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var innerSub = null;
    var syncUnsub = false;
    var handledResult;
    innerSub = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, undefined, function (err) {
      handledResult = (0, _innerFrom.innerFrom)(selector(err, catchError(selector)(source)));
      if (innerSub) {
        innerSub.unsubscribe();
        innerSub = null;
        handledResult.subscribe(subscriber);
      } else {
        syncUnsub = true;
      }
    }));
    if (syncUnsub) {
      innerSub.unsubscribe();
      innerSub = null;
      handledResult.subscribe(subscriber);
    }
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineAll = void 0;
var _combineLatestAll = require("./combineLatestAll");
var combineAll = exports.combineAll = _combineLatestAll.combineLatestAll;

},{"./combineLatestAll":60}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineLatest = combineLatest;
var _tslib = require("tslib");
var _combineLatest = require("../observable/combineLatest");
var _lift = require("../util/lift");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var _pipe = require("../util/pipe");
var _args = require("../util/args");
function combineLatest() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var resultSelector = (0, _args.popResultSelector)(args);
  return resultSelector ? (0, _pipe.pipe)(combineLatest.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args))), (0, _mapOneOrManyArgs.mapOneOrManyArgs)(resultSelector)) : (0, _lift.operate)(function (source, subscriber) {
    (0, _combineLatest.combineLatestInit)((0, _tslib.__spreadArray)([source], (0, _tslib.__read)((0, _argsOrArgArray.argsOrArgArray)(args))))(subscriber);
  });
}

},{"../observable/combineLatest":22,"../util/args":201,"../util/argsOrArgArray":203,"../util/lift":220,"../util/mapOneOrManyArgs":221,"../util/pipe":224,"tslib":227}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineLatestAll = combineLatestAll;
var _combineLatest = require("../observable/combineLatest");
var _joinAllInternals = require("./joinAllInternals");
function combineLatestAll(project) {
  return (0, _joinAllInternals.joinAllInternals)(_combineLatest.combineLatest, project);
}

},{"../observable/combineLatest":22,"./joinAllInternals":94}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combineLatestWith = combineLatestWith;
var _tslib = require("tslib");
var _combineLatest = require("./combineLatest");
function combineLatestWith() {
  var otherSources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    otherSources[_i] = arguments[_i];
  }
  return _combineLatest.combineLatest.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(otherSources)));
}

},{"./combineLatest":59,"tslib":227}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concat = concat;
var _tslib = require("tslib");
var _lift = require("../util/lift");
var _concatAll = require("./concatAll");
var _args = require("../util/args");
var _from = require("../observable/from");
function concat() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(args);
  return (0, _lift.operate)(function (source, subscriber) {
    (0, _concatAll.concatAll)()((0, _from.from)((0, _tslib.__spreadArray)([source], (0, _tslib.__read)(args)), scheduler)).subscribe(subscriber);
  });
}

},{"../observable/from":29,"../util/args":201,"../util/lift":220,"./concatAll":63,"tslib":227}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatAll = concatAll;
var _mergeAll = require("./mergeAll");
function concatAll() {
  return (0, _mergeAll.mergeAll)(1);
}

},{"./mergeAll":101}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatMap = concatMap;
var _mergeMap = require("./mergeMap");
var _isFunction = require("../util/isFunction");
function concatMap(project, resultSelector) {
  return (0, _isFunction.isFunction)(resultSelector) ? (0, _mergeMap.mergeMap)(project, resultSelector, 1) : (0, _mergeMap.mergeMap)(project, 1);
}

},{"../util/isFunction":213,"./mergeMap":103}],65:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatMapTo = concatMapTo;
var _concatMap = require("./concatMap");
var _isFunction = require("../util/isFunction");
function concatMapTo(innerObservable, resultSelector) {
  return (0, _isFunction.isFunction)(resultSelector) ? (0, _concatMap.concatMap)(function () {
    return innerObservable;
  }, resultSelector) : (0, _concatMap.concatMap)(function () {
    return innerObservable;
  });
}

},{"../util/isFunction":213,"./concatMap":64}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatWith = concatWith;
var _tslib = require("tslib");
var _concat = require("./concat");
function concatWith() {
  var otherSources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    otherSources[_i] = arguments[_i];
  }
  return _concat.concat.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(otherSources)));
}

},{"./concat":62,"tslib":227}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.connect = connect;
var _Subject = require("../Subject");
var _innerFrom = require("../observable/innerFrom");
var _lift = require("../util/lift");
var _fromSubscribable = require("../observable/fromSubscribable");
var DEFAULT_CONFIG = {
  connector: function () {
    return new _Subject.Subject();
  }
};
function connect(selector, config) {
  if (config === void 0) {
    config = DEFAULT_CONFIG;
  }
  var connector = config.connector;
  return (0, _lift.operate)(function (source, subscriber) {
    var subject = connector();
    (0, _innerFrom.innerFrom)(selector((0, _fromSubscribable.fromSubscribable)(subject))).subscribe(subscriber);
    subscriber.add(source.subscribe(subject));
  });
}

},{"../Subject":12,"../observable/fromSubscribable":32,"../observable/innerFrom":35,"../util/lift":220}],68:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.count = count;
var _reduce = require("./reduce");
function count(predicate) {
  return (0, _reduce.reduce)(function (total, value, i) {
    return !predicate || predicate(value, i) ? total + 1 : total;
  }, 0);
}

},{"./reduce":118}],69:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debounce = debounce;
var _lift = require("../util/lift");
var _noop = require("../util/noop");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function debounce(durationSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    var lastValue = null;
    var durationSubscriber = null;
    var emit = function () {
      durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
      durationSubscriber = null;
      if (hasValue) {
        hasValue = false;
        var value = lastValue;
        lastValue = null;
        subscriber.next(value);
      }
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
      hasValue = true;
      lastValue = value;
      durationSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, emit, _noop.noop);
      (0, _innerFrom.innerFrom)(durationSelector(value)).subscribe(durationSubscriber);
    }, function () {
      emit();
      subscriber.complete();
    }, undefined, function () {
      lastValue = durationSubscriber = null;
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],70:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.debounceTime = debounceTime;
var _async = require("../scheduler/async");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function debounceTime(dueTime, scheduler) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var activeTask = null;
    var lastValue = null;
    var lastTime = null;
    var emit = function () {
      if (activeTask) {
        activeTask.unsubscribe();
        activeTask = null;
        var value = lastValue;
        lastValue = null;
        subscriber.next(value);
      }
    };
    function emitWhenIdle() {
      var targetTime = lastTime + dueTime;
      var now = scheduler.now();
      if (now < targetTime) {
        activeTask = this.schedule(undefined, targetTime - now);
        subscriber.add(activeTask);
        return;
      }
      emit();
    }
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      lastValue = value;
      lastTime = scheduler.now();
      if (!activeTask) {
        activeTask = scheduler.schedule(emitWhenIdle, dueTime);
        subscriber.add(activeTask);
      }
    }, function () {
      emit();
      subscriber.complete();
    }, undefined, function () {
      lastValue = activeTask = null;
    }));
  });
}

},{"../scheduler/async":184,"../util/lift":220,"./OperatorSubscriber":49}],71:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultIfEmpty = defaultIfEmpty;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function defaultIfEmpty(defaultValue) {
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      hasValue = true;
      subscriber.next(value);
    }, function () {
      if (!hasValue) {
        subscriber.next(defaultValue);
      }
      subscriber.complete();
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],72:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delay = delay;
var _async = require("../scheduler/async");
var _delayWhen = require("./delayWhen");
var _timer = require("../observable/timer");
function delay(due, scheduler) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  var duration = (0, _timer.timer)(due, scheduler);
  return (0, _delayWhen.delayWhen)(function () {
    return duration;
  });
}

},{"../observable/timer":46,"../scheduler/async":184,"./delayWhen":73}],73:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delayWhen = delayWhen;
var _concat = require("../observable/concat");
var _take = require("./take");
var _ignoreElements = require("./ignoreElements");
var _mapTo = require("./mapTo");
var _mergeMap = require("./mergeMap");
var _innerFrom = require("../observable/innerFrom");
function delayWhen(delayDurationSelector, subscriptionDelay) {
  if (subscriptionDelay) {
    return function (source) {
      return (0, _concat.concat)(subscriptionDelay.pipe((0, _take.take)(1), (0, _ignoreElements.ignoreElements)()), source.pipe(delayWhen(delayDurationSelector)));
    };
  }
  return (0, _mergeMap.mergeMap)(function (value, index) {
    return (0, _innerFrom.innerFrom)(delayDurationSelector(value, index)).pipe((0, _take.take)(1), (0, _mapTo.mapTo)(value));
  });
}

},{"../observable/concat":23,"../observable/innerFrom":35,"./ignoreElements":92,"./mapTo":97,"./mergeMap":103,"./take":142}],74:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dematerialize = dematerialize;
var _Notification = require("../Notification");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function dematerialize() {
  return (0, _lift.operate)(function (source, subscriber) {
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (notification) {
      return (0, _Notification.observeNotification)(notification, subscriber);
    }));
  });
}

},{"../Notification":7,"../util/lift":220,"./OperatorSubscriber":49}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.distinct = distinct;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _noop = require("../util/noop");
var _innerFrom = require("../observable/innerFrom");
function distinct(keySelector, flushes) {
  return (0, _lift.operate)(function (source, subscriber) {
    var distinctKeys = new Set();
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var key = keySelector ? keySelector(value) : value;
      if (!distinctKeys.has(key)) {
        distinctKeys.add(key);
        subscriber.next(value);
      }
    }));
    flushes && (0, _innerFrom.innerFrom)(flushes).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      return distinctKeys.clear();
    }, _noop.noop));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],76:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.distinctUntilChanged = distinctUntilChanged;
var _identity = require("../util/identity");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function distinctUntilChanged(comparator, keySelector) {
  if (keySelector === void 0) {
    keySelector = _identity.identity;
  }
  comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
  return (0, _lift.operate)(function (source, subscriber) {
    var previousKey;
    var first = true;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var currentKey = keySelector(value);
      if (first || !comparator(previousKey, currentKey)) {
        first = false;
        previousKey = currentKey;
        subscriber.next(value);
      }
    }));
  });
}
function defaultCompare(a, b) {
  return a === b;
}

},{"../util/identity":209,"../util/lift":220,"./OperatorSubscriber":49}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.distinctUntilKeyChanged = distinctUntilKeyChanged;
var _distinctUntilChanged = require("./distinctUntilChanged");
function distinctUntilKeyChanged(key, compare) {
  return (0, _distinctUntilChanged.distinctUntilChanged)(function (x, y) {
    return compare ? compare(x[key], y[key]) : x[key] === y[key];
  });
}

},{"./distinctUntilChanged":76}],78:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elementAt = elementAt;
var _ArgumentOutOfRangeError = require("../util/ArgumentOutOfRangeError");
var _filter = require("./filter");
var _throwIfEmpty = require("./throwIfEmpty");
var _defaultIfEmpty = require("./defaultIfEmpty");
var _take = require("./take");
function elementAt(index, defaultValue) {
  if (index < 0) {
    throw new _ArgumentOutOfRangeError.ArgumentOutOfRangeError();
  }
  var hasDefaultValue = arguments.length >= 2;
  return function (source) {
    return source.pipe((0, _filter.filter)(function (v, i) {
      return i === index;
    }), (0, _take.take)(1), hasDefaultValue ? (0, _defaultIfEmpty.defaultIfEmpty)(defaultValue) : (0, _throwIfEmpty.throwIfEmpty)(function () {
      return new _ArgumentOutOfRangeError.ArgumentOutOfRangeError();
    }));
  };
}

},{"../util/ArgumentOutOfRangeError":194,"./defaultIfEmpty":71,"./filter":85,"./take":142,"./throwIfEmpty":149}],79:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.endWith = endWith;
var _tslib = require("tslib");
var _concat = require("../observable/concat");
var _of = require("../observable/of");
function endWith() {
  var values = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    values[_i] = arguments[_i];
  }
  return function (source) {
    return (0, _concat.concat)(source, _of.of.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(values))));
  };
}

},{"../observable/concat":23,"../observable/of":39,"tslib":227}],80:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.every = every;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function every(predicate, thisArg) {
  return (0, _lift.operate)(function (source, subscriber) {
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      if (!predicate.call(thisArg, value, index++, source)) {
        subscriber.next(false);
        subscriber.complete();
      }
    }, function () {
      subscriber.next(true);
      subscriber.complete();
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],81:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exhaust = void 0;
var _exhaustAll = require("./exhaustAll");
var exhaust = exports.exhaust = _exhaustAll.exhaustAll;

},{"./exhaustAll":82}],82:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exhaustAll = exhaustAll;
var _exhaustMap = require("./exhaustMap");
var _identity = require("../util/identity");
function exhaustAll() {
  return (0, _exhaustMap.exhaustMap)(_identity.identity);
}

},{"../util/identity":209,"./exhaustMap":83}],83:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exhaustMap = exhaustMap;
var _map = require("./map");
var _innerFrom = require("../observable/innerFrom");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function exhaustMap(project, resultSelector) {
  if (resultSelector) {
    return function (source) {
      return source.pipe(exhaustMap(function (a, i) {
        return (0, _innerFrom.innerFrom)(project(a, i)).pipe((0, _map.map)(function (b, ii) {
          return resultSelector(a, b, i, ii);
        }));
      }));
    };
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var index = 0;
    var innerSub = null;
    var isComplete = false;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (outerValue) {
      if (!innerSub) {
        innerSub = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, function () {
          innerSub = null;
          isComplete && subscriber.complete();
        });
        (0, _innerFrom.innerFrom)(project(outerValue, index++)).subscribe(innerSub);
      }
    }, function () {
      isComplete = true;
      !innerSub && subscriber.complete();
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49,"./map":96}],84:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.expand = expand;
var _lift = require("../util/lift");
var _mergeInternals = require("./mergeInternals");
function expand(project, concurrent, scheduler) {
  if (concurrent === void 0) {
    concurrent = Infinity;
  }
  concurrent = (concurrent || 0) < 1 ? Infinity : concurrent;
  return (0, _lift.operate)(function (source, subscriber) {
    return (0, _mergeInternals.mergeInternals)(source, subscriber, project, concurrent, undefined, true, scheduler);
  });
}

},{"../util/lift":220,"./mergeInternals":102}],85:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filter = filter;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function filter(predicate, thisArg) {
  return (0, _lift.operate)(function (source, subscriber) {
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return predicate.call(thisArg, value, index++) && subscriber.next(value);
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],86:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.finalize = finalize;
var _lift = require("../util/lift");
function finalize(callback) {
  return (0, _lift.operate)(function (source, subscriber) {
    try {
      source.subscribe(subscriber);
    } finally {
      subscriber.add(callback);
    }
  });
}

},{"../util/lift":220}],87:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createFind = createFind;
exports.find = find;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function find(predicate, thisArg) {
  return (0, _lift.operate)(createFind(predicate, thisArg, 'value'));
}
function createFind(predicate, thisArg, emit) {
  var findIndex = emit === 'index';
  return function (source, subscriber) {
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var i = index++;
      if (predicate.call(thisArg, value, i, source)) {
        subscriber.next(findIndex ? i : value);
        subscriber.complete();
      }
    }, function () {
      subscriber.next(findIndex ? -1 : undefined);
      subscriber.complete();
    }));
  };
}

},{"../util/lift":220,"./OperatorSubscriber":49}],88:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findIndex = findIndex;
var _lift = require("../util/lift");
var _find = require("./find");
function findIndex(predicate, thisArg) {
  return (0, _lift.operate)((0, _find.createFind)(predicate, thisArg, 'index'));
}

},{"../util/lift":220,"./find":87}],89:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.first = first;
var _EmptyError = require("../util/EmptyError");
var _filter = require("./filter");
var _take = require("./take");
var _defaultIfEmpty = require("./defaultIfEmpty");
var _throwIfEmpty = require("./throwIfEmpty");
var _identity = require("../util/identity");
function first(predicate, defaultValue) {
  var hasDefaultValue = arguments.length >= 2;
  return function (source) {
    return source.pipe(predicate ? (0, _filter.filter)(function (v, i) {
      return predicate(v, i, source);
    }) : _identity.identity, (0, _take.take)(1), hasDefaultValue ? (0, _defaultIfEmpty.defaultIfEmpty)(defaultValue) : (0, _throwIfEmpty.throwIfEmpty)(function () {
      return new _EmptyError.EmptyError();
    }));
  };
}

},{"../util/EmptyError":195,"../util/identity":209,"./defaultIfEmpty":71,"./filter":85,"./take":142,"./throwIfEmpty":149}],90:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMap = void 0;
var _mergeMap = require("./mergeMap");
var flatMap = exports.flatMap = _mergeMap.mergeMap;

},{"./mergeMap":103}],91:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.groupBy = groupBy;
var _Observable = require("../Observable");
var _innerFrom = require("../observable/innerFrom");
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function groupBy(keySelector, elementOrOptions, duration, connector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var element;
    if (!elementOrOptions || typeof elementOrOptions === 'function') {
      element = elementOrOptions;
    } else {
      duration = elementOrOptions.duration, element = elementOrOptions.element, connector = elementOrOptions.connector;
    }
    var groups = new Map();
    var notify = function (cb) {
      groups.forEach(cb);
      cb(subscriber);
    };
    var handleError = function (err) {
      return notify(function (consumer) {
        return consumer.error(err);
      });
    };
    var activeGroups = 0;
    var teardownAttempted = false;
    var groupBySourceSubscriber = new _OperatorSubscriber.OperatorSubscriber(subscriber, function (value) {
      try {
        var key_1 = keySelector(value);
        var group_1 = groups.get(key_1);
        if (!group_1) {
          groups.set(key_1, group_1 = connector ? connector() : new _Subject.Subject());
          var grouped = createGroupedObservable(key_1, group_1);
          subscriber.next(grouped);
          if (duration) {
            var durationSubscriber_1 = (0, _OperatorSubscriber.createOperatorSubscriber)(group_1, function () {
              group_1.complete();
              durationSubscriber_1 === null || durationSubscriber_1 === void 0 ? void 0 : durationSubscriber_1.unsubscribe();
            }, undefined, undefined, function () {
              return groups.delete(key_1);
            });
            groupBySourceSubscriber.add((0, _innerFrom.innerFrom)(duration(grouped)).subscribe(durationSubscriber_1));
          }
        }
        group_1.next(element ? element(value) : value);
      } catch (err) {
        handleError(err);
      }
    }, function () {
      return notify(function (consumer) {
        return consumer.complete();
      });
    }, handleError, function () {
      return groups.clear();
    }, function () {
      teardownAttempted = true;
      return activeGroups === 0;
    });
    source.subscribe(groupBySourceSubscriber);
    function createGroupedObservable(key, groupSubject) {
      var result = new _Observable.Observable(function (groupSubscriber) {
        activeGroups++;
        var innerSub = groupSubject.subscribe(groupSubscriber);
        return function () {
          innerSub.unsubscribe();
          --activeGroups === 0 && teardownAttempted && groupBySourceSubscriber.unsubscribe();
        };
      });
      result.key = key;
      return result;
    }
  });
}

},{"../Observable":9,"../Subject":12,"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],92:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ignoreElements = ignoreElements;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _noop = require("../util/noop");
function ignoreElements() {
  return (0, _lift.operate)(function (source, subscriber) {
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, _noop.noop));
  });
}

},{"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],93:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEmpty = isEmpty;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function isEmpty() {
  return (0, _lift.operate)(function (source, subscriber) {
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      subscriber.next(false);
      subscriber.complete();
    }, function () {
      subscriber.next(true);
      subscriber.complete();
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],94:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.joinAllInternals = joinAllInternals;
var _identity = require("../util/identity");
var _mapOneOrManyArgs = require("../util/mapOneOrManyArgs");
var _pipe = require("../util/pipe");
var _mergeMap = require("./mergeMap");
var _toArray = require("./toArray");
function joinAllInternals(joinFn, project) {
  return (0, _pipe.pipe)((0, _toArray.toArray)(), (0, _mergeMap.mergeMap)(function (sources) {
    return joinFn(sources);
  }), project ? (0, _mapOneOrManyArgs.mapOneOrManyArgs)(project) : _identity.identity);
}

},{"../util/identity":209,"../util/mapOneOrManyArgs":221,"../util/pipe":224,"./mergeMap":103,"./toArray":154}],95:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.last = last;
var _EmptyError = require("../util/EmptyError");
var _filter = require("./filter");
var _takeLast = require("./takeLast");
var _throwIfEmpty = require("./throwIfEmpty");
var _defaultIfEmpty = require("./defaultIfEmpty");
var _identity = require("../util/identity");
function last(predicate, defaultValue) {
  var hasDefaultValue = arguments.length >= 2;
  return function (source) {
    return source.pipe(predicate ? (0, _filter.filter)(function (v, i) {
      return predicate(v, i, source);
    }) : _identity.identity, (0, _takeLast.takeLast)(1), hasDefaultValue ? (0, _defaultIfEmpty.defaultIfEmpty)(defaultValue) : (0, _throwIfEmpty.throwIfEmpty)(function () {
      return new _EmptyError.EmptyError();
    }));
  };
}

},{"../util/EmptyError":195,"../util/identity":209,"./defaultIfEmpty":71,"./filter":85,"./takeLast":143,"./throwIfEmpty":149}],96:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.map = map;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function map(project, thisArg) {
  return (0, _lift.operate)(function (source, subscriber) {
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      subscriber.next(project.call(thisArg, value, index++));
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],97:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapTo = mapTo;
var _map = require("./map");
function mapTo(value) {
  return (0, _map.map)(function () {
    return value;
  });
}

},{"./map":96}],98:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.materialize = materialize;
var _Notification = require("../Notification");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function materialize() {
  return (0, _lift.operate)(function (source, subscriber) {
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      subscriber.next(_Notification.Notification.createNext(value));
    }, function () {
      subscriber.next(_Notification.Notification.createComplete());
      subscriber.complete();
    }, function (err) {
      subscriber.next(_Notification.Notification.createError(err));
      subscriber.complete();
    }));
  });
}

},{"../Notification":7,"../util/lift":220,"./OperatorSubscriber":49}],99:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.max = max;
var _reduce = require("./reduce");
var _isFunction = require("../util/isFunction");
function max(comparer) {
  return (0, _reduce.reduce)((0, _isFunction.isFunction)(comparer) ? function (x, y) {
    return comparer(x, y) > 0 ? x : y;
  } : function (x, y) {
    return x > y ? x : y;
  });
}

},{"../util/isFunction":213,"./reduce":118}],100:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
var _tslib = require("tslib");
var _lift = require("../util/lift");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _mergeAll = require("./mergeAll");
var _args = require("../util/args");
var _from = require("../observable/from");
function merge() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(args);
  var concurrent = (0, _args.popNumber)(args, Infinity);
  args = (0, _argsOrArgArray.argsOrArgArray)(args);
  return (0, _lift.operate)(function (source, subscriber) {
    (0, _mergeAll.mergeAll)(concurrent)((0, _from.from)((0, _tslib.__spreadArray)([source], (0, _tslib.__read)(args)), scheduler)).subscribe(subscriber);
  });
}

},{"../observable/from":29,"../util/args":201,"../util/argsOrArgArray":203,"../util/lift":220,"./mergeAll":101,"tslib":227}],101:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeAll = mergeAll;
var _mergeMap = require("./mergeMap");
var _identity = require("../util/identity");
function mergeAll(concurrent) {
  if (concurrent === void 0) {
    concurrent = Infinity;
  }
  return (0, _mergeMap.mergeMap)(_identity.identity, concurrent);
}

},{"../util/identity":209,"./mergeMap":103}],102:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeInternals = mergeInternals;
var _innerFrom = require("../observable/innerFrom");
var _executeSchedule = require("../util/executeSchedule");
var _OperatorSubscriber = require("./OperatorSubscriber");
function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalFinalizer) {
  var buffer = [];
  var active = 0;
  var index = 0;
  var isComplete = false;
  var checkComplete = function () {
    if (isComplete && !buffer.length && !active) {
      subscriber.complete();
    }
  };
  var outerNext = function (value) {
    return active < concurrent ? doInnerSub(value) : buffer.push(value);
  };
  var doInnerSub = function (value) {
    expand && subscriber.next(value);
    active++;
    var innerComplete = false;
    (0, _innerFrom.innerFrom)(project(value, index++)).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (innerValue) {
      onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
      if (expand) {
        outerNext(innerValue);
      } else {
        subscriber.next(innerValue);
      }
    }, function () {
      innerComplete = true;
    }, undefined, function () {
      if (innerComplete) {
        try {
          active--;
          var _loop_1 = function () {
            var bufferedValue = buffer.shift();
            if (innerSubScheduler) {
              (0, _executeSchedule.executeSchedule)(subscriber, innerSubScheduler, function () {
                return doInnerSub(bufferedValue);
              });
            } else {
              doInnerSub(bufferedValue);
            }
          };
          while (buffer.length && active < concurrent) {
            _loop_1();
          }
          checkComplete();
        } catch (err) {
          subscriber.error(err);
        }
      }
    }));
  };
  source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, outerNext, function () {
    isComplete = true;
    checkComplete();
  }));
  return function () {
    additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
  };
}

},{"../observable/innerFrom":35,"../util/executeSchedule":208,"./OperatorSubscriber":49}],103:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeMap = mergeMap;
var _map = require("./map");
var _innerFrom = require("../observable/innerFrom");
var _lift = require("../util/lift");
var _mergeInternals = require("./mergeInternals");
var _isFunction = require("../util/isFunction");
function mergeMap(project, resultSelector, concurrent) {
  if (concurrent === void 0) {
    concurrent = Infinity;
  }
  if ((0, _isFunction.isFunction)(resultSelector)) {
    return mergeMap(function (a, i) {
      return (0, _map.map)(function (b, ii) {
        return resultSelector(a, b, i, ii);
      })((0, _innerFrom.innerFrom)(project(a, i)));
    }, concurrent);
  } else if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    return (0, _mergeInternals.mergeInternals)(source, subscriber, project, concurrent);
  });
}

},{"../observable/innerFrom":35,"../util/isFunction":213,"../util/lift":220,"./map":96,"./mergeInternals":102}],104:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeMapTo = mergeMapTo;
var _mergeMap = require("./mergeMap");
var _isFunction = require("../util/isFunction");
function mergeMapTo(innerObservable, resultSelector, concurrent) {
  if (concurrent === void 0) {
    concurrent = Infinity;
  }
  if ((0, _isFunction.isFunction)(resultSelector)) {
    return (0, _mergeMap.mergeMap)(function () {
      return innerObservable;
    }, resultSelector, concurrent);
  }
  if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return (0, _mergeMap.mergeMap)(function () {
    return innerObservable;
  }, concurrent);
}

},{"../util/isFunction":213,"./mergeMap":103}],105:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeScan = mergeScan;
var _lift = require("../util/lift");
var _mergeInternals = require("./mergeInternals");
function mergeScan(accumulator, seed, concurrent) {
  if (concurrent === void 0) {
    concurrent = Infinity;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var state = seed;
    return (0, _mergeInternals.mergeInternals)(source, subscriber, function (value, index) {
      return accumulator(state, value, index);
    }, concurrent, function (value) {
      state = value;
    }, false, undefined, function () {
      return state = null;
    });
  });
}

},{"../util/lift":220,"./mergeInternals":102}],106:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeWith = mergeWith;
var _tslib = require("tslib");
var _merge = require("./merge");
function mergeWith() {
  var otherSources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    otherSources[_i] = arguments[_i];
  }
  return _merge.merge.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(otherSources)));
}

},{"./merge":100,"tslib":227}],107:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.min = min;
var _reduce = require("./reduce");
var _isFunction = require("../util/isFunction");
function min(comparer) {
  return (0, _reduce.reduce)((0, _isFunction.isFunction)(comparer) ? function (x, y) {
    return comparer(x, y) < 0 ? x : y;
  } : function (x, y) {
    return x < y ? x : y;
  });
}

},{"../util/isFunction":213,"./reduce":118}],108:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.multicast = multicast;
var _ConnectableObservable = require("../observable/ConnectableObservable");
var _isFunction = require("../util/isFunction");
var _connect = require("./connect");
function multicast(subjectOrSubjectFactory, selector) {
  var subjectFactory = (0, _isFunction.isFunction)(subjectOrSubjectFactory) ? subjectOrSubjectFactory : function () {
    return subjectOrSubjectFactory;
  };
  if ((0, _isFunction.isFunction)(selector)) {
    return (0, _connect.connect)(selector, {
      connector: subjectFactory
    });
  }
  return function (source) {
    return new _ConnectableObservable.ConnectableObservable(source, subjectFactory);
  };
}

},{"../observable/ConnectableObservable":18,"../util/isFunction":213,"./connect":67}],109:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observeOn = observeOn;
var _executeSchedule = require("../util/executeSchedule");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function observeOn(scheduler, delay) {
  if (delay === void 0) {
    delay = 0;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        return subscriber.next(value);
      }, delay);
    }, function () {
      return (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        return subscriber.complete();
      }, delay);
    }, function (err) {
      return (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        return subscriber.error(err);
      }, delay);
    }));
  });
}

},{"../util/executeSchedule":208,"../util/lift":220,"./OperatorSubscriber":49}],110:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.onErrorResumeNext = void 0;
exports.onErrorResumeNextWith = onErrorResumeNextWith;
var _tslib = require("tslib");
var _argsOrArgArray = require("../util/argsOrArgArray");
var _onErrorResumeNext = require("../observable/onErrorResumeNext");
function onErrorResumeNextWith() {
  var sources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    sources[_i] = arguments[_i];
  }
  var nextSources = (0, _argsOrArgArray.argsOrArgArray)(sources);
  return function (source) {
    return _onErrorResumeNext.onErrorResumeNext.apply(void 0, (0, _tslib.__spreadArray)([source], (0, _tslib.__read)(nextSources)));
  };
}
var onErrorResumeNext = exports.onErrorResumeNext = onErrorResumeNextWith;

},{"../observable/onErrorResumeNext":40,"../util/argsOrArgArray":203,"tslib":227}],111:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pairwise = pairwise;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function pairwise() {
  return (0, _lift.operate)(function (source, subscriber) {
    var prev;
    var hasPrev = false;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var p = prev;
      prev = value;
      hasPrev && subscriber.next([p, value]);
      hasPrev = true;
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],112:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pluck = pluck;
var _map = require("./map");
function pluck() {
  var properties = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    properties[_i] = arguments[_i];
  }
  var length = properties.length;
  if (length === 0) {
    throw new Error('list of properties cannot be empty.');
  }
  return (0, _map.map)(function (x) {
    var currentProp = x;
    for (var i = 0; i < length; i++) {
      var p = currentProp === null || currentProp === void 0 ? void 0 : currentProp[properties[i]];
      if (typeof p !== 'undefined') {
        currentProp = p;
      } else {
        return undefined;
      }
    }
    return currentProp;
  });
}

},{"./map":96}],113:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publish = publish;
var _Subject = require("../Subject");
var _multicast = require("./multicast");
var _connect = require("./connect");
function publish(selector) {
  return selector ? function (source) {
    return (0, _connect.connect)(selector)(source);
  } : function (source) {
    return (0, _multicast.multicast)(new _Subject.Subject())(source);
  };
}

},{"../Subject":12,"./connect":67,"./multicast":108}],114:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishBehavior = publishBehavior;
var _BehaviorSubject = require("../BehaviorSubject");
var _ConnectableObservable = require("../observable/ConnectableObservable");
function publishBehavior(initialValue) {
  return function (source) {
    var subject = new _BehaviorSubject.BehaviorSubject(initialValue);
    return new _ConnectableObservable.ConnectableObservable(source, function () {
      return subject;
    });
  };
}

},{"../BehaviorSubject":6,"../observable/ConnectableObservable":18}],115:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishLast = publishLast;
var _AsyncSubject = require("../AsyncSubject");
var _ConnectableObservable = require("../observable/ConnectableObservable");
function publishLast() {
  return function (source) {
    var subject = new _AsyncSubject.AsyncSubject();
    return new _ConnectableObservable.ConnectableObservable(source, function () {
      return subject;
    });
  };
}

},{"../AsyncSubject":5,"../observable/ConnectableObservable":18}],116:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishReplay = publishReplay;
var _ReplaySubject = require("../ReplaySubject");
var _multicast = require("./multicast");
var _isFunction = require("../util/isFunction");
function publishReplay(bufferSize, windowTime, selectorOrScheduler, timestampProvider) {
  if (selectorOrScheduler && !(0, _isFunction.isFunction)(selectorOrScheduler)) {
    timestampProvider = selectorOrScheduler;
  }
  var selector = (0, _isFunction.isFunction)(selectorOrScheduler) ? selectorOrScheduler : undefined;
  return function (source) {
    return (0, _multicast.multicast)(new _ReplaySubject.ReplaySubject(bufferSize, windowTime, timestampProvider), selector)(source);
  };
}

},{"../ReplaySubject":10,"../util/isFunction":213,"./multicast":108}],117:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.raceWith = raceWith;
var _tslib = require("tslib");
var _race = require("../observable/race");
var _lift = require("../util/lift");
var _identity = require("../util/identity");
function raceWith() {
  var otherSources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    otherSources[_i] = arguments[_i];
  }
  return !otherSources.length ? _identity.identity : (0, _lift.operate)(function (source, subscriber) {
    (0, _race.raceInit)((0, _tslib.__spreadArray)([source], (0, _tslib.__read)(otherSources)))(subscriber);
  });
}

},{"../observable/race":43,"../util/identity":209,"../util/lift":220,"tslib":227}],118:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reduce = reduce;
var _scanInternals = require("./scanInternals");
var _lift = require("../util/lift");
function reduce(accumulator, seed) {
  return (0, _lift.operate)((0, _scanInternals.scanInternals)(accumulator, seed, arguments.length >= 2, false, true));
}

},{"../util/lift":220,"./scanInternals":127}],119:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.refCount = refCount;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function refCount() {
  return (0, _lift.operate)(function (source, subscriber) {
    var connection = null;
    source._refCount++;
    var refCounter = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, undefined, undefined, function () {
      if (!source || source._refCount <= 0 || 0 < --source._refCount) {
        connection = null;
        return;
      }
      var sharedConnection = source._connection;
      var conn = connection;
      connection = null;
      if (sharedConnection && (!conn || sharedConnection === conn)) {
        sharedConnection.unsubscribe();
      }
      subscriber.unsubscribe();
    });
    source.subscribe(refCounter);
    if (!refCounter.closed) {
      connection = source.connect();
    }
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],120:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.repeat = repeat;
var _empty = require("../observable/empty");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
var _timer = require("../observable/timer");
function repeat(countOrConfig) {
  var _a;
  var count = Infinity;
  var delay;
  if (countOrConfig != null) {
    if (typeof countOrConfig === 'object') {
      _a = countOrConfig.count, count = _a === void 0 ? Infinity : _a, delay = countOrConfig.delay;
    } else {
      count = countOrConfig;
    }
  }
  return count <= 0 ? function () {
    return _empty.EMPTY;
  } : (0, _lift.operate)(function (source, subscriber) {
    var soFar = 0;
    var sourceSub;
    var resubscribe = function () {
      sourceSub === null || sourceSub === void 0 ? void 0 : sourceSub.unsubscribe();
      sourceSub = null;
      if (delay != null) {
        var notifier = typeof delay === 'number' ? (0, _timer.timer)(delay) : (0, _innerFrom.innerFrom)(delay(soFar));
        var notifierSubscriber_1 = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
          notifierSubscriber_1.unsubscribe();
          subscribeToSource();
        });
        notifier.subscribe(notifierSubscriber_1);
      } else {
        subscribeToSource();
      }
    };
    var subscribeToSource = function () {
      var syncUnsub = false;
      sourceSub = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, function () {
        if (++soFar < count) {
          if (sourceSub) {
            resubscribe();
          } else {
            syncUnsub = true;
          }
        } else {
          subscriber.complete();
        }
      }));
      if (syncUnsub) {
        resubscribe();
      }
    };
    subscribeToSource();
  });
}

},{"../observable/empty":27,"../observable/innerFrom":35,"../observable/timer":46,"../util/lift":220,"./OperatorSubscriber":49}],121:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.repeatWhen = repeatWhen;
var _innerFrom = require("../observable/innerFrom");
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function repeatWhen(notifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    var innerSub;
    var syncResub = false;
    var completions$;
    var isNotifierComplete = false;
    var isMainComplete = false;
    var checkComplete = function () {
      return isMainComplete && isNotifierComplete && (subscriber.complete(), true);
    };
    var getCompletionSubject = function () {
      if (!completions$) {
        completions$ = new _Subject.Subject();
        (0, _innerFrom.innerFrom)(notifier(completions$)).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
          if (innerSub) {
            subscribeForRepeatWhen();
          } else {
            syncResub = true;
          }
        }, function () {
          isNotifierComplete = true;
          checkComplete();
        }));
      }
      return completions$;
    };
    var subscribeForRepeatWhen = function () {
      isMainComplete = false;
      innerSub = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, function () {
        isMainComplete = true;
        !checkComplete() && getCompletionSubject().next();
      }));
      if (syncResub) {
        innerSub.unsubscribe();
        innerSub = null;
        syncResub = false;
        subscribeForRepeatWhen();
      }
    };
    subscribeForRepeatWhen();
  });
}

},{"../Subject":12,"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],122:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.retry = retry;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _identity = require("../util/identity");
var _timer = require("../observable/timer");
var _innerFrom = require("../observable/innerFrom");
function retry(configOrCount) {
  if (configOrCount === void 0) {
    configOrCount = Infinity;
  }
  var config;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount;
  } else {
    config = {
      count: configOrCount
    };
  }
  var _a = config.count,
    count = _a === void 0 ? Infinity : _a,
    delay = config.delay,
    _b = config.resetOnSuccess,
    resetOnSuccess = _b === void 0 ? false : _b;
  return count <= 0 ? _identity.identity : (0, _lift.operate)(function (source, subscriber) {
    var soFar = 0;
    var innerSub;
    var subscribeForRetry = function () {
      var syncUnsub = false;
      innerSub = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
        if (resetOnSuccess) {
          soFar = 0;
        }
        subscriber.next(value);
      }, undefined, function (err) {
        if (soFar++ < count) {
          var resub_1 = function () {
            if (innerSub) {
              innerSub.unsubscribe();
              innerSub = null;
              subscribeForRetry();
            } else {
              syncUnsub = true;
            }
          };
          if (delay != null) {
            var notifier = typeof delay === 'number' ? (0, _timer.timer)(delay) : (0, _innerFrom.innerFrom)(delay(err, soFar));
            var notifierSubscriber_1 = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
              notifierSubscriber_1.unsubscribe();
              resub_1();
            }, function () {
              subscriber.complete();
            });
            notifier.subscribe(notifierSubscriber_1);
          } else {
            resub_1();
          }
        } else {
          subscriber.error(err);
        }
      }));
      if (syncUnsub) {
        innerSub.unsubscribe();
        innerSub = null;
        subscribeForRetry();
      }
    };
    subscribeForRetry();
  });
}

},{"../observable/innerFrom":35,"../observable/timer":46,"../util/identity":209,"../util/lift":220,"./OperatorSubscriber":49}],123:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.retryWhen = retryWhen;
var _innerFrom = require("../observable/innerFrom");
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function retryWhen(notifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    var innerSub;
    var syncResub = false;
    var errors$;
    var subscribeForRetryWhen = function () {
      innerSub = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, undefined, undefined, function (err) {
        if (!errors$) {
          errors$ = new _Subject.Subject();
          (0, _innerFrom.innerFrom)(notifier(errors$)).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
            return innerSub ? subscribeForRetryWhen() : syncResub = true;
          }));
        }
        if (errors$) {
          errors$.next(err);
        }
      }));
      if (syncResub) {
        innerSub.unsubscribe();
        innerSub = null;
        syncResub = false;
        subscribeForRetryWhen();
      }
    };
    subscribeForRetryWhen();
  });
}

},{"../Subject":12,"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],124:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sample = sample;
var _innerFrom = require("../observable/innerFrom");
var _lift = require("../util/lift");
var _noop = require("../util/noop");
var _OperatorSubscriber = require("./OperatorSubscriber");
function sample(notifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    var lastValue = null;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      hasValue = true;
      lastValue = value;
    }));
    (0, _innerFrom.innerFrom)(notifier).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      if (hasValue) {
        hasValue = false;
        var value = lastValue;
        lastValue = null;
        subscriber.next(value);
      }
    }, _noop.noop));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],125:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sampleTime = sampleTime;
var _async = require("../scheduler/async");
var _sample = require("./sample");
var _interval = require("../observable/interval");
function sampleTime(period, scheduler) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  return (0, _sample.sample)((0, _interval.interval)(period, scheduler));
}

},{"../observable/interval":36,"../scheduler/async":184,"./sample":124}],126:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scan = scan;
var _lift = require("../util/lift");
var _scanInternals = require("./scanInternals");
function scan(accumulator, seed) {
  return (0, _lift.operate)((0, _scanInternals.scanInternals)(accumulator, seed, arguments.length >= 2, true));
}

},{"../util/lift":220,"./scanInternals":127}],127:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scanInternals = scanInternals;
var _OperatorSubscriber = require("./OperatorSubscriber");
function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
  return function (source, subscriber) {
    var hasState = hasSeed;
    var state = seed;
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var i = index++;
      state = hasState ? accumulator(state, value, i) : (hasState = true, value);
      emitOnNext && subscriber.next(state);
    }, emitBeforeComplete && function () {
      hasState && subscriber.next(state);
      subscriber.complete();
    }));
  };
}

},{"./OperatorSubscriber":49}],128:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sequenceEqual = sequenceEqual;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function sequenceEqual(compareTo, comparator) {
  if (comparator === void 0) {
    comparator = function (a, b) {
      return a === b;
    };
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var aState = createState();
    var bState = createState();
    var emit = function (isEqual) {
      subscriber.next(isEqual);
      subscriber.complete();
    };
    var createSubscriber = function (selfState, otherState) {
      var sequenceEqualSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (a) {
        var buffer = otherState.buffer,
          complete = otherState.complete;
        if (buffer.length === 0) {
          complete ? emit(false) : selfState.buffer.push(a);
        } else {
          !comparator(a, buffer.shift()) && emit(false);
        }
      }, function () {
        selfState.complete = true;
        var complete = otherState.complete,
          buffer = otherState.buffer;
        complete && emit(buffer.length === 0);
        sequenceEqualSubscriber === null || sequenceEqualSubscriber === void 0 ? void 0 : sequenceEqualSubscriber.unsubscribe();
      });
      return sequenceEqualSubscriber;
    };
    source.subscribe(createSubscriber(aState, bState));
    (0, _innerFrom.innerFrom)(compareTo).subscribe(createSubscriber(bState, aState));
  });
}
function createState() {
  return {
    buffer: [],
    complete: false
  };
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],129:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.share = share;
var _tslib = require("tslib");
var _innerFrom = require("../observable/innerFrom");
var _Subject = require("../Subject");
var _Subscriber = require("../Subscriber");
var _lift = require("../util/lift");
function share(options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.connector,
    connector = _a === void 0 ? function () {
      return new _Subject.Subject();
    } : _a,
    _b = options.resetOnError,
    resetOnError = _b === void 0 ? true : _b,
    _c = options.resetOnComplete,
    resetOnComplete = _c === void 0 ? true : _c,
    _d = options.resetOnRefCountZero,
    resetOnRefCountZero = _d === void 0 ? true : _d;
  return function (wrapperSource) {
    var connection;
    var resetConnection;
    var subject;
    var refCount = 0;
    var hasCompleted = false;
    var hasErrored = false;
    var cancelReset = function () {
      resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
      resetConnection = undefined;
    };
    var reset = function () {
      cancelReset();
      connection = subject = undefined;
      hasCompleted = hasErrored = false;
    };
    var resetAndUnsubscribe = function () {
      var conn = connection;
      reset();
      conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
    };
    return (0, _lift.operate)(function (source, subscriber) {
      refCount++;
      if (!hasErrored && !hasCompleted) {
        cancelReset();
      }
      var dest = subject = subject !== null && subject !== void 0 ? subject : connector();
      subscriber.add(function () {
        refCount--;
        if (refCount === 0 && !hasErrored && !hasCompleted) {
          resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
        }
      });
      dest.subscribe(subscriber);
      if (!connection && refCount > 0) {
        connection = new _Subscriber.SafeSubscriber({
          next: function (value) {
            return dest.next(value);
          },
          error: function (err) {
            hasErrored = true;
            cancelReset();
            resetConnection = handleReset(reset, resetOnError, err);
            dest.error(err);
          },
          complete: function () {
            hasCompleted = true;
            cancelReset();
            resetConnection = handleReset(reset, resetOnComplete);
            dest.complete();
          }
        });
        (0, _innerFrom.innerFrom)(source).subscribe(connection);
      }
    })(wrapperSource);
  };
}
function handleReset(reset, on) {
  var args = [];
  for (var _i = 2; _i < arguments.length; _i++) {
    args[_i - 2] = arguments[_i];
  }
  if (on === true) {
    reset();
    return;
  }
  if (on === false) {
    return;
  }
  var onSubscriber = new _Subscriber.SafeSubscriber({
    next: function () {
      onSubscriber.unsubscribe();
      reset();
    }
  });
  return (0, _innerFrom.innerFrom)(on.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args)))).subscribe(onSubscriber);
}

},{"../Subject":12,"../Subscriber":13,"../observable/innerFrom":35,"../util/lift":220,"tslib":227}],130:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shareReplay = shareReplay;
var _ReplaySubject = require("../ReplaySubject");
var _share = require("./share");
function shareReplay(configOrBufferSize, windowTime, scheduler) {
  var _a, _b, _c;
  var bufferSize;
  var refCount = false;
  if (configOrBufferSize && typeof configOrBufferSize === 'object') {
    _a = configOrBufferSize.bufferSize, bufferSize = _a === void 0 ? Infinity : _a, _b = configOrBufferSize.windowTime, windowTime = _b === void 0 ? Infinity : _b, _c = configOrBufferSize.refCount, refCount = _c === void 0 ? false : _c, scheduler = configOrBufferSize.scheduler;
  } else {
    bufferSize = configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity;
  }
  return (0, _share.share)({
    connector: function () {
      return new _ReplaySubject.ReplaySubject(bufferSize, windowTime, scheduler);
    },
    resetOnError: true,
    resetOnComplete: false,
    resetOnRefCountZero: refCount
  });
}

},{"../ReplaySubject":10,"./share":129}],131:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.single = single;
var _EmptyError = require("../util/EmptyError");
var _SequenceError = require("../util/SequenceError");
var _NotFoundError = require("../util/NotFoundError");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function single(predicate) {
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    var singleValue;
    var seenValue = false;
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      seenValue = true;
      if (!predicate || predicate(value, index++, source)) {
        hasValue && subscriber.error(new _SequenceError.SequenceError('Too many matching values'));
        hasValue = true;
        singleValue = value;
      }
    }, function () {
      if (hasValue) {
        subscriber.next(singleValue);
        subscriber.complete();
      } else {
        subscriber.error(seenValue ? new _NotFoundError.NotFoundError('No matching values') : new _EmptyError.EmptyError());
      }
    }));
  });
}

},{"../util/EmptyError":195,"../util/NotFoundError":197,"../util/SequenceError":199,"../util/lift":220,"./OperatorSubscriber":49}],132:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.skip = skip;
var _filter = require("./filter");
function skip(count) {
  return (0, _filter.filter)(function (_, index) {
    return count <= index;
  });
}

},{"./filter":85}],133:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.skipLast = skipLast;
var _identity = require("../util/identity");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function skipLast(skipCount) {
  return skipCount <= 0 ? _identity.identity : (0, _lift.operate)(function (source, subscriber) {
    var ring = new Array(skipCount);
    var seen = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var valueIndex = seen++;
      if (valueIndex < skipCount) {
        ring[valueIndex] = value;
      } else {
        var index = valueIndex % skipCount;
        var oldValue = ring[index];
        ring[index] = value;
        subscriber.next(oldValue);
      }
    }));
    return function () {
      ring = null;
    };
  });
}

},{"../util/identity":209,"../util/lift":220,"./OperatorSubscriber":49}],134:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.skipUntil = skipUntil;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
var _noop = require("../util/noop");
function skipUntil(notifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    var taking = false;
    var skipSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      skipSubscriber === null || skipSubscriber === void 0 ? void 0 : skipSubscriber.unsubscribe();
      taking = true;
    }, _noop.noop);
    (0, _innerFrom.innerFrom)(notifier).subscribe(skipSubscriber);
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return taking && subscriber.next(value);
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],135:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.skipWhile = skipWhile;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function skipWhile(predicate) {
  return (0, _lift.operate)(function (source, subscriber) {
    var taking = false;
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return (taking || (taking = !predicate(value, index++))) && subscriber.next(value);
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],136:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startWith = startWith;
var _concat = require("../observable/concat");
var _args = require("../util/args");
var _lift = require("../util/lift");
function startWith() {
  var values = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    values[_i] = arguments[_i];
  }
  var scheduler = (0, _args.popScheduler)(values);
  return (0, _lift.operate)(function (source, subscriber) {
    (scheduler ? (0, _concat.concat)(values, source, scheduler) : (0, _concat.concat)(values, source)).subscribe(subscriber);
  });
}

},{"../observable/concat":23,"../util/args":201,"../util/lift":220}],137:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribeOn = subscribeOn;
var _lift = require("../util/lift");
function subscribeOn(scheduler, delay) {
  if (delay === void 0) {
    delay = 0;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    subscriber.add(scheduler.schedule(function () {
      return source.subscribe(subscriber);
    }, delay));
  });
}

},{"../util/lift":220}],138:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switchAll = switchAll;
var _switchMap = require("./switchMap");
var _identity = require("../util/identity");
function switchAll() {
  return (0, _switchMap.switchMap)(_identity.identity);
}

},{"../util/identity":209,"./switchMap":139}],139:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switchMap = switchMap;
var _innerFrom = require("../observable/innerFrom");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function switchMap(project, resultSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var innerSubscriber = null;
    var index = 0;
    var isComplete = false;
    var checkComplete = function () {
      return isComplete && !innerSubscriber && subscriber.complete();
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      innerSubscriber === null || innerSubscriber === void 0 ? void 0 : innerSubscriber.unsubscribe();
      var innerIndex = 0;
      var outerIndex = index++;
      (0, _innerFrom.innerFrom)(project(value, outerIndex)).subscribe(innerSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (innerValue) {
        return subscriber.next(resultSelector ? resultSelector(value, innerValue, outerIndex, innerIndex++) : innerValue);
      }, function () {
        innerSubscriber = null;
        checkComplete();
      }));
    }, function () {
      isComplete = true;
      checkComplete();
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],140:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switchMapTo = switchMapTo;
var _switchMap = require("./switchMap");
var _isFunction = require("../util/isFunction");
function switchMapTo(innerObservable, resultSelector) {
  return (0, _isFunction.isFunction)(resultSelector) ? (0, _switchMap.switchMap)(function () {
    return innerObservable;
  }, resultSelector) : (0, _switchMap.switchMap)(function () {
    return innerObservable;
  });
}

},{"../util/isFunction":213,"./switchMap":139}],141:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switchScan = switchScan;
var _switchMap = require("./switchMap");
var _lift = require("../util/lift");
function switchScan(accumulator, seed) {
  return (0, _lift.operate)(function (source, subscriber) {
    var state = seed;
    (0, _switchMap.switchMap)(function (value, index) {
      return accumulator(state, value, index);
    }, function (_, innerValue) {
      return state = innerValue, innerValue;
    })(source).subscribe(subscriber);
    return function () {
      state = null;
    };
  });
}

},{"../util/lift":220,"./switchMap":139}],142:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.take = take;
var _empty = require("../observable/empty");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function take(count) {
  return count <= 0 ? function () {
    return _empty.EMPTY;
  } : (0, _lift.operate)(function (source, subscriber) {
    var seen = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      if (++seen <= count) {
        subscriber.next(value);
        if (count <= seen) {
          subscriber.complete();
        }
      }
    }));
  });
}

},{"../observable/empty":27,"../util/lift":220,"./OperatorSubscriber":49}],143:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeLast = takeLast;
var _tslib = require("tslib");
var _empty = require("../observable/empty");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function takeLast(count) {
  return count <= 0 ? function () {
    return _empty.EMPTY;
  } : (0, _lift.operate)(function (source, subscriber) {
    var buffer = [];
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      buffer.push(value);
      count < buffer.length && buffer.shift();
    }, function () {
      var e_1, _a;
      try {
        for (var buffer_1 = (0, _tslib.__values)(buffer), buffer_1_1 = buffer_1.next(); !buffer_1_1.done; buffer_1_1 = buffer_1.next()) {
          var value = buffer_1_1.value;
          subscriber.next(value);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (buffer_1_1 && !buffer_1_1.done && (_a = buffer_1.return)) _a.call(buffer_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      subscriber.complete();
    }, undefined, function () {
      buffer = null;
    }));
  });
}

},{"../observable/empty":27,"../util/lift":220,"./OperatorSubscriber":49,"tslib":227}],144:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeUntil = takeUntil;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
var _noop = require("../util/noop");
function takeUntil(notifier) {
  return (0, _lift.operate)(function (source, subscriber) {
    (0, _innerFrom.innerFrom)(notifier).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      return subscriber.complete();
    }, _noop.noop));
    !subscriber.closed && source.subscribe(subscriber);
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],145:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeWhile = takeWhile;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function takeWhile(predicate, inclusive) {
  if (inclusive === void 0) {
    inclusive = false;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var index = 0;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var result = predicate(value, index++);
      (result || inclusive) && subscriber.next(value);
      !result && subscriber.complete();
    }));
  });
}

},{"../util/lift":220,"./OperatorSubscriber":49}],146:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tap = tap;
var _isFunction = require("../util/isFunction");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _identity = require("../util/identity");
function tap(observerOrNext, error, complete) {
  var tapObserver = (0, _isFunction.isFunction)(observerOrNext) || error || complete ? {
    next: observerOrNext,
    error: error,
    complete: complete
  } : observerOrNext;
  return tapObserver ? (0, _lift.operate)(function (source, subscriber) {
    var _a;
    (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
    var isUnsub = true;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var _a;
      (_a = tapObserver.next) === null || _a === void 0 ? void 0 : _a.call(tapObserver, value);
      subscriber.next(value);
    }, function () {
      var _a;
      isUnsub = false;
      (_a = tapObserver.complete) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
      subscriber.complete();
    }, function (err) {
      var _a;
      isUnsub = false;
      (_a = tapObserver.error) === null || _a === void 0 ? void 0 : _a.call(tapObserver, err);
      subscriber.error(err);
    }, function () {
      var _a, _b;
      if (isUnsub) {
        (_a = tapObserver.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
      }
      (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
    }));
  }) : _identity.identity;
}

},{"../util/identity":209,"../util/isFunction":213,"../util/lift":220,"./OperatorSubscriber":49}],147:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttle = throttle;
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function throttle(durationSelector, config) {
  return (0, _lift.operate)(function (source, subscriber) {
    var _a = config !== null && config !== void 0 ? config : {},
      _b = _a.leading,
      leading = _b === void 0 ? true : _b,
      _c = _a.trailing,
      trailing = _c === void 0 ? false : _c;
    var hasValue = false;
    var sendValue = null;
    var throttled = null;
    var isComplete = false;
    var endThrottling = function () {
      throttled === null || throttled === void 0 ? void 0 : throttled.unsubscribe();
      throttled = null;
      if (trailing) {
        send();
        isComplete && subscriber.complete();
      }
    };
    var cleanupThrottling = function () {
      throttled = null;
      isComplete && subscriber.complete();
    };
    var startThrottle = function (value) {
      return throttled = (0, _innerFrom.innerFrom)(durationSelector(value)).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, endThrottling, cleanupThrottling));
    };
    var send = function () {
      if (hasValue) {
        hasValue = false;
        var value = sendValue;
        sendValue = null;
        subscriber.next(value);
        !isComplete && startThrottle(value);
      }
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      hasValue = true;
      sendValue = value;
      !(throttled && !throttled.closed) && (leading ? send() : startThrottle(value));
    }, function () {
      isComplete = true;
      !(trailing && hasValue && throttled && !throttled.closed) && subscriber.complete();
    }));
  });
}

},{"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],148:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttleTime = throttleTime;
var _async = require("../scheduler/async");
var _throttle = require("./throttle");
var _timer = require("../observable/timer");
function throttleTime(duration, scheduler, config) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  var duration$ = (0, _timer.timer)(duration, scheduler);
  return (0, _throttle.throttle)(function () {
    return duration$;
  }, config);
}

},{"../observable/timer":46,"../scheduler/async":184,"./throttle":147}],149:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throwIfEmpty = throwIfEmpty;
var _EmptyError = require("../util/EmptyError");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function throwIfEmpty(errorFactory) {
  if (errorFactory === void 0) {
    errorFactory = defaultErrorFactory;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var hasValue = false;
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      hasValue = true;
      subscriber.next(value);
    }, function () {
      return hasValue ? subscriber.complete() : subscriber.error(errorFactory());
    }));
  });
}
function defaultErrorFactory() {
  return new _EmptyError.EmptyError();
}

},{"../util/EmptyError":195,"../util/lift":220,"./OperatorSubscriber":49}],150:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TimeInterval = void 0;
exports.timeInterval = timeInterval;
var _async = require("../scheduler/async");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function timeInterval(scheduler) {
  if (scheduler === void 0) {
    scheduler = _async.asyncScheduler;
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var last = scheduler.now();
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var now = scheduler.now();
      var interval = now - last;
      last = now;
      subscriber.next(new TimeInterval(value, interval));
    }));
  });
}
var TimeInterval = exports.TimeInterval = function () {
  function TimeInterval(value, interval) {
    this.value = value;
    this.interval = interval;
  }
  return TimeInterval;
}();

},{"../scheduler/async":184,"../util/lift":220,"./OperatorSubscriber":49}],151:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TimeoutError = void 0;
exports.timeout = timeout;
var _async = require("../scheduler/async");
var _isDate = require("../util/isDate");
var _lift = require("../util/lift");
var _innerFrom = require("../observable/innerFrom");
var _createErrorClass = require("../util/createErrorClass");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _executeSchedule = require("../util/executeSchedule");
var TimeoutError = exports.TimeoutError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function TimeoutErrorImpl(info) {
    if (info === void 0) {
      info = null;
    }
    _super(this);
    this.message = 'Timeout has occurred';
    this.name = 'TimeoutError';
    this.info = info;
  };
});
function timeout(config, schedulerArg) {
  var _a = (0, _isDate.isValidDate)(config) ? {
      first: config
    } : typeof config === 'number' ? {
      each: config
    } : config,
    first = _a.first,
    each = _a.each,
    _b = _a.with,
    _with = _b === void 0 ? timeoutErrorFactory : _b,
    _c = _a.scheduler,
    scheduler = _c === void 0 ? schedulerArg !== null && schedulerArg !== void 0 ? schedulerArg : _async.asyncScheduler : _c,
    _d = _a.meta,
    meta = _d === void 0 ? null : _d;
  if (first == null && each == null) {
    throw new TypeError('No timeout provided.');
  }
  return (0, _lift.operate)(function (source, subscriber) {
    var originalSourceSubscription;
    var timerSubscription;
    var lastValue = null;
    var seen = 0;
    var startTimer = function (delay) {
      timerSubscription = (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        try {
          originalSourceSubscription.unsubscribe();
          (0, _innerFrom.innerFrom)(_with({
            meta: meta,
            lastValue: lastValue,
            seen: seen
          })).subscribe(subscriber);
        } catch (err) {
          subscriber.error(err);
        }
      }, delay);
    };
    originalSourceSubscription = source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
      seen++;
      subscriber.next(lastValue = value);
      each > 0 && startTimer(each);
    }, undefined, undefined, function () {
      if (!(timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.closed)) {
        timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
      }
      lastValue = null;
    }));
    !seen && startTimer(first != null ? typeof first === 'number' ? first : +first - scheduler.now() : each);
  });
}
function timeoutErrorFactory(info) {
  throw new TimeoutError(info);
}

},{"../observable/innerFrom":35,"../scheduler/async":184,"../util/createErrorClass":205,"../util/executeSchedule":208,"../util/isDate":212,"../util/lift":220,"./OperatorSubscriber":49}],152:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timeoutWith = timeoutWith;
var _async = require("../scheduler/async");
var _isDate = require("../util/isDate");
var _timeout = require("./timeout");
function timeoutWith(due, withObservable, scheduler) {
  var first;
  var each;
  var _with;
  scheduler = scheduler !== null && scheduler !== void 0 ? scheduler : _async.async;
  if ((0, _isDate.isValidDate)(due)) {
    first = due;
  } else if (typeof due === 'number') {
    each = due;
  }
  if (withObservable) {
    _with = function () {
      return withObservable;
    };
  } else {
    throw new TypeError('No observable provided to switch to');
  }
  if (first == null && each == null) {
    throw new TypeError('No timeout provided.');
  }
  return (0, _timeout.timeout)({
    first: first,
    each: each,
    scheduler: scheduler,
    with: _with
  });
}

},{"../scheduler/async":184,"../util/isDate":212,"./timeout":151}],153:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timestamp = timestamp;
var _dateTimestampProvider = require("../scheduler/dateTimestampProvider");
var _map = require("./map");
function timestamp(timestampProvider) {
  if (timestampProvider === void 0) {
    timestampProvider = _dateTimestampProvider.dateTimestampProvider;
  }
  return (0, _map.map)(function (value) {
    return {
      value: value,
      timestamp: timestampProvider.now()
    };
  });
}

},{"../scheduler/dateTimestampProvider":185,"./map":96}],154:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toArray = toArray;
var _reduce = require("./reduce");
var _lift = require("../util/lift");
var arrReducer = function (arr, value) {
  return arr.push(value), arr;
};
function toArray() {
  return (0, _lift.operate)(function (source, subscriber) {
    (0, _reduce.reduce)(arrReducer, [])(source).subscribe(subscriber);
  });
}

},{"../util/lift":220,"./reduce":118}],155:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.window = window;
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _noop = require("../util/noop");
var _innerFrom = require("../observable/innerFrom");
function window(windowBoundaries) {
  return (0, _lift.operate)(function (source, subscriber) {
    var windowSubject = new _Subject.Subject();
    subscriber.next(windowSubject.asObservable());
    var errorHandler = function (err) {
      windowSubject.error(err);
      subscriber.error(err);
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.next(value);
    }, function () {
      windowSubject.complete();
      subscriber.complete();
    }, errorHandler));
    (0, _innerFrom.innerFrom)(windowBoundaries).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function () {
      windowSubject.complete();
      subscriber.next(windowSubject = new _Subject.Subject());
    }, _noop.noop, errorHandler));
    return function () {
      windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.unsubscribe();
      windowSubject = null;
    };
  });
}

},{"../Subject":12,"../observable/innerFrom":35,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49}],156:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.windowCount = windowCount;
var _tslib = require("tslib");
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
function windowCount(windowSize, startWindowEvery) {
  if (startWindowEvery === void 0) {
    startWindowEvery = 0;
  }
  var startEvery = startWindowEvery > 0 ? startWindowEvery : windowSize;
  return (0, _lift.operate)(function (source, subscriber) {
    var windows = [new _Subject.Subject()];
    var starts = [];
    var count = 0;
    subscriber.next(windows[0].asObservable());
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var e_1, _a;
      try {
        for (var windows_1 = (0, _tslib.__values)(windows), windows_1_1 = windows_1.next(); !windows_1_1.done; windows_1_1 = windows_1.next()) {
          var window_1 = windows_1_1.value;
          window_1.next(value);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (windows_1_1 && !windows_1_1.done && (_a = windows_1.return)) _a.call(windows_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      var c = count - windowSize + 1;
      if (c >= 0 && c % startEvery === 0) {
        windows.shift().complete();
      }
      if (++count % startEvery === 0) {
        var window_2 = new _Subject.Subject();
        windows.push(window_2);
        subscriber.next(window_2.asObservable());
      }
    }, function () {
      while (windows.length > 0) {
        windows.shift().complete();
      }
      subscriber.complete();
    }, function (err) {
      while (windows.length > 0) {
        windows.shift().error(err);
      }
      subscriber.error(err);
    }, function () {
      starts = null;
      windows = null;
    }));
  });
}

},{"../Subject":12,"../util/lift":220,"./OperatorSubscriber":49,"tslib":227}],157:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.windowTime = windowTime;
var _Subject = require("../Subject");
var _async = require("../scheduler/async");
var _Subscription = require("../Subscription");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _arrRemove = require("../util/arrRemove");
var _args = require("../util/args");
var _executeSchedule = require("../util/executeSchedule");
function windowTime(windowTimeSpan) {
  var _a, _b;
  var otherArgs = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    otherArgs[_i - 1] = arguments[_i];
  }
  var scheduler = (_a = (0, _args.popScheduler)(otherArgs)) !== null && _a !== void 0 ? _a : _async.asyncScheduler;
  var windowCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
  var maxWindowSize = otherArgs[1] || Infinity;
  return (0, _lift.operate)(function (source, subscriber) {
    var windowRecords = [];
    var restartOnClose = false;
    var closeWindow = function (record) {
      var window = record.window,
        subs = record.subs;
      window.complete();
      subs.unsubscribe();
      (0, _arrRemove.arrRemove)(windowRecords, record);
      restartOnClose && startWindow();
    };
    var startWindow = function () {
      if (windowRecords) {
        var subs = new _Subscription.Subscription();
        subscriber.add(subs);
        var window_1 = new _Subject.Subject();
        var record_1 = {
          window: window_1,
          subs: subs,
          seen: 0
        };
        windowRecords.push(record_1);
        subscriber.next(window_1.asObservable());
        (0, _executeSchedule.executeSchedule)(subs, scheduler, function () {
          return closeWindow(record_1);
        }, windowTimeSpan);
      }
    };
    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      (0, _executeSchedule.executeSchedule)(subscriber, scheduler, startWindow, windowCreationInterval, true);
    } else {
      restartOnClose = true;
    }
    startWindow();
    var loop = function (cb) {
      return windowRecords.slice().forEach(cb);
    };
    var terminate = function (cb) {
      loop(function (_a) {
        var window = _a.window;
        return cb(window);
      });
      cb(subscriber);
      subscriber.unsubscribe();
    };
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      loop(function (record) {
        record.window.next(value);
        maxWindowSize <= ++record.seen && closeWindow(record);
      });
    }, function () {
      return terminate(function (consumer) {
        return consumer.complete();
      });
    }, function (err) {
      return terminate(function (consumer) {
        return consumer.error(err);
      });
    }));
    return function () {
      windowRecords = null;
    };
  });
}

},{"../Subject":12,"../Subscription":14,"../scheduler/async":184,"../util/args":201,"../util/arrRemove":204,"../util/executeSchedule":208,"../util/lift":220,"./OperatorSubscriber":49}],158:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.windowToggle = windowToggle;
var _tslib = require("tslib");
var _Subject = require("../Subject");
var _Subscription = require("../Subscription");
var _lift = require("../util/lift");
var _innerFrom = require("../observable/innerFrom");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _noop = require("../util/noop");
var _arrRemove = require("../util/arrRemove");
function windowToggle(openings, closingSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var windows = [];
    var handleError = function (err) {
      while (0 < windows.length) {
        windows.shift().error(err);
      }
      subscriber.error(err);
    };
    (0, _innerFrom.innerFrom)(openings).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (openValue) {
      var window = new _Subject.Subject();
      windows.push(window);
      var closingSubscription = new _Subscription.Subscription();
      var closeWindow = function () {
        (0, _arrRemove.arrRemove)(windows, window);
        window.complete();
        closingSubscription.unsubscribe();
      };
      var closingNotifier;
      try {
        closingNotifier = (0, _innerFrom.innerFrom)(closingSelector(openValue));
      } catch (err) {
        handleError(err);
        return;
      }
      subscriber.next(window.asObservable());
      closingSubscription.add(closingNotifier.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, closeWindow, _noop.noop, handleError)));
    }, _noop.noop));
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      var e_1, _a;
      var windowsCopy = windows.slice();
      try {
        for (var windowsCopy_1 = (0, _tslib.__values)(windowsCopy), windowsCopy_1_1 = windowsCopy_1.next(); !windowsCopy_1_1.done; windowsCopy_1_1 = windowsCopy_1.next()) {
          var window_1 = windowsCopy_1_1.value;
          window_1.next(value);
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (windowsCopy_1_1 && !windowsCopy_1_1.done && (_a = windowsCopy_1.return)) _a.call(windowsCopy_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }, function () {
      while (0 < windows.length) {
        windows.shift().complete();
      }
      subscriber.complete();
    }, handleError, function () {
      while (0 < windows.length) {
        windows.shift().unsubscribe();
      }
    }));
  });
}

},{"../Subject":12,"../Subscription":14,"../observable/innerFrom":35,"../util/arrRemove":204,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49,"tslib":227}],159:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.windowWhen = windowWhen;
var _Subject = require("../Subject");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
function windowWhen(closingSelector) {
  return (0, _lift.operate)(function (source, subscriber) {
    var window;
    var closingSubscriber;
    var handleError = function (err) {
      window.error(err);
      subscriber.error(err);
    };
    var openWindow = function () {
      closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
      window === null || window === void 0 ? void 0 : window.complete();
      window = new _Subject.Subject();
      subscriber.next(window.asObservable());
      var closingNotifier;
      try {
        closingNotifier = (0, _innerFrom.innerFrom)(closingSelector());
      } catch (err) {
        handleError(err);
        return;
      }
      closingNotifier.subscribe(closingSubscriber = (0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, openWindow, openWindow, handleError));
    };
    openWindow();
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      return window.next(value);
    }, function () {
      window.complete();
      subscriber.complete();
    }, handleError, function () {
      closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
      window = null;
    }));
  });
}

},{"../Subject":12,"../observable/innerFrom":35,"../util/lift":220,"./OperatorSubscriber":49}],160:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withLatestFrom = withLatestFrom;
var _tslib = require("tslib");
var _lift = require("../util/lift");
var _OperatorSubscriber = require("./OperatorSubscriber");
var _innerFrom = require("../observable/innerFrom");
var _identity = require("../util/identity");
var _noop = require("../util/noop");
var _args = require("../util/args");
function withLatestFrom() {
  var inputs = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    inputs[_i] = arguments[_i];
  }
  var project = (0, _args.popResultSelector)(inputs);
  return (0, _lift.operate)(function (source, subscriber) {
    var len = inputs.length;
    var otherValues = new Array(len);
    var hasValue = inputs.map(function () {
      return false;
    });
    var ready = false;
    var _loop_1 = function (i) {
      (0, _innerFrom.innerFrom)(inputs[i]).subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
        otherValues[i] = value;
        if (!ready && !hasValue[i]) {
          hasValue[i] = true;
          (ready = hasValue.every(_identity.identity)) && (hasValue = null);
        }
      }, _noop.noop));
    };
    for (var i = 0; i < len; i++) {
      _loop_1(i);
    }
    source.subscribe((0, _OperatorSubscriber.createOperatorSubscriber)(subscriber, function (value) {
      if (ready) {
        var values = (0, _tslib.__spreadArray)([value], (0, _tslib.__read)(otherValues));
        subscriber.next(project ? project.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(values))) : values);
      }
    }));
  });
}

},{"../observable/innerFrom":35,"../util/args":201,"../util/identity":209,"../util/lift":220,"../util/noop":222,"./OperatorSubscriber":49,"tslib":227}],161:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zip = zip;
var _tslib = require("tslib");
var _zip = require("../observable/zip");
var _lift = require("../util/lift");
function zip() {
  var sources = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    sources[_i] = arguments[_i];
  }
  return (0, _lift.operate)(function (source, subscriber) {
    _zip.zip.apply(void 0, (0, _tslib.__spreadArray)([source], (0, _tslib.__read)(sources))).subscribe(subscriber);
  });
}

},{"../observable/zip":48,"../util/lift":220,"tslib":227}],162:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zipAll = zipAll;
var _zip = require("../observable/zip");
var _joinAllInternals = require("./joinAllInternals");
function zipAll(project) {
  return (0, _joinAllInternals.joinAllInternals)(_zip.zip, project);
}

},{"../observable/zip":48,"./joinAllInternals":94}],163:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zipWith = zipWith;
var _tslib = require("tslib");
var _zip = require("./zip");
function zipWith() {
  var otherInputs = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    otherInputs[_i] = arguments[_i];
  }
  return _zip.zip.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(otherInputs)));
}

},{"./zip":161,"tslib":227}],164:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleArray = scheduleArray;
var _Observable = require("../Observable");
function scheduleArray(input, scheduler) {
  return new _Observable.Observable(function (subscriber) {
    var i = 0;
    return scheduler.schedule(function () {
      if (i === input.length) {
        subscriber.complete();
      } else {
        subscriber.next(input[i++]);
        if (!subscriber.closed) {
          this.schedule();
        }
      }
    });
  });
}

},{"../Observable":9}],165:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleAsyncIterable = scheduleAsyncIterable;
var _Observable = require("../Observable");
var _executeSchedule = require("../util/executeSchedule");
function scheduleAsyncIterable(input, scheduler) {
  if (!input) {
    throw new Error('Iterable cannot be null');
  }
  return new _Observable.Observable(function (subscriber) {
    (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
      var iterator = input[Symbol.asyncIterator]();
      (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        iterator.next().then(function (result) {
          if (result.done) {
            subscriber.complete();
          } else {
            subscriber.next(result.value);
          }
        });
      }, 0, true);
    });
  });
}

},{"../Observable":9,"../util/executeSchedule":208}],166:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleIterable = scheduleIterable;
var _Observable = require("../Observable");
var _iterator = require("../symbol/iterator");
var _isFunction = require("../util/isFunction");
var _executeSchedule = require("../util/executeSchedule");
function scheduleIterable(input, scheduler) {
  return new _Observable.Observable(function (subscriber) {
    var iterator;
    (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
      iterator = input[_iterator.iterator]();
      (0, _executeSchedule.executeSchedule)(subscriber, scheduler, function () {
        var _a;
        var value;
        var done;
        try {
          _a = iterator.next(), value = _a.value, done = _a.done;
        } catch (err) {
          subscriber.error(err);
          return;
        }
        if (done) {
          subscriber.complete();
        } else {
          subscriber.next(value);
        }
      }, 0, true);
    });
    return function () {
      return (0, _isFunction.isFunction)(iterator === null || iterator === void 0 ? void 0 : iterator.return) && iterator.return();
    };
  });
}

},{"../Observable":9,"../symbol/iterator":191,"../util/executeSchedule":208,"../util/isFunction":213}],167:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleObservable = scheduleObservable;
var _innerFrom = require("../observable/innerFrom");
var _observeOn = require("../operators/observeOn");
var _subscribeOn = require("../operators/subscribeOn");
function scheduleObservable(input, scheduler) {
  return (0, _innerFrom.innerFrom)(input).pipe((0, _subscribeOn.subscribeOn)(scheduler), (0, _observeOn.observeOn)(scheduler));
}

},{"../observable/innerFrom":35,"../operators/observeOn":109,"../operators/subscribeOn":137}],168:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schedulePromise = schedulePromise;
var _innerFrom = require("../observable/innerFrom");
var _observeOn = require("../operators/observeOn");
var _subscribeOn = require("../operators/subscribeOn");
function schedulePromise(input, scheduler) {
  return (0, _innerFrom.innerFrom)(input).pipe((0, _subscribeOn.subscribeOn)(scheduler), (0, _observeOn.observeOn)(scheduler));
}

},{"../observable/innerFrom":35,"../operators/observeOn":109,"../operators/subscribeOn":137}],169:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduleReadableStreamLike = scheduleReadableStreamLike;
var _scheduleAsyncIterable = require("./scheduleAsyncIterable");
var _isReadableStreamLike = require("../util/isReadableStreamLike");
function scheduleReadableStreamLike(input, scheduler) {
  return (0, _scheduleAsyncIterable.scheduleAsyncIterable)((0, _isReadableStreamLike.readableStreamLikeToAsyncGenerator)(input), scheduler);
}

},{"../util/isReadableStreamLike":218,"./scheduleAsyncIterable":165}],170:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scheduled = scheduled;
var _scheduleObservable = require("./scheduleObservable");
var _schedulePromise = require("./schedulePromise");
var _scheduleArray = require("./scheduleArray");
var _scheduleIterable = require("./scheduleIterable");
var _scheduleAsyncIterable = require("./scheduleAsyncIterable");
var _isInteropObservable = require("../util/isInteropObservable");
var _isPromise = require("../util/isPromise");
var _isArrayLike = require("../util/isArrayLike");
var _isIterable = require("../util/isIterable");
var _isAsyncIterable = require("../util/isAsyncIterable");
var _throwUnobservableError = require("../util/throwUnobservableError");
var _isReadableStreamLike = require("../util/isReadableStreamLike");
var _scheduleReadableStreamLike = require("./scheduleReadableStreamLike");
function scheduled(input, scheduler) {
  if (input != null) {
    if ((0, _isInteropObservable.isInteropObservable)(input)) {
      return (0, _scheduleObservable.scheduleObservable)(input, scheduler);
    }
    if ((0, _isArrayLike.isArrayLike)(input)) {
      return (0, _scheduleArray.scheduleArray)(input, scheduler);
    }
    if ((0, _isPromise.isPromise)(input)) {
      return (0, _schedulePromise.schedulePromise)(input, scheduler);
    }
    if ((0, _isAsyncIterable.isAsyncIterable)(input)) {
      return (0, _scheduleAsyncIterable.scheduleAsyncIterable)(input, scheduler);
    }
    if ((0, _isIterable.isIterable)(input)) {
      return (0, _scheduleIterable.scheduleIterable)(input, scheduler);
    }
    if ((0, _isReadableStreamLike.isReadableStreamLike)(input)) {
      return (0, _scheduleReadableStreamLike.scheduleReadableStreamLike)(input, scheduler);
    }
  }
  throw (0, _throwUnobservableError.createInvalidObservableTypeError)(input);
}

},{"../util/isArrayLike":210,"../util/isAsyncIterable":211,"../util/isInteropObservable":214,"../util/isIterable":215,"../util/isPromise":217,"../util/isReadableStreamLike":218,"../util/throwUnobservableError":226,"./scheduleArray":164,"./scheduleAsyncIterable":165,"./scheduleIterable":166,"./scheduleObservable":167,"./schedulePromise":168,"./scheduleReadableStreamLike":169}],171:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Action = void 0;
var _tslib = require("tslib");
var _Subscription = require("../Subscription");
var Action = exports.Action = function (_super) {
  (0, _tslib.__extends)(Action, _super);
  function Action(scheduler, work) {
    return _super.call(this) || this;
  }
  Action.prototype.schedule = function (state, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return this;
  };
  return Action;
}(_Subscription.Subscription);

},{"../Subscription":14,"tslib":227}],172:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnimationFrameAction = void 0;
var _tslib = require("tslib");
var _AsyncAction = require("./AsyncAction");
var _animationFrameProvider = require("./animationFrameProvider");
var AnimationFrameAction = exports.AnimationFrameAction = function (_super) {
  (0, _tslib.__extends)(AnimationFrameAction, _super);
  function AnimationFrameAction(scheduler, work) {
    var _this = _super.call(this, scheduler, work) || this;
    _this.scheduler = scheduler;
    _this.work = work;
    return _this;
  }
  AnimationFrameAction.prototype.requestAsyncId = function (scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (delay !== null && delay > 0) {
      return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
    }
    scheduler.actions.push(this);
    return scheduler._scheduled || (scheduler._scheduled = _animationFrameProvider.animationFrameProvider.requestAnimationFrame(function () {
      return scheduler.flush(undefined);
    }));
  };
  AnimationFrameAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
    var _a;
    if (delay === void 0) {
      delay = 0;
    }
    if (delay != null ? delay > 0 : this.delay > 0) {
      return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
    }
    var actions = scheduler.actions;
    if (id != null && ((_a = actions[actions.length - 1]) === null || _a === void 0 ? void 0 : _a.id) !== id) {
      _animationFrameProvider.animationFrameProvider.cancelAnimationFrame(id);
      scheduler._scheduled = undefined;
    }
    return undefined;
  };
  return AnimationFrameAction;
}(_AsyncAction.AsyncAction);

},{"./AsyncAction":176,"./animationFrameProvider":182,"tslib":227}],173:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AnimationFrameScheduler = void 0;
var _tslib = require("tslib");
var _AsyncScheduler = require("./AsyncScheduler");
var AnimationFrameScheduler = exports.AnimationFrameScheduler = function (_super) {
  (0, _tslib.__extends)(AnimationFrameScheduler, _super);
  function AnimationFrameScheduler() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  AnimationFrameScheduler.prototype.flush = function (action) {
    this._active = true;
    var flushId = this._scheduled;
    this._scheduled = undefined;
    var actions = this.actions;
    var error;
    action = action || actions.shift();
    do {
      if (error = action.execute(action.state, action.delay)) {
        break;
      }
    } while ((action = actions[0]) && action.id === flushId && actions.shift());
    this._active = false;
    if (error) {
      while ((action = actions[0]) && action.id === flushId && actions.shift()) {
        action.unsubscribe();
      }
      throw error;
    }
  };
  return AnimationFrameScheduler;
}(_AsyncScheduler.AsyncScheduler);

},{"./AsyncScheduler":177,"tslib":227}],174:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsapAction = void 0;
var _tslib = require("tslib");
var _AsyncAction = require("./AsyncAction");
var _immediateProvider = require("./immediateProvider");
var AsapAction = exports.AsapAction = function (_super) {
  (0, _tslib.__extends)(AsapAction, _super);
  function AsapAction(scheduler, work) {
    var _this = _super.call(this, scheduler, work) || this;
    _this.scheduler = scheduler;
    _this.work = work;
    return _this;
  }
  AsapAction.prototype.requestAsyncId = function (scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (delay !== null && delay > 0) {
      return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
    }
    scheduler.actions.push(this);
    return scheduler._scheduled || (scheduler._scheduled = _immediateProvider.immediateProvider.setImmediate(scheduler.flush.bind(scheduler, undefined)));
  };
  AsapAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
    var _a;
    if (delay === void 0) {
      delay = 0;
    }
    if (delay != null ? delay > 0 : this.delay > 0) {
      return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
    }
    var actions = scheduler.actions;
    if (id != null && ((_a = actions[actions.length - 1]) === null || _a === void 0 ? void 0 : _a.id) !== id) {
      _immediateProvider.immediateProvider.clearImmediate(id);
      if (scheduler._scheduled === id) {
        scheduler._scheduled = undefined;
      }
    }
    return undefined;
  };
  return AsapAction;
}(_AsyncAction.AsyncAction);

},{"./AsyncAction":176,"./immediateProvider":186,"tslib":227}],175:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsapScheduler = void 0;
var _tslib = require("tslib");
var _AsyncScheduler = require("./AsyncScheduler");
var AsapScheduler = exports.AsapScheduler = function (_super) {
  (0, _tslib.__extends)(AsapScheduler, _super);
  function AsapScheduler() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  AsapScheduler.prototype.flush = function (action) {
    this._active = true;
    var flushId = this._scheduled;
    this._scheduled = undefined;
    var actions = this.actions;
    var error;
    action = action || actions.shift();
    do {
      if (error = action.execute(action.state, action.delay)) {
        break;
      }
    } while ((action = actions[0]) && action.id === flushId && actions.shift());
    this._active = false;
    if (error) {
      while ((action = actions[0]) && action.id === flushId && actions.shift()) {
        action.unsubscribe();
      }
      throw error;
    }
  };
  return AsapScheduler;
}(_AsyncScheduler.AsyncScheduler);

},{"./AsyncScheduler":177,"tslib":227}],176:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsyncAction = void 0;
var _tslib = require("tslib");
var _Action = require("./Action");
var _intervalProvider = require("./intervalProvider");
var _arrRemove = require("../util/arrRemove");
var AsyncAction = exports.AsyncAction = function (_super) {
  (0, _tslib.__extends)(AsyncAction, _super);
  function AsyncAction(scheduler, work) {
    var _this = _super.call(this, scheduler, work) || this;
    _this.scheduler = scheduler;
    _this.work = work;
    _this.pending = false;
    return _this;
  }
  AsyncAction.prototype.schedule = function (state, delay) {
    var _a;
    if (delay === void 0) {
      delay = 0;
    }
    if (this.closed) {
      return this;
    }
    this.state = state;
    var id = this.id;
    var scheduler = this.scheduler;
    if (id != null) {
      this.id = this.recycleAsyncId(scheduler, id, delay);
    }
    this.pending = true;
    this.delay = delay;
    this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay);
    return this;
  };
  AsyncAction.prototype.requestAsyncId = function (scheduler, _id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return _intervalProvider.intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
  };
  AsyncAction.prototype.recycleAsyncId = function (_scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (delay != null && this.delay === delay && this.pending === false) {
      return id;
    }
    if (id != null) {
      _intervalProvider.intervalProvider.clearInterval(id);
    }
    return undefined;
  };
  AsyncAction.prototype.execute = function (state, delay) {
    if (this.closed) {
      return new Error('executing a cancelled action');
    }
    this.pending = false;
    var error = this._execute(state, delay);
    if (error) {
      return error;
    } else if (this.pending === false && this.id != null) {
      this.id = this.recycleAsyncId(this.scheduler, this.id, null);
    }
  };
  AsyncAction.prototype._execute = function (state, _delay) {
    var errored = false;
    var errorValue;
    try {
      this.work(state);
    } catch (e) {
      errored = true;
      errorValue = e ? e : new Error('Scheduled action threw falsy error');
    }
    if (errored) {
      this.unsubscribe();
      return errorValue;
    }
  };
  AsyncAction.prototype.unsubscribe = function () {
    if (!this.closed) {
      var _a = this,
        id = _a.id,
        scheduler = _a.scheduler;
      var actions = scheduler.actions;
      this.work = this.state = this.scheduler = null;
      this.pending = false;
      (0, _arrRemove.arrRemove)(actions, this);
      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, null);
      }
      this.delay = null;
      _super.prototype.unsubscribe.call(this);
    }
  };
  return AsyncAction;
}(_Action.Action);

},{"../util/arrRemove":204,"./Action":171,"./intervalProvider":187,"tslib":227}],177:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AsyncScheduler = void 0;
var _tslib = require("tslib");
var _Scheduler = require("../Scheduler");
var AsyncScheduler = exports.AsyncScheduler = function (_super) {
  (0, _tslib.__extends)(AsyncScheduler, _super);
  function AsyncScheduler(SchedulerAction, now) {
    if (now === void 0) {
      now = _Scheduler.Scheduler.now;
    }
    var _this = _super.call(this, SchedulerAction, now) || this;
    _this.actions = [];
    _this._active = false;
    return _this;
  }
  AsyncScheduler.prototype.flush = function (action) {
    var actions = this.actions;
    if (this._active) {
      actions.push(action);
      return;
    }
    var error;
    this._active = true;
    do {
      if (error = action.execute(action.state, action.delay)) {
        break;
      }
    } while (action = actions.shift());
    this._active = false;
    if (error) {
      while (action = actions.shift()) {
        action.unsubscribe();
      }
      throw error;
    }
  };
  return AsyncScheduler;
}(_Scheduler.Scheduler);

},{"../Scheduler":11,"tslib":227}],178:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueueAction = void 0;
var _tslib = require("tslib");
var _AsyncAction = require("./AsyncAction");
var QueueAction = exports.QueueAction = function (_super) {
  (0, _tslib.__extends)(QueueAction, _super);
  function QueueAction(scheduler, work) {
    var _this = _super.call(this, scheduler, work) || this;
    _this.scheduler = scheduler;
    _this.work = work;
    return _this;
  }
  QueueAction.prototype.schedule = function (state, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (delay > 0) {
      return _super.prototype.schedule.call(this, state, delay);
    }
    this.delay = delay;
    this.state = state;
    this.scheduler.flush(this);
    return this;
  };
  QueueAction.prototype.execute = function (state, delay) {
    return delay > 0 || this.closed ? _super.prototype.execute.call(this, state, delay) : this._execute(state, delay);
  };
  QueueAction.prototype.requestAsyncId = function (scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (delay != null && delay > 0 || delay == null && this.delay > 0) {
      return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
    }
    scheduler.flush(this);
    return 0;
  };
  return QueueAction;
}(_AsyncAction.AsyncAction);

},{"./AsyncAction":176,"tslib":227}],179:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueueScheduler = void 0;
var _tslib = require("tslib");
var _AsyncScheduler = require("./AsyncScheduler");
var QueueScheduler = exports.QueueScheduler = function (_super) {
  (0, _tslib.__extends)(QueueScheduler, _super);
  function QueueScheduler() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  return QueueScheduler;
}(_AsyncScheduler.AsyncScheduler);

},{"./AsyncScheduler":177,"tslib":227}],180:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.VirtualTimeScheduler = exports.VirtualAction = void 0;
var _tslib = require("tslib");
var _AsyncAction = require("./AsyncAction");
var _Subscription = require("../Subscription");
var _AsyncScheduler = require("./AsyncScheduler");
var VirtualTimeScheduler = exports.VirtualTimeScheduler = function (_super) {
  (0, _tslib.__extends)(VirtualTimeScheduler, _super);
  function VirtualTimeScheduler(schedulerActionCtor, maxFrames) {
    if (schedulerActionCtor === void 0) {
      schedulerActionCtor = VirtualAction;
    }
    if (maxFrames === void 0) {
      maxFrames = Infinity;
    }
    var _this = _super.call(this, schedulerActionCtor, function () {
      return _this.frame;
    }) || this;
    _this.maxFrames = maxFrames;
    _this.frame = 0;
    _this.index = -1;
    return _this;
  }
  VirtualTimeScheduler.prototype.flush = function () {
    var _a = this,
      actions = _a.actions,
      maxFrames = _a.maxFrames;
    var error;
    var action;
    while ((action = actions[0]) && action.delay <= maxFrames) {
      actions.shift();
      this.frame = action.delay;
      if (error = action.execute(action.state, action.delay)) {
        break;
      }
    }
    if (error) {
      while (action = actions.shift()) {
        action.unsubscribe();
      }
      throw error;
    }
  };
  VirtualTimeScheduler.frameTimeFactor = 10;
  return VirtualTimeScheduler;
}(_AsyncScheduler.AsyncScheduler);
var VirtualAction = exports.VirtualAction = function (_super) {
  (0, _tslib.__extends)(VirtualAction, _super);
  function VirtualAction(scheduler, work, index) {
    if (index === void 0) {
      index = scheduler.index += 1;
    }
    var _this = _super.call(this, scheduler, work) || this;
    _this.scheduler = scheduler;
    _this.work = work;
    _this.index = index;
    _this.active = true;
    _this.index = scheduler.index = index;
    return _this;
  }
  VirtualAction.prototype.schedule = function (state, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    if (Number.isFinite(delay)) {
      if (!this.id) {
        return _super.prototype.schedule.call(this, state, delay);
      }
      this.active = false;
      var action = new VirtualAction(this.scheduler, this.work);
      this.add(action);
      return action.schedule(state, delay);
    } else {
      return _Subscription.Subscription.EMPTY;
    }
  };
  VirtualAction.prototype.requestAsyncId = function (scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    this.delay = scheduler.frame + delay;
    var actions = scheduler.actions;
    actions.push(this);
    actions.sort(VirtualAction.sortActions);
    return 1;
  };
  VirtualAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return undefined;
  };
  VirtualAction.prototype._execute = function (state, delay) {
    if (this.active === true) {
      return _super.prototype._execute.call(this, state, delay);
    }
  };
  VirtualAction.sortActions = function (a, b) {
    if (a.delay === b.delay) {
      if (a.index === b.index) {
        return 0;
      } else if (a.index > b.index) {
        return 1;
      } else {
        return -1;
      }
    } else if (a.delay > b.delay) {
      return 1;
    } else {
      return -1;
    }
  };
  return VirtualAction;
}(_AsyncAction.AsyncAction);

},{"../Subscription":14,"./AsyncAction":176,"./AsyncScheduler":177,"tslib":227}],181:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.animationFrameScheduler = exports.animationFrame = void 0;
var _AnimationFrameAction = require("./AnimationFrameAction");
var _AnimationFrameScheduler = require("./AnimationFrameScheduler");
var animationFrameScheduler = exports.animationFrameScheduler = new _AnimationFrameScheduler.AnimationFrameScheduler(_AnimationFrameAction.AnimationFrameAction);
var animationFrame = exports.animationFrame = animationFrameScheduler;

},{"./AnimationFrameAction":172,"./AnimationFrameScheduler":173}],182:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.animationFrameProvider = void 0;
var _tslib = require("tslib");
var _Subscription = require("../Subscription");
var animationFrameProvider = exports.animationFrameProvider = {
  schedule: function (callback) {
    var request = requestAnimationFrame;
    var cancel = cancelAnimationFrame;
    var delegate = animationFrameProvider.delegate;
    if (delegate) {
      request = delegate.requestAnimationFrame;
      cancel = delegate.cancelAnimationFrame;
    }
    var handle = request(function (timestamp) {
      cancel = undefined;
      callback(timestamp);
    });
    return new _Subscription.Subscription(function () {
      return cancel === null || cancel === void 0 ? void 0 : cancel(handle);
    });
  },
  requestAnimationFrame: function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var delegate = animationFrameProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.requestAnimationFrame) || requestAnimationFrame).apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args)));
  },
  cancelAnimationFrame: function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var delegate = animationFrameProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.cancelAnimationFrame) || cancelAnimationFrame).apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args)));
  },
  delegate: undefined
};

},{"../Subscription":14,"tslib":227}],183:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asapScheduler = exports.asap = void 0;
var _AsapAction = require("./AsapAction");
var _AsapScheduler = require("./AsapScheduler");
var asapScheduler = exports.asapScheduler = new _AsapScheduler.AsapScheduler(_AsapAction.AsapAction);
var asap = exports.asap = asapScheduler;

},{"./AsapAction":174,"./AsapScheduler":175}],184:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.asyncScheduler = exports.async = void 0;
var _AsyncAction = require("./AsyncAction");
var _AsyncScheduler = require("./AsyncScheduler");
var asyncScheduler = exports.asyncScheduler = new _AsyncScheduler.AsyncScheduler(_AsyncAction.AsyncAction);
var async = exports.async = asyncScheduler;

},{"./AsyncAction":176,"./AsyncScheduler":177}],185:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.dateTimestampProvider = void 0;
var dateTimestampProvider = exports.dateTimestampProvider = {
  now: function () {
    return (dateTimestampProvider.delegate || Date).now();
  },
  delegate: undefined
};

},{}],186:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.immediateProvider = void 0;
var _tslib = require("tslib");
var _Immediate = require("../util/Immediate");
var setImmediate = _Immediate.Immediate.setImmediate,
  clearImmediate = _Immediate.Immediate.clearImmediate;
var immediateProvider = exports.immediateProvider = {
  setImmediate: function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var delegate = immediateProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.setImmediate) || setImmediate).apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args)));
  },
  clearImmediate: function (handle) {
    var delegate = immediateProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearImmediate) || clearImmediate)(handle);
  },
  delegate: undefined
};

},{"../util/Immediate":196,"tslib":227}],187:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intervalProvider = void 0;
var _tslib = require("tslib");
var intervalProvider = exports.intervalProvider = {
  setInterval: function (handler, timeout) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }
    var delegate = intervalProvider.delegate;
    if (delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) {
      return delegate.setInterval.apply(delegate, (0, _tslib.__spreadArray)([handler, timeout], (0, _tslib.__read)(args)));
    }
    return setInterval.apply(void 0, (0, _tslib.__spreadArray)([handler, timeout], (0, _tslib.__read)(args)));
  },
  clearInterval: function (handle) {
    var delegate = intervalProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
  },
  delegate: undefined
};

},{"tslib":227}],188:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.performanceTimestampProvider = void 0;
var performanceTimestampProvider = exports.performanceTimestampProvider = {
  now: function () {
    return (performanceTimestampProvider.delegate || performance).now();
  },
  delegate: undefined
};

},{}],189:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.queueScheduler = exports.queue = void 0;
var _QueueAction = require("./QueueAction");
var _QueueScheduler = require("./QueueScheduler");
var queueScheduler = exports.queueScheduler = new _QueueScheduler.QueueScheduler(_QueueAction.QueueAction);
var queue = exports.queue = queueScheduler;

},{"./QueueAction":178,"./QueueScheduler":179}],190:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timeoutProvider = void 0;
var _tslib = require("tslib");
var timeoutProvider = exports.timeoutProvider = {
  setTimeout: function (handler, timeout) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }
    var delegate = timeoutProvider.delegate;
    if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
      return delegate.setTimeout.apply(delegate, (0, _tslib.__spreadArray)([handler, timeout], (0, _tslib.__read)(args)));
    }
    return setTimeout.apply(void 0, (0, _tslib.__spreadArray)([handler, timeout], (0, _tslib.__read)(args)));
  },
  clearTimeout: function (handle) {
    var delegate = timeoutProvider.delegate;
    return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
  },
  delegate: undefined
};

},{"tslib":227}],191:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSymbolIterator = getSymbolIterator;
exports.iterator = void 0;
function getSymbolIterator() {
  if (typeof Symbol !== 'function' || !Symbol.iterator) {
    return '@@iterator';
  }
  return Symbol.iterator;
}
var iterator = exports.iterator = getSymbolIterator();

},{}],192:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observable = void 0;
var observable = exports.observable = function () {
  return typeof Symbol === 'function' && Symbol.observable || '@@observable';
}();

},{}],193:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

},{}],194:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ArgumentOutOfRangeError = void 0;
var _createErrorClass = require("./createErrorClass");
var ArgumentOutOfRangeError = exports.ArgumentOutOfRangeError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function ArgumentOutOfRangeErrorImpl() {
    _super(this);
    this.name = 'ArgumentOutOfRangeError';
    this.message = 'argument out of range';
  };
});

},{"./createErrorClass":205}],195:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EmptyError = void 0;
var _createErrorClass = require("./createErrorClass");
var EmptyError = exports.EmptyError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function EmptyErrorImpl() {
    _super(this);
    this.name = 'EmptyError';
    this.message = 'no elements in sequence';
  };
});

},{"./createErrorClass":205}],196:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TestTools = exports.Immediate = void 0;
var nextHandle = 1;
var resolved;
var activeHandles = {};
function findAndClearHandle(handle) {
  if (handle in activeHandles) {
    delete activeHandles[handle];
    return true;
  }
  return false;
}
var Immediate = exports.Immediate = {
  setImmediate: function (cb) {
    var handle = nextHandle++;
    activeHandles[handle] = true;
    if (!resolved) {
      resolved = Promise.resolve();
    }
    resolved.then(function () {
      return findAndClearHandle(handle) && cb();
    });
    return handle;
  },
  clearImmediate: function (handle) {
    findAndClearHandle(handle);
  }
};
var TestTools = exports.TestTools = {
  pending: function () {
    return Object.keys(activeHandles).length;
  }
};

},{}],197:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotFoundError = void 0;
var _createErrorClass = require("./createErrorClass");
var NotFoundError = exports.NotFoundError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function NotFoundErrorImpl(message) {
    _super(this);
    this.name = 'NotFoundError';
    this.message = message;
  };
});

},{"./createErrorClass":205}],198:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ObjectUnsubscribedError = void 0;
var _createErrorClass = require("./createErrorClass");
var ObjectUnsubscribedError = exports.ObjectUnsubscribedError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function ObjectUnsubscribedErrorImpl() {
    _super(this);
    this.name = 'ObjectUnsubscribedError';
    this.message = 'object unsubscribed';
  };
});

},{"./createErrorClass":205}],199:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SequenceError = void 0;
var _createErrorClass = require("./createErrorClass");
var SequenceError = exports.SequenceError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function SequenceErrorImpl(message) {
    _super(this);
    this.name = 'SequenceError';
    this.message = message;
  };
});

},{"./createErrorClass":205}],200:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UnsubscriptionError = void 0;
var _createErrorClass = require("./createErrorClass");
var UnsubscriptionError = exports.UnsubscriptionError = (0, _createErrorClass.createErrorClass)(function (_super) {
  return function UnsubscriptionErrorImpl(errors) {
    _super(this);
    this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) {
      return i + 1 + ") " + err.toString();
    }).join('\n  ') : '';
    this.name = 'UnsubscriptionError';
    this.errors = errors;
  };
});

},{"./createErrorClass":205}],201:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.popNumber = popNumber;
exports.popResultSelector = popResultSelector;
exports.popScheduler = popScheduler;
var _isFunction = require("./isFunction");
var _isScheduler = require("./isScheduler");
function last(arr) {
  return arr[arr.length - 1];
}
function popResultSelector(args) {
  return (0, _isFunction.isFunction)(last(args)) ? args.pop() : undefined;
}
function popScheduler(args) {
  return (0, _isScheduler.isScheduler)(last(args)) ? args.pop() : undefined;
}
function popNumber(args, defaultValue) {
  return typeof last(args) === 'number' ? args.pop() : defaultValue;
}

},{"./isFunction":213,"./isScheduler":219}],202:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.argsArgArrayOrObject = argsArgArrayOrObject;
var isArray = Array.isArray;
var getPrototypeOf = Object.getPrototypeOf,
  objectProto = Object.prototype,
  getKeys = Object.keys;
function argsArgArrayOrObject(args) {
  if (args.length === 1) {
    var first_1 = args[0];
    if (isArray(first_1)) {
      return {
        args: first_1,
        keys: null
      };
    }
    if (isPOJO(first_1)) {
      var keys = getKeys(first_1);
      return {
        args: keys.map(function (key) {
          return first_1[key];
        }),
        keys: keys
      };
    }
  }
  return {
    args: args,
    keys: null
  };
}
function isPOJO(obj) {
  return obj && typeof obj === 'object' && getPrototypeOf(obj) === objectProto;
}

},{}],203:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.argsOrArgArray = argsOrArgArray;
var isArray = Array.isArray;
function argsOrArgArray(args) {
  return args.length === 1 && isArray(args[0]) ? args[0] : args;
}

},{}],204:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.arrRemove = arrRemove;
function arrRemove(arr, item) {
  if (arr) {
    var index = arr.indexOf(item);
    0 <= index && arr.splice(index, 1);
  }
}

},{}],205:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createErrorClass = createErrorClass;
function createErrorClass(createImpl) {
  var _super = function (instance) {
    Error.call(instance);
    instance.stack = new Error().stack;
  };
  var ctorFunc = createImpl(_super);
  ctorFunc.prototype = Object.create(Error.prototype);
  ctorFunc.prototype.constructor = ctorFunc;
  return ctorFunc;
}

},{}],206:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createObject = createObject;
function createObject(keys, values) {
  return keys.reduce(function (result, key, i) {
    return result[key] = values[i], result;
  }, {});
}

},{}],207:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.captureError = captureError;
exports.errorContext = errorContext;
var _config = require("../config");
var context = null;
function errorContext(cb) {
  if (_config.config.useDeprecatedSynchronousErrorHandling) {
    var isRoot = !context;
    if (isRoot) {
      context = {
        errorThrown: false,
        error: null
      };
    }
    cb();
    if (isRoot) {
      var _a = context,
        errorThrown = _a.errorThrown,
        error = _a.error;
      context = null;
      if (errorThrown) {
        throw error;
      }
    }
  } else {
    cb();
  }
}
function captureError(err) {
  if (_config.config.useDeprecatedSynchronousErrorHandling && context) {
    context.errorThrown = true;
    context.error = err;
  }
}

},{"../config":15}],208:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.executeSchedule = executeSchedule;
function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
  if (delay === void 0) {
    delay = 0;
  }
  if (repeat === void 0) {
    repeat = false;
  }
  var scheduleSubscription = scheduler.schedule(function () {
    work();
    if (repeat) {
      parentSubscription.add(this.schedule(null, delay));
    } else {
      this.unsubscribe();
    }
  }, delay);
  parentSubscription.add(scheduleSubscription);
  if (!repeat) {
    return scheduleSubscription;
  }
}

},{}],209:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.identity = identity;
function identity(x) {
  return x;
}

},{}],210:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isArrayLike = void 0;
var isArrayLike = function (x) {
  return x && typeof x.length === 'number' && typeof x !== 'function';
};
exports.isArrayLike = isArrayLike;

},{}],211:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAsyncIterable = isAsyncIterable;
var _isFunction = require("./isFunction");
function isAsyncIterable(obj) {
  return Symbol.asyncIterator && (0, _isFunction.isFunction)(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
}

},{"./isFunction":213}],212:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isValidDate = isValidDate;
function isValidDate(value) {
  return value instanceof Date && !isNaN(value);
}

},{}],213:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFunction = isFunction;
function isFunction(value) {
  return typeof value === 'function';
}

},{}],214:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isInteropObservable = isInteropObservable;
var _observable = require("../symbol/observable");
var _isFunction = require("./isFunction");
function isInteropObservable(input) {
  return (0, _isFunction.isFunction)(input[_observable.observable]);
}

},{"../symbol/observable":192,"./isFunction":213}],215:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIterable = isIterable;
var _iterator = require("../symbol/iterator");
var _isFunction = require("./isFunction");
function isIterable(input) {
  return (0, _isFunction.isFunction)(input === null || input === void 0 ? void 0 : input[_iterator.iterator]);
}

},{"../symbol/iterator":191,"./isFunction":213}],216:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isObservable = isObservable;
var _Observable = require("../Observable");
var _isFunction = require("./isFunction");
function isObservable(obj) {
  return !!obj && (obj instanceof _Observable.Observable || (0, _isFunction.isFunction)(obj.lift) && (0, _isFunction.isFunction)(obj.subscribe));
}

},{"../Observable":9,"./isFunction":213}],217:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPromise = isPromise;
var _isFunction = require("./isFunction");
function isPromise(value) {
  return (0, _isFunction.isFunction)(value === null || value === void 0 ? void 0 : value.then);
}

},{"./isFunction":213}],218:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isReadableStreamLike = isReadableStreamLike;
exports.readableStreamLikeToAsyncGenerator = readableStreamLikeToAsyncGenerator;
var _tslib = require("tslib");
var _isFunction = require("./isFunction");
function readableStreamLikeToAsyncGenerator(readableStream) {
  return (0, _tslib.__asyncGenerator)(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
    var reader, _a, value, done;
    return (0, _tslib.__generator)(this, function (_b) {
      switch (_b.label) {
        case 0:
          reader = readableStream.getReader();
          _b.label = 1;
        case 1:
          _b.trys.push([1,, 9, 10]);
          _b.label = 2;
        case 2:
          if (!true) return [3, 8];
          return [4, (0, _tslib.__await)(reader.read())];
        case 3:
          _a = _b.sent(), value = _a.value, done = _a.done;
          if (!done) return [3, 5];
          return [4, (0, _tslib.__await)(void 0)];
        case 4:
          return [2, _b.sent()];
        case 5:
          return [4, (0, _tslib.__await)(value)];
        case 6:
          return [4, _b.sent()];
        case 7:
          _b.sent();
          return [3, 2];
        case 8:
          return [3, 10];
        case 9:
          reader.releaseLock();
          return [7];
        case 10:
          return [2];
      }
    });
  });
}
function isReadableStreamLike(obj) {
  return (0, _isFunction.isFunction)(obj === null || obj === void 0 ? void 0 : obj.getReader);
}

},{"./isFunction":213,"tslib":227}],219:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isScheduler = isScheduler;
var _isFunction = require("./isFunction");
function isScheduler(value) {
  return value && (0, _isFunction.isFunction)(value.schedule);
}

},{"./isFunction":213}],220:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hasLift = hasLift;
exports.operate = operate;
var _isFunction = require("./isFunction");
function hasLift(source) {
  return (0, _isFunction.isFunction)(source === null || source === void 0 ? void 0 : source.lift);
}
function operate(init) {
  return function (source) {
    if (hasLift(source)) {
      return source.lift(function (liftedSource) {
        try {
          return init(liftedSource, this);
        } catch (err) {
          this.error(err);
        }
      });
    }
    throw new TypeError('Unable to lift unknown Observable type');
  };
}

},{"./isFunction":213}],221:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapOneOrManyArgs = mapOneOrManyArgs;
var _tslib = require("tslib");
var _map = require("../operators/map");
var isArray = Array.isArray;
function callOrApply(fn, args) {
  return isArray(args) ? fn.apply(void 0, (0, _tslib.__spreadArray)([], (0, _tslib.__read)(args))) : fn(args);
}
function mapOneOrManyArgs(fn) {
  return (0, _map.map)(function (args) {
    return callOrApply(fn, args);
  });
}

},{"../operators/map":96,"tslib":227}],222:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.noop = noop;
function noop() {}

},{}],223:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.not = not;
function not(pred, thisArg) {
  return function (value, index) {
    return !pred.call(thisArg, value, index);
  };
}

},{}],224:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pipe = pipe;
exports.pipeFromArray = pipeFromArray;
var _identity = require("./identity");
function pipe() {
  var fns = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    fns[_i] = arguments[_i];
  }
  return pipeFromArray(fns);
}
function pipeFromArray(fns) {
  if (fns.length === 0) {
    return _identity.identity;
  }
  if (fns.length === 1) {
    return fns[0];
  }
  return function piped(input) {
    return fns.reduce(function (prev, fn) {
      return fn(prev);
    }, input);
  };
}

},{"./identity":209}],225:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reportUnhandledError = reportUnhandledError;
var _config = require("../config");
var _timeoutProvider = require("../scheduler/timeoutProvider");
function reportUnhandledError(err) {
  _timeoutProvider.timeoutProvider.setTimeout(function () {
    var onUnhandledError = _config.config.onUnhandledError;
    if (onUnhandledError) {
      onUnhandledError(err);
    } else {
      throw err;
    }
  });
}

},{"../config":15,"../scheduler/timeoutProvider":190}],226:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createInvalidObservableTypeError = createInvalidObservableTypeError;
function createInvalidObservableTypeError(input) {
  return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
}

},{}],227:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.__addDisposableResource = __addDisposableResource;
exports.__assign = void 0;
exports.__asyncDelegator = __asyncDelegator;
exports.__asyncGenerator = __asyncGenerator;
exports.__asyncValues = __asyncValues;
exports.__await = __await;
exports.__awaiter = __awaiter;
exports.__classPrivateFieldGet = __classPrivateFieldGet;
exports.__classPrivateFieldIn = __classPrivateFieldIn;
exports.__classPrivateFieldSet = __classPrivateFieldSet;
exports.__createBinding = void 0;
exports.__decorate = __decorate;
exports.__disposeResources = __disposeResources;
exports.__esDecorate = __esDecorate;
exports.__exportStar = __exportStar;
exports.__extends = __extends;
exports.__generator = __generator;
exports.__importDefault = __importDefault;
exports.__importStar = __importStar;
exports.__makeTemplateObject = __makeTemplateObject;
exports.__metadata = __metadata;
exports.__param = __param;
exports.__propKey = __propKey;
exports.__read = __read;
exports.__rest = __rest;
exports.__runInitializers = __runInitializers;
exports.__setFunctionName = __setFunctionName;
exports.__spread = __spread;
exports.__spreadArray = __spreadArray;
exports.__spreadArrays = __spreadArrays;
exports.__values = __values;
exports.default = void 0;
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function (d, b) {
  extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function (d, b) {
    d.__proto__ = b;
  } || function (d, b) {
    for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function () {
  exports.__assign = __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
exports.__assign = __assign;
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
    d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function (target, key) {
    decorator(target, key, paramIndex);
  };
}
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind,
    key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _,
    done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function (f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? {
      get: descriptor.get,
      set: descriptor.set
    } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) {
      if (kind === "field") initializers.unshift(_);else descriptor[key] = _;
    }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
}
;
function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
    value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
}
;
function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
}
;
function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", {
    configurable: true,
    value: prefix ? "".concat(prefix, " ", name) : name
  });
}
;
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = {
      label: 0,
      sent: function () {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: []
    },
    f,
    y,
    t,
    g;
  return g = {
    next: verb(0),
    "throw": verb(1),
    "return": verb(2)
  }, typeof Symbol === "function" && (g[Symbol.iterator] = function () {
    return this;
  }), g;
  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return {
            value: op[1],
            done: false
          };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return {
      value: op[0] ? op[1] : void 0,
      done: true
    };
  }
}
var __createBinding = exports.__createBinding = Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = {
      enumerable: true,
      get: function () {
        return m[k];
      }
    };
  }
  Object.defineProperty(o, k2, desc);
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
};
function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator,
    m = s && o[s],
    i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function () {
      if (o && i >= o.length) o = void 0;
      return {
        value: o && o[i++],
        done: !o
      };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o),
    r,
    ar = [],
    e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = {
      error: error
    };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++) for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++) r[k] = a[j];
  return r;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []),
    i,
    q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function (v) {
      return new Promise(function (a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) {
    throw e;
  }), verb("return"), i[Symbol.iterator] = function () {
    return this;
  }, i;
  function verb(n, f) {
    i[n] = o[n] ? function (v) {
      return (p = !p) ? {
        value: __await(o[n](v)),
        done: false
      } : f ? f(v) : v;
    } : f;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator],
    i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function (v) {
      return new Promise(function (resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function (v) {
      resolve({
        value: v,
        done: d
      });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", {
      value: raw
    });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
;
var __setModuleDefault = Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
};
function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : {
    default: mod
  };
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || typeof receiver !== "object" && typeof receiver !== "function") throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}
function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose;
    if (async) {
      if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
      dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
      if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
      dispose = value[Symbol.dispose];
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    env.stack.push({
      value: value,
      dispose: dispose,
      async: async
    });
  } else if (async) {
    env.stack.push({
      async: true
    });
  }
  return value;
}
var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  function next() {
    while (env.stack.length) {
      var rec = env.stack.pop();
      try {
        var result = rec.dispose && rec.dispose.call(rec.value);
        if (rec.async) return Promise.resolve(result).then(next, function (e) {
          fail(e);
          return next();
        });
      } catch (e) {
        fail(e);
      }
    }
    if (env.hasError) throw env.error;
  }
  return next();
}
var _default = exports.default = {
  __extends: __extends,
  __assign: __assign,
  __rest: __rest,
  __decorate: __decorate,
  __param: __param,
  __metadata: __metadata,
  __awaiter: __awaiter,
  __generator: __generator,
  __createBinding: __createBinding,
  __exportStar: __exportStar,
  __values: __values,
  __read: __read,
  __spread: __spread,
  __spreadArrays: __spreadArrays,
  __spreadArray: __spreadArray,
  __await: __await,
  __asyncGenerator: __asyncGenerator,
  __asyncDelegator: __asyncDelegator,
  __asyncValues: __asyncValues,
  __makeTemplateObject: __makeTemplateObject,
  __importStar: __importStar,
  __importDefault: __importDefault,
  __classPrivateFieldGet: __classPrivateFieldGet,
  __classPrivateFieldSet: __classPrivateFieldSet,
  __classPrivateFieldIn: __classPrivateFieldIn,
  __addDisposableResource: __addDisposableResource,
  __disposeResources: __disposeResources
};

},{}]},{},[2]);
