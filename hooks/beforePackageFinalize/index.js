const CloudFormationStackHelper = require('../../helpers/cloudFormationStack')
const S3BucketHelper = require('../../helpers/s3Bucket')
const S3BucketResource = require('../../helpers/resources/s3Bucket')
const CloudFrontDistribution = require('../../helpers/resources/cloudFrontDistribution')

class Controller {
  /**
   * Execute hook
   */
  async execute () {
    if (this.config.bucket === undefined) {
      return
    }

    // Empty old Bucket
    
    const stack = new CloudFormationStackHelper({provider: this.provider})
    const outputBucket = await stack.getOutputValue('FrontendBucket')
    if (outputBucket !== false && this.config.bucket !== outputBucket) {
      const oldBucket = new S3BucketHelper({provider: this.provider, name: outputBucket})
      await oldBucket.empty()
    }

    // Init properties

    this.cloudFormationTemplate = this.serverless.service.provider.compiledCloudFormationTemplate

    // Create S3 Bucket

    const bucket = new S3BucketResource({
      name: this.config.bucket, 
      indexDocument: this.config.indexDocument, 
      errorDocument: this.config.errorDocument
    })
    this.cloudFormationTemplate.Resources['Frontend'] = bucket.toCloudFormationObject()

    // Create CloudFront distribution

    if (this.config.cdn !== undefined) {
      const cloudFront = new CloudFrontDistribution({
        bucketCFKey: 'Frontend',
        enabled: this.config.cdn.enabled !== false,
        indexDocument: this.config.indexDocument,
        aliases: this.config.cdn.aliases,
        priceClass: this.config.cdn.priceClass,
        certificate: this.config.cdn.certificate,
      })
      this.cloudFormationTemplate.Resources['FrontendCDN'] = cloudFront.toCloudFormationObject()
    }

    // Outputs

    this.cloudFormationTemplate.Outputs['FrontendBucket'] = JSON.parse(`
      {
        "Description": "Frontend Bucket",
        "Value": {
          "Ref": "Frontend"
        }
      }
    `)

    if (this.config.cdn !== undefined) {
      this.cloudFormationTemplate.Outputs['FrontendWebsite'] = JSON.parse(`
        {
          "Description": "Frontend Website",
          "Value": { 
            "Fn::GetAtt": [ "FrontendCDN", "DomainName" ] 
          }
        }
      `)
      this.cloudFormationTemplate.Outputs['FrontendCloudFront'] = JSON.parse(`
        {
          "Description": "Frontend CloudFront distribution ID",
          "Value": { 
            "Ref": "FrontendCDN"
          }
        }
      `)      
    } else {
      this.cloudFormationTemplate.Outputs['FrontendWebsite'] = JSON.parse(`
        {
          "Description": "Frontend Website",
          "Value": { 
            "Fn::GetAtt" : [ "Frontend", "WebsiteURL" ] 
          }
        }
      `)
    }
    
  }
}

module.exports = new Controller()
