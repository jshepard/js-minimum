const fs = require('fs')
const _ = require('lodash')
const path = require('path')

function flattenDirectores(target, modules, basePath, options) {
  return _.reduce(modules, (memo, m, id) => {
    let subPath = basePath ? `${basePath}/${id}` : id
    let dirPath = options.keepDirectoryPath ? subPath : id

    if (_.get(m, '__isDirectory')) {
      delete m.__isDirectory
      flattenDirectores(memo, m, subPath, options)
    } else {
      memo[dirPath] = m
    }

    return memo
  }, target)
}


function requireDir(options) {
  let files
  let modules = {}

  options.force = options.force || true
  options.filter = options.filter || /(.*)/
  options._depth = options._depth || 0
  options.import = options.import || '*'

  if (options.depth && options.depth > options._depth) {
    return
  }

  options.startDirname = options.startDirname || options.dirname

  try {
    files = fs.readdirSync(options.dirname)
  } catch (e) {
    if (options.optional){
      return {}
    }
    throw new Error('Directory not found: ' + options.dirname)
  }

  for (let file of files) {
    let filepath = options.dirname + '/' + file
    let filename = path.basename(file, path.extname(file))

    if (fs.statSync(filepath).isDirectory()) {

      if (options.excludeDirs && file.match(options.excludeDirs)) {
        continue
      }

      let _depth = options.depth + 1
      modules[file] = requireDir(_.defaults({dirname: filepath, _depth: _depth}, options))

      if (options.markDirectories || options.flattenDirectories) {
        modules[file].__isDirectory = true
      }

    } else {

      if (options.exclude && file.match(options.exclude)) {
        continue
      }

      let identity

      if (options.filter) {
        let match = file.match(options.filter)

        if (!match){
          continue
        }

        identity = match[1]
      }

      if (options.pathFilter) {
          let relativePath = filepath.replace(options.startDirname, '')
          relativePath = '/' + _.trimStart(path, '/')
          let pathMatch = relativePath.match(options.pathFilter)

          if (!pathMatch) {
            continue
          }

          identity = pathMatch[2]
      }

      if (options.identity === false) {
        identity = filename
      }

      if (options.dontLoad) {
        modules[identity] = filepath
      } else {
        if (options.force) {
          let resolved = require.resolve(filepath)

          if (require.cache[resolved]) {
            delete require.cache[resolved]
          }
        }

        let contents = require(filepath)

        if (options.import === 'default' && contents.__esModule) {
          contents = _.get(contents, 'default')
        } else if (options.import !== '*') {
          contents = _.get(contents, options.import)
        }

        if (options.aggregate) {
          _.merge(modules, contents)
        } else if (contents && (options.import !== '*') && (options.import !== 'default')) {
            modules[identity] = {}
            _.set(modules[identity], options.import, contents)
        } else {
          modules[identity] = contents
        }

      }
    }
  }

  if (options.flattenDirectories) {
    modules = flattenDirectores({}, modules, null, options)
  }

  return modules
}

module.exports = requireDir
