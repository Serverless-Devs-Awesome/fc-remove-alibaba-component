'use strict'
const _ = require('lodash');
const getUuid = require('uuid-by-string');

const Client = require('../client');
const inquirer = require('inquirer')

const requestOption = {
  method: 'POST'
};

const defaultVpcName = 'fc-fun-vpc';
const defaultVSwitchName = 'fc-fun-vswitch-1';
const NAS_DEFAULT_DESCRIPTION = 'default_nas_created_by_fc_fun';

class Nas extends Client {
  constructor (credentials, region) {
    super(credentials, region);
    this.vpcClient = this.buildVpcClient();
    this.nasClient = this.buildNasClient();
  }

  async findVpc (vpcName) {
    const pageSize = 50; // max value is 50. see https://help.aliyun.com/document_detail/104577.html
    let requestPageNumber = 0;
    let totalCount;
    let pageNumber;
  
    let vpc;
  
    do {
      var params = {
        RegionId: this.region,
        PageSize: pageSize,
        PageNumber: ++requestPageNumber
      };
  
      const rs = await this.vpcClient.request('DescribeVpcs', params, requestOption);
      totalCount = rs.TotalCount;
      pageNumber = rs.PageNumber;
      const vpcs = rs.Vpcs.Vpc;
  
      this.logger.log(`find vpc rs: ${JSON.stringify(rs)}`);
      vpc = _.find(vpcs, { VpcName: vpcName });
      this.logger.log(`find default vpc: ${JSON.stringify(vpc)}`);
    } while (!vpc && totalCount && pageNumber && pageNumber * pageSize < totalCount)
  
    return vpc;
  }

  async describeVSwitchAttributes (vpcClient) {
    return await vpcClient.request('DescribeVSwitchAttributes', params, requestOption)
  }

  async findVswitchExistByName (vswitchIds, searchVSwtichName) {
    if (!_.isEmpty(vswitchIds)) {
      for (const vswitchId of vswitchIds) {
        const params = {
          RegionId: this.region,
          VSwitchId: vswitchId
        }
        const describeRs = await this.vpcClient.request('DescribeVSwitchAttributes', params, requestOption)
        const vswitchName = (describeRs || {}).VSwitchName;
  
        if (_.isEqual(searchVSwtichName, vswitchName)) {
          this.logger.log(`found default vswitchId: ${vswitchId}.`);
          return vswitchId;
        }
      }
    }
    this.logger.log(`could not find ${searchVSwtichName} from ${vswitchIds} for region ${region}.`);
    return null;
  }

  async findDefaultVpcAndSwitch () {
    const funDefaultVpc = await this.findVpc(defaultVpcName)
    if (funDefaultVpc) {
      const vswitchIds = funDefaultVpc.VSwitchIds.VSwitchId;
      const vswitchId = await this.findVswitchExistByName(vswitchIds, defaultVSwitchName)
      return {
        vpcId: funDefaultVpc.VpcId,
        vswitchId
      }
    }
    return {}
  }

  async findNasFileSystem (description) {
    const pageSize = 50;
    let requestPageNumber = 0;
    let totalCount;
    let pageNumber;
  
    let fileSystem;
    do {
      const params = {
        RegionId: this.region,
        PageSize: pageSize,
        PageNumber: ++requestPageNumber
      }
  
      let rs;
      try {
        rs = await this.nasClient.request('DescribeFileSystems', params, requestOption)
      } catch (ex) {
        this.throwError(ex);
      }
      totalCount = rs.TotalCount;
      pageNumber = rs.PageNumber;
      const fileSystems = rs.FileSystems.FileSystem;
      fileSystem = _.find(fileSystems, { Description: description });
      this.logger.log(`find filesystem: ${JSON.stringify(fileSystem)}`);
    } while (!fileSystem && totalCount && pageNumber && pageNumber * pageSize < totalCount)
    return (fileSystem || {}).FileSystemId;
  }

  async findMountTarget (nasClient, region, fileSystemId, vpcId, vswitchId) {
    var params = {
      RegionId: region,
      FileSystemId: fileSystemId
    };
    const rs = await nasClient.request('DescribeMountTargets', params, requestOption);
    const mountTargets = rs.MountTargets.MountTarget;
  
    // todo: 检查 mountTargets 的 vswitch 是否与函数计算的一致？
    if (!_.isEmpty(mountTargets)) {
      const mountTarget = _.find(mountTargets, {
        VpcId: vpcId,
        VswId: vswitchId
      });
      if (mountTarget) {
        return mountTarget.MountTargetDomain;
      }
    }
    return null
  }
  
  async deleteDefaultNas (vpcId, vswitchId, nasConfig, forceDelete = false) {
    const fileSystemId = await this.findNasFileSystem(NAS_DEFAULT_DESCRIPTION);
    if (!fileSystemId) { return }
    const mountTarget = await this.findMountTarget(this.nasClient, this.region, fileSystemId, vpcId, vswitchId);
    if (!mountTarget) { return }

    let isAutoGenerated = nasConfig === 'Auto' || nasConfig.Type === 'Auto';
    if (nasConfig && nasConfig.MountPoints) {
      for (const mount of nasConfig.MountPoints) {
        if ((mount.NasAddr === mountTarget) || (mount.ServerAddr && mount.ServerAddr.split(':')[0] === mountTarget)) {
          isAutoGenerated = true;
          break
        }
      }
    }

    this.logger.info(`Found auto generated nas file system: ${fileSystemId}, mount target: ${mountTarget}.`);
    if (!forceDelete) {
      const { deleteNas } = await inquirer.prompt([{
        type: 'confirm',
        name: 'deleteNas',
        default: false,
        message: `Do you want to delete NAS: ${fileSystemId}?`
      }]);
      forceDelete = deleteNas;
    }
  
    if (forceDelete) {
      this.logger.info(`Deleting mount target: ${mountTarget}.`);
      await this.nasClient.request('DeleteMountTarget', { FileSystemId: fileSystemId, MountTargetDomain: mountTarget }, requestOption);
      this.logger.success('Delete successfully.');
      this.logger.info(`Deleting nas file system: ${fileSystemId}`);
      await this.nasClient.request('DeleteFileSystem', { FileSystemId: fileSystemId }, requestOption);
      this.logger.success('Delete successfully.');
    }
  }

  async removeNas (nasConfig, forceDelete) {
    const { vpcId, vswitchId } = await this.findDefaultVpcAndSwitch(this.credentials, this.region)
    if (vpcId && vswitchId) {
      try {
        await this.deleteDefaultNas(vpcId, vswitchId, nasConfig, forceDelete)
      } catch (e) {
        this.logger.warn(`Failed to delete auto generated nas: ${e}`)
      }
    }
  }
}

module.exports = Nas;
