module.exports = {
  uiHost: "127.0.0.1",
  uiPort: Number(process.env.WORKFLOW_PORT || 1880),
  httpAdminRoot: "/editor",
  contextStorage: { default: { module: "localfilesystem" } },
  functionExternalModules: false,
  disableEditor: false,
  logging: { console: { level: "info", metrics: false, audit: false } }
};

