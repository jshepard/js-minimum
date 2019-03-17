const _ = require('lodash')
const bluebird = require('bluebird')

function createTxWrapper(momentum, db) {
  return (fn) => {
    let tx = db.begin()
    tx.commitPromise = bluebird.promisify(tx.commit, {context: tx})
    tx.rollbackPromise = bluebird.promisify(tx.rollback, {context: tx})

    if (!fn) {
      return tx
    }

    return fn(tx).then(async (results) => {
      if (tx.state() === 'closed') {
        momentum.log.warn('transaction was already closed')
      } else {
        await tx.commitPromise()
      }
      return results
    })
    .catch(async (error) => {
      if (tx.state() !== 'closed') {
        await tx.rollbackPromise()
      }
      throw error
    })

  }
}

function getEnumerationTables(momentum, db) {
  let coreEnumerationTables = ['job_state']
  let enumerationSuffixes = momentum.config.database.enumerationTableSuffixes
  let appEnumerationTables = momentum.config.database.enumerationTables

  let enumerationTables = coreEnumerationTables.concat(appEnumerationTables)

  _.each(_.keys(db.tableDescriptions), async (tableName) => {
    _.each(enumerationSuffixes, (suffix) => {
      if (_.endsWith(tableName, suffix)) {
        enumerationTables.push(tableName)
      }
    })
  })

  return _.uniq(enumerationTables)
}

function addDbMethods(target, momentum, db) {

  target.query = bluebird.promisify(db.query, {context: db})
  _.each(['select', 'update', 'insert', 'delete'], (action) => {
    target[action] = _.bind(db[action], db)
  })

  target.begin = createTxWrapper(momentum, db)

}

function getEnumValueName(name) {
  return _.toUpper(_.snakeCase(name))
}

async function loadDbEnumerations(momentum, db) {
  // load any enumeration tables
  let enumerationTables = getEnumerationTables(momentum, db)

  return await bluebird.reduce(_.values(db.models), async (enums, tableModel) => {
    if (_.includes(enumerationTables, tableModel.tableName)) {
      let values = await tableModel.find().reduce((memo, row) => {
        memo[getEnumValueName(row.name)] = row.id
        return memo
      }, {})

      enums[tableModel.identity] = values
    }
    return enums
  }, {})

}

module.exports = {
  createTxWrapper,
  getEnumerationTables,
  addDbMethods,
  loadDbEnumerations
}
