'use strict'

const FC = require('@alicloud/fc2');
const Pop = require('@alicloud/pop-core');
const Logger = require('./logger');
const ServerlessError = require('./error');

FC.prototype.getAccountSettings = function (options = {}, headers = {}) {
  return this.get('/account-settings', options, headers)
}

class Client {
  constructor (credentials, region) {
    this.region = region;
    this.credentials = credentials;

    this.accountId = credentials.AccountID;
    this.accessKeyID = credentials.AccessKeyID;
    this.accessKeySecret = credentials.AccessKeySecret;
    this.stsToken = credentials.SecurityToken;

    this.logger = new Logger();
  }

  buildOssClient (bucketName) {
    return new OSS({
      region: this.region,
      accessKeyId: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      stsToken: this.stsToken,
      bucket: bucketName
    })
  }

  buildFcClient () {
    return new FC(this.accountId, {
      accessKeyID: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      securityToken: this.stsToken,
      region: this.region,
      timeout: 6000000
    })
  }

  buildVpcClient () {
    return new Pop({
      endpoint: 'https://vpc.aliyuncs.com',
      apiVersion: '2016-04-28',
      accessKeyId: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      opts: {
        timeout: 60 * 1000
      }
    })
  }

  buildEcsClient () {
    return new Pop({
      endpoint: 'https://ecs.aliyuncs.com',
      apiVersion: '2014-05-26',
      accessKeyId: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      opts: {
        timeout: 60 * 1000
      }
    })
  }

  buildNasClient () {
    return new Pop({
      endpoint: `http://nas.${this.region}.aliyuncs.com`,
      apiVersion: '2017-06-26',
      accessKeyId: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      opts: {
        timeout: 60 * 1000
      }
    })
  }

  buildRoaClient () {
    return new ROAClient({
      accessKeyId: this.accessKeyID,
      accessKeySecret: this.accessKeySecret,
      endpoint: `https://cr.${this.region}.aliyuncs.com`,
      apiVersion: '2016-06-07'
    })
  }

  /**
   * 抛出错误，用作数据统计
   * @param {*} e Error 对象或者 { name, message }
   */
  throwError (e) {
    new ServerlessError(e);
  }
}

module.exports = Client
