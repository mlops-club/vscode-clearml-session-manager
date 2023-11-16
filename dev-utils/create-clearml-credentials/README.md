# `create-clearml-credentials`

Generate a set of ClearML credentials for use in local development and testing.

The credentials are then stored in 3 places:

- `volumes/opt/clearml/config/generated_credentials.env`
- `volumes/opt/clearml/config/clearml.conf`
- `volumes/opt/data # not human readable`

## Context

This repo uses docker-compose to run a ClearML server and 2 agents.
In order for the 2 agents to connect to the server, they need to be configured
with credentials. It turns out, the most straightforward way to create these
credentials involves visiting the UI and creating them for a user.

Once created in the UI, information about the credentials is stored as state
in the ./dev-utils/volumes/opt/data folder. To avoid committing these large data files
directly to git, we use a docker-compose file that runs an additional selenium/pylenium
container to visit the UI and create the credentials.
