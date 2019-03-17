//
// Account Model
//
class Account extends momentum.models.Account {

  static steve() {
    return this.findOne({email: 'steve.rogers@army.mil'})
  }

  static tony() {
    return this.findOne({email: 'tony@stark.com'})
  }

  isSteve() {
    return (this.id === 1)
  }

}

Account.options.omit = ['encrypted_password']

module.exports = Account
