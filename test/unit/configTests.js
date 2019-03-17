/*eslint-env node, mocha */
const _ = require('lodash')
const path = require('path')
const chai = require('chai')
const { EventEmitter } = require('events')

// let assert = chai.assert
let expect = chai.expect

class Momentum extends EventEmitter {
    constructor (config) {
      super()

      this.log = () => {}
      this.config = config || {}
      this.modules = {}
      this.utils = require('../../lib/momentum/utils')
    }
}

describe('Config', function () {
  let fixturesPath = path.join(__dirname, '../fixtures/simple')
  let stack = []

  before(function () {
    stack.push(process.cwd())
    process.chdir(fixturesPath)
  })

  after(function () {
    process.chdir(stack.pop())
  })

  it('should load', function () {
    let loadConfiguration = require('../../lib/momentum/configuration')
    let momentum = new Momentum({
      environment: 'test',
      processType: 'config',
      log: {log: _.noop }
    })
    loadConfiguration(momentum)

    expect(momentum.config).to.be.a('object')
    expect(momentum.config.environment).to.equal('test')
    expect(momentum.config.paths.appPath).to.equal(fixturesPath)
  })

})
