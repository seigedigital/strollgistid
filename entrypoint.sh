#!/bin/sh

envsubst < $WORKDIR/config.json.example > $WORKDIR/config.json

node index.js
