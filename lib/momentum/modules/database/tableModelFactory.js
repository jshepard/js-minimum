const _ = require('lodash')
const {pluralize, singularize} = require('inflection')
const {TableModel} = require('./tableModel')
const {getEnumerationTables} = require('./dbUtils')
const {TableModelAssociation} = require('./tableModelAssociation')

function getModelIdentity(tableName) {
  return _.upperFirst(_.camelCase(tableName))
}

function getTableNameFromColumnName(columnName) {
  let tableName = columnName.slice(0, 0 - _.size('_id'))
  if (momentum.config.database.puralizedTableNames) {
    tableName = pluralize(tableName)
  }
  return tableName
}

function getAssociationNamePlural(tableName) {
  if (momentum.config.database.puralizedTableNames) {
    return _.camelCase(tableName)
  } else {
    // names can be multi-word, only pluralize the last one for best results...
    let nameWords = _.words(tableName)
    let lastWord = nameWords.pop()
    nameWords.push(pluralize(lastWord))
    return _.camelCase(nameWords)
  }
}

function getAssociationNameSingular(tableName) {
  if (momentum.config.database.puralizedTableNames) {
    // names can be multi-word, only sigularize the last one for best results...
    let nameWords = _.words(tableName)
    let lastWord = nameWords.pop()
    nameWords.push(singularize(lastWord))
    return _.camelCase(nameWords)
  } else {
    return _.camelCase(tableName)
  }
}


function createTableModel(momentum, db, tableDescription, associations) {
  let enumerationTables = getEnumerationTables(momentum, db)

  // new class for each table
  class AppTableModel extends TableModel {}

  //
  // Table
  //

  let tableName = tableDescription.table_name
  let identity = getModelIdentity(tableName)
  let isEnumeration = _.includes(enumerationTables, tableName)
  let options = _.cloneDeep(_.get(momentum, 'config.models', {}))

  let tableProperties = {
    db: db,
    tableDescription: tableDescription,
    columns: _.keys(tableDescription.columnDescriptions),
    tableName: tableName,
    identity: identity,
    isEnumeration: isEnumeration,
    globalId: identity,
    associations: _.keyBy(associations, 'name'),
    isInsertable: tableDescription.is_insertable_into === 'YES',
    isView: tableDescription.table_type === 'VIEW',
    options: options,
    primaryKeys: _.chain(tableDescription.columnDescriptions)
      .filter({constraint_type: 'PRIMARY KEY'})
      .map('column_name')
      .value()
  }

  _.each(tableProperties, (value, name) => {
    Object.defineProperty(AppTableModel, name, {value: value, enumerable: true})
  })

  if (AppTableModel.primaryKeys.length === 1) {
    AppTableModel.primaryKey = AppTableModel.primaryKeys[0]
  }

  // if no valid order, use primary key, if any
  if (!AppTableModel.options.order && AppTableModel.primaryKey) {
    AppTableModel.options.order = AppTableModel.primaryKey
  }

  // make AppTableModel an event emitter
  momentum.utils.emitterProxy(AppTableModel, [], identity)


  //
  // Record
  //

  let recordProperties = { }

  _.each(AppTableModel.columns, (columnName) => {
    recordProperties[_.camelCase(columnName)] = {
      enumerable: true,
      get: function columnGet() {
        return this.get(columnName)
      },
      set: function columnSet(value) {
        this.set(columnName, value)
      }
    }

    // hidden column name accessors as well (if not the same as camelcase name)
    if (!recordProperties[columnName]) {
      recordProperties[columnName] = {
        enumerable: false,
        get: function columnGet() {
            return this.get(columnName)
        },
        set: function columnSet(value) {
            this.set(columnName, value)
        }
      }
    }
  })

  _.each(AppTableModel.associations, (association, associationName) => {
    recordProperties[associationName] = {
      enumerable: true,
      get: function associationGet() {
        if (!this._associations[associationName]) {
          this._associations[associationName] = new TableModelAssociation(this, associationName)
        }

        return this._associations[associationName].value()
      },
      set: function associationSet(value) {
        if (!this._associations[associationName]) {
          this._associations[associationName] = new TableModelAssociation(this, associationName)
        }

        this._associations[associationName].setValue(value)
      }
    }
  })


  // add column methods the the AppTableModel prototype
  Object.defineProperties(AppTableModel.prototype, recordProperties)

  return AppTableModel
}

