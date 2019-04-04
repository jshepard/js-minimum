function gamaLevel(value) {
  return function decorator(target) {
    target.gamaLevel = value
  }
}

module.exports = gamaLevel
