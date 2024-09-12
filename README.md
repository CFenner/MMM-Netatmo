[![Validation](https://github.com/CFenner/MMM-Netatmo/actions/workflows/validation.yml/badge.svg)](https://github.com/CFenner/MMM-Netatmo/actions/workflows/validation.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module/badge.svg)](https://snyk.io/test/github/cfenner/magicmirror-netatmo-module)
[![code climate](https://codeclimate.com/github/CFenner/MMM-Netatmo/badges/gpa.svg)](https://codeclimate.com/github/CFenner/MMM-Netatmo)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-neostandard-brightgreen.svg)](https://github.com/neostandard/neostandard)
[![api](https://img.shields.io/badge/api-Netatmo-orange.svg)](https://dev.netatmo.com/doc)
[![All Contributors](https://img.shields.io/github/all-contributors/CFenner/MMM-Netatmo/main)](#contributors-)
[![License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://choosealicense.com/licenses/mit/)

# MMM-Netatmo

A module for [MagicMirror²][mirror] to integrate information from a [Netatmo weather station][weather-station].

![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/main/.github/preview.classic.png)
![Netatmo visualisation](https://github.com/CFenner/MagicMirror-Netatmo-Module/blob/main/.github/preview.bubbles.png)

## Usage

Prerequisites:

To use this module you need to have access to a [Netatmo weather station][weather-station].

### Installation

Navigate into your MagicMirror's modules folder and clone the repository:

```shell
cd ~/MagicMirror/modules && git clone https://github.com/CFenner/MMM-Netatmo netatmo
```

:warning: Note that the checkout folder is named `netatmo` and not `MMM-Netatmo` as the repository.

Since v2.1.0: **No special dependencies and no others commands are now needed!**

### Connection to Netatmo Service API

To be able to access your data, you need to have an Netatmo Application. Create your personal app in the [Netatmo developer portal][dev-portal] and you will get an `APP_ID` and an `APP_SECRET` which you will need to enter in your [mirror configuration](#configuration). On the same page, scroll to *Token Generator* and create a token with the `read_station` scope. During that process you will grant your previously created Netatmo app access to your Netatmo weather station. You will actually not need the `access_token`, but the `refresh_token`. This will also go into your mirror configuration.

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
    refresh_token: '', // your generated refresh token
  }
}
```

#### Config Options

The following properties can be configured:

|Option|Description|Default|Required|
|---|---|---|---|
|`clientId`|The ID of your Netatmo [application][dev-portal].||yes|
|`clientSecret`|The app secret of your Netatmo [application][dev-portal].||yes|
|`refresh_token`|Generated refresh token for your Netatmo app and Netatmo instance.||yes|
|`refreshInterval`|How often does the content needs to be updated (minutes)? Data is updated by netatmo every 10 minutes|`3`|no|
|`moduleOrder`|The rendering order of your weather modules, ommit a module to hide the output. **Example:** `["Kitchen","Kid's Bedroom","Garage","Garden"]` Be aware that you need to use the module names that you set in the netatmo configuration.||no|
|`dataOrder`|The rendering order of the data types of a module, ommit a data type to hide the output. **Example:** `["Noise","Pressure","CO2","Humidity","Temperature","Rain"]`||no|
|`design`|The design for the module appearance, could be `classic` or `bubbles`.|`classic`|no|
|`horizontal`|Control the direction of the modules.|`true`|no|
|`showBattery`|Control the appearance of the battery status.|`true`|no|
|`showRadio`|Control the appearance of the radio perception.|`true`|no|
|`showWiFi`|Control the appearance of the Wifi perception.|`true`|no|
|`showTrend`|Control the appearance of the temperature and pressure trend.|`true`|no|
|`showMeasurementIcon`|Control the appearance of the data entry icons (`bubbles` design only).|`true`|no|
|`showStationName`|Control the appearance of the station name next to the module name.|`true`|no|
|`showModuleNameOnTop`|Control the position of the module name.|`false`|no|
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
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kuutio-hub"><img src="https://avatars.githubusercontent.com/u/66736498?v=4?s=100" width="100px;" alt="kuutio-hub"/><br /><sub><b>kuutio-hub</b></sub></a><br /><a href="#translation-kuutio-hub" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zdeneksofr"><img src="https://avatars.githubusercontent.com/u/25898139?v=4?s=100" width="100px;" alt="zdeneksofr"/><br /><sub><b>zdeneksofr</b></sub></a><br /><a href="#translation-zdeneksofr" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tomlarse"><img src="https://avatars.githubusercontent.com/u/4574656?v=4?s=100" width="100px;" alt="Tom-Inge Larsen"/><br /><sub><b>Tom-Inge Larsen</b></sub></a><br /><a href="#translation-tomlarse" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jegerikke"><img src="https://avatars.githubusercontent.com/u/35518057?v=4?s=100" width="100px;" alt="jegerikke"/><br /><sub><b>jegerikke</b></sub></a><br /><a href="#translation-jegerikke" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gilmrt"><img src="https://avatars.githubusercontent.com/u/4236800?v=4?s=100" width="100px;" alt="gilmrt"/><br /><sub><b>gilmrt</b></sub></a><br /><a href="#translation-gilmrt" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cyber152"><img src="https://avatars.githubusercontent.com/u/96107993?v=4?s=100" width="100px;" alt="cyber152"/><br /><sub><b>cyber152</b></sub></a><br /><a href="https://github.com/CFenner/MMM-Netatmo/commits?author=cyber152" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Laz2516"><img src="https://avatars.githubusercontent.com/u/40304797?v=4?s=100" width="100px;" alt="Laz2516"/><br /><sub><b>Laz2516</b></sub></a><br /><a href="#translation-Laz2516" title="Translation">🌍</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ottolote"><img src="https://avatars.githubusercontent.com/u/6615220?v=4?s=100" width="100px;" alt="Otto Lote"/><br /><sub><b>Otto Lote</b></sub></a><br /><a href="https://github.com/CFenner/MMM-Netatmo/commits?author=ottolote" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cgillinger"><img src="https://avatars.githubusercontent.com/u/11836825?v=4?s=100" width="100px;" alt="cgillinger"/><br /><sub><b>cgillinger</b></sub></a><br /><a href="#translation-cgillinger" title="Translation">🌍</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.bugsounet.fr"><img src="https://avatars.githubusercontent.com/u/30669209?v=4?s=100" width="100px;" alt="Bugsounet - Cédric"/><br /><sub><b>Bugsounet - Cédric</b></sub></a><br /><a href="https://github.com/CFenner/MMM-Netatmo/commits?author=bugsounet" title="Code">💻</a> <a href="https://github.com/CFenner/MMM-Netatmo/issues?q=author%3Abugsounet" title="Bug reports">🐛</a> <a href="https://github.com/CFenner/MMM-Netatmo/pulls?q=is%3Apr+reviewed-by%3Abugsounet" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Duhlin12"><img src="https://avatars.githubusercontent.com/u/140636121?v=4?s=100" width="100px;" alt="Duhlin12"/><br /><sub><b>Duhlin12</b></sub></a><br /><a href="https://github.com/CFenner/MMM-Netatmo/commits?author=Duhlin12" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

[weather-station]: https://www.netatmo.com/weather
[dev-portal]: https://dev.netatmo.com/apps/
[mirror]: https://github.com/SAP/jenkins-library/issues
