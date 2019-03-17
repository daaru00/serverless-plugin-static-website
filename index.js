'use strict';

const chalk = require('chalk');
const { exec } = require('child_process');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.frontendConfig = serverless.service.custom.frontend;

    this.commands = {
      deploy: {
        commands: {
          frontend: {
            usage: 'Deploy frontend assets to specific S3 bucket',
            lifecycleEvents: [
              'execute',
            ],
          }
        }
      },
      remove: {
        commands: {
          frontend: {
            usage: 'Remove all frontend assets from specific S3 bucket',
            lifecycleEvents: [
              'execute',
            ],
          }
        }
      }
    };

    this.hooks = {
      'before:package:finalize': this.createResources.bind(this),
      'before:remove:remove': this.deleteResources.bind(this),
      'before:deploy:frontend:execute': this.deployFrontendBefore.bind(this),
      'deploy:frontend:execute': this.deployFrontend.bind(this),
      'remove:frontend:execute': this.deleteResources.bind(this),
      'after:deploy:frontend:execute': this.deployFrontendAfter.bind(this),
      'after:aws:info:displayServiceInfo': this.info.bind(this)
    };
  }

  /**
   * Adding resources
   */

  async createResources () {
    if (this.frontendConfig.bucket === undefined) {
      return;
    }

    const stack = await this.getStackOutputData();
    if (stack !== undefined) {
      const frontendOutputBucket = stack.Outputs.find((output) => output.OutputKey === 'FrontendBucket');
      if (frontendOutputBucket !== undefined && this.frontendConfig.bucket !== frontendOutputBucket.OutputValue) {
        await this.deleteResources(frontendOutputBucket.OutputValue);
      }
    }

    this.serverless.service.provider.compiledCloudFormationTemplate.Resources['Frontend'] = JSON.parse(`
      {
        "Type": "AWS::S3::Bucket",
        "Properties": {
          "BucketName": "${this.frontendConfig.bucket}",
          "AccessControl": "PublicRead",
          "WebsiteConfiguration": {
            "IndexDocument": "${this.frontendConfig.indexDocument || 'index.html'}",
            "ErrorDocument": "${this.frontendConfig.errorDocument || 'error.html'}"
          }
        }
      }
    `);

    this.serverless.service.provider.compiledCloudFormationTemplate.Outputs['FrontendBucket'] = JSON.parse(`
      {
        "Description": "Frontend Bucket",
        "Value": {
          "Ref": "Frontend"
        }
      }
    `);

    this.serverless.service.provider.compiledCloudFormationTemplate.Outputs['FrontendWebsite'] = JSON.parse(`
      {
        "Description": "Frontend Bucket",
        "Value": { 
          "Fn::GetAtt" : [ "Frontend", "WebsiteURL" ] 
        }
      }
    `);
  }

  /**
   * Delete resources
   */
  async deleteResources (bucket) {
    if (this.frontendConfig.bucket === undefined && bucket === undefined) {
      return;
    }

    const bucketName = bucket ? bucket : this.frontendConfig.bucket;
    this.serverless.cli.log(`Deleting all objects from bucket ${bucketName}..`);

    const keys = await this.listBucketKeys(undefined, bucket);
    await this.provider.request('S3', 'deleteObjects', {
      Bucket: bucketName,
      Delete: {
        Objects: keys.map((key) => ({
          Key: key
        }))
      }
    });

    this.serverless.cli.log(`Bucket ${bucketName} empty!`);
  }

  /**
   * List bucket keys
   */
  async listBucketKeys (nextToken, bucket) {
    if (this.frontendConfig.bucket === undefined && bucket === undefined) {
      return [];
    }

    const bucketName = bucket ? bucket : this.frontendConfig.bucket;
    const response = await this.provider.request('S3', 'listObjectsV2', {
      Bucket: bucketName,
      ContinuationToken: nextToken
    });

    let keys = response.Contents.map((content) => content.Key);
    if (response.IsTruncated && response.NextContinuationToken) {
      const nextKeys = await this.listBucketKeys(response.NextContinuationToken, bucket);
      keys = keys.concat(nextKeys);
    }

    return keys;
  }

  /**
   * Deploy static assets
   */

  deployFrontendBefore () {
    if (this.frontendConfig.bucket === undefined) {
      this.serverless.cli.log('No bucket provided in custom.frontend configuration');
      return;
    }
    this.serverless.cli.log('Deploying frontend assets..');
  }

  deployFrontend () {
    if (this.frontendConfig.bucket === undefined) {
      return;
    }

    if (this.frontendConfig.dir === undefined) {
      this.serverless.cli.log('No files to upload, check directory configurations');
      return;
    }

    const profile = this.serverless.service.provider.profile;
    const env = { 'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID, 'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY };

    let command = '';
    if (this.frontendConfig.deploy === 'cp') {
      command = `cp ${this.frontendConfig.dir} s3://${this.frontendConfig.bucket}/ --acl public-read --cache-control max-age=${this.frontendConfig.cacheControl || '31536000'} --recursive`;
    }else{
      command = `sync ${this.frontendConfig.dir} s3://${this.frontendConfig.bucket}/ --acl public-read --cache-control max-age=${this.frontendConfig.cacheControl || '31536000'} --delete`;
    }

    return new Promise((resolve, reject) => {
      exec(
        `aws ${profile ? `--profile ${profile}` : ''} s3 ${command}`,
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }

          if (stdout.trim() === '' && stderr.trim() === '') {
            resolve();
            return;
          }

          if (stdout.trim() !== '' && stderr.trim() === '') {
            this.serverless.cli.log('---------------------------')
            this.serverless.cli.log(stdout.trim().replace('remaining', ''))
            this.serverless.cli.log('---------------------------')
            resolve();
            return;
          }

          if (stderr.trim() !== '') {
            this.serverless.cli.log('---------------------------')
            this.serverless.cli.log(stderr.trim())
            this.serverless.cli.log('---------------------------')
            reject();
            return;
          }
        },
        { env }
      );
    })
  }

  deployFrontendAfter () {
    if (this.frontendConfig.bucket === undefined) {
      return;
    }
    this.serverless.cli.log('Frontend assets deployed!');
  }

  /**
   * Show frontend information
   */

  async info () {
    const stack = await this.getStackOutputData();
    if (stack === undefined) {
      return;
    }

    const frontendOutputWebsite = stack.Outputs.find((output) => output.OutputKey === 'FrontendWebsite');
    if (frontendOutputWebsite === undefined) {
      return;
    }

    this.serverless.cli.consoleLog(`${chalk.yellow('frontend:')} ${frontendOutputWebsite.OutputValue}`);
  }

  async getStackOutputData () {
    let response;
    try {
      response = await this.provider.request(
        'CloudFormation',
        'describeStacks',
        { StackName: this.provider.naming.getStackName() }
      );  
    }catch(exception){
      return;
    }
    
    if (response.Stacks.length === 0) {
      return;
    }

    return response.Stacks[0];
  }

}

module.exports = ServerlessPlugin;
