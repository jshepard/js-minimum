/*eslint-env node, mocha */
/*eslint no-unused-expressions: 0 */
/*eslint no-magic-numbers: 0 */

const _ = require('lodash')
const path = require('path')
const chai = require('chai')

const Momentum = require('../../lib/momentum')

let expect = chai.expect

let momentum

describe('Models', function () {
  let db
  let TableModel
  let Account
  let AccountGroup
  let AccountEvent

  let fixturesPath = path.join(__dirname, '../fixtures/simple')
  let stack = []
  let modelStaticMethods = [
    'select',
    'count',
    'find',
    'findOne',
    'create',
    'update',
    'updateOne',
    'destroy'
  ]

  let modelInstanceMethods = [
    'getDb',
    'toObject',
    'toJSON',
    'isDirty',
    'reset',
    'reload',
    'save',
    'destroy',
    'get',
    'set',
    'populate'
  ]

  let testCharacters = [{
    account_state_id: 2,
    account_group_id: 100,
    email: 'bruce.banner@defense.gov',
    first_name: 'Bruce',
    last_name: 'Banner',
    activation_token: 'green scar',
    encrypted_password: '*****'
  }, {
    account_state_id: 2,
    account_group_id: 100,
    email: 'clint.barton@shield.gov',
    first_name: 'Clint',
    last_name: 'Barton',
    activation_token: 'pizza dog',
    encrypted_password: '*****'
  }, {
    account_state_id: 2,
    account_group_id: 100,
    email: 'phil.coulston@shield.gov',
    first_name: 'Phil',
    last_name: 'Coulston',
    activation_token: 'T.A.H.I.T.I.',
    encrypted_password: '*****'
  }, {
    account_state_id: 2,
    account_group_id: 100,
    email: 'sam.wilson@shield.gov',
    first_name: 'Sam',
    last_name: 'Wilson',
    activation_token: 'redwing',
    encrypted_password: '*****'
  }, {
    account_state_id: 2,
    account_group_id: 100,
    email: 'james.rhodes@shield.gov',
    first_name: 'James',
    last_name: 'Rhodes',
    activation_token: 'warmachine',
    encrypted_password: '*****'
  }]

  let shieldAgent = {
    account_state_id: 2,
    account_group_id: 100,
    email: 'nick.fury@shield.gov',
    first_name: 'Nick',
    last_name: 'Fury',
    activation_token: 'secret war',
    encrypted_password: '*****'
  }

  function verifyAccountRecord(record) {
      expect(record instanceof TableModel).to.be.true
      expect(record instanceof Account).to.be.true
      expect(record.id).to.be.above(0)
  }

  before(async function () {
    stack.push(process.cwd())
    process.chdir(fixturesPath)

    // eslint-disable-next-line no-invalid-this
    this.timeout(5000)
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

    db = momentum.modules.db
    TableModel = db.TableModel
    Account = momentum.models.Account
    AccountGroup = momentum.models.AccountGroup
    AccountEvent = momentum.models.AccountEvent
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
    expect(momentum.models).to.be.a('object')
    expect(momentum.models.Account).to.be.a('function')
  })


  describe('Model types and inheritance', function () {

    it('has the expected models', function () {
      let tableNames = [
        'Account',
        'AccountEvent',
        'AccountGroup',
        'AccountPermission',
        'AccountXAccountPermission',
        'AccountXAgency',
        'Agency',
        'Migration',
        'MigrationLock'
      ]

      let modelNames = _.keys(momentum.models)

      _.each(tableNames, function (name) {
        expect(_.includes(modelNames, name)).to.equal(true)
      })
    })

    it ('creates models with the right type', function () {
      // they are classes
      expect(_.isFunction(TableModel)).to.equal(true)
      expect(_.isFunction(Account)).to.equal(true)

      // they inherit from TableModel
      expect(TableModel.prototype.isPrototypeOf(Account.prototype)).to.be.true

      let account = new Account()

      // they're instances of the correct type
      expect(account instanceof TableModel).to.equal(true)
      expect(account instanceof Account).to.equal(true)
    })

    it ('creates models with the right methods', function () {
      _.each(modelStaticMethods, function (name) {
        expect(_.has(TableModel, name)).to.equal(true)
        expect(_.isFunction(TableModel[name])).to.equal(true)
      })

      _.each(modelStaticMethods, function (name) {
        expect(_.isFunction(Account[name])).to.equal(true)
      })

      let account = new Account()
      _.each(modelInstanceMethods, function (name) {
        expect(_.isFunction(account[name])).to.equal(true)
      })
    })

    it('allows column names to be set in snake_case', function () {
      let account = new Account()

      expect(account.first_name).to.not.exist

      account.set('first_name', 'first')

      expect(account.first_name).to.equal('first')
      expect(account._dirty.first_name).to.exist
      expect(account._dirty.first_name).to.equal('first')
    })

    it('allows column names to be set in camelCase', function () {
      let account = new Account()

      expect(account.first_name).to.not.exist

      account.set('firstName', 'first')

      expect(account.first_name).to.equal('first')
      expect(account.firstName).to.equal('first')
      expect(account._dirty.first_name).to.exist
      expect(account._dirty.first_name).to.equal('first')
    })

    it('allows columns to be set in bulk with snake_case keys', function () {
      let account = new Account()

      expect(account.first_name).to.not.exist

      account.set(_.clone(shieldAgent))

      expect(account.first_name).to.equal(shieldAgent.first_name)
      expect(account.last_name).to.equal(shieldAgent.last_name)
      expect(account.email).to.equal(shieldAgent.email)
    })

    it('allows columns to be set in bulk with camelCase keys', function () {
      let account = new Account()

      expect(account.first_name).to.not.exist

      let camelCaseShieldAgent = _.mapKeys(shieldAgent, (value, key) => {
        return _.camelCase(key)
      })

      account.set(camelCaseShieldAgent)

      expect(account.first_name).to.equal(camelCaseShieldAgent.firstName)
      expect(account.firstName).to.equal(camelCaseShieldAgent.firstName)
      expect(account.last_name).to.equal(camelCaseShieldAgent.lastName)
      expect(account.lastName).to.equal(camelCaseShieldAgent.lastName)
      expect(account.email).to.equal(camelCaseShieldAgent.email)
    })

    // TODO: Object.preventExtensions and Object.freeze not working?
    it.skip('prevents accidentally setting fields that do not exist', function () {
      let error
      let account = new Account()

      try {
        account.doesNotExist = 'should not work'
      } catch (e) {
        error = e
      }

      expect(error).to.exist
    })

    it('allows valid fields to be set', function () {
      let error
      let account = new Account()

      try {
        account.firstName = 'some first name'
      } catch (e) {
        error = e
      }

      expect(error).to.not.exist
      expect(account.firstName).to.equal('some first name')
    })

    // TODO: Object.preventExtensions and Object.freeze not working?
    it.skip('prevents accidentally setting deep row values', function () {
      let error

      let state = {
        name: 'state',
        subValue:{
          name: 'subValue',
          subSubValue: {
            name: 'subSubValue'
          }
        }
      }

      let account = new Account({state: state})

      expect(account.state.subValue.name).to.equal('subValue')

      try {
        account.state.subValue.otherField = 'otherField'
      } catch (e) {
        error = e
      }

      expect(error).to.exist
      let row = account.getRow()
      let otherField = _.get(row, 'state.subValue.otherField')
      expect(otherField).to.not.exist
    })

    it('prevents accidentally setting deep row values on real query results', async function () {
      let error
      let account = await Account.findOne({id: 1})

      try {
        account.state.otherField = 'otherField'
      } catch (e) {
        error = e
      }

      expect(error).to.exist
    })

    it('allows json fields to be set', async function () {

      let state = {
        name: 'state',
        subValue:{
          name: 'subValue',
          subSubValue: {
            name: 'subSubValue'
          }
        }
      }

      let account = new Account({state: {}})

      account.state = state
      expect(account.isDirty()).to.be.true
      expect(_.get(account, 'state.subValue.subSubValue.name')).to.equal('subSubValue')

      let row = account.getRow()
      let dirty = account._dirty
      let json = account.toJSON()

      expect(_.isEmpty(row.state)).to.be.true

      expect(dirty.state).to.exist

      expect(state).to.deep.equal(dirty.state)
      expect(state).to.deep.equal(json.state)
    })
  })

  describe('CRUD functionality', function () {

    function verifyAccountArray(records) {
      expect(_.isArray(records)).to.be.true
      expect(_.size(records)).to.be.above(0)

      _.each(records, function (record) {
        verifyAccountRecord(record)
      })
    }

    describe('find', function () {
      it('can find with no params', async function () {
        let records = await Account.find()
        verifyAccountArray(records)
      })

      it('can find with criteria', async function () {
        let records = await Account.find({id: 1})
        verifyAccountArray(records)
        expect(_.size(records)).to.equal(1)
        let record = _.first(records)
        expect(record.id).to.equal(1)
      })

      it('can find with empty criteria', async function () {
        let records = await Account.find({})
        verifyAccountArray(records)
      })

      it('can find with options', async function () {
        let account = await Account.find({}, {limit: 2})
        verifyAccountArray(account)
        expect(_.size(account)).to.equal(2)
      })

      it('returns empty array when no results', async function () {
        let records = await Account.find({id: 0})
        expect(_.isArray(records)).to.be.true
        expect(_.size(records)).to.equal(0)
      })

      it('can find using critera', async function () {
        let records = await Account.find({id: {gt: 3}})
        let ids = _.map(records, 'id')
        expect(_.first(ids)).to.equal(4)
      })
    })

    describe('findOne', function () {

      it('can find with just an id', async function () {
        let record = await Account.findOne(1)
        expect(_.isArray(record)).to.be.false
        verifyAccountRecord(record)
        expect(record.id).to.equal(1)
      })

      it('should throw an error if findOne returns more than one record', async function () {
        let record
        let error
        try {
          record = await Account.findOne({})
        } catch (e) {
          error = e
        }
        expect(error).to.exist
        expect(record).to.not.exist
      })

      it('should return undefined when there is no match', async function () {
        let record = await Account.findOne({id: 0})
        expect(record).to.not.exist
      })
    })

    describe('create', function () {

      afterEach(async function () {
          await Account.destroy({account_group_id: shieldAgent.account_group_id})
      })

      it('can create a record', async function () {
        let values = _.clone(shieldAgent)
        let record = await Account.create(values)
        expect(record instanceof Account).to.be.true
        expect(record.id).to.be.above(0)
      })

    })

    describe('update', function () {

      afterEach(async function () {
          await Account.destroy({account_group_id: shieldAgent.account_group_id})
      })

      it('can update multiple records', async function () {
        await Account.create(_.clone(testCharacters[0]))
        await Account.create(_.clone(testCharacters[1]))

        let accounts = await Account.find({account_group_id: shieldAgent.account_group_id})

        expect(_.size(accounts)).to.be.above(1)
        _.each(accounts, function (record) {
          expect(record.account_group_id).to.equal(shieldAgent.account_group_id)
        })

        let updatedShieldAgents = await Account.update({account_group_id: shieldAgent.account_group_id}, {activation_token: 'marvel-universe'})
        expect(_.size(updatedShieldAgents)).to.be.above(1)

        _.each(updatedShieldAgents, function (record) {
          expect(record.activationToken).to.equal('marvel-universe')
        })
      })
    })

    describe('updateOne', function () {

      afterEach(async function () {
          await Account.destroy({account_group_id: shieldAgent.account_group_id})
      })

      it('can update one record', async function () {
        let values = _.clone(shieldAgent)
        let record = await Account.create(values)

        expect(record instanceof Account).to.be.true
        expect(record.firstName).to.equal('Nick')

        await Account.updateOne(record.id, {first_name: 'Jack', email: 'jack.fury@example.com'})
        await record.reload()

        expect(record.firstName).to.equal('Jack')
      })

      it('can update one record within an existing transaction', async function () {
        let values = _.clone(shieldAgent)
        let record = await Account.create(values)

        expect(record instanceof Account).to.be.true
        expect(record.firstName).to.equal('Nick')

        await db.begin(async function(tx) {
          await Account.updateOne(record.id, {first_name: 'Jack', email: 'jack.fury@example.com'}, tx)
        })

        await record.reload()

        expect(record.firstName).to.equal('Jack')
      })

      it('fails when updating more than one record', async function () {
        await Account.create(_.clone(testCharacters[0]))
        await Account.create(_.clone(testCharacters[1]))

        let error
        let record
        try {
          record = await Account.updateOne({account_group_id: shieldAgent.account_group_id}, {activation_token: 'cival-war'})
        } catch (e) {
          error = e
        }

        // we should get an error
        expect(error).to.exist
        expect(record).to.not.exist

        // none of the records should have been updated
        let records = await Account.find({activation_token: 'cival-war'})

        expect(_.isEmpty(records)).to.be.true
      })

      it('fails when updating more than one record within an existing transaction', async function () {
        await Account.create(_.clone(testCharacters[0]))
        await Account.create(_.clone(testCharacters[1]))

        let error
        let record
        try {
          await db.begin(async function(tx) {
            record = await Account.updateOne({account_group_id: shieldAgent.account_group_id}, {activation_token: 'cival-war'}, tx)
          })
        } catch (e) {
          error = e
        }

        // we should get an error
        expect(error).to.exist
        expect(record).to.not.exist

        // none of the records should have been updated
        let records = await Account.find({activation_token: 'cival-war'})

        expect(_.isEmpty(records)).to.be.true
      })
    })

    describe('count', function () {

      it('can count with no params', async function () {
        let count = await Account.count()
        let records = await Account.find({}, {limit:0})

        expect(_.size(records)).to.equal(count)
      })

      it('can count with criteria', async function () {
        let countAll = await Account.count()
        let count = await Account.count({id:{gt:2}})
        let records = await Account.find({id:{gt:2}}, {limit:0})

        expect(countAll).to.be.above(count)
        expect(count).to.be.above(1)
        expect(_.size(records)).to.equal(count)
      })
    })

    describe('destroy', function () {

      afterEach(async function () {
          await Account.destroy({account_group_id: shieldAgent.account_group_id})
      })

      it('can remove a single record', async function () {
        let values = _.clone(shieldAgent)
        let record = await Account.create(values)

        let destroyed = await Account.destroy(record.id)
        expect(_.size(destroyed)).to.equal(1)

        let destroyedRecord = _.first(destroyed)
        expect(record.id).to.equal(destroyedRecord.id)
        let missing = await Account.findOne(record.id)
        expect(missing).to.not.exist
      })

      it('can remove multiple records', async function () {
        await Account.create(_.clone(testCharacters[0]))
        await Account.create(_.clone(testCharacters[1]))

        let records = await Account.find({account_group_id: shieldAgent.account_group_id})
        expect(_.size(records)).to.be.above(1)

        let destroyed = await Account.destroy({account_group_id: shieldAgent.account_group_id})
        expect(_.size(destroyed)).to.equal(_.size(records))

        let missing = await Account.find({account_group_id: shieldAgent.account_group_id})
        expect(_.size(missing)).to.equal(0)
      })
    })

    describe('transactions', function () {

      afterEach(async function () {
          await Account.destroy({account_group_id: shieldAgent.account_group_id})
      })

      it('can run in a transacton', async function () {
        let account = await Account.create(_.clone(testCharacters[0]))

        await db.begin(async function(tx) {
          let record = await Account.findOne(account.id, tx)
          record.firstName = 'bannana'
          await record.save(tx)
        })

        let record = await Account.findOne(account.id)
        expect(record.firstName).to.equal('bannana')
      })

      it('rolls back when an error occurs within the transaction', async function () {
        let firstName
        let error
        let account = await Account.create(_.clone(testCharacters[0]))
        try {
          await db.begin(async function (tx) {
            let record = await Account.findOne(account.id, tx)
            firstName = record.firstName
            record.firstName = 'bannana'
            await record.save(tx)
            throw new Error('some error after save')
          })
        } catch (e) {
          error = e
        }
        expect(error).to.exist

        let record = await Account.findOne(account.id)
        expect(record.firstName).to.equal(firstName)
      })

      it('rolls back when an sql error occurs within the transaction', async function () {
        let firstName
        let error
        let record = await Account.create(_.clone(testCharacters[0]))
        try {
          await db.begin(async function (tx) {
            firstName = record.firstName
            record.firstName = 'banana'
            await record.save(tx)
            record.accountGroupId = 'foobar'
            await record.save(tx)
          })
        } catch (e) {
          error = e
        }
        expect(error).to.exist

        let tony = await Account.findOne(record.id)
        expect(tony.firstName).to.equal(firstName)
      })
    })
  })

  describe('Record functionality', function () {
    let record

    beforeEach(async function () {
      record = await Account.create(shieldAgent)
      expect(record instanceof Account).to.be.true
    })

    afterEach(async function () {
        await Account.destroy({account_group_id: shieldAgent.account_group_id})
    })

    it('record knows the Model identity', function () {
      expect(record.Model).to.equal(Account)
    })

    it('keeps track of dirty state and can reset', function () {
      expect(record.isDirty()).to.be.false
      record.firstName = 'some other name'
      expect(record.firstName).to.equal('some other name')

      record.activationToken = 'some activation token'
      expect(record.activationToken).to.equal('some activation token')

      expect(record.isDirty()).to.be.true
      expect(_.get(record._dirty, 'first_name')).to.equal(record.firstName)
      expect(_.get(record._dirty, 'activation_token')).to.equal(record.activationToken)

      record.reset()

      expect(record.isDirty()).to.be.false
      expect(_.isEmpty(record._dirty)).to.be.true
    })

    it('it uses dirty state when serializing', function () {
      record.reset()

      expect(record.isDirty()).to.be.false

      let clean = record.toObject()
      expect(_.get(clean, 'first_name')).to.equal(record.firstName)

      record.firstName = 'bannana'
      expect(record.isDirty()).to.be.true

      let dirty = record.toObject()
      expect(_.get(dirty, 'first_name')).to.equal('bannana')

      record.reset()
    })

    it('filters omit fields when serializing via toJSON', async function () {
      let toObjectResults = record.toObject()
      let toJSONResults = record.toJSON()

      expect(_.has(toObjectResults, 'encrypted_password')).to.be.true
      expect(_.has(toJSONResults, 'encrypted_password')).to.be.false
    })

    it('can save values', async function () {

      record.reset()
      expect(record.isDirty()).to.be.false
      let originalName = record.firstName

      expect(record.firstName).to.not.equal('Jack')

      record.firstName = 'Jack'
      await record.save()

      expect(record.isDirty()).to.be.false
      expect(record.firstName).to.equal('Jack')

      record.firstName = originalName
      await record.save()
    })

    it('can reload values', async function () {

      let originalName = record.firstName
      let resetRecord = await Account.findOne(record.id)

      expect(resetRecord.firstName).to.equal(record.firstName)
      expect(record.firstName).to.not.equal('Jack')

      record.firstName = 'Jack'
      await record.save()
      expect(record.firstName).to.equal('Jack')

      expect(resetRecord.firstName).to.equal(originalName)
      await resetRecord.reload()
      expect(resetRecord.firstName).to.equal('Jack')

      record.firstName = originalName
      await record.save()

    })

    it('can destroy itself', async function () {
      let account = await Account.create(_.clone(testCharacters[0]))
      expect(account instanceof Account).to.be.true
      expect(account.id).to.be.above(0)
      expect(account._destroyed).to.be.false

      let exists = await Account.findOne(account.id)
      expect(exists).to.exist
      expect(exists.id).to.equal(account.id)

      await account.destroy()
      expect(account._destroyed).to.be.true

      exists = await Account.findOne(account.id)
      expect(exists).to.not.exist
    })

    it('save creates new record when detached', async function () {
      let values = _.clone(testCharacters[0])

      let account = new Account()
      expect(account.isDirty()).to.be.false
      expect(account.id).to.not.exist

      account.set(values)
      expect(account.isDirty()).to.be.true

      await account.save()
      expect(account.isDirty()).to.be.false

      expect(account.id).to.exist
      expect(account.firstName).to.equal(values.first_name)

      await account.destroy()
    })

    it('refuses to save a destroyed record', async function () {
      let error
      let values = _.clone(testCharacters[0])

      let account = new Account()
      account.set(values)
      await account.save()
      await account.destroy()

      expect(account.id).to.exist
      expect(account.firstName).to.equal(values.first_name)
      expect(account.isDirty()).to.be.false
      account.firstName = 'Some-other-name'

      try {
        await account.save()
      } catch (e) {
        error = e
      }

      expect(error).to.exist
    })

    it('can lock a single record with nowait', function (done) {

      async function doWork() {
        let steve = await Account.steve()
        let cap = await Account.steve()

        Account.db.begin(async (tx) => {
          await steve.lockNoWait(tx)
          steve.emit('ping')
          await steve.onceAsync('pong')
        })
        .then(() => {
          done()
        })
        .catch(done)

        steve.once('ping', () => {
          Account.db.begin(async (tx) => {
            await cap.lockNoWait(tx)
          })
          .then(() => {
            done('should not allow a second lock')
          })
          .catch(() => {
            steve.emit('pong')
          })
        })
      }

      doWork()
    })

    it('can lock a single record with wait', function (done) {

      async function doWork() {
        let steve = await Account.steve()
        let cap = await Account.steve()

        Account.db.begin(async (tx) => {
          await steve.lock(tx)
          steve.emit('ping')
          await steve.onceAsync('release')
        })
        .catch(done)

        steve.once('ping', () => {
          Account.db.begin(async (tx) => {

            setTimeout(() => {
              steve.emit('release')
            }, 100)

            await cap.lock(tx)
          })
          .then(() => {
            done()
          })
          .catch(done)
        })
      }

      doWork()
    })

    describe('associations', function () {

      it('finds has one associations', function () {
        // AccountUser has one accountGroup via account_group_id
        expect(Account.associations.accountGroup).to.exist
        expect(Account.associations.accountGroup.type).to.equal('one')
        expect(Account.associations.accountGroup.tableName).to.equal('account_group')
        expect(Account.associations.accountGroup.column).to.equal('account_group_id')
      })

      it('finds has many associations', function () {
        // AccountUser has many accountEvents via account_id
        expect(Account.associations.accountEvents).to.exist
        expect(Account.associations.accountEvents.type).to.equal('many')
        expect(Account.associations.accountEvents.tableName).to.equal('account_event')
        expect(Account.associations.accountEvents.column).to.equal('account_id')
      })

      it('finds through associations via cross tables', function () {
        // Account has many accountPermissions through account_x_account_permission
        expect(Account.associations.accountPermissions).to.exist
        expect(Account.associations.accountPermissions.type).to.equal('through')
        expect(Account.associations.accountPermissions.tableName).to.equal('account_permission')
        expect(Account.associations.accountPermissions.through).to.equal('account_x_account_permission')
        expect(Account.associations.accountPermissions.fromTableColumn).to.equal('account_x_account_permission.account_id')
        expect(Account.associations.accountPermissions.toTableColumn).to.equal('account_x_account_permission.account_permission_id')
      })

      it('populates "has one" associations', async function () {
        let steve = await Account.steve()
        expect(steve.accountGroup).to.not.exist

        await steve.populate('accountGroup')

        expect(steve.accountGroup).to.exist
        expect(steve.accountGroup instanceof AccountGroup).to.be.true
        expect(steve.accountGroup.id).to.equal(1)
      })

      it('populates "has one" associations via q.populate', async function () {

        let steve = await Account.steve().populate('accountGroup')

        expect(steve.accountGroup).to.exist
        expect(steve.accountGroup instanceof AccountGroup).to.be.true
        expect(steve.accountGroup.id).to.equal(1)
      })

      it('serializes "has one" associations', async function () {
        let steve = await Account.steve()
        expect(steve.accountGroup).to.not.exist

        await steve.populate('accountGroup')
        let json = steve.toJSON()

        expect(json.account_group).to.exist
        expect(json.account_group.id).to.equal(1)
      })

      it('populates "has many" associations', async function () {
        let steve = await Account.steve()
        expect(steve).to.exist
        expect(steve.accountEvents).to.be.empty

        await steve.populate('accountEvents')
        expect(steve.accountEvents).to.exist
        expect(_.isArray(steve.accountEvents)).to.be.true

        let accepted = _.find(steve.accountEvents, {code: 'IA'})
        expect(accepted).to.exist
        expect(accepted instanceof AccountEvent).to.be.true
      })

      it('populates "has many" associations via q.populate', async function () {
        let steve = await Account.steve().populate('accountEvents')
        expect(steve).to.exist
        expect(steve.accountEvents).to.exist
        expect(_.isArray(steve.accountEvents)).to.be.true

        let accepted = _.find(steve.accountEvents, {code: 'IA'})
        expect(accepted).to.exist
        expect(accepted instanceof AccountEvent).to.be.true
      })

      it('serializes "has many" associations', async function () {
        let steve = await Account.steve()
        expect(steve).to.exist
        expect(steve.accountEvents).to.be.empty

        await steve.populate('accountEvents')
        let json = steve.toJSON()
        expect(json.account_events).to.exist
        expect(_.isArray(json.account_events)).to.be.true

        let accepted = _.find(json.account_events, {code: 'IA'})
        expect(accepted).to.exist
      })

      it('populates enumeration "through" associations', async function () {
        let steve = await Account.steve()
        await steve.populate('accountPermissions')
        let permission = _.first(steve.accountPermissions)
        expect(_.isNumber(permission)).to.be.true
      })

      it('populates enumeration "through" associations via q.populate', async function () {
        let steve = await Account.steve().populate('accountPermissions')
        let permission = _.first(steve.accountPermissions)
        expect(_.isNumber(permission)).to.be.true
      })

      it('serializes enumeration "through" associations', async function () {
        let steve = await Account.steve()
        await steve.populate('accountPermissions')
        let json = steve.toJSON()
        let permission = _.first(json.account_permissions)
        expect(_.isNumber(permission)).to.be.true
      })

      it('populates "through" associations', async function () {
        let steve = await Account.steve()
        await steve.populate('agencies')
        let agency = _.find(steve.agencies, {id: 1})
        expect(agency instanceof db.models.Agency).to.be.true
      })

      it('populates "through" associations via q.populate', async function () {
        let steve = await Account.steve().populate('agencies')
        let agency = _.find(steve.agencies, {id: 1})
        expect(agency instanceof db.models.Agency).to.be.true
      })

      it('serializes "through" associations', async function () {
        let steve = await Account.steve()
        await steve.populate('agencies')
        let json = steve.toJSON()
        let agency = _.find(json.agencies, {id: 1})
        expect(agency).to.exist
      })

      it('can set a "has one" association with a model', async function () {
        let steve = await Account.steve()
        let peter = await Account.findOne({email: 'parker@dailybugle.com'})

        await steve.populate('accountGroup')
        await peter.populate('accountGroup')

        let oldAccountGroup = steve.accountGroup
        let accountGroup = peter.accountGroup

        await steve.attach('accountGroup', accountGroup)
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(accountGroup.id)

        await steve.attach('accountGroup', oldAccountGroup)
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(oldAccountGroup.id)
      })

      it('can set a "has one" association with an id', async function () {
        let steve = await Account.steve()
        let peter = await Account.findOne({email: 'parker@dailybugle.com'})

        await steve.populate('accountGroup')
        await peter.populate('accountGroup')

        let oldAccountGroup = steve.accountGroup
        let accountGroup = peter.accountGroup

        await steve.attach('accountGroup', accountGroup.id)
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(accountGroup.id)

        await steve.attach('accountGroup', oldAccountGroup.id)
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(oldAccountGroup.id)
      })

      it('can set a "has one" association with an array', async function () {
        let steve = await Account.steve()
        let peter = await Account.findOne({email: 'parker@dailybugle.com'})

        await steve.populate('accountGroup')
        await peter.populate('accountGroup')

        let oldAccountGroup = steve.accountGroup
        let accountGroup = peter.accountGroup

        await steve.attach('accountGroup', [accountGroup.id])
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(accountGroup.id)

        await steve.attach('accountGroup', [oldAccountGroup.id])
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(oldAccountGroup.id)
      })

      it('throws an error when more than one value is attached to "has one" association', async function () {
        let steve = await Account.steve()
        let peter = await Account.findOne({email: 'parker@dailybugle.com'})

        await steve.populate('accountGroup')
        await peter.populate('accountGroup')

        let oldAccountGroup = steve.accountGroup
        let accountGroup = peter.accountGroup

        let error

        try {
          await steve.attach('accountGroup', [oldAccountGroup.id, accountGroup.id])
        } catch (e){
          error = e
        }

        expect(error).to.exist
      })

      it('can attach a "has many" association with a model', async function () {
        let steve = await Account.steve()
        let peter = await Account.findOne({email: 'parker@dailybugle.com'})

        await steve.populate('accountGroup')
        await peter.populate('accountGroup')

        let oldAccountGroup = steve.accountGroup
        let accountGroup = peter.accountGroup

        await accountGroup.attach('accounts', steve)
        await steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(accountGroup.id)

        await steve.attach('accountGroup', oldAccountGroup)
        steve.reload()

        expect(steve.accountGroup).to.be.instanceof(AccountGroup)
        expect(steve.accountGroup.id).to.equal(oldAccountGroup.id)
      })

      it('can destroy a "has many" association with a model', async function () {
        let steve = await Account.steve()
        await steve.populate('accountEvents')

        let accepted = _.find(steve.accountEvents, {code: 'IA'})
        expect(accepted).to.exist
        expect(accepted instanceof AccountEvent).to.be.true

        await steve.destroyAssociations('accountEvents', accepted)
        await steve.reload()

        expect(_.find(steve.accountEvents, {code: 'IA'})).to.not.exist

      })

      it('can destroy multiple "has many" associations with an array of models', async function () {
        let steve = await Account.steve()
        await steve.populate('accountEvents')
        expect(_.size(steve.accountEvents)).to.be.above(1)

        await steve.destroyAssociations('accountEvents', steve.accountEvents)
        await steve.reload()

        expect(steve.accountEvents).to.be.empty
      })

      it('can attach a "through" association with an enumeration', async function () {
        let steve = await Account.steve()
        let AccountPermission = momentum.enums.AccountPermission

        await steve.populate('accountPermissions')
        expect(steve.accountPermissions).to.not.include(AccountPermission.EDIT_TICKETS)

        await steve.attach('accountPermissions', AccountPermission.EDIT_TICKETS)
        await steve.reload()

        expect(steve.accountPermissions).to.include(AccountPermission.EDIT_TICKETS)
      })

      it('can detach a "through" association with an enumeration', async function () {
        let steve = await Account.steve()
        let AccountPermission = momentum.enums.AccountPermission

        await steve.populate('accountPermissions')
        expect(steve.accountPermissions).to.include(AccountPermission.MODIFY_PASSWORDS)

        await steve.detach('accountPermissions', AccountPermission.MODIFY_PASSWORDS)
        await steve.reload()

        expect(steve.accountPermissions).to.not.include(AccountPermission.MODIFY_PASSWORDS)
      })

      // TODO: test {destroy:false} path for detach! (need nullable references first)
    })

    describe('enumerations', function () {
      it('creates db enumerations', async function () {
        let AccountState = momentum.modules.db.enums.AccountState
        expect(AccountState).to.exist
      })

      it('creates getters for enumeration associations', async function () {
        let Account = momentum.modules.db.models.Account
        let AccountState = momentum.modules.db.enums.AccountState

        let account = new Account({
          account_state_id: AccountState.ACTIVE,
          account_group_id: 100,
          email: 't.challa@wakanda.gov',
          first_name: 'T',
          last_name: '\'Challa',
          activation_token: 'vibranium',
          encrypted_password: '*****'
        })

        expect(account.accountState).to.equal(AccountState.ACTIVE)
      })

      it('creates setters for enumeration associations', async function () {
        let Account = momentum.modules.db.models.Account
        let AccountState = momentum.modules.db.enums.AccountState

        let account = new Account({
          account_state_id: AccountState.ACTIVE,
          account_group_id: 100,
          email: 't.challa@wakanda.gov',
          first_name: 'T',
          last_name: '\'Challa',
          activation_token: 'vibranium',
          encrypted_password: '*****'
        })

        account.accountState = AccountState.UNKNOWN
        expect(account.accountState).to.equal(AccountState.UNKNOWN)
        expect(account._dirty.account_state_id).to.equal(AccountState.UNKNOWN)
      })

      it('allows enumeration associations to be set to null', async function () {
        let Account = momentum.modules.db.models.Account
        let AccountState = momentum.modules.db.enums.AccountState

        let account = new Account({
          account_state_id: AccountState.ACTIVE,
          account_group_id: 100,
          email: 't.challa@wakanda.gov',
          first_name: 'T',
          last_name: '\'Challa',
          activation_token: 'vibranium',
          encrypted_password: '*****'
        })

        account.accountState = null
        expect(account.accountState).to.equal(null)
        expect(account._dirty.account_state_id).to.equal(null)
      })

      it('enumeration associations reject invalid values', async function () {
        let Account = momentum.modules.db.models.Account

        let account = new Account({
          account_state_id: AccountState.ACTIVE,
          account_group_id: 100,
          email: 't.challa@wakanda.gov',
          first_name: 'T',
          last_name: '\'Challa',
          activation_token: 'vibranium',
          encrypted_password: '*****'
        })

        let error
        try {
          account.accountState = 42
        } catch (e) {
          error = e
        }
        expect(error).to.exist
      })

    })

  })
})
