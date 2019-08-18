const deployController = require('./deploy')
const removeController = require('./remove')

module.exports = {
  deploy: {
    command: deployController.description,
    controller: deployController
  },
  remove: {
    command: removeController.description,
    controller: removeController
  }
}
