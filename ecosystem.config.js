module.exports = {
    apps: [
      {
        name: "finoo-api",
        script: "server.js",
        env: {
          NODE_ENV: "production"
        },
        env_production: {
          NODE_ENV: "production"
        }
      }
    ]
  };
  