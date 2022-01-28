<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[logo]: https://img.shields.io/badge/all_contributors-5-orange.svg 'Number of contributors on All-Contributors'
<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![Build Status](https://travis-ci.org/CFenner/MMM-Netatmo.svg?branch=master)](https://travis-ci.org/CFenner/MMM-Netatmo)
[![Known Vulnerabilities](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module/badge.svg)](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module)
[![code climate](https://codeclimate.com/github/CFenner/MMM-Netatmo/badges/gpa.svg)](https://codeclimate.com/github/CFenner/MMM-Netatmo)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![api](https://img.shields.io/badge/api-Netatmo-orange.svg)](https://dev.netatmo.com/doc)
[![All Contributors][logo]](#link)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://choosealicense.com/licenses/mit/)

# MMM-Netatmo

A module to integrate information from a [Netatmo weather station][weather-station] into the [MagicMirror][mirror].

![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/master/.github/preview.classic.png)
![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/master/.github/preview.bubbles.png)

## Usage

Prerequisites:

To use this module you need to have access to a [Netatmo weather station][weather-station].

### Installation

Navigate into your MagicMirror's modules folder and clone the repository:

```shell
cd ~/MagicMirror/modules && git clone git clone https://github.com/CFenner/MMM-Netatmo.git netatmo
```

:warning: Note that the checkout folder is named `netatmo` and not `MMM-Netatmo` as the repository.

### Connection to Netatmo Service API

To be able to access your data, you need to have an Netatmo Application. Create your personal app in the [Netatmo developer portal][dev-portal] and you will get an `APP_ID` and an `APP_SECRET` which you will need to enter in your [mirror configuration](#configuration).

#### Sample Data

If you don't have a Netatmo station yet, you can request a set of mock data by configuring `mockData: true` in the module configuration. In that case you don't need any user of app credentials.

### Configuration

To run the module properly, you need to add the following data to your config.js file.

```js
{
  module: 'netatmo',
  position: 'bottom_left', // the location where the module should be displayed
  header: 'Netatmo', // a header if you like one
  config: {
    clientId: '', // your app id
    clientSecret: '', // your app secret
    username: '', // your netatmo username
    password: '', // your netatmo password
  }
}
```

#### Config Options

The following properties can be configured:

|Option|Description|Default|Required|
|---|---|---|---|
|`clientId`|The ID of your Netatmo [application][dev-portal].||yes|
|`clientSecret`|The app secret of your Netatmo [application][dev-portal].||yes|
|`username`|Username for your Netatmo weather station.||yes|
|`password`|Password for your Netatmo weather station.||yes|
|`refreshInterval`|How often does the content needs to be updated (minutes)? Data is updated by netatmo every 10 minutes|`3`|no|
|`moduleOrder`|The rendering order of your weather modules, ommit a module to hide the output. **Example:** `["Kitchen","Kid's Bedroom","Garage","Garden"]` Be aware that you need to use the module names that you set in the netatmo configuration.||no|
|`dataOrder`|The rendering order of the data types of a module, ommit a data type to hide the output. **Example:** `["Noise","Pressure","CO2","Humidity","Temperature","Rain"]`||no|
|`design`|The design for the module appearance, could be `classic` or `bubbles`.|`classic`|no|
|`horizontal`|Control the direction of the modules (`classic` design only).|`true`|no|
|`showBattery`|Control the appearance of the battery status.|`true`|no|
|`showRadio`|Control the appearance of the radio perception.|`true`|no|
|`showWiFi`|Control the appearance of the Wifi perception.|`true`|no|
|`showTrend`|Control the appearance of the temperature and pressure trend.|`true`|no|
|`showMeasurementIcon`|Control the appearance of the data entry icons (`bubbles` design only).|`true`|no|
|`fontClassModuleName`|Control font size class of the module name.|`xsmall`|no|
|`fontClassPrimary`|Control font size class of the primary value (`bubbles` design only).|`large`|no|
|`fontClassSecondary`|Control font size class of the secondary value (`bubbles` design only).|`xsmall`|no|
|`fontClassMeasurement`|Control font size class of the data entries.|`xsmall`|no|
|`thresholdCO2Average`|Control the threshold for the CO2 status when it should turn `average` (`bubbles` design only).|`800`|no|
|`thresholdCO2Bad`|Control the threshold for the CO2 status when it should turn `bad` (`bubbles` design only).|`1800`|no|
|`mockData`|Use a set of mock data instead of a real data from the Netatmo API.|`false`|no|

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
    <td align="center"><a href="https://github.com/gilmrt"><img src="https://avatars.githubusercontent.com/u/4236800?v=4?s=100" width="100px;" alt=""/><br /><sub><b>gilmrt</b></sub></a><br /><a href="#translation-gilmrt" title="Translation">🌍</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

[weather-station]: https://www.netatmo.com/weather
[dev-portal]: https://dev.netatmo.com/apps/
[mirror]: https://github.com/SAP/jenkins-library/issues
