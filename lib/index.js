const  Momentum = require('./momentum')

// TODO: get intial config from .momentum.json
let config = {}
let singleton = new Momentum(config)

module.exports = singleton
