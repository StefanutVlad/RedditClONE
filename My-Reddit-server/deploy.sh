#!/bin/bash

echo What should the version be?
read VERSION

docker build -t vladstef8/redditclone:$VERSION . 
docker push vladstef8/redditclone:$VERSION
ssh root@67.205.168.105 "docker pull vladstef8/redditclone:$VERSION && docker tag vladstef8/redditclone:$VERSION dokku/api:$VERSION && dokku deploy api $VERSION"