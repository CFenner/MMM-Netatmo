# Integration Testing with Docker Compose

To test the module in a MagicMirror instance:

- run `npm run docker:server` to start MagicMirror Docker
- run `npm run docker:clone` to clone the module into the modules folder
- use `docker exec -it mm bash` and `git checkout <branchName>` to load a specific branch
- run `npm run docker:install` to install the modules dependencies
- add the module config to the `config/config.js`

  ```
      {
        module: 'netatmo',
        position: 'bottom_left',
        header: 'Netatmo',
        config: {
          clientId: '',
          clientSecret: '',
          refresh_token: '',
        },
      },
  ```

- open MagicMirror ui at http://0.0.0.0:8080
