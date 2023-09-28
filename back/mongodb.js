const express = require('express')
const mongoose = require('mongoose')
const app = express();
app.use(express.json())
require('dotenv').config()

const cors = require('cors');
app.use(cors({
    origin: '*'
}));

const Drone = require('./Drone.js')


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/allDrones', (req, res) => {
  Drone.find()
  .then(result => res.status(200).json({ result }))
  .catch(error => res.status(500).json({msg: error}))
})

app.post('/save', (req, res) => {
  return new Promise(async (resolve,reject) => {
    Drone.create(req.body)
    .then(result => {
      res.status(200).json({ result })
    })
    .catch((error) => {
      res.status(500).json({msg:  error })
      resolve(error);
    })
  })
})


app.get('/delete/:id', (req, res) => {
  return new Promise(async (resolve,reject) => {
    console.log("reqqq",req)
    Drone.deleteOne(req.body)
    .then(result => {
      res.status(200).json({ result })
    })
    .catch((error) => {
      res.status(500).json({msg:  error })
      resolve(error);
    })
  })
})

mongoose.connect(process.env.MONGO_URI)
    .then((result) => {
      console.log("connected well")
      app.listen(5000)
    })
    .catch((err) => {
      console.log(err)
    })