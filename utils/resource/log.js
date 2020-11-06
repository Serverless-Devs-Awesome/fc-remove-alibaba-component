'use strict'
const _ = require('lodash');
const getUuid = require('uuid-by-string');

const Client = require('../client');
const inquirer = require('inquirer')
const { promiseRetry } = require('../utils');


class Log extends Client {
  constructor (credentials, region) {
    super(credentials, region);
    this.logClient = this.buildLogClient();
  }

  generateSlsProjectName (accountId, region) {
    return `aliyun-fc-${region}-${getUuid(accountId)}`
  }

  generateDefaultLogConfig () {
    return {
      project: this.generateSlsProjectName(this.accountId, this.region),
      logStore: 'function-log'
    }
  }

  async slsProjectExist (projectName) {
    let projectExist = true;
    await promiseRetry(async (retry, times) => {
      try {
        await this.logClient.getProject(projectName);
      } catch (ex) {
        if (ex.code === 'Unauthorized') {
          this.throwError({
            name: 'Unauthorized',
            message: `Log Service '${projectName}' may create by others, you should use a unique project name.`
          });
        } else if (ex.code !== 'ProjectNotExist') {
          this.logger.log(`error when getProject, projectName is ${projectName}, error is: \n${ex}`);
          this.logger.info(`Retry ${times} times`);
          retry(ex);
        } else { projectExist = false }
      }
    })
    return projectExist;
  }

  async deleteDefaultSlsProject ({ project }, forceDelete) {
    const defaultProjectExist = await this.slsProjectExist(project);
    if (!defaultProjectExist) { return };

    this.logger.info(`Found auto generated sls project: ${project}.`);
    if (!forceDelete) {
      const { deleteLogs } = await inquirer.prompt([{
        type: 'confirm',
        name: 'deleteLogs',
        default: false,
        message: `Do you want to delete sls project: ${project}?`
      }])
      forceDelete = deleteLogs;
    }

    if (forceDelete) {
      this.logger.info(`Deleting sls project: ${project}`);
      await this.logClient.deleteProject(project);
      this.logger.success('Delete sls project successfully.');
    }
  }
}

module.exports = Log;
