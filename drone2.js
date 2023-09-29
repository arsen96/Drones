const io = require('socket.io-client')
const socket = io("http://localhost:3000");
const map = L.map("map").setView([43.3, -0.366667], 15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

socket.on('welcome', function(data) {
    console.log("",data)
});

socket.on("displayMarkers", (data) => {
    const currentMarkers = JSON.parse(data)
    currentMarkers.forEach(element => {
        L.marker([element.lat, element.lng])
        .addTo(map)
        .openPopup();
    });
 
})



socket.on('sendMarkerData', (data) => {
    let currData = JSON.parse(data);
    map.removeLayer()
    const currentMovingMarker = L.Marker.movingMarker(
        currData.destArrived,
        currData.durationAnim,
      ).addTo(map);
  
      currentMovingMarker.start();
});

