const mongoose = require('mongoose')

const DroneSchema = new mongoose.Schema({
    name:String,
    adresse:String,
    lat:Number,
    long:Number,
    type:String,
})

const Drone = mongoose.model('Drone', DroneSchema)

module.exports = Drone