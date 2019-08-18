const chalk = require('chalk')
const { exec } = require('child_process')

module.exports = class S3Bucket {
  /**
   * Constructor
   *
   * @param {object} opts
   */
  constructor({ provider, name }) {
    this.provider = provider
    this.name = name
  }

  /**
   * List bucket keys
   */
  async listKeys(nextToken) {
    if (this.name === undefined) {
      return []
    }

    const response = await this.provider.request('S3', 'listObjectsV2', {
      Bucket: this.name,
      ContinuationToken: nextToken
    })

    let keys = response.Contents.map((content) => content.Key)
    if (response.IsTruncated && response.NextContinuationToken) {
      const nextKeys = await this.listKeys(response.NextContinuationToken, this.name)
      keys = keys.concat(nextKeys)
    }

    return keys
  }

  /**
   * Upload directory
   * 
   * @param {object} opts
   */
  async uploadDirectory({ directory, strategy, profile, cacheControl, logger }) {
    strategy = strategy || 'cp'
    cacheControl = cacheControl || '31536000'

    let command = ''
    if (strategy === 'cp') {
      command = `cp ${directory} s3://${this.name}/ --recursive`
    } else {
      command = `sync ${directory} s3://${this.name}/ --delete`
    }

    return new Promise((resolve, reject) => {
      exec(
        `aws ${profile ? `--profile ${profile}` : ''} s3 ${command} --acl public-read --cache-control max-age=${cacheControl} --no-progress`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error)
            return
          }

          if (stdout.trim() === '' && stderr.trim() === '') {
            resolve()
            return
          }

          if (stdout.trim() !== '' && stderr.trim() === '') {
            if (logger !== undefined && typeof logger.log === 'function') {
              logger.log('---------------------------')
              logger.consoleLog(chalk.yellow(stdout.trim()))
              logger.log('---------------------------')
            }
            resolve()
            return
          }

          if (stderr.trim() !== '') {
            if (logger !== undefined && typeof logger.log === 'function') {
              logger.log('---------------------------')
              logger.consoleLog(chalk.red(stderr.trim()))
              logger.log('---------------------------')
            }
            reject()
            return
          }
        },
        {
          env: { 'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID, 'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY }
        }
      )
    })
  }

  /**
   * Delete all content
   */
  async empty () {
    const keys = await this.listKeys()
    await this.provider.request('S3', 'deleteObjects', {
      Bucket: this.name,
      Delete: {
        Objects: keys.map((key) => ({
          Key: key
        }))
      }
    })
  }
}
