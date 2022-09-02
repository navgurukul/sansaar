# install modules
# pip3 install -r requirements.txt

import os, requests, json
from slack import WebClient
from dotenv import load_dotenv
from pathlib import Path

dotenv_path=Path(os.getcwd()).parent.parent
load_dotenv(str(dotenv_path)+'/server/.env')

# crontab instalation: (https://www.digitalocean.com/community/tutorials/how-to-use-cron-to-automate-tasks-ubuntu-1804)
# type crontab -e on your terminal and past the down cron scheduler:
# * * * * * python3 /home/andy/navgurukul/sansaar/lib/serverStatus/index.py > /home/andy/pydemo.txt

# for resolving dotenv path
# * * * * * cd /home/andy/navgurukul/sansaar/lib/serverStatus/ ; python3 index.py > /home/andy/pydemo.txt

# send a message on slack by bot-token
client = WebClient(
    token=os.environ.get('slack_bot_token')
)

def send_slack_message(e):
    response = client.chat_postMessage(
        channel=os.environ.get('slack_channel'),
        text="*Server is down*\n\n{}".format(e)
    )
    print(response)

def check_server_status():
    try:
        url = os.environ.get('api_url')
        response = requests.request("GET", url)
        print(response, "response")
        if response.status_code != 200:
            send_slack_message("*Hey @Anand Patel, @Kirithiv R, @Sanjna Panwar  , production server is down with error code : *" + "`" + str(response.status_code) + "`" + "*please fix it ASAP*")
        elif len(response.json())<0:
            send_slack_message("*Hey @Anand Patel, @Kirithiv R, @Sanjna Panwar  , response in the production system was empty. Please take a look.*")
    except Exception as e:
        send_slack_message(f'`Hey @Anand Patel, @Kirithiv R, @Sanjna Panwar  , production server is down. Please fix it ASAP`\n```${e}```')
check_server_status()