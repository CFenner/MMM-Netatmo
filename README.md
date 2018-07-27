[![Build Status](https://travis-ci.org/CFenner/MMM-Netatmo.svg?branch=master)](https://travis-ci.org/CFenner/MMM-Netatmo)
[![Known Vulnerabilities](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module/badge.svg)](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module)
[![code climate](https://codeclimate.com/github/CFenner/MMM-Netatmo/badges/gpa.svg)](https://codeclimate.com/github/CFenner/MMM-Netatmo)
[![api](https://img.shields.io/badge/api-Netatmo-orange.svg)](https://dev.netatmo.com/doc)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://choosealicense.com/licenses/mit/)

# MagicMirror-Netatmo-Module

A module to integrale informations from a Netatmo weather station into the [MagicMirror](https://github.com/MichMich/MagicMirror).

![Netatmo visualisation](https://raw.githubusercontent.com/AgP42/MMM-Netatmo/master/Netatmo_NEW.png)

## Usage

_Prerequisites_

- requires MagicMirror v2.0.0
- a Netatmo weather station at home or at least access to a Netatmo weather station account

To use this module, clone this repository to your __modules__ folder of your MagicMirror:

`cd ~/MagicMirror/modules`

`git clone https://github.com/AgP42/MMM-Netatmo.git netatmo`

Now just add the module to your config.js file ([config entries](#configuration)).

### Access Your Data

To be able to access your data, you need to have an Netatmo Application and grant this application access to your data.

#### Register an App

Your can register a new app [here](https://dev.netatmo.com/dev/createapp). Afterwards you will get an APP_ID and an APP_SECRET which you will need to enter in the [config entries](#configuration).

#### Grant Access to Your Data

To allow the app to access your data, you need to send a POST request to the auth server and register the app.

##### cURL

One option is to use the command line tool [cURL](https://www.google.de/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&cad=rja&uact=8&ved=0ahUKEwjqgN789KnaAhUBalAKHR-NDLoQFgg2MAE&url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FCURL&usg=AOvVaw27-lfQBHvLQPR2qsddIR6U). 

```
curl --data "grant_type=password&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&username=YOUR_NETATMO_USERNAME&password=YOUR_NETATMO_PASSWORD&scope=read_station" "https://api.netatmo.com/oauth2/token"
```

The POST request will return the following data:

```
{"access_token":"abc","refresh_token":"xyz","scope":["read_station"],"expires_in":10800,"expire_in":10800}
```

The REFRESH_TOKEN will be needed in the [config entries](#configuration).

### Configuration

The module needs the default configuration block in your config.js to work.

```
{
	module: 'netatmo',
	position: 'bottom_left', // the location where the module should be displayed
	header: 'Netatmo',
	config: {
		location: 'germany/berlin', //for AirQuality
		lang: 'fr', 
		updateIntervalAirQuality: 600, //in secondes
		
		clientId: '', // your app id
		clientSecret: '', // your app secret
		refreshToken: '' // your generated refresh token
		
		updatesIntervalDisplay: 60, //en sec. Delais pour aller voir si besoin d'actualiser netatmo et airquality
    		animationSpeed: 1000,
		moduleOrder: ["Extérieur", "Chambre"]
	}
}
```

The following properties can be configured:

|Option|Description|
|---|---|
|clientId|The ID of your Netatmo [application](https://dev.netatmo.com/dev/listapps).<br><br>This value is **REQUIRED**|
|clientSecret|The app secret of your Netatmo [application](https://dev.netatmo.com/dev/listapps).<br><br>This value is **REQUIRED**|
|refreshToken|The generated refresh token you got from the POST request to the auth api.<br><br>This value is **REQUIRED**|
|updatesIntervalDisplay|How often to check if netatmo datas needs to be updated? (Minutes) No Netatmo server request with this value. Netatmo request minimum every 11 min.<br>Data is updated by netatmo every 10 minutes.<br><br>**Default value:** `1`|
|moduleOrder|The rendering order of your weather modules, ommit a module to hide the output.<br><br>**Example:** `["Kitchen","Kid's Bedroom","Garage","Garden"]` <br>Be aware that you need to use the module names that you set in the netatmo configuration.|
|location|For AirQuality display. Use the part behind http://aqicn.org/city/ for your location. For example http://aqicn.org/city/netherland/utrecht/griftpark/<br><br>**Example:** `'germany/berlin'`|
|lang|To display AirQuality result. Not all languages may be supported (see: http://aqicn.org/faq/2015-07-28/air-quality-widget-new-improved-feed/).<br><br>**Example:** `'fr'`|
|updateIntervalAirQuality|Value in secondes. If last request to AirQuality server is bigger that this value, a new request to made. AirQuality serveur update is approx every hour. <br><br>**Example:** `600`|
