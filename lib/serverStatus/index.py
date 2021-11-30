# set-up slack and webClient
# 1. pip3 install -r requirements.txt

# if you install all modules by requirments.txt file then no need to install manually
# 2. pip3 install slack
# 3. pip3 install slackclient

import os, requests, json
from slack import WebClient

# crontab instalation: (https://www.digitalocean.com/community/tutorials/how-to-use-cron-to-automate-tasks-ubuntu-1804)
# type crontab -e on your terminal and past the down cron scheduler:
# * * * * * python3 /home/andy/navgurukul/sansaar/lib/serverStatus/index.py > /home/andy/pydemo.txt
    
# send a message on slack channel with the webhook
# def send_slack_message(e):
    # Pica bot
    # url = "https://hooks.slack.com/services/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" 

    # frontent bot
    # url = "https://hooks.slack.com/services/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"


    # dev-server-bot (Meraki)
    # url = "https://hooks.slack.com/services/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"
    # payload={"text": "*Server is down*\n\n{}".format(e)}
    # headers = {
    # 'Content-Type': 'application/json'
    # }
    # response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    # print(response.text)

# send a message on slack by bot-token
client = WebClient(
    token="xoxb-1450944977746-2781275661427-vl7HpFdGg3k29ZIQY5zft4if"
)

def send_slack_message(e):

    response = client.chat_postMessage(
        channel="dev-server",
        text="*Server is down*\n\n{}".format(e)
    )
    print(response)

def check_server_status():
    try:
        # url = "http://localhost:5000/courses"
        url = "https://dev-api.merakilearn.org/courses"
        response = requests.request("GET", url)
        print(response, "response")
        if response.status_code != 200:
            send_slack_message("`Hey developers, there is some bug in your server please fix it ASAP`")
        elif len(response.json())<0:
            send_slack_message("`Hey developers, there is some bug in your server please fix it ASAP`")
    except Exception as e:
        send_slack_message(f'`Hey developers, there is some bug in your server please fix it ASAP`\n```${e}```')
check_server_status()