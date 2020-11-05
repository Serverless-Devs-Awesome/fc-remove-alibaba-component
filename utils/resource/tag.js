'use strict'
const _ = require('lodash');
const Client = require('../client');

class Tag extends Client {
  constructor (credentials, region) {
    super(credentials, region);
    this.fcClient = this.buildFcClient();
  }

  /**
   * Remove tags
   * @param {*} resourceArn
   * @param {*} tags : Will delete all tags if not specified
   */
  async remove (resourceArn, parameters) {
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

module.exports = Tag
