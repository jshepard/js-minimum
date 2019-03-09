const _ = require('lodash')

// relation types: hasOne hasMany through

function getIds(ids, Model) {
  ids = _.isArray(ids) ? ids : [ids]
  return _.map(ids, function (id) {
    // if it's a model get the primary key
    if (id instanceof Model) {
      id = id.get(Model.primaryKey)
    }
    if (!_.isFinite(id)) {
      throw new Error(`Expect finite id of ${Model.identity}`)
    }
    return _.toNumber(id)
  })
}

function parseWhere(Model, where) {
  if (_.isPlainObject(where)) {
    return where
  } else {
    return {[Model.primaryKey]: where}
  }
}


class TableModelAssociation {

  constructor(model, associationName) {

    this.model = model
    this.Model = model.Model.getAssociationModel(associationName)
    this.association = model.Model.associations[associationName]
    this.db = model.getDb()

    this.reset()
  }

  toObject() {
    return this.value({toObject: true})
  }

  toJSON() {
    return this.value({toJSON: true})
  }

  toString() {
    return `[${this.Model.identity} Collection]`
  }

  parse(models) {
    return models
  }

  at(index) {
    return this._models[index]
  }

  get(id) {
    let pk = this.Model.primaryKey
    return _.find(this._models, {[pk]: id})
  }

  set(models = []) {
    models = _.isArray(models) ? models : [models]
    this._models = this.parse(models)
  }

  reset() {
    this.options = {}
    this._models = this.parse([])
    this.isPopulated = false
  }

  async create(data, options = {}, db = this.db) {
    let Model = this.Model
    let association = this.association
    let modelId = this.model.get(this.model.Model.primaryKey)
    let created

    if (association.type === 'one') {
      created = await Model.create(data, db)

      this.model.set(association.column, created.id)
      await this.model.save()
      await this.populate(options, db)

    } else if (association.type === 'many') {

      _.extend(data, {[association.column]: modelId})
      created = await Model.create(data, db)
      await this.populate(options, db)

    } else if (association.type === 'through') {

      let ThroughModel = _.find(_.values(this.db.models), {tableName: association.through})

      let toTableColumn = _.last(association.toTableColumn.split('.'))
      let fromTableColumn = _.last(association.fromTableColumn.split('.'))

      created = await Model.create(data, db)
      let rows = [{
        [toTableColumn]: created.id,
        [fromTableColumn]: modelId
      }]

      await ThroughModel.addRows(rows)
      await this.populate(options, db)

    }

    return created
  }

  async attach(ids, options = {}, db = this.db) {
    let Model = this.Model
    let association = this.association
    let modelId = this.model.get(this.model.Model.primaryKey)

    ids = getIds(ids, Model)

    if (association.type === 'one') {

      if (_.size(ids) > 1) {
          throw new Error(`Cannot attach more than one id for type "one" association ${association.name}`)
      }

      let id = _.first(ids)
      this.model.set(association.column, id)
      await this.model.save()
      await this.populate(options, db)

    } else if (association.type === 'many') {

      await Model.update({[Model.primaryKey]: ids}, {[association.column]: modelId})
      await this.populate(options, db)

    } else if (association.type === 'through') {

      let ThroughModel = _.find(_.values(this.db.models), {tableName: association.through})

      let toTableColumn = _.last(association.toTableColumn.split('.'))
      let fromTableColumn = _.last(association.fromTableColumn.split('.'))

      let rows = _.map(ids, (id) => {
        return {
          [toTableColumn]: id,
          [fromTableColumn]: modelId
        }
      })

      await ThroughModel.addRows(rows)
      await this.populate(options, db)

    }
  }

  async detach(ids, options = {}, db = this.db) {
    let Model = this.Model
    let association = this.association
    let modelId = this.model.get(this.model.Model.primaryKey)

    ids = getIds(ids, Model)

    if (association.type === 'one') {

      if (this.model.get(association.column) === modelId) {
        this.model.set(association.column, null)
        await this.model.save(db)
      }

    } else if (association.type === 'many') {

      await Model.update({[Model.primaryKey]: {in: ids}}, {[association.column]: null}, db)
      await this.populate(options, db)

    } else if (association.type === 'through') {

      let ThroughModel = _.find(_.values(this.db.models), {tableName: association.through})

      if (options.destroy === false) {
        await ThroughModel.update({[association.toTableColumn]: {in: ids}, [association.fromTableColumn]: modelId}, {[association.toTableColumn]: null}, db)
      } else {
        await ThroughModel.destroy({[association.toTableColumn]: {in: ids}, [association.fromTableColumn]: modelId}, db)
      }
      await this.populate(options, db)

    }
  }

