# syntax=docker/dockerfile:experimental

FROM node:17-alpine

LABEL maintainer="kontakt@seige.digital"

ENV WORKDIR=/strollgistid

RUN --mount=target=/mnt/build-context \
    mkdir -p $WORKDIR && \
    touch /var/log/strollgistid.log && \
    apk --update upgrade && \
    apk add --update --no-cache gettext && \
    cd /mnt/build-context/ && \
    cp -r `ls -A . | grep -vE "deployment"` $WORKDIR && \
    cp -r /mnt/build-context/deployment/docker/strollgistid/entrypoint.sh $WORKDIR && \
    if [ -r /mnt/build-context/config.json ] ; then cp /mnt/build-context/config.json $WORKDIR ; else cp /mnt/build-context/config.json.example $WORKDIR/config.json ; fi && \
    sed -i -E 's/127.0.0.1/0.0.0.0/g' $WORKDIR/config.json* && \
    sed -i -E 's/svout: \{.*?\}/svout: { type: "console", layout: { type: "basic" } }/g' $WORKDIR/index.js && \
    chown -R node $WORKDIR /var/log/strollgistid.log && \
    cd $WORKDIR && \
    npm install

WORKDIR $WORKDIR

USER node

EXPOSE 2000

CMD [ "./entrypoint.sh" ]
