# strollgistid

This service tries to deliver the latest raw content of a single file gist.

The reasons to create this service were
* compensate delays of the github API
* host JSON LD files as gists having their own URI in the JSON body (impossible when the raw_url depends on the latest commit)
* cache requests in order to slow down load on the github API

This service is ment to run behind an Nginx proxy: ```proxy_pass http://127.0.0.1:2000;```

## How To Use

* clone this repository ```git clone https://github.com/seigedigital/strollgistid```

* run ```npm install```

* configure the few options in ```config.json``` (and ```index.js```?)

* run ```npm start``` or ```node index.js```

URI schema: {Your BaseURL}/{github Userame}/{gist ID}

Request this service with header ```X-SV-CACHE-UPDATE: TRUE``` in order to initiate a cache update.

```
curl -H 'X-SV-CACHE-UPDATE: TRUE' {Your BaseURL}/{github Userame}/{gist ID}
```

Otherwise get cached results which are much faster. Revalidation is ensured by saving a stroll from the editor (which always makes use of the header mentioned above.)

## Docker

### Buiding the service image

After cloning run the following in the root directory of this repository

```
DOCKER_BUILDKIT=1 docker-compose build
```

### Using the `docker-compose.yaml` file

You can use `docker-compose` to also start NGinx, this will also build the service image if required.

```
docker-compose up
```

or if you want to run as a demon

```
docker-compose up -d
```

### Configuring the service for `docker-compose`

You can update `docker-env` to pass your setting to the service containers
