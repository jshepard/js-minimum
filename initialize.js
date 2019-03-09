const fs = require('fs')
const CURR_DIR = process.cwd()
const templatePath = `${__dirname}/templates/project`

function createDirectoryContents (templatePath, newProjectPath) {
  const filesToCreate = fs.readdirSync(templatePath)

  filesToCreate.forEach(file => {
    const origFilePath = `${templatePath}/${file}`

    // get stats about the current file
    const stats = fs.statSync(origFilePath)

    if (stats.isFile()) {
      const contents = fs.readFileSync(origFilePath, 'utf8');
      if (file == 'gitignore') {
        file = '.gitignore'
      }
      const writePath = `${newProjectPath}/${file}`
      fs.writeFileSync(writePath, contents, 'utf8')
    } else if (stats.isDirectory()) {
      fs.mkdirSync(`${newProjectPath}/${file}`)

      // recursive call
      createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`)
    }
  });
}

createDirectoryContents(templatePath, CURR_DIR)

console.log('')
console.log('')
console.log('Please add a database connection in config/local.js')
console.log('')
console.log('')
