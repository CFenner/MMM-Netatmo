[![Build Status](https://travis-ci.org/CFenner/MMM-Netatmo.svg?branch=master)](https://travis-ci.org/CFenner/MMM-Netatmo)
[![Known Vulnerabilities](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module/badge.svg)](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module)
[![code climate](https://codeclimate.com/github/CFenner/MMM-Netatmo/badges/gpa.svg)](https://codeclimate.com/github/CFenner/MMM-Netatmo)
[![api](https://img.shields.io/badge/api-Netatmo-orange.svg)](https://dev.netatmo.com/doc)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://choosealicense.com/licenses/mit/)

# MMM-Netatmo

A module to integrate information from a [Netatmo weather station][weather-station] into the [MagicMirror][mirror].

![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/master/.github/preview.png)

## Usage

Prerequisites:

To use this module you need to have access to a [Netatmo weather station][weather-station].

### Installation

Navigate into your MagicMirror's modules folder and clone the repository:

```shell
cd ~/MagicMirror/modules && git clone git clone https://github.com/CFenner/MMM-Netatmo.git netatmo
```

:warning: Note that the checkout folder is named `netatmo` and not `MMM-Netatmo` as the repository.

### API Connection

To be able to access your data, you need to have an Netatmo Application and grant this application access to your data.

#### Register an App

Create your personal app in the [Netatmo developer portal][dev-portal] and you will get an `APP_ID` and an `APP_SECRET` which you will need to enter in the [config entries](#configuration).

#### Grant Access to Your Data

To allow the app to access your data, you need to send a POST request to the auth server and register the app.

One option is to use the command line tool [cURL](https://en.wikipedia.org/wiki/CURL).

```shell
curl -X POST \
  -d "scope=read_station" \
  -d "grant_type=password" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=YOUR_NETATMO_USERNAME" \
  -d "password=YOUR_NETATMO_PASSWORD" \
  "https://api.netatmo.com/oauth2/token"
```

The request will return the following data:

```json
{
  "access_token":"abc",
  "refresh_token":"xyz",
  "scope":["read_station"],
  "expires_in":10800,
  "expire_in":10800
}
```

The REFRESH_TOKEN will be needed in the [config entries](#configuration).

### Configuration

To run the module properly, you need to add the following data to your config.js file.

```js
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

#### Config Options

The following properties can be configured:

|Option|Description|Default|Required|
|---|---|---|---|
|`clientId`|The ID of your Netatmo [application][dev-portal].||yes|
|`clientSecret`|The app secret of your Netatmo [application][dev-portal].||yes|
|`refreshToken`|The generated refresh token you got from the POST request to the auth api.||yes|
|`refreshInterval`|How often does the content needs to be updated? (Minutes)<br>Data is updated by netatmo every 10 minutes|`3`|no|
|`moduleOrder`|The rendering order of your weather modules, ommit a module to hide the output.<br><br>**Example:** `["Kitchen","Kid's Bedroom","Garage","Garden"]` <br>Be aware that you need to use the module names that you set in the netatmo configuration.||no|
|`dataOrder`|The rendering order of the data types of a module, ommit a data type to hide the output.<br><br>**Example:** `["Noise","Pressure","CO2","Humidity","Temperature","Rain"]`||no|

[weather-station]: https://www.netatmo.com/weather
[dev-portal]: https://dev.netatmo.com/apps/
[mirror]: https://github.com/SAP/jenkins-library/issues
