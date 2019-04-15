const _ = require('lodash')
const INSPECT_CUSTOM = require('util').inspect.custom
const bluebird = require('bluebird')
const utils = require('../../utils')
const {TableModelAssociation} = require('./tableModelAssociation')

function addPromiseMethods(q) {
  q.then = async function _then(onFulfilled, onRejected) {
    return q.exec().then(onFulfilled, onRejected)
  }

  q.catch = async function _catch(onRejected) {
    return q.exec().catch(onRejected)
  }

  q.tap = async function _tap(sideEffect) {
    return q.then((results) => {
      sideEffect(results)
      return results
    })
  }

  q.map = async function _map(mapper) {
    return q.then((results) => {
      return _.map(results, mapper)
    })
  }

  q.reduce = async function _reduce(reducer, initialValue) {
    return q.then((results) => {
      return _.reduce(results, reducer, initialValue)
    })
  }

  q.return = async function _return(value) {
    return q.then(() => {
      return value
    })
  }
}

function parsePopulateOptions(associationName, options) {
    if (_.isArray(associationName)) {
      return _.map(associationName, (name) => {
        if (_.isString(name)) {
          return {name: name, options: options}
        } else {
          return name
        }
      })
    } else if (associationName) {
      return [{name: associationName, options: options}]
    } else {
      return []
    }
}


function addMomentumMethods(q) {
  q.populate = function (associationName, options = {}) {
    q.associations = q.associations || {}
    _.each(parsePopulateOptions(associationName, options), ({name, options}) => {
      q.associations[name] = options
    })
    return q
  }
}

function exec(Model, q, eventName, args) {
  let execute = bluebird.promisify(q.execute, {context: q})

  q.exec = async function _exec() {
    await Model.emitAsync(`before:${eventName}`, ...args)

    let results = await execute()

    let models = _.map(results.rows, (row) => {
      return new Model(row, {_detached: false})
    })

    let associationPromises = _(models)
      .map((model) => {
        return _.map(_.keys(q.associations), (associationName) => {
          return model.populate(associationName, q.associations[associationName])
        })
      })
      .flatten()
      .value()
    await Promise.all(associationPromises)

    await Model.emitAsync(eventName, models)

    return models
  }

  addPromiseMethods(q)
  addMomentumMethods(q)

  return q.exec
}

function execOne(Model, q, eventName, args) {
  let execute = bluebird.promisify(q.execute, {context: q})

  q.exec = async function _execOne() {
    await Model.emitAsync(`before:${eventName}`, ...args)

    let results = await execute()
    if (_.size(results.rows) > 1) {
      throw new Error('More than one result from execOne')
    }
    let row = _.first(results.rows)

    let model = null
    if (row) {
      model = new Model(row, {_detached: false})
    }

    let associationPromises = _.map(_.keys(q.associations), (associationName) => {
      return model.populate(associationName, q.associations[associationName])
    })
    await Promise.all(associationPromises)

    await Model.emitAsync(eventName, model)

    return model
  }

  addPromiseMethods(q)
  addMomentumMethods(q)

  return q.exec
}

function isTx(db) {
    return (db.commit && db.rollback)
}

function execOneTx(Model, q, eventName, args, tx) {
  let execute = bluebird.promisify(q.execute, {context: q})

  q.exec = async function _execOne() {
    await Model.emitAsync(`before:${eventName}`, ...args)

    let results = await execute()

    if (_.size(results.rows) > 1) {
      if (tx) {
        if (tx.state() !== 'closed') {
          await tx.rollbackPromise()
        }
      }
      throw new Error('More than one result from execOne')
    }
    let row = _.first(results.rows)

    if (tx) {
      await tx.commitPromise()
    }

    let model
    if (row) {
      model = new Model(row, {_detached: false})
    }

    let associationPromises = _.map(_.keys(q.associations), (associationName) => {
      return model.populate(associationName, q.associations[associationName])
    })
    await Promise.all(associationPromises)

    await Model.emitAsync(eventName, model)

    return model
  }

  addPromiseMethods(q)
  addMomentumMethods(q)

  return q.exec
}

function execOneField(Model, q, eventName, args, fieldName) {
  let execute = bluebird.promisify(q.execute, {context: q})

  q.exec = async function _execOneField() {
    await Model.emitAsync(`before:${eventName}`, ...args)

    let results = await execute()
    if (_.size(results.rows) > 1) {
      throw new Error('More than one result from execOne')
    }
    let row = _.first(results.rows)

    let result = _.get(row, fieldName)

    await Model.emitAsync(eventName, result)

    return result
  }

  addPromiseMethods(q)
  addMomentumMethods(q)

  return q.exec
}

function parseWhere(model, where) {
  if (_.isPlainObject(where)) {
    return where
  } else {
    return {[model.primaryKey]: where}
  }
}

function serializeAssociations(associations, options = {}) {
  let serialized = {}

  _.each(associations, (association, name) => {
      if (association.isPopulated) {
        if (options.toJSON) {
          serialized[_.snakeCase(name)] = association.toJSON()
        } else {
          serialized[_.snakeCase(name)] = association.toObject()
        }
      }
  })

  return serialized
}

