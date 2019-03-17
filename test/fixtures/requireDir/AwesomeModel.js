
class AwesomeModel {  
  static onBeforeFind () {
  }

  getName () {
    return 'AwesomeModel'
  }
}

AwesomeModel.options = {limit: 42}

module.exports = AwesomeModel
