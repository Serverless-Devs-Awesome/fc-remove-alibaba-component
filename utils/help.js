
module.exports = (inputs) => ({
  description: `Usage: s ${inputs.Project.ProjectName} remove [command]

    Delete application.`,
  commands: [{
    name: 'function',
    desc: 'only remove function.'
  }, {
    name: 'tags',
    desc: 'only remove service tags.'
  }, {
    name: 'tags -k, --key <name>',
    desc: 'only the specified service tag are remove.'
  }, {
    name: 'domain',
    desc: 'only remove domain.'
  }, {
    name: 'domain -d, --domain <name>',
    desc: 'only remove the specified domain name.'
  }, {
    name: 'trigger',
    desc: 'only remove trigger.'
  }, {
    name: 'trigger -n, --name <name>',
    desc: 'only remove the specified trigger name.'
  }],
  args: [{
    name: '-f/--force',
    desc: 'delete auto generated resource by force.'
  }]
})