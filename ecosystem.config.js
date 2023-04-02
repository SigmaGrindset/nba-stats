module.exports = {
  apps: [{
    script: 'src/app.js',
    name: "app",
    instances: 1,
    exec_mode: "cluster",

    env: {
      "NODE_ENV": "development",
      "PORT": 3000
    },
    env_production: {
      "NODE_ENV": "production",
      "PORT": 3000
    }
  }],

};
