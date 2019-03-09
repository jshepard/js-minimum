const path = require('path')
const _ = require('lodash')
const getDefaultConfig = require('./defaults')

module.exports = (momentum) => {
  let configDefaults = getDefaultConfig()

  momentum.log('Loading Configuration...')

  momentum.config = momentum.config || {}

  let configParams = _.cloneDeep(momentum.config)
  let configPath = path.resolve(configDefaults.paths.appPath, 'config')

  let configCore = momentum.utils.requireDir({
    dirname   : configPath,
    exclude   : /local\.(js|json|coffee|litcoffee)$/,
    excludeDirs: /(locales|env)$/,
    filter    : /(.+)\.(js|json|coffee|litcoffee)$/,
    optional: true,
    identity  : false
  })

  let configLocal = momentum.utils.requireDir({
    dirname   : configPath,
    excludeDirs: /(env)$/,
    filter    : /local\.(js|json|coffee|litcoffee)$/,
    optional: true,
    aggregate : true,
    identity  : false
  })

  let env = momentum.config.environment || configLocal.environment || configDefaults.environment
  let configEnv = momentum.utils.requireDir({
    dirname   : path.resolve(configPath, 'env'),
    filter    : new RegExp(env + '.(js|json|coffee|litcoffee)$'),
    optional  : true,
    aggregate : true,
    identity  : false
  })

  _.merge(momentum.config, configDefaults, configCore, configEnv, configLocal, configParams)
}
