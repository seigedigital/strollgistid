#!/bin/sh

if ! test -r $WORKDIR/config.json ; then
    echo "Generating $WORKDIR/config.json"
    envsubst < $WORKDIR/config.json.example > $WORKDIR/config.json
fi

node index.js
