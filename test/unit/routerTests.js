/*eslint-env node, mocha */
/*eslint no-unused-expressions: 0 */
/*eslint no-magic-numbers: 0 */

const _ = require('lodash')
const path = require('path')
const chai = require('chai')
const http = require('http')

const Momentum = require('../../momentum')

let expect = chai.expect
let momentum

function expectRoute(method, route) {
  let definition = momentum.modules.api.openApi.definition.paths[route]
  expect(definition).to.exist
  expect(definition[method]).to.exist
}

function execRoute(method, route, data, parse = JSON.parse) {
  return new Promise((resolve, reject) => {
    let options = {
      port: momentum.config.server.port,
      method: method,
      path: route
    }

    if (data) {
      options.headers = {
        'Content-Type': 'application/json'
      }
    }

    let req = http.request(options, (res) => {
      let responseData = []

      res.setEncoding('utf8')

      res.on('data', (chunk) => {
        responseData.push(chunk)
      })

      res.on('end', () => {
        let text = responseData.join('')
        try {
          resolve(parse(text))
        } catch(e) {
          resolve(text)
        }
      })
    })

    req.on('error', reject)
    if (data) {
      req.write(data)
    }
    req.end()
  })
}

describe('Routers', function () {
  let fixturesPath = path.join(__dirname, '../fixtures/simple')
  let stack = []

  before(async function () {
    stack.push(process.cwd())
    process.chdir(fixturesPath)

    // eslint-disable-next-line no-invalid-this
    this.timeout(10000)
    let connection = 'postgres://localhost:5432/momentum_test'

    let momentumConfigOnly = new Momentum({
      environment: 'test',
      database: {
        connection: connection
      },
      processType: 'config',
      log: {log: _.noop}
    })

    await momentumConfigOnly.onceReady()

    let dbUtils = momentumConfigOnly.utils.db
    let config = momentumConfigOnly.config

    await dbUtils.dropDatabase(config).catch(_.noop)
    await dbUtils.createDatabase(config)
    await dbUtils.migrateLatest(config)
    await dbUtils.seedRun(config)

    momentum = new Momentum({
      environment: 'test',
      database: {
        connection: connection
      },
      log: {log: _.noop }
    })

    await momentum.onceReady()

  })

  after(async function () {
    momentum.stop()
    await momentum.onceStopped()
    process.chdir(stack.pop())
  })

  it('should load momentum', function () {
    expect(momentum.config).to.be.a('object')
    expect(momentum.config.environment).to.equal('test')
    expect(momentum.config.paths.appPath).to.equal(fixturesPath)
    expect(momentum.controllers).to.be.a('object')
    expect(momentum.controllers['api::AccountController']).to.be.a('object')
  })

  describe('routes', function () {

    it('should have an index ', function () {
      expectRoute('get', '/')
    })

    it('should have a stark/jarvis get route', function () {
      expectRoute('get', '/api/stark/jarvis')
    })

    it('should have a stark/jarvis post route', function () {
      expectRoute('post', '/api/stark/jarvis')
    })

    it('should apply decorators', function () {
      let JarvisRoute = momentum.routes['api::stark::jarvisRoute'].constructor
      expect(JarvisRoute.gamaLevel).to.equal(100)
    })

  })

  describe('functionality', function () {

    before(async function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(10000)
      momentum.start()
      await momentum.onceStarted()
    })

    it('should get /api/Account/sayHi to accountController#sayHi', async function () {
      let results = await execRoute('get', '/api/Account/sayHi')
      expect(results).to.equal('hi!')
    })

    it('should get / to indexRoute#index', async function () {
      let results = await execRoute('get', '/')
      expect(results).to.equal('Home')
    })


    it('should get /api/stark to starkRoute#index', async function () {
      let results = await execRoute('get', '/api/stark')
      expect(results).to.equal('Ready')
    })

    it('should get /api/stark/ceo to starkRoute#ceo', async function () {
      let results = await execRoute('get', '/api/stark/ceo')
      expect(results).to.equal('Pepper Potts')
    })

    it('should get /api/stark/jarvis to jarvisRoute#status', async function () {
      let results = await execRoute('get', '/api/stark/jarvis')
      expect(results).to.equal('Ready')
    })

    it('should post /api/stark/jarvis to jarvisRoute#cleanSlateProtocol', async function () {
      let results = await execRoute('post', '/api/stark/jarvis', JSON.stringify({}))
      expect(results).to.equal('Clean Slate Protocol initiated.')
    })

  })

})
