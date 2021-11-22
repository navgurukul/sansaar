import os, requests, json

# crontab instalation: (https://www.digitalocean.com/community/tutorials/how-to-use-cron-to-automate-tasks-ubuntu-1804)
# type crontab -e on your terminal and past the down cron scheduler:
# * * * * * python3 /home/andy/navgurukul/sansaar/lib/serverStatus/index.py > /home/andy/pydemo.txt
    
def send_slack_message(e):
    # Pica bot
    # url = "https://hooks.slack.com/services/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" 

    # frontent bot
    url = "https://hooks.slack.com/services/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"
    payload={"text": "*Server is down*\n\n{}".format(e)}
    headers = {
    'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    print(response.text)

def check_server_status():
    try:
        url = "http://localhost:5000/courses"
        response = requests.request("GET", url)
        print(response, "response")
        if response.status_code != 200:
            send_slack_message("`Hey developers, there is some bug in your server please fix it ASAP`")
    except Exception as e:
        send_slack_message(f'`Hey developers, there is some bug in your server please fix it ASAP`\n```${e}```')
check_server_status()