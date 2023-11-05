from clearml import backend_api

from clearml.backend_api.session.client import APIClient
from clearml.backend_api.services.v2_23.queues import Queue
# Create an instance of APIClient
client = APIClient()
project_list = client.projects.get_all(name="DevOps")
print(project_list)


queue_list = client.queues.get_all()
print(queue_list)

client.workers.