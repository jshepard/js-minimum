/*eslint-env node, mocha */
/*eslint no-unused-expressions: 0 */
/*eslint no-magic-numbers: 0 */

const _ = require('lodash')
const path = require('path')
const chai = require('chai')
const http = require('http')

const Momentum = require('../../lib/momentum')

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

describe('Controllers', function () {
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

  it('should have the custom options', function () {
    expect(momentum.controllers['api::AccountController'].options.associations).to.exist
  })

  it('should load the custom routes', function () {
    expectRoute('get', '/api/Account/sayHi')
  })

  describe('Decorators', function () {
    it('should load the default decorators', function () {
      _.each(['options', 'policies', 'get', 'put', 'post', 'del', 'patch'], function (name) {
        expect(momentum.decorators[name]).to.exist
        expect(momentum.decorators[name]).to.be.a('function')
      })
    })

    it('should load any custom decorators', function () {
      expect(momentum.decorators.gamaLevel).to.exist
      expect(momentum.decorators.gamaLevel).to.be.a('function')
    })
  })

  describe('model CRUD routes', function () {
    it('should have a create route', function () {
      expectRoute('post', '/api/Account')
    })

    it('should have a find route', function () {
      expectRoute('get', '/api/Account')
    })

    it('should have a findOne route', function () {
      expectRoute('get', '/api/Account/{id}')
    })

    it('should have a put update route', function () {
      expectRoute('put', '/api/Account/{id}')
    })

    it('should have a post update route', function () {
      expectRoute('post', '/api/Account/{id}')
    })

    it('should have a delete route', function () {
      expectRoute('delete', '/api/Account/{id}')
    })
  })

  describe('subController CRUD routes', function () {
    it('should have a create route', function () {
      expectRoute('post', '/api/Account/{id}/AccountEvents')
    })

    it('should have a find route', function () {
      expectRoute('get', '/api/Account/{id}/AccountEvents')
    })

    it('should have a findOne route', function () {
      expectRoute('get', '/api/Account/{id}/AccountEvents/{associationId}')
    })

    it('should have a put update route', function () {
      expectRoute('put', '/api/Account/{id}/AccountEvents/{associationId}')
    })

    it('should have a post update route', function () {
      expectRoute('post', '/api/Account/{id}/AccountEvents/{associationId}')
    })

    it('should have a delete route', function () {
      expectRoute('delete', '/api/Account/{id}/AccountEvents/{associationId}')
    })
  })

  describe('functionality', function () {

    before(async function () {
      // eslint-disable-next-line no-invalid-this
      this.timeout(10000)
      momentum.start()
      await momentum.onceStarted()
    })

    describe('model CRUD routes', function () {
      let createdId
      let AccountKeys = [
        'id',
        'version',
        'created_at',
        'updated_at',
        'account_group_id',
        'email',
        'first_name',
        'last_name',
        'activation_token',
        'reset_password_token',
        'reset_password_expires_at',
        'update_email_token',
        'update_email',
        'active',
        'suspended',
        'failed_login_attempts',
        'failed_login_ip_address',
        'failed_login_suspended_until',
        'last_login_at',
        'state'
      ]

      it('should create', async function () {
        let data = {
          account_state_id: 1,
          account_group_id: 100,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          encrypted_password: '*****'
        }

        let results = await execRoute('post', '/api/Account', JSON.stringify(data))
        _.each(AccountKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        _.each(_.omit(data, 'encrypted_password'), (value, key) => {
          expect(results[key]).to.equal(value)
        })

        createdId = results.id
      })

      it('should find', async function () {
        let results = await execRoute('get', '/api/Account')

        expect(_.isArray(results)).to.be.true
        expect(_.size(results)).to.be.above(0)
        let first = _.first(results)
        _.each(AccountKeys, (key) => {
          expect(_.has(first, key)).to.be.true
        })
      })

      it('should auto pouluate the populate fields', async function () {
        let results = await execRoute('get', '/api/Account')

        expect(_.isArray(results)).to.be.true
        expect(_.size(results)).to.be.above(0)
        let steve = _.find(results, {email: 'steve.rogers@army.mil'})

        expect(steve.account_group).to.exist
        expect(steve.account_events).to.exist
        expect(_.isArray(steve.account_events)).to.be.true
        let accepted = _.find(steve.account_events, {code: 'IA'})
        expect(accepted).to.exist
      })

      it('should have a findOne route', async function () {
        let results = await execRoute('get', `/api/Account/${createdId}`)

        expect(_.isObject(results)).to.be.true
        _.each(AccountKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
      })

      it('should have a put update route', async function () {
          let data = {first_name: 'First'}
          let results = await execRoute('put', `/api/Account/${createdId}`, JSON.stringify(data))

          expect(_.isObject(results)).to.be.true
          _.each(AccountKeys, (key) => {
            expect(_.has(results, key)).to.be.true
          })
          expect(results.first_name).to.equal(data.first_name)
      })

      it('should have a post update route', async function () {
        let data = {first_name: 'Test'}
        let results = await execRoute('post', `/api/Account/${createdId}`, JSON.stringify(data))

        expect(_.isObject(results)).to.be.true
        _.each(AccountKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        expect(results.first_name).to.equal(data.first_name)
      })

      it('should have a delete route', async function () {
        let results = await execRoute('delete', `/api/Account/${createdId}`)
        expect(_.isObject(results)).to.be.true
        _.each(AccountKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        expect(results.id).to.equal(createdId)
        expect(results.email).to.equal('test@example.com')
      })
    })

    describe('subController CRUD routes', function () {
      let accountId
      let createdId

      let accountEventData = {
        code: 'A1',
        location: 'Seattle',
        description: 'The Emerald City.'
      }

      let AccountEventKeys = [
        'id',
        'version',
        'created_at',
        'updated_at',
        'account_id',
        'code',
        'location',
        'description'
      ]

      before(async function () {
        let account = await momentum.models.Account.create({
          account_state_id: 2,
          account_group_id: 100,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          encrypted_password: '*****'
        })
        accountId = account.id
      })

      after(async function () {
        await momentum.models.Account.destroy(accountId)
      })

      it('should create', async function () {
        let results = await execRoute('post', `/api/Account/${accountId}/AccountEvents`, JSON.stringify(accountEventData))

        _.each(accountEventData, (value, key) => {
          expect(results[key]).to.equal(value)
        })
        expect(results.account_id).to.equal(accountId)
        createdId = results.id
      })

      it('should find', async function () {
        let results = await execRoute('get', `/api/Account/${accountId}/AccountEvents`)

        expect(_.isArray(results)).to.be.true
        expect(_.size(results)).to.be.above(0)
        let first = _.first(results)
        _.each(AccountEventKeys, (key) => {
          expect(_.has(first, key)).to.be.true
        })
        expect(first.account_id).to.equal(accountId)
      })

      it('should have a findOne route', async function () {
        let results = await execRoute('get', `/api/Account/${accountId}/AccountEvents/${createdId}`)

        expect(_.isObject(results)).to.be.true
        _.each(AccountEventKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        expect(results.account_id).to.equal(accountId)
      })

      it('should have a put update route', async function () {
          let data = {description: 'Updated description'}
          let results = await execRoute('put', `/api/Account/${accountId}/AccountEvents/${createdId}`, JSON.stringify(data))

          expect(_.isObject(results)).to.be.true
          _.each(AccountEventKeys, (key) => {
            expect(_.has(results, key)).to.be.true
          })
          expect(results.description).to.equal(data.description)
      })

      it('should have a post update route', async function () {
        let data = {description: accountEventData.description}
        let results = await execRoute('post', `/api/Account/${accountId}/AccountEvents/${createdId}`, JSON.stringify(data))

        expect(_.isObject(results)).to.be.true
        _.each(AccountEventKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        expect(results.description).to.equal(data.description)
      })

      it('should have a delete route', async function () {
        let results = await execRoute('delete', `/api/Account/${accountId}/AccountEvents/${createdId}`)
        expect(_.isObject(results)).to.be.true
        _.each(AccountEventKeys, (key) => {
          expect(_.has(results, key)).to.be.true
        })
        expect(results.id).to.equal(createdId)
      })
    })

  })

})