function freezeDeep(obj) {

    if (_.isObject(obj) && !Object.isFrozen(obj)) {
        Object.freeze(obj)
        _.each(obj, function (val) {
            freezeDeep(val)
        })
    }

    return obj
}

class TableModel {

  constructor (row = {}, options = {}) {
    // make model an event emitter
    utils.emitterProxy(this)

    let Model = this.Model
    let _dirty = _.get(options, '_dirty', {})
    let _associations = _.get(options, '_associations', {})
    let _detached = _.get(options, '_detached', true)
    let _destroyed = _.get(options, '_destroyed', false)

    Object.defineProperty(this, '_dirty', {value: _dirty, writable: true})
    Object.defineProperty(this, '_associations', {value: _associations, writable: true})
    Object.defineProperty(this, '_detached', {value: _detached, writable: true})
    Object.defineProperty(this, '_destroyed', {value: _destroyed, writable: true})

    let privateRow
    this.setRow = (value) => { privateRow = freezeDeep(value) }
    this.getRow = () => { return privateRow }

    Object.preventExtensions(this)

    this.setRow(Model.parse(row))
  }

  static toObject() {
    return _.pick(this, _.keys(this))
  }

  static toJSON() {
    return _(this.toObject())
      .omit('db')
      .omit(_.isFunction)
      .value()
  }

  static getAssociationModel(associationName) {
    let description = this.associations[associationName]
    if (description) {
      return _.find(_.values(this.db.models), {tableName: description.tableName})
    }
  }

  //===============
  // Table Methods
  //===============

  //
  // parse
  //
  static parse(row) {
    return row
  }


  //
  // select
  //
  static select(columns, db = this.db) {
    let eventName = 'select'

    let q = db.select(this.tableName, columns)

    exec(this, q, eventName, arguments)
    return q
  }


  //
  // count
  //
  static count(where, db = this.db) {
    let eventName = 'count'

    let countPrimaryKeys = (q) => { q.func('count', [q.c(this.primaryKey)]) }
    let q = db.select(this.tableName, countPrimaryKeys).where(parseWhere(this, where))
    execOneField(this, q, eventName, arguments, 'count')

    return q
  }


  //
  // find
  //
  static find(where, options = this.options, db = this.db) {
    let eventName = 'find'

    let q = db.select(this.tableName).where(parseWhere(this, where))

    if (options.limit) {
      q.limit(options.limit)
    }

    if (options.offset) {
      q.offset(options.offset)
    }

    if (options.order) {
      q.order(options.order)
    }

    exec(this, q, eventName, arguments)

    return q
  }


  //
  // findOne
  //
  static findOne(where, db = this.db) {
    let eventName = 'findOne'
    let limit = 2

    let q = db.select(this.tableName).where(parseWhere(this, where)).limit(limit)
    execOne(this, q, eventName, arguments)

    return q
  }


  //
  // create
  //
  static create(values, db = this.db) {
    let eventName = 'create'

    let q = db.insert(this.tableName, values).returning(this.columns)
    execOne(this, q, eventName, arguments)

    return q
  }


  //
  // addRows
  //
  static addRows(rows, db = this.db) {
    let eventName = 'addRows'
    let keys = _.keys(_.first(rows))

    rows = _.map(rows, (row) => {
      return _.map(keys, _.propertyOf(row))
    })

    let q = db.insert(this.tableName, keys).addRows(rows).returning(this.columns)
    exec(this, q, eventName, arguments)

    return q
  }


  //
  // update
  //
  static update(where, values, db = this.db) {
    let eventName = 'update'

    let q = db.update(this.tableName)
        .set(values)
        .where(parseWhere(this, where))
        .returning(this.columns)
    exec(this, q, eventName, arguments)

    return q
  }


  //
  // updateOne
  //
  static updateOne(where, values, db = this.db) {
    let eventName = 'updateOne'

    // if not already in one, run this in a tx to prevent updating more than one record
    // when a tx wrapper function is not provided, begin returns a tx
    var tx = (isTx(db) ? db : db.begin())

    let q = tx.update(this.tableName)
        .set(values)
        .where(parseWhere(this, where))
        .returning(this.columns)
    // if db is tx, pass null so execOne wont try to commit the tx too early
    execOneTx(this, q, eventName, arguments, (isTx(db) ? null : tx))

    return q
  }


  //
  // destroy
  //
  static destroy(where, db = this.db) {
    let eventName = 'destroy'

    let q = db.delete(this.tableName)
        .where(parseWhere(this, where))
        .returning(this.columns)
    exec(this, q, eventName, arguments)

    return q
  }


  //================
  // Record Methods
  //================

  get Model() {
    return this.constructor
  }

  getDb() {
    return this.Model.db
  }

