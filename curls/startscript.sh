#!/bin/bash   
echo Ingrese el saludo
read greet
echo Ingrese el access_token
read accesstoken

curl -X POST -H "Content-Type: application/json" -d '{
  "get_started":
    {
      "payload":"GET_sTARTED_PAYLOAD"
    }
}' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$accesstoken"    

curl -X POST -H "Content-Type: application/json" -d '{
  "greeting":[
    {
      "locale":"default",
      "text":"'$greet'"
    }
  ] 
}' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$accesstoken"    