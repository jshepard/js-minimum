const _ = require('lodash')
const {Route} = require('./route')

const DEFAULT_LIMIT = 10000
const STATUS = {
  OK: 200,
  CREATED: 201,
  NOT_FOUND: 404,
  ERROR: 500
}


class Controller extends Route {

  constructor(identity, options = {}) {
    _.defaultsDeep(options, momentum.config.controllers)
    super(identity, options)

    let root = this.options.root
    root = root === '/' ? '' : root

    this.Model = momentum.models[this.identity]
    this.globalId = _.trimStart(`${this.root}/${this.identity}Controller`, '/').split('/').join('::')
    this.actions = this.createCrudActions().concat(this.actions)
  }

  //===============
  // Helper Methods
  //===============

  getAssociation(req) {
    let associationName = req.options.association
    return this.Model.associations[associationName]
  }

  getAssociationModel(req) {
    let associationName = req.options.association
    return this.Model.getAssociationModel(associationName)
  }

  getAssociationController(associationName) {
    let Model = this.Model.getAssociationModel(associationName)
    return (Model ? momentum.controllers[Model.identity] : null)
  }

  async getParent(req) {
    let pk = this.getPrimaryKeys(req)
    return this.Model.findOne(pk)
  }

  getViewLocals(req, res, results) {
    let locals = super.getViewLocals(req, res, results)

    return _.extend({
      Model: this.Model,
      AssociationModel: this.getAssociationModel(req),
      controller: this
    }, locals)
  }

  getConstraints(req, Model) {
    return _.get(req, ['constraints', Model.identity], {})
  }

  getPrimaryKeys(req) {
    let constraints = this.getConstraints(req, this.Model)
    let pk = {}

    _.each(this.Model.primaryKeys, (key) => {
      let paramsKey = _.get(req.options, ['keyName'], key)
      let value = req.options[key] || req.params[paramsKey] || req.params.id
      if (value) {
        pk[key] = value
      }
    })

    return _.extend(pk, constraints)
  }

  getCriteria(req, Model) {
    let where = _.get(req, ['options', 'where'], {})
    let criteria = _.pick(req.query, Model.columns)
    let constraints = this.getConstraints(req, Model)

    return _.extend({}, where, criteria, constraints)
  }

  getAssociationId(req, key) {
    return Number(req.options[key] || req.params[key])
  }

  getLimit(req) {
    return Number(req.query.limit || req.options.limit || momentum.config.controllers.limit || DEFAULT_LIMIT)
  }

  getOffset(req) {
    return Number(req.query.offset || req.options.offset || 0)
  }

  getOrder(req) {
    let order = req.params.order || req.query.order || req.options.order || {}
    if (_.isString(order)) {
      let field = order.split(':')[0]
      let direction = order.split(':')[1] || 'ASC'
      order = {[field]: direction}
    }
    return order
  }

  getControllerAssociations() {
    let associations = {}

    if (this.options.associations === '*') {
      associations = this.Model.associations
    } else {
      associations = _.pick(this.Model.associations, this.options.associations)
    }

    return associations
  }

  createCrudActions() {
    let associations = this.getControllerAssociations()

    let actions = [
      {verb: 'get',    path: '',      key: 'find'},
      {verb: 'get',    path: '/{id}', key: 'findOne'},
      {verb: 'post',   path: '',      key: 'create', status: STATUS.CREATED},
      {verb: 'put',    path: '/{id}', key: 'update'},
      {verb: 'post',   path: '/{id}', key: 'update'},
      {verb: 'delete', path: '/{id}', key: 'destroy'},
    ]
    _.each(associations, (association, associationName) => {
      let options = {options:  {association: associationName}}
      let associationMethods = this.createAssociationMethods(associationName)
      let associationActions = this.getAssociationActions(association, associationName, associationMethods)
      actions = actions.concat(_.map(associationActions, actions => _.extend(actions, options)))
    })

    return actions
  }

  createAssociationMethods(associationName) {
    let methods = {
      'find': 'findAssociations',
      'findOne': 'findOneAssociation',
      'create': 'createAssociation',
      'update': 'updateAssociation',
      'destroy': 'destroyAssociation'
    }
    let results = {}
    _.each(methods, (baseMethod, methodPrefix) => {
      // TODO would be nice to singularize/pluralize the association name properly
      let name = `${methodPrefix}${_.upperFirst(associationName)}`
      results[baseMethod] = name
      this[name] = async (req, res) => {
        req.options = _.extend(req.options || {}, {association: associationName})
        return this[`${baseMethod}`](req, res)
      }
    })
    return results
  }

