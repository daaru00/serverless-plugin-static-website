const _ = require('lodash')

const hooks = require('./hooks')
const commands = require('./commands')

class ServerlessPlugin {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider('aws')
    this.config = _.get(this.serverless.service, 'custom.frontend', {})
    this.service = this.serverless.service.getServiceObject()
    this.cloudFormationTemplate = this.serverless.service.provider.compiledCloudFormationTemplate

    this.commands = {
      deploy: {
        commands: {
          frontend: commands.deploy.command
        }
      },
      remove: {
        commands: {
          frontend: commands.remove.command
        }
      }
    }

    this.hooks = {
      'before:package:finalize': hooks.beforePackageFinalize.execute.bind(this),
      'before:remove:remove': hooks.beforeRemove.execute.bind(this),

      'before:deploy:frontend:execute': commands.deploy.controller.before.bind(this),
      'deploy:frontend:execute': commands.deploy.controller.execute.bind(this),
      'after:deploy:frontend:execute': commands.deploy.controller.after.bind(this),
      'remove:frontend:execute': commands.remove.controller.execute.bind(this),

      'after:aws:info:displayServiceInfo': hooks.displayServiceInfo.execute.bind(this)
    }
  }
}

module.exports = ServerlessPlugin
