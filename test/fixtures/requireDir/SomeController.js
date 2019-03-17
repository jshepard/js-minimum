class SomeController {

  sayHi(req, res) {
    res.send("hi!")
  }
  
}

SomeController.options = {view: 'someController.pug'}

module.exports = SomeController
