const chalk = require('chalk')
const CloudFormationStackHelper = require('../../helpers/cloudFormationStack')

class Controller {
  /**
   * Execute hook
   */
  async execute () {
    const stack = new CloudFormationStackHelper({provider: this.provider})

    const frontendOutputWebsite = await stack.getOutputValue('FrontendWebsite')
    if (frontendOutputWebsite === false) {
      return
    }

    this.serverless.cli.consoleLog(`${chalk.yellow('frontend:')} ${frontendOutputWebsite}`)
  }
}

module.exports = new Controller()
