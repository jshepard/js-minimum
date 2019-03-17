//
// Account Controller
//
const {get, policies, options} = momentum.decorators

class AccountController extends momentum.Controller {

  sayHi(req, res) {
    return "hi!"
  }

}

get('/sayHi')(AccountController.prototype, 'sayHi')

options({
    populate: ['accountGroup', 'accountEvents'],
})(AccountController)

module.exports = AccountController