  getAssociationActions(association, associationName, associationMethods) {
    let actions = []
    let pathId = _.upperFirst(associationName)

    // if there is only one model we don't need the get id route
    if (association.type === 'one') {
      actions = [
        {verb: 'get',    path: `/{id}/${pathId}`,                 key: associationMethods['findOneAssociation']},
        {verb: 'post',   path: `/{id}/${pathId}`,                 key: associationMethods['createAssociation'], status: STATUS.CREATED},
        {verb: 'put',    path: `/{id}/${pathId}/{associationId}`, key: associationMethods['updateAssociation']},
        {verb: 'post',   path: `/{id}/${pathId}/{associationId}`, key: associationMethods['updateAssociation']},
        {verb: 'delete', path: `/{id}/${pathId}/{associationId}`, key: associationMethods['destroyAssociation']},
      ]
    } else {
      actions = [
        {verb: 'get',    path: `/{id}/${pathId}`,                 key: associationMethods['findAssociations']},
        {verb: 'get',    path: `/{id}/${pathId}/{associationId}`, key: associationMethods['findOneAssociation']},
        {verb: 'post',   path: `/{id}/${pathId}`,                 key: associationMethods['createAssociation'], status: STATUS.CREATED},
        {verb: 'put',    path: `/{id}/${pathId}/{associationId}`, key: associationMethods['updateAssociation']},
        {verb: 'post',   path: `/{id}/${pathId}/{associationId}`, key: associationMethods['updateAssociation']},
        {verb: 'delete', path: `/{id}/${pathId}/{associationId}`, key: associationMethods['destroyAssociation']},
      ]
    }

    // TODO get sub controller actions
    return actions
  }

  //===============
  // CRUD Methods
  //===============

  //
  // POST /model
  //
  async create(req, res) {
    let data = this.getData(req)

    return this.Model.db.begin(async (tx) => {
      res.status(STATUS.CREATED)
      return this.Model.create(data, tx).populate(this.options.populate)
    })
  }

  //
  // GET /model
  //
  async find(req, res) {
    let criteria = this.getCriteria(req, this.Model)
    let options = {
      limit: this.getLimit(req),
      offset: this.getOffset(req),
      order: this.getOrder(req)
    }

    return this.Model.find(criteria, options).populate(this.options.populate)
  }

  //
  // GET /model/:id
  //
  async findOne(req, res) {
    let pk = this.getPrimaryKeys(req)

    return this.Model.findOne(pk).populate(this.options.populate)
  }

  //
  // PUT /model/:id
  //
  async update(req, res) {
    let pk = this.getPrimaryKeys(req)
    let data = this.getData(req)

    return this.Model.db.begin(async (tx) => {
      return this.Model.updateOne(pk, data, tx).populate(this.options.populate)
    })
  }

  //
  // DELETE /model/:id
  //
  async destroy(req, res) {
    let pk = this.getPrimaryKeys(req)

    return this.Model.db.begin(async (tx) => {
      let dbRecord = await this.Model.findOne(pk, tx).populate(this.options.populate)

      if (dbRecord) {
        await this.Model.destroy(pk, tx)
      }

      return dbRecord
    })
  }

  //
  // GET /model/:id/:association
  //
  async findAssociations(req, res) {
    let associationName = _.get(req, ['options', 'association'])
    let model = await this.getParent(req)
    let AssociationModel = model.Model.getAssociationModel(associationName)

    let where = this.getCriteria(req, AssociationModel)
    let options = {
      limit: this.getLimit(req),
      offset: this.getOffset(req),
      order: this.getOrder(req),
      populate: this.options.populate
    }

    return model.findAssociations(associationName, where, options)
  }

  //
  // GET /model/:id/:association/:associationId
  //
  async findOneAssociation(req, res) {
    let associationName = _.get(req, ['options', 'association'])
    let model = await this.getParent(req)

    let where = this.getAssociationId(req, 'associationId')
    let options = {populate: this.options.populate}

    return model.findOneAssociation(associationName, where, options)
  }


  //
  // POST /model/:id/:association
  //
  async createAssociation(req, res) {
    let associationName = _.get(req, ['options', 'association'])
    let model = await this.getParent(req)
    let data = this.getData(req)
    let options = {populate: this.options.populate}
    let db = momentum.modules.db

    // if this is a has one association, and an exiting association
    // already exists, should we delete it, update it, or fail?
    // for now update...

    let AssociationModel = model.Model.getAssociationModel(associationName)
    let id = data[AssociationModel.primaryKey]
    if (id) {
      return db.begin(async function(tx) {
        let association = await AssociationModel.findOne(id)
        association.set(data)
        await association.save(tx)
        return model.attach(associationName, association, options, tx)
      })
    }

    // otherwise create a new model and attach it
    return db.begin(async function(tx) {
      res.status(STATUS.CREATED)
      return model.createAssociation(associationName, data, options, tx)
    })
  }

  //
  // PUT /model/:id/:association/:associationId
  //
  async updateAssociation(req, res) {
    let associationName = _.get(req, ['options', 'association'])
    let model = await this.getParent(req)
    let data = this.getData(req)

    let where = this.getAssociationId(req, 'associationId')
    let options = {populate: this.options.populate}

    let association = await model.findOneAssociation(associationName, where, options)
    association.set(data)
    return association.save()
  }

  //
  // DEL /model/:id/:association/:associationId
  //
  async destroyAssociation(req, res) {
    let db = momentum.modules.db
    let associationName = _.get(req, ['options', 'association'])
    let model = await this.getParent(req)

    let where = this.getAssociationId(req, 'associationId')
    let options = {}

    let association = await model.findOneAssociation(associationName, where, options)
    let results = await db.begin(async function(tx) {
      return model.destroyAssociations(associationName, association.id, options, tx)
    })

    return _.first(results)
  }

}

Controller.options = {
  bind: true,
  associations: '*',
  actions:[]
}

module.exports.Controller = Controller