  async destroy(ids, options = {}, db = this.db) {
    let Model = this.Model
    let association = this.association
    let modelId = this.model.get(this.model.Model.primaryKey)

    ids = getIds(ids, Model)

    if (association.type === 'one') {

      let results = null
      if (_.size(ids) === 1 && this.model.get(association.column) === _.first(ids)) {
        this.model.set(association.column, null)
        await this.model.save(db)
        results = await Model.destroy({[Model.primaryKey]: {in: ids}}, db)
      }

      return results

    } else if (association.type === 'many') {

      let results = await Model.destroy({[Model.primaryKey]: {in: ids}, [association.column]: modelId}, db)
      await this.populate(options, db)
      return results

    } else if (association.type === 'through') {

      let ThroughModel = _.find(_.values(this.db.models), {tableName: association.through})

      let throughModels = await ThroughModel.destroy({[association.toTableColumn]: {in: ids}, [association.fromTableColumn]: modelId}, db)
      let removedIds = _.pluck(throughModels, association.toTableColumn)
      let results = await Model.destroy({[Model.primaryKey]: {in: removedIds}}, db)
      await this.populate(options, db)
      return results

    }
  }

  async reload(db = this.db) {
    if (this.isPopulated) {
      return await this.populate(this.options, db)
    }
  }

  async find(where, options = {}, db = this.db) {
    let Model = this.Model
    options.where = parseWhere(Model, where)
    let results = await this.fetch(options, db)

    return (_.isArray(results) ? results : (_.isEmpty(results) ? [] : [results]))
  }

  async findOne(where, options = {}, db = this.db) {
    let Model = this.Model
    options.where = parseWhere(Model, where)
    let result = await this.fetchOne(options, db)

    return result
  }

  async populate(options = {}, db = this.db) {
    this.options = options

    let results = await this.find(options.where, options, db)

    this._models = results
    this.isPopulated = true

    return results
  }

  setValue(value) {
    let association = this.association
    let isOne = (association.type === 'one')
    let isEnumeration = this.Model.isEnumeration

    if (!isEnumeration || !isOne) {
      throw new Error(`Cannot set association`)
    }

    let enums = this.Model.db.enums
    let enumTypeName = _.upperFirst(association.name)
    let enumType = enums[enumTypeName]
    let isNull = (value === null)
    let isValid = _.includes(_.values(enumType), value)

    if (isNull || isValid) {
      this.set(association.column, value)
    } else {
      throw new Error(`Invalid value for enum type ${enumTypeName}: ${value}`)
    }

    this.model.set(this.association.column, value)
  }

  value(options = {}) {
    let association = this.association
    let isOne = (association.type === 'one')
    let isEnumeration = this.Model.isEnumeration
    let values = _.map(this._models, (model) => {
      if (isEnumeration) {
        return model.id
      } else if (options.toJSON) {
        return model.toJSON()
      } else if (options.toObject) {
        return model.toObject
      } else {
        return model
      }
    })
    let value = isOne ? _.first(values) : values

    return (isEnumeration && isOne) ? this.model.get(association.column) : value
  }


  async fetch(options = {}, db = this.db) {
    let Model = this.Model
    let association = this.association

    if (association.type === 'one') {

      // if we're asking for an id that is not the parent id, then no result
      let id = this.model.get(association.column)
      let whereId = _.get(options.where, [Model.primaryKey])
      if (whereId && whereId !== this.model.get(association.column)) {
        return null
      }

      let where = _.extend({}, options.where, {[Model.primaryKey]: id})
      let result = await Model.findOne(where, db).populate(options.populate)
      return result

    } else if (association.type === 'many') {

      // if we're asking for an id that is not the parent id, then no result
      let id = this.model.get(this.model.Model.primaryKey)
      let whereId = _.get(options.where, [association.column])
      if (whereId && whereId !== id) {
        return []
      }

      let where = _.extend({}, options.where, {[association.column]: id})
      let findOptions = _.pick(options, 'limit', 'offest', 'order')
      let results = await Model.find(where, findOptions, db).populate(options.populate)
      return results

    } else if (association.type === 'through') {

      let id = this.model.get(this.model.Model.primaryKey)
      let q = Model.select()
      let on = {[association.toTableColumn]: q.c(Model.primaryKey)}

      q.fields(Model.columns)
        .join(association.through, {on: on})
        .where(q.c(association.fromTableColumn).eq(id))
        .where(_.extend({}, options.where))

      if (options.limit) {
        q.limit(options.limit)
      }

      if (options.offset) {
        q.offset(options.offset)
      }

      if (options.order) {
        q.order(options.order)
      }

      q.populate(options.populate)

      let results = await q.exec()
      return results

    }
  }

  async fetchOne(options = {}, db = this.db) {
    let results = await this.fetch(options, db)

    if (_.isArray(results) && _.size(results) > 1) {
      throw new Error('More than one result from execOne')
    }

    return _.isArray(results) ? _.first(results) : results
  }

}

module.exports = {
  TableModelAssociation
}
