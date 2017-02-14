#!/bin/bash 
# build.sh
#
# Author: Joël Franusic (joel.franusic@okta.com)
# Copyright 2016 Okta, Inc.

DEPLOY_BRANCH="master"
TARGET_S3_BUCKET="s3://developer.okta.com-staging"

source "scripts/common.sh"

require_env_var "OKTA_HOME"
require_env_var "BRANCH"
require_env_var "REPO"

# `cd` to the path where Okta's build system has this repository
cd ${OKTA_HOME}/${REPO}

interject "Building HTML in $(pwd)"
if ! generate_html;
then
    echo "Error building site"
    exit ${BUILD_FAILURE};
fi

if [ "${BRANCH}" != "${DEPLOY_BRANCH}" ];
then
    echo "build.sh: Not in branch '${DEPLOY_BRANCH}', not pushing website to S3"
    exit ${SUCCESS};
fi

interject "Uploading HTML from '${GENERATED_SITE_LOCATION}' to '${TARGET_S3_BUCKET}'"
if ! aws s3 cp ${GENERATED_SITE_LOCATION} ${TARGET_S3_BUCKET} --recursive;
then
    echo "Error uploading HTML to S3"
    exit ${BUILD_FAILURE}
fi
exit ${SUCCESS}

