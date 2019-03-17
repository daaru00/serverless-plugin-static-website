# Serverless Static Website

[![npm](https://img.shields.io/npm/v/serverless-plugin-static-website.svg)](https://www.npmjs.com/package/serverless-plugin-static-website)

A [serverless](https://serverless.com) plugin to create an S3 bucket to hosting your static website, it will automatically set public permissions and provide a specific deploy command.

## Usage

### Installation

```bash
$ npm install serverless-plugin-static-website --save-dev
```
or using yarn
```bash
$ yarn add serverless-plugin-static-website
```

### Configuration

```yaml
plugins:
  - serverless-plugin-static-website

custom:
  frontend: 
    bucket: ${self:service}-${self:provider.stage} # Provide a bucket name
    dir: './frontend' # Set frontend directory to publish
```

### Bucket information

At the end of `serverless deploy` you will see inside "Service Information" section the websites bucket's URL:
```
Service Information
service: myservice
stage: dev
region: eu-west-1
stack: myservice-dev
resources: 6
frontend: http://myservice-test.s3-website-eu-west-1.amazonaws.com <-- here thr URL to visit
api keys:
  None
endpoints:
  None
functions:
  hello: myservice-test-hello
layers:
  None
```

### Deploy files

Deploy static websites files
```bash
$ serverless deploy frontend
```
this will sync your configured frontend directory with S3 bucket.

_Note: this command is a wrapper of `aws s3 sync`, so you must have the [AWS CLI](https://docs.aws.amazon.com/en_us/cli/latest/userguide/cli-chap-install.html) installed._

### Cleaning

When you destroy the environment with `serverless remove` the created bucket will be emptied automatically to permit the deletion.

### TODO

- [x] Create bucket
- [x] Deploy on bucket
- [x] Empty bucket during serverless remove phase
- [ ] Add CloudFront configurations
