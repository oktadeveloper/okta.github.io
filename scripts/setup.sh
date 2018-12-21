#!/bin/bash


# Where the generated VuePress site will be placed
GENERATED_SITE_LOCATION="../packages/docs/.vuepress/dist"

# Define these ENV vars if they aren't defined already,
# so these scripts can be run outside of CI
if [[ -z "${BUILD_FAILURE}" ]]; then
    export BUILD_FAILURE=1
fi

if [[ -z "${SUCCESS}" ]]; then
    export SUCCESS=0
fi

# Use latest version of Node
setup_service node v10.7.0

export PATH="${PATH}:$(yarn global bin)"

# Install required dependencies
yarn install -g @okta/ci-update-package
yarn install -g @okta/ci-pkginfo

