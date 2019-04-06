const  Momentum = require('./momentum')
let singleton = new Momentum()
global.momentum = singleton
module.exports = singleton
