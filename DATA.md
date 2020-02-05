# Netatmo Data

```
{
    "body": {
        "devices": [],
        "user": {}
    },
    "status": "ok",
    "time_exec": 0.035109043121338,
    "time_server": 1462746567
}
```

## Modules

- NAMain
- NAModule1 // outdoor
- NAModule2 // rain
- NAModule3 // wind
- NAModule4 // indoor

All module have the following data: 

```
{
    "_id": "",
    "type": "NAModule1",
    "last_message": 1462745975,
    "last_seen": 1462745949,
    "last_setup": 1448382569,
    "dashboard_data": {},
    "data_type": [],
    "module_name": "Outdoor",
    "firmware": 43,
    "reachable": true,
}
```

Modules with batteries have the following additional data:

```
{
    "battery_vp": 5613,
    "battery_percent": 79,
    "rf_status": 79
}
```

### Main - `NAMain`

```
{
    "_id": "",
    "cipher_id": "",
    "last_status_store": 1462745980,
    "modules": [
      [...]
    ],
    "place": {
        "altitude": 1797.0131057604,
        "city": "",
        "": "US",
        "timezone": "",
        "location": [-104.797903, 39.523649]
    },
    "station_name": "",
    "type": "NAMain",
    "dashboard_data": {
        "AbsolutePressure": 803.4,
        "time_utc": 1462745966,
        "Noise": 45,
        "Temperature": 20,
        "temp_trend": "up",
        "Humidity": 43                "Pressure": 998.6,
        "pressure_trend": "down",
        "CO2": 469,
        "date_max_temp": 1462731171,
        "date_min_temp": 1462709180,
        "min_temp": 18.1,
        "max_temp": 20.3
    },
    "data_type": ["Temperature", "CO2", "Humidity", "Noise", "Pressure"],
    "co2_calibrating": false,
    "date_setup": 1460662828,
    "last_upgrade": 1462638093,
    "wifi_status": 42,
    "friend_users": [""]
}
```

### Outdoor - `NAModule1`

```
{
    "type": "NAModule1",
    "dashboard_data": {
        "time_utc": 1462745949,
        "Temperature": 15.4,
        "temp_trend": "down",
        "Humidity": 36,
        "date_max_temp": 1462741078,
        "date_min_temp": 1462710677,
        "min_temp": 2.2,
        "max_temp": 19.7
    },
    "data_type": ["Temperature", "Humidity"]
}
```

### Wind - `NAModule2`

```
{
    "type": "NAModule2",
    "dashboard_data": {
        "WindAngle": 221,
        "WindStrength": 2,
        "GustAngle": 208,
        "GustStrength": 4,
        "time_utc": 1462745962,
        "WindHistoric": [{
            "WindStrength": 5,
            "WindAngle": 43,
            "time_utc": 1462742585
        }, {
            "WindStrength": 5,
            "WindAngle": 174,
            "time_utc": 1462742886
        }, {
            "WindStrength": 10,
            "WindAngle": 315,
            "time_utc": 1462743136
        }, [...]
        ],
        "date_max_wind_str": 1462742283,
        "date_max_temp": 1462687491,
        "date_min_temp": 1462687491,
        "min_temp": 0,
        "max_temp": 0,
        "max_wind_angle": 44,
        "max_wind_str": 20
    },
    "data_type": ["Wind"]
}
```

### Rain - `NAModule3`

```
{
    "type": "NAModule3",
    "dashboard_data": {
        "time_utc": 1462745962,
        "Rain": 0,
        "sum_rain_24": 0,
        "sum_rain_1": 0
    },
    "data_type": ["Rain"]
}
```

### Indoor - `NAModule4`

```
{
    "type": "NAModule4",
    "dashboard_data": {
        "time_utc": 1462739506,
        "Temperature": 24.5,
        "temp_trend": "stable",
        "Humidity": 35,
        "CO2": 605,
        "date_max_temp": 1462698477,
        "date_min_temp": 1462658648,
        "min_temp": 23.3,
        "max_temp": 27.6
    },
    "data_type": ["Temperature", "CO2", "Humidity"]
}
```

## User

```
"user": {
    "mail": "",
    "administrative": {
        "country": "DE",
        "reg_locale": "de-DE",
        "lang": "de-DE",
        "unit": 0, //celsius
        "windunit": 4,
        "pressureunit": 0,
        "feel_like_algo": 0
    }
}
```

```
"user": {
    "mail": "",
    "administrative": {
        "country": "US",
        "reg_locale": "en-US",
        "lang": "en-GB",
        "unit": 1, //fahrenheit
        "windunit": 1,
        "pressureunit": 0,
        "feel_like_algo": 1
    }
}
```
