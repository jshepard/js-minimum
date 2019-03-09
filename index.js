const  Momentum = require('./lib/momentum')
let singleton = new Momentum()
global.momentum = singleton
module.exports = singleton
