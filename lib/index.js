
const  Momentum = require('./momentum')

// TODO: get intial config
let config = {}
let singleton = new Momentum(config)

module.exports = singleton
