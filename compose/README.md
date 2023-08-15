# Integration Testing with Docker Compose

To test the module in a MagicMirror docker instance:

- rename the `.env.template` file in the repository root to `.env` and fill in the values
- run `npm run docker:clone` to clone the module (`main` branch)
- optional: use `docker exec -it mm bash` and `git checkout <branchName>` to load a specific branch
- run `npm run docker:install` to install the modules dependencies
- run `npm run docker:server` to start MagicMirror Docker
- open MagicMirror ui at [`http://0.0.0.0:8080`](http://0.0.0.0:8080)
