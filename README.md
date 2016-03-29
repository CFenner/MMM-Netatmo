# MagicMirror-Netatmo-Module

| [MagicMirror Project on Github](https://github.com/MichMich/MagicMirror) | [Netatmo API](https://dev.netatmo.com/doc) |

A module to integrale informations from a Netatmo weather station into the MagicMirror.

## Usage

_Prerequisites_

- requires MagicMirror v2.0.0
- a Netatmo weather station at home or at least access to a Netatmo weather station account

To use this module with the old module system, use this branch: https://github.com/CFenner/MagicMirror-Netatmo-Module/tree/rel-1.0

To use this module, just create a new folder in the __modules__ folder of your MagicMirror, name it 'netatmo' and copy the content of the repository into this folder. You also need to add some [config entries](#configuration) to your config.js file. After that the content will be added to your mirror.

### Access Your Data

To be able to access your data, you need to have an Netatmo Application and grant this application access to your data.

#### Register an App

Your can register a new app [here](https://dev.netatmo.com/dev/createapp). Afterwards you will get an APP_ID and an APP_SECRET which you will need to enter in the [config entries](#configuration).

#### Grant Access to Your Data

To allow the app to access your data, you need to send a POST request to the auth server and register the app.

You can send a POST request with [Hurl.it](https://www.hurl.it)([Git](https://github.com/defunkt/hurl)) to the Netatmo auth url: https://api.netatmo.com/oauth2/token

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

The REFRESH_TOKEN will be needed in the [config entries](#configuration).

### Configuration

To run the module properly, you need to add the following data to your config.js file.

```
{
	module: 'netatmo',
	position: 'bottom_left', // you may choose any location
	config: {
		clientId: '<YOUR_CLIENT_ID>',
		clientSecret: '<YOUR_CLIENT_SECRET>',
		refreshToken: '<YOUR_GENERATED_REFRESH_TOKEN>'
	}
}
```

You also can set the refresh interval in minutes (default: 3). Keep in mind that the netatmo data is updated every 10 minutes.

```
	config: {
		...,
		refreshInterval: 0.5, // set to update every 30 seconds
	}
```

You also can set the order of the modules and it's data. By omitting a certain module or data type, you can prevent it from being shown.
Be aware that you need to use the module names that you set in the netatmo configuration.

```
	config: {
		...,
		moduleOrder: [
			"Kitchen",
			//"Kid's Bedroom",
			//"Garage",
			"Garden"
		],
		dataOrder: [
			//"Noise", 
			//"Pressure", 
			"CO2", 
			"Humidity", 
			"Temperature",
			"Rain"
		]
	}
```
