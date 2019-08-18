module.exports = class CloudFrontDistribution {
  /**
   * Constructor
   * 
   * @param {object} opts
   */
  constructor({ bucketCFKey, enabled, indexDocument, aliases, priceClass, certificate }) {
    this.bucketCFKey = bucketCFKey
    this.enabled = enabled || true
    this.indexDocument = indexDocument || 'index.html'
    this.aliases = aliases || []
    this.priceClass = priceClass || 'PriceClass_100'
    this.certificate = certificate || false
  }

  /**
   * Generate CloudFormation JSON
   */
  toCloudFormationObject() {
    const aliasesString = JSON.stringify(this.aliases)

    let certificate = JSON.parse(`
      {
        "CloudFrontDefaultCertificate" : "true"
      }
    `)

    if (this.certificate) {
      certificate = JSON.parse(`
        {
          "CloudFrontDefaultCertificate" : "false",
          "SslSupportMethod": "sni-only",
          "AcmCertificateArn": "${this.certificate}"
        }
      `)
    }

    return JSON.parse(`
      {
        "Type": "AWS::CloudFront::Distribution",
        "Properties": {
          "DistributionConfig": {
            "Origins": [{
              "DomainName": "Fn::GetAtt" : [ "${this.bucketCFKey}", "WebsiteURL" ],
              "Id": "S3Origin",
              "CustomOriginConfig": {
                "OriginProtocolPolicy": "http-only"
              }
            }],
            "Enabled": "${this.enabled !== false ? 'true' : 'false'}",
            "DefaultRootObject": "${this.indexDocument}",
            "Aliases": ${aliasesString},
            "DefaultCacheBehavior": {
              "AllowedMethods": [ "GET", "HEAD", "OPTIONS"],  
              "TargetOriginId": "S3Origin",
              "ForwardedValues": {
                "QueryString": "false",
                "Cookies": { "Forward": "none" }
              },
              "ViewerProtocolPolicy": "redirect-to-https",
              "Compress": "true",
            },
            "PriceClass": "${this.priceClass || 'PriceClass_100'}",
            "ViewerCertificate": ${certificate}
          }
        }
      }
    `)
  }
}
