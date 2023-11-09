from pathlib import Path
from pylenium.driver import Pylenium, PyleniumConfig
from pylenium.config import DriverConfig
import requests
from rich import print
import os
import pyhocon
from textwrap import dedent
from typing import Optional
import time

THIS_DIR = Path(__file__).parent

BASE_URL = os.getenv("BASE_URL", "http://host.docker.internal:8080")
CLEARML_CONF_FPATH_TO_UPDATE = Path(os.getenv(
    "CLEARML_CONF_FPATH_TO_UPDATE",
    THIS_DIR / "clearml.conf"
))
CREDENTIALS_DOTENV_FPATH = Path(os.getenv(
    "CREDENTIALS_DOTENV_OUTFPATH",
    THIS_DIR / "generated_credentials.env"
))

    
def main():
    wait_for_clearml_api_server_to_be_reachable(base_url=BASE_URL)

    py = Pylenium(config=PyleniumConfig(driver=DriverConfig(browser="firefox", options=["headless"])))
    login(
        py=py,
        login_url=f"{BASE_URL}/login",
        username="test",
        password="test"
    )
    py.visit(f"{BASE_URL}/settings/workspace-configuration")

    auth_cookie = get_clearml_token_cookie(py=py)
    print("cookie", auth_cookie)
    credentials = create_credentials_with_cookie(
        base_url=f"{BASE_URL}", cookie_value=auth_cookie,
    )

    py.quit()

    print(credentials)
    write_credentials_to_dotenv_file(
        credentials=credentials,
        out_filepath=CREDENTIALS_DOTENV_FPATH,
    )

    update_clearml_conf_file_or_create_if_not_exists(
        conf_fpath=CLEARML_CONF_FPATH_TO_UPDATE,
        credentials=credentials,
    )

def wait_for_clearml_api_server_to_be_reachable(base_url: str):
    # Wait for the API server to be reachable
    url = f'{base_url}/api/v2.26/debug.ping'
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get(url)
            print(response.text)
            if response.status_code == 200:
                print(f"API server is reachable")
                break
        except requests.exceptions.ConnectionError as err:
            print(err)
            print(f"{i}/{max_retries}: API server is not reachable yet")
        time.sleep(2)

def update_clearml_conf_file_or_create_if_not_exists(conf_fpath: Path, credentials: dict):
    # read and parse the hocon file, or create default conf if not exists
    conf: Optional[pyhocon.ConfigTree] = None
    try:
        conf = pyhocon.ConfigFactory.parse_file(str(conf_fpath))
    except FileNotFoundError:
        conf = pyhocon.ConfigFactory.parse_string(dedent("""\
        api { 
            web_server: http://localhost:8080
            api_server: http://localhost:8008
            files_server: http://localhost:8081
            credentials {
                "access_key" = "xxx"
                "secret_key"  = "xxx"
            }
        }
        """))

    # substitute the credentials
    conf["api"]["credentials"]["access_key"] = credentials["data"]["credentials"]["access_key"]
    conf["api"]["credentials"]["secret_key"] = credentials["data"]["credentials"]["secret_key"]

    # write the conf file back to disk
    conf_fpath.parent.mkdir(parents=True, exist_ok=True)
    conf_fpath.touch(exist_ok=True)
    conf_fpath.write_text(pyhocon.HOCONConverter.to_hocon(conf))


def write_credentials_to_dotenv_file(credentials: dict, out_filepath: Path):
    """
    Write the following JSON object to disk.

    ```bash
    export CLEARML_API_ACCESS_KEY=...
    export CLEARML_API_SECRET_KEY=...
    ```

    :param credentials: dict of the form...
    {
        'meta': {
            'id': '5ada142d737243f689697e8eb1c8218d',
            'trx': '5ada142d737243f689697e8eb1c8218d',
            'endpoint': {
                'name': 'auth.create_credentials',
                'requested_version': '2.26',
                'actual_version': '1.0'
            },
            'result_code': 200,
            'result_subcode': 0,
            'result_msg': 'OK',
            'error_stack': '',
            'error_data': {}
        },
        'data': {
            'credentials': {
                'access_key': 'FA3XDA82CC9F6MEVHNLH',
                'secret_key': '6PKVbuWRjD9lenOxYyHit6iVVardyMNSi24JBUAIi4qouX3e8U'
            }
        }
    }
    """
    # Create the file if it doesn't exist
    out_filepath.parent.mkdir(parents=True, exist_ok=True)
    out_filepath.touch(exist_ok=True)

    # Write the credentials to the file
    out_filepath.write_text(
        f"export CLEARML_API_ACCESS_KEY={credentials['data']['credentials']['access_key']}\n"
        f"export CLEARML_API_SECRET_KEY={credentials['data']['credentials']['secret_key']}\n"
    )

class LoginPage:
    def __init__(self, py: Pylenium):
        self.py = py

    def enter_username(self, username: str):
        self.py.get('#name').type(username)

    def enter_password(self, password: str):
        self.py.get('#password').type(password)

    def click_login_button(self):
        self.py.get('button.btn.btn-neon').click()

# Main script
def login(py: Pylenium, login_url: str, username: str, password: str):
    
    # Navigate to the login page
    py.visit(login_url)  # Replace with the actual URL

    # Create an instance of LoginPage
    login_page = LoginPage(py)

    # Perform login actions
    login_page.enter_username(username=username)  # Replace with actual username
    login_page.enter_password(password=password)  # Replace with actual password
    login_page.click_login_button()



def get_clearml_token_cookie(py: Pylenium) -> str:
    # Once the cookie is set, retrieve it
    cookie = py.get_cookie('clearml_token_basic')

    # Return the value of the cookie, or None if it's not found
    return cookie['value'] if cookie else None

def create_credentials_with_cookie(base_url: str, cookie_value: str, credentials_data = dict()):
    # The URL for creating credentials
    url = f'{base_url}/api/v2.26/auth.create_credentials'

    # The headers for the POST request
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': f'{BASE_URL}',
        'Referer': f'{BASE_URL}/settings/workspace-configuration',
    }

    # The cookies to be sent with the request
    cookies = {
        'clearml_token_basic': cookie_value
    }

    # Make the POST request
    response = requests.post(url, headers=headers, json=credentials_data, cookies=cookies)

    # Check the response
    if response.status_code == 200:
        print("Credentials created successfully")
        return response.json()
    else:
        print(f"Failed to create credentials: {response.status_code}")
        return response.text



if __name__ == '__main__':
    main()
