const S3BucketHelper = require('../../helpers/s3Bucket')

class Controller {
  /**
   * Execute hook
   */
  async execute () {
    if (this.config.bucket === undefined) {
      return
    }

    this.serverless.cli.log(`Deleting all objects from bucket ${this.config.bucket}..`)

    const bucket = new S3BucketHelper({provider: this.provider, name: this.config.bucket})
    await bucket.empty()

    this.serverless.cli.log(`Bucket ${this.config.bucket} empty!`)
  }
}

module.exports = new Controller()
