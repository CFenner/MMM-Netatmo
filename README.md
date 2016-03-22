# MagicMirror-Netatmo-Module

| [MagicMirror Project on Github](https://github.com/MichMich/MagicMirror) | [Netatmo API](https://dev.netatmo.com/doc) | [Hurl.it](https://www.hurl.it) | [CreateNetatmoApp](https://dev.netatmo.com/dev/createapp)

A module to integrale informations from the Netatmo API into the MagicMirror.

## Usage

_Prerequisites_

- a Netatmo weather station at home or at least access to a Netatmo weather station account

To usw this module, just include the __netatmo-module__ folder into the __modules__ folder of your MagicMirror and include a `netatmo.init();` in the jQuery.ready function in the main.js. You also need to add some config entries to your config.js file. After that the content will be added to your mirror.



### Access Your Data

To be able to access your data, you need to have an Netatmo Application and grant this application access to your data.

#### Register an App

Your can register a new app [here](https://dev.netatmo.com/dev/createapp). Afterwards you will get an APP_ID and an APP_SECRET which you will need to enter in the config.

#### Grant Access to Your Data

To allow the app to access your data, you need to send a POST request to the auth server and register the app.

You can send a POST request with [Hurl.it](https://www.hurl.it) to the Netatmo auth url: https://api.netatmo.com/oauth2/token

Also you need to provide the following data:

- grant_type: password
- client_id: [APP_ID]
- client_secret: [APP_SECRET]
- username: [USER_MAIL]
- password: [USER_PASSWORD]
- scope: read_station

The POST request will return the following data:

- access_token: [ACCESS_TOKEN]
- expires_in: 10800
- refresh_token: [REFRESH_TOKEN]

The REFRESH_TOKEN will be needed in the config section aswell.

### Configuration

To run the module properly, you need to add the following data to your config.js file.

```
netatmo: {
  client_id: 'APP_ID', // add your [APP_ID]
	client_secret: 'APP_SECRET', // add your [APP_SECRET]
	refresh_token: 'REFRESH_TOKEN', // add your [REFRESH_TOKEN]
	moduleOrder: [
		// specify a certain module order
	],
	dataOrder: [
		// specify a certain data order
	]
}
```
