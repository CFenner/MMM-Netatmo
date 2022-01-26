[![Build Status](https://travis-ci.org/CFenner/MMM-Netatmo.svg?branch=master)](https://travis-ci.org/CFenner/MMM-Netatmo)
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-4-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
[![Known Vulnerabilities](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module/badge.svg)](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module)
[![code climate](https://codeclimate.com/github/CFenner/MMM-Netatmo/badges/gpa.svg)](https://codeclimate.com/github/CFenner/MMM-Netatmo)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![api](https://img.shields.io/badge/api-Netatmo-orange.svg)](https://dev.netatmo.com/doc)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://choosealicense.com/licenses/mit/)

# MagicMirror-Netatmo-Module

A module to integrale informations from a Netatmo weather station into the [MagicMirror](https://github.com/MichMich/MagicMirror).

![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/master/.github/preview.png)

## Usage

_Prerequisites_

- requires MagicMirror v2.0.0
- a Netatmo weather station at home or at least access to a Netatmo weather station account

To use this module with the **old module system**, use this branch: https://github.com/CFenner/MagicMirror-Netatmo-Module/tree/rel-1.0

To use this module, just clone this repository to your __modules__ folder of your MagicMirror: `git clone https://github.com/CFenner/MagicMirror-Netatmo-Module.git netatmo`

Now just add the module to your config.js file ([config entries](#configuration)).

### Access Your Data

To be able to access your data, you need to have an Netatmo Application and grant this application access to your data.

#### Register an App

Your can register a new app [here](https://dev.netatmo.com/apps/createanapp). Afterwards you will get an APP_ID and an APP_SECRET which you will need to enter in the [config entries](#configuration).

#### Grant Access to Your Data

To allow the app to access your data, you need to send a POST request to the auth server and register the app.

##### cURL

One option is to use the command line tool [cURL](https://www.google.de/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&uact=8&ved=0ahUKEwjqgN789KnaAhUBalAKHR-NDLoQFgg2MAE&url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FCURL&usg=AOvVaw27-lfQBHvLQPR2qsddIR6U). 

```
curl -X POST -d "grant_type=password" -d "client_id=YOUR_CLIENT_ID" -d "client_secret=YOUR_CLIENT_SECRET" -d "username=YOUR_NETATMO_USERNAME" -d "password=YOUR_NETATMO_PASSWORD" -d "scope=read_station" "https://api.netatmo.com/oauth2/token"
```

The POST request will return the following data:

```
{"access_token":"abc","refresh_token":"xyz","scope":["read_station"],"expires_in":10800,"expire_in":10800}
```

The REFRESH_TOKEN will be needed in the [config entries](#configuration).

##### Hurl.it

You can also send a POST request with [Hurl.it](https://www.hurl.it)([Git](https://github.com/defunkt/hurl)) to the Netatmo auth url: https://api.netatmo.com/oauth2/token

Also you need to provide the following data (add as parameters):

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

The module needs the default configuration block in your config.js to work.

```
{
	module: 'netatmo',
	position: 'bottom_left', // the location where the module should be displayed
	config: {
		clientId: '', // your app id
		clientSecret: '', // your app secret
		refreshToken: '' // your generated refresh token
	}
}
```

The following properties can be configured:

|Option|Description|
|---|---|
|clientId|The ID of your Netatmo [application](https://dev.netatmo.com/dev/listapps).<br><br>This value is **REQUIRED**|
|clientSecret|The app secret of your Netatmo [application](https://dev.netatmo.com/dev/listapps).<br><br>This value is **REQUIRED**|
|refreshToken|The generated refresh token you got from the POST request to the auth api.<br><br>This value is **REQUIRED**|
|refreshInterval|How often does the content needs to be updated? (Minutes)<br>Data is updated by netatmo every 10 minutes.<br><br>**Default value:** `3`|
|moduleOrder|The rendering order of your weather modules, ommit a module to hide the output.<br><br>**Example:** `["Kitchen","Kid's Bedroom","Garage","Garden"]` <br>Be aware that you need to use the module names that you set in the netatmo configuration.|
|dataOrder|The rendering order of the data types of a module, ommit a data type to hide the output.<br><br>**Example:** `["Noise","Pressure","CO2","Humidity","Temperature","Rain"]`|

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/kuutio-hub"><img src="https://avatars.githubusercontent.com/u/66736498?v=4?s=100" width="100px;" alt=""/><br /><sub><b>kuutio-hub</b></sub></a><br /><a href="#translation-kuutio-hub" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/zdeneksofr"><img src="https://avatars.githubusercontent.com/u/25898139?v=4?s=100" width="100px;" alt=""/><br /><sub><b>zdeneksofr</b></sub></a><br /><a href="#translation-zdeneksofr" title="Translation">🌍</a></td>
    <td align="center"><a href="http://blog.codesalot.com"><img src="https://avatars.githubusercontent.com/u/4574656?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Tom-Inge Larsen</b></sub></a><br /><a href="#translation-tomlarse" title="Translation">🌍</a></td>
    <td align="center"><a href="https://github.com/jegerikke"><img src="https://avatars.githubusercontent.com/u/35518057?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jegerikke</b></sub></a><br /><a href="#translation-jegerikke" title="Translation">🌍</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!