'use strict'
const _ = require('lodash');
const Client = require('../client');

class FcResource extends Client {
  constructor (credentials, region) {
    super(credentials, region);
    this.fcClient = this.buildFcClient();
  }

  /**
   * Remove service
   * @param {*} serviceName
   */
  async removeService (serviceName) {
    try {
      this.logger.info(`Deleting service ${serviceName}`)
      await this.fcClient.deleteService(serviceName)
      this.logger.success(`Delete service ${serviceName} successfully`)
    } catch (err) {
      if (err.code === 'ServiceNotFound') {
        this.logger.info(`Service ${serviceName} not exists`)
        return
      }
      this.throwError({ message: `Unable to delete service ${serviceName}: ${err.message}` });
    }
  }

  /**
   * Delete function
   * @param {*} serviceName
   * @param {*} functionName
   */
  async removeFunction (serviceName, functionName) {
    try {
      this.logger.info(`Deleting function ${serviceName}@${functionName}`)
      await this.fcClient.deleteFunction(serviceName, functionName)
      this.logger.success(`Delete function ${serviceName}@${functionName} successfully`)
    } catch (err) {
      if (err.code === 'ServiceNotFound') {
        this.logger.info('Service not exists, skip deleting function')
        return
      }
      if (err.code === 'FunctionNotFound') {
        this.logger.info(`Function ${serviceName}@${functionName} not exists.`)
      } else {
        this.throwError({ message: `Unable to delete function ${serviceName}@${functionName}: ${err.message}` });
      }
    }
  }

  /**
   * Remove trigger
   * @param {*} serviceName
   * @param {*} functionName
   * @param {*} triggerList : will delete all triggers if not specified
   */
  async removeTrigger (serviceName, functionName, parameters) {
    const onlyRemoveTriggerName = parameters ? (parameters.n || parameters.name) : false;
    const triggerList = [];

    if (onlyRemoveTriggerName) {
      triggerList.push(onlyRemoveTriggerName);
    } else {
      try {
        const listTriggers = await this.fcClient.listTriggers(serviceName, functionName);
        const curTriggerList = listTriggers.data;
        for (let i = 0; i < curTriggerList.triggers.length; i++) {
          triggerList.push(curTriggerList.triggers[i].triggerName);
        }
      } catch (ex) {
        if (ex.code === 'ServiceNotFound') {
          this.logger.info('Service not exists, skip deleting trigger');
          return;
        }
        if (ex.code === 'FunctionNotFound') {
          this.logger.info('Function not exists, skip deleting trigger');
          return;
        }
        this.throwError({ message: `Unable to get triggers: ${ex.message}` });
      }
    }

    // 删除触发器
    for (let i = 0; i < triggerList.length; i++) {
      this.logger.info(`Deleting trigger: ${triggerList[i]}`);
      try {
        await this.fcClient.deleteTrigger(serviceName, functionName, triggerList[i]);
      } catch (ex) {
        this.throwError({ message: `Unable to delete triggers: ${ex.message}` });
      }

      this.logger.success(`Delete trigger successfully: ${triggerList[i]}`)
    }
  }

  /**
   * Remove tags
   * @param {*} resourceArn
   * @param {*} tags : Will delete all tags if not specified
   */
  async removeTags (resourceArn, parameters) {
    const onlyRemoveTagName = parameters ? (parameters.k || parameters.key) : false;
    const tagKeys = [];

    if (onlyRemoveTagName) {
      tagKeys.push(onlyRemoveTagName);
    } else {
      try {
        const allTags = await this.fcClient.getResourceTags({ resourceArn: resourceArn });
        if (allTags.data && allTags.data.tags) {
          const tagsAttr = allTags.data.tags;
          for (const key in tagsAttr) {
            tagKeys.push(key);
          }
        }
      } catch (ex) {
        if (ex.code === 'ServiceNotFound') {
          this.logger.info('Service not exists, skip deleting tags');
          return;
        }
        this.logger.error(ex.code);
        this.throwError({ message: `Unable to get tags: ${ex.message}` });
      }
    }
    if (tagKeys.length !== 0) {
      this.logger.info('Tags: untag resource: ' + JSON.stringify(tagKeys));
      await this.fcClient.untagResource(resourceArn, tagKeys);
      this.logger.success('Tags: untag resource successfully: ' + JSON.stringify(tagKeys));
    } else {
      this.logger.info('Tags empty, skip deleting.');
    }
  }
}

module.exports = FcResource;
