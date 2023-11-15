#!/bin/bash

set -e

THIS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

function install {
    set -x
    python -m pip install --upgrade pip
}

function start-clearml-server {
  export LOCALHOST=`get-localhost`
  source volumes/opt/clearml/config/generated_credentials.env
  docker-compose up
}

function get-localhost {
    # Detect the OS
    OS=$(uname -s)

    if [ "$OS" = "Darwin" ]; then
      # if macOS, use host.docker.internal
      export LOCALHOST=host.docker.internal
    else
      # otherwise use localhost
      export LOCALHOST=localhost
    fi

}

function start-clearml-agent {
  export CLEARML_CONFIG_FILE="${THIS_DIR}/dev-utils/volumes/opt/clearml/config/clearml.conf"
  clearml-agent daemon --queue default --cpu-only --docker
}

function start-clearml-session {
  export CLEARML_CONFIG_FILE="${THIS_DIR}/dev-utils/volumes/opt/clearml/config/clearml.conf"
  clearml-session --public-ip false ${@}
}

# Generate a set of ClearML credentials for use in local development and testing.
#
# Context: this repo uses docker-compose to run a ClearML server and 2 agents.
# In order for the 2 agents to connect to the server, they need to be configured
# with credentials. It turns out, the most straightforward way to create these
# credentials involves visiting the UI and creating them for a user.
#
# Once created in the UI, information about the credentials is stored as state
# in the ./dev-utils/volumes/opt/data folder. To avoid committing these large data files
# directly to git, we use a docker-compose file that runs an additional selenium/pylenium
# container to visit the UI and create the credentials.
#
# The credentials are then stored in 3 places:
#
# - volumes/opt/clearml/config/generated_credentials.env
# - volumes/opt/clearml/config/clearml.conf
# - volumes/opt/data # not human readable
function generate-clearml-credentials-for-compose {
    export LOCALHOST=`get-localhost`

    docker-compose \
      -f docker-compose.yaml \
      -f ./dev-utils/create-clearml-credentials/docker-compose.yaml \
      -f ./dev-utils/create-clearml-credentials/docker-compose.depends.yaml \
      run create-clearml-credentials
}

# (example) ./run.sh test tests/test_slow.py::test__slow_add
function test {
    # run only specified tests, if none specified, run all
    python -m pytest \
        -m 'not slow' \
        --ignore-glob 'tests/artifacts/*' \
        --numprocesses auto \
        "$THIS_DIR/tests/"
}

function clean {
    rm -rf \
      dist \
      out \
      build \
      coverage.xml \
      test-reports \
      tests/artifacts \
      dev-utils/volumes/opt/clearml/agent \
      dev-utils/volumes/opt/clearml/config/generated_credentials.env \
      dev-utils/volumes/opt/clearml/config/clearml.conf \
      dev-utils/volumes/opt/clearml/data \
      dev-utils/volumes/opt/clearml/logs \
      dev-utils/volumes/usr/ \
      .vscode-test \
      .coverage
      
    find . \
      -type d \
      \( \
        -name "*cache*" \
        -o -name "*.dist-info" \
        -o -name "*.egg-info" \
        -o -name "*htmlcov" \
      \) \
      -not -path "*env/*" \
      -exec rm -r {} + || true

    find . \
      -type f \
      -name "*.pyc" \
      -o -name "*.vsix" \
      -not -path "*env/*" \
      -exec rm {} +
}

function help {
    echo "$0 <task> <args>"
    echo "Tasks:"
    compgen -A function | cat -n
}

TIMEFORMAT="Task completed in %3lR"
time ${@:-help}