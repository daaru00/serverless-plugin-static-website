const S3BucketHelper = require('../../helpers/s3Bucket')
const CloudFrontDistributionHelper = require('../../helpers/cloudFrontDistribution')
const CloudFormationStackHelper = require('../../helpers/cloudFormationStack')

class Controller {
  /**
   * Constructor
   */
  constructor() {
    this.description = {
      usage: 'Deploy frontend assets to specific S3 bucket.',
      lifecycleEvents: [
        'execute'
      ]
    }
  }

  /**
   * Before command
   */
  async before() {
    if (this.frontendConfig.bucket === undefined) {
      this.serverless.cli.log('No bucket provided in custom.frontend configuration')
      return
    }
    this.serverless.cli.log('Deploying frontend assets..')
  }

  /**
   * Execute command
   */
  async execute() {
    if (this.config.bucket === undefined) {
      return
    }

    if (this.config.dir === undefined) {
      this.serverless.cli.log('No files to upload, check directory configuration.')
      return
    }

    const bucket = new S3BucketHelper({ provider: this.provider, name: this.config.bucket })
    await bucket.uploadDirectory({ 
      directory: this.config.dir, 
      strategy: this.config.deploy, 
      profile: this.serverless.service.provider.profile, 
      logger: this.serverless.cli
    })
  }

  /**
   * After command
   */
  async after() {
    if (this.frontendConfig.bucket === undefined) {
      return
    }

    this.serverless.cli.log('Frontend assets deployed!')

    const stack = new CloudFormationStackHelper({provider: this.provider})
    const outputCloudFront = await stack.getOutputValue('FrontendCloudFront')
    if (outputCloudFront !== false) {
      const cloudFrontDistribution = new CloudFrontDistributionHelper({
        provider: this.provider, 
        distributionId: outputCloudFront
      })
      this.serverless.cli.log('Invalidating CloudFront distribution..')
      await cloudFrontDistribution.invalidate({
        paths: [
          '/*'
        ]}
      )
      this.serverless.cli.log('CloudFront distribution invalidation created!')
    }
  }
}

module.exports = new Controller()