function isCrossTable(tableDescription) {
  let columnNames = _.without(_.keys(tableDescription.columnDescriptions), 'id', 'created_at', 'updated_at', 'version')
  let allEndInId = _.every(columnNames, (columnName) => {
    return _.endsWith(columnName, '_id')
  })

  return (allEndInId && _.size(columnNames) == 2)
}

function findAssociations(tableDescriptions) {
  let associations = { }

  _.each(tableDescriptions, (tableDescription) => {

    if (tableDescription.table_type === 'VIEW') {
      return
    }

    if (isCrossTable(tableDescription)) {
      let columns = _.keys(tableDescription.columnDescriptions)
      let idColumns = _.filter(columns, (columnName) => _.endsWith(columnName, '_id'))
      let tables = _.map(idColumns, getTableNameFromColumnName)

      let crossTableName = tableDescription.table_name
      let table1Name = tables[0]
      let table1IdColumn = idColumns[0]
      let table2Name = tables[1]
      let table2IdColumn = idColumns[1]
      let tablesExist = tableDescriptions[table1Name] && tableDescriptions[table2Name]

      if (tablesExist) {
        // table1Name has many table2Name through crossTableName
        associations[table1Name] = associations[table1Name] || []
        associations[table1Name].push({
          type: 'through',
          fromTable: table1Name,
          toTable: table2Name,
          through: crossTableName,
          name: getAssociationNamePlural(table2Name),
          tableName: table2Name,
          column: table2IdColumn,
          fromTableColumn: [crossTableName, table1IdColumn].join('.'),
          toTableColumn: [crossTableName, table2IdColumn].join('.')
        })

        // table2Name has many table1Name through crossTableName
        associations[table2Name] = associations[table2Name] || []
        associations[table2Name].push({
          type: 'through',
          fromTable: table2Name,
          toTable: table1Name,
          through: crossTableName,
          name: getAssociationNamePlural(table1Name),
          tableName: table1Name,
          column: table1IdColumn,
          fromTableColumn: [crossTableName, table2IdColumn].join('.'),
          toTableColumn: [crossTableName, table1IdColumn].join('.')
        })
      }

    } else {
      // look for table id keys
      _.each(tableDescription.columnDescriptions, (columnDescription, columnName) => {
        // if the columnName ends in _id and it matches a table name, it's probably an association
        let tableName = columnName.slice(0, 0 - _.size('_id'))
        if (momentum.config.database.puralizedTableNames) {
          tableName = pluralize(tableName)
        }
        if (_.endsWith(columnName, '_id') && tableDescriptions[tableName]) {
          // tableDescription.table_name has one tableName
          associations[tableDescription.table_name] = associations[tableDescription.table_name] || []
          associations[tableDescription.table_name].push({
            type: 'one',
            name: getAssociationNameSingular(tableName),
            tableName: tableName,
            column: columnName
          })

          // tableName has many tableDescription.table_name
          associations[tableName] = associations[tableName] || []
          associations[tableName].push({
            type: 'many',
            name: getAssociationNamePlural(tableDescription.table_name),
            tableName: tableDescription.table_name,
            column: columnName
          })
        }
      })
    }
  })
  return associations
}


function createTableModels(momentum, db) {
  let models = {}
  let tableDescriptions = db.tableDescriptions
  let associationsByTable = findAssociations(tableDescriptions)

  _.each(tableDescriptions, (tableDescription) => {
    let associations = associationsByTable[tableDescription.table_name] || []
    let AppTableModel = createTableModel(momentum, db, tableDescription, associations)

    models[AppTableModel.identity] = AppTableModel
  })

  return models
}

function loadAppTableModels(momentum, db, models) {
  let paths = momentum.config.paths

  let appModels = momentum.utils.requireDir({
    dirname: paths.models,
    filter: /(.+)\.(js|coffee|litcoffee)$/,
    flattenDirectories: true
  })

  return _.mapValues(models, (model) => {
    return appModels[model.identity] || model
  })

}

module.exports = {
  createTableModels,
  loadAppTableModels
}
