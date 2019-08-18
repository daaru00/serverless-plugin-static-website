module.exports = class S3Bucket {
  /**
   * Constructor
   * 
   * @param {object} opts
   */
  constructor({ name, indexDocument, errorDocument }) {
    this.name = name
    this.indexDocument = indexDocument
    this.errorDocument = errorDocument
  }

  /**
   * Generate CloudFormation object
   * 
   * @returns {string}
   */
  toCloudFormationObject() {
    return JSON.parse(`
      {
        "Type": "AWS::S3::Bucket",
        "Properties": {
          "BucketName": "${this.name}",
          "AccessControl": "PublicRead",
          "WebsiteConfiguration": {
            "IndexDocument": "${this.indexDocument || 'index.html'}",
            "ErrorDocument": "${this.errorDocument || 'error.html'}"
          }
        }
      }
    `)
  }
}
