/*eslint-env node, mocha */
const _ = require('lodash')
const path = require('path')
const chai = require('chai')

const Momentum = require('../../momentum')

// let assert = chai.assert
let expect = chai.expect

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

  it('should load', async function () {
    let momentum = new Momentum({
      environment: 'test',
      processType: 'config',
      log: {log: _.noop }
    })
    await momentum.onceReady()

    expect(momentum.config).to.be.a('object')
    expect(momentum.config.environment).to.equal('test')
    expect(momentum.config.paths.appPath).to.equal(fixturesPath)
  })

})
