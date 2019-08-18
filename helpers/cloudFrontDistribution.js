module.exports = class CloudFrontDistribution {
  /**
   * Constructor
   *
   * @param {object} opts
   */
  constructor({ provider, distributionId }) {
    this.provider = provider
    this.distributionId = distributionId
  }

  /**
   * Invalidate path
   * 
   * @param {string[]} paths
   */
  async invalidate({paths, logger}) {
    paths = paths || ['/*']

    const response = await this.provider.request(
      'CloudFront',
      'createInvalidation',
      { 
        DistributionId: this.distributionId,  
        InvalidationBatch: {
          CallerReference: ((new Date()).getTime() / 1000).toString(),
          Paths: {
            Quantity: paths.length,
            Items: paths
          }
        }
      }
    )
    
    if (logger !== undefined && typeof logger.log === 'function') {
      logger.log(`Invalidation id: ${response.Invalidation.Id}`)
    }
  }
}
