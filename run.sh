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
  export CLEARML_CONFIG_FILE="${THIS_DIR}/volumes/opt/clearml/config/clearml.conf"
  clearml-agent daemon --queue default --cpu-only --docker
}

function start-clearml-session {
  export CLEARML_CONFIG_FILE="${THIS_DIR}/volumes/opt/clearml/config/clearml.conf"
  clearml-session --public-ip false ${@}
}

function generate-clearml-credentials-for-compose {
    export LOCALHOST=`get-localhost`

    docker-compose \
      -f docker-compose.yaml \
      -f ./create-clearml-credentials/docker-compose.yaml \
      -f ./create-clearml-credentials/docker-compose.depends.yaml \
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
    rm -rf dist \
        build \
        coverage.xml \
        test-reports \
        tests/artifacts \
        cookiecutter.yaml \
        sample \
        volumes/opt/clearml/agent \
        volumes/opt/clearml/config/generated_credentials.env \
        volumes/opt/clearml/config/clearml.conf \
        volumes/opt/clearml/data \
        volumes/opt/clearml/logs \
        volumes/usr/ \
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