const { Component } = require('@serverless-devs/s-core');
const getHelp = require('./utils/help');

const FcResource = require('./utils/resource/fc');
const _ = require('lodash');

class FcComponent extends Component {
  constructor() {
    super();
  }

  async remove (inputs) {
    this.help(inputs, getHelp(inputs))

    // 处理参数
    const {
      Properties: properties = {},
      Credentials: credentials = {}
    } = inputs;
    const {
      Region: region,
      Service: serviceProp = {},
      Function: functionProp = {}
    } = properties;
    const serviceName = serviceProp.Name;
    const functionName = functionProp.Name;

    const { Commands: commands, Parameters: parameters } = this.args(inputs.Args, ['-f, --force']);
    const removeType = commands[0];

    let isRemoveAll = false;
    if (commands.length === 0) {
      isRemoveAll = true;
    }

    const fcResource = new FcResource(credentials, region)

    // 解绑标签
    if (removeType === 'tags' || isRemoveAll) {
      // TODO 指定删除标签
      const serviceArn = 'services/' + serviceName
      await fcResource.removeTags(serviceArn, parameters)
    }

    if (removeType === 'domain' || isRemoveAll) {
      let triggers = properties.Function.Triggers;
      if (_.isArray(triggers)) {
        triggers = triggers.filter(trigger => trigger.Type === 'HTTP' && trigger.Parameters && trigger.Parameters.Domains);
        const onlyDomainName = parameters.d || parameters.domain;
        
        for (const trigger of triggers) {
          await fcResource.removeDomain(
            trigger.Parameters.Domains,
            serviceName,
            functionName,
            onlyDomainName
          )
        }
      }
    }

    // 单独删除触发器
    if (removeType === 'trigger' || isRemoveAll) {
      // TODO 指定删除特定触发器
      await fcResource.removeTrigger(serviceName, functionName, parameters);
    }

    // 单独删除函数
    if (removeType === 'function' || isRemoveAll) {
      await fcResource.removeFunction(serviceName, functionName);
    }

    // 单独删除服务
    // TODO 服务是全局的，当前组件如何判断是否要删除服务？
    if (removeType === 'service' || isRemoveAll) {
      if (serviceProp.Nas) {
        await fcResource.removeNasFunctionIfExists(serviceName)
      }
      await fcResource.removeService(serviceName)
    }

    if (isRemoveAll) {
      const forceDelete = parameters.f || parameters.force || false;
      await fcResource.removeAutoGeneratedResourceIfExists({
        forceDelete,
        nasConfig: serviceProp.Nas,
        logConfig: serviceProp.Log
      })
    }
  }
}

module.exports = FcComponent;