  getAssociation(associationName) {
    if (!this.Model.associations[associationName]) {
      throw new Error(`Association ${associationName} does not exist for ${this.Model.globalId}}`)
    }

    if (!this._associations[associationName]) {
      this._associations[associationName] = new TableModelAssociation(this, associationName)
    }

    return this._associations[associationName]
  }

  [INSPECT_CUSTOM]() {
    let Model = this.Model
    return `[Record: ${Model.identity} (${Model.primaryKey}: ${this.get(Model.primaryKey)})]`
  }

  toObject() {
    let row = this.getRow()
    return _.cloneDeep(_.defaults({}, this._dirty, row, serializeAssociations(this._associations)))
  }

  toJSON() {
    let Model = this.Model
    let row = this.getRow()
    let json = _.cloneDeep(_.defaults({}, this._dirty, row, serializeAssociations(this._associations, {toJSON: true})))
    return _.omit(json, Model.options.omit)
  }

  isDirty() {
    return !_.isEmpty(this._dirty)
  }

  reset() {
    this._dirty = {}
    return this
  }

  async lock(db = this.getDb()) {
    // 'FOR UPDATE'
    let query = bluebird.promisify(db.query, {context: db})
    let Model = this.Model
    let row = this.getRow()
    let where = _.pick(row, Model.primaryKey)

    let [sql, params] = Model.findOne(where, db).compile()
    let results = await query(`${sql} FOR UPDATE`, params)

    if (_.size(results.rows) > 1) {
      throw new Error('More than one result from lock')
    }

    this.reset()
    this.setRow(_.first(results.rows))

    // refresh any associations
    this.reloadAssociations(db)

    return this
  }

  async lockNoWait(db = this.getDb()) {
    // 'FOR UPDATE NO WAIT'
    let query = bluebird.promisify(db.query, {context: db})
    let Model = this.Model
    let row = this.getRow()
    let where = _.pick(row, Model.primaryKey)

    let [sql, params] = Model.findOne(where, db).compile()
    let results = await query(`${sql} FOR UPDATE NOWAIT`, params)

    if (_.size(results.rows) > 1) {
      throw new Error('More than one result from lockNoWait')
    }

    this.reset()
    this.setRow(_.first(results.rows))

    // refresh any associations
    this.reloadAssociations(db)

    return this
  }

  async reload(db = this.getDb()) {
    let Model = this.Model
    let row = this.getRow()
    let where = _.pick(row, Model.primaryKey)
    let dbRecord = await Model.findOne(where, db)

    this.reset()
    this.setRow(_.cloneDeep(dbRecord.getRow()))

    // refresh any associations
    await this.reloadAssociations(db)

    return this
  }

  async reloadAssociations(db = this.getDb()) {
    // refresh any associations

    let promises = _.map(this._associations, (association, associationName) => {
      return association.reload(db)
    })

    // wait for the associaions to load
    await Promise.all(promises)
  }


  async save(db = this.getDb()) {
    let Model = this.Model
    let row = this.getRow()
    let where = _.pick(row, Model.primaryKey)

    if (this._destroyed) {
        throw new Error('cannot save a destroyed record')
    }

    if (this._detached) {
      let dbRecord = await Model.create(this._dirty, db)
      this.reset()
      this.setRow(_.cloneDeep(dbRecord.getRow()))
      await this.reloadAssociations(db)
    } else {
      await Model.updateOne(where, this._dirty, db)
      await this.reload(db)
    }

    return this
  }

  async destroy(db = this.getDb()) {
    let Model = this.Model
    let row = this.getRow()
    let where = _.pick(row, Model.primaryKey)

    await Model.destroy(where, db)

    this._destroyed = true

    return this
  }

  get(columnName) {
    let row = this.getRow()
    return _.get(this, ['_dirty',columnName], row[columnName])
  }

  set(columnName, value){
    if (_.isString(columnName)) {
      this._dirty[_.snakeCase(columnName)] = value
    } else {
      let Model = this.Model
      let normalized = _.mapKeys(columnName, (v, key) => {
        return _.snakeCase(key)
      })
      _.extend(this._dirty, _.pick(normalized, Model.columns))
    }
  }

  async createAssociation(associationName, data, options = {}, db = this.db) {
    return this.getAssociation(associationName).create(data, options, db)
  }

  async findAssociations(associationName, where, options = {}, db = this.db) {
    return this.getAssociation(associationName).find(where, options, db)
  }

  async findOneAssociation(associationName, where, options = {}, db = this.db) {
    return this.getAssociation(associationName).findOne(where, options, db)
  }

  async populate(associationName, options = {}, db = this.getDb()) {
    return this.getAssociation(associationName).populate(options, db)
  }

  async attach(associationName, value, options = {}, db = this.getDb()) {
    return this.getAssociation(associationName).attach(value, options, db)
  }

  async detach(associationName, value, options = {}, db = this.getDb()) {
    return this.getAssociation(associationName).detach(value, options, db)
  }

  async destroyAssociations(associationName, value, options = {}, db = this.getDb()) {
    return this.getAssociation(associationName).destroy(value, options, db)
  }
}

module.exports = {
  TableModel
}
