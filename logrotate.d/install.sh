#!/bin/bash

sudo cp strollgistid.conf /etc/logrotate.d/
sudo service logrotate restart
sudo grep strollgistid /var/lib/logrotate/status

