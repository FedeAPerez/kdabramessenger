#!/bin/bash   
echo Ingrese el nombre del menu
read menuname
echo Ingrese el access_token
read accesstoken

curl -X POST -H "Content-Type: application/json" -d '{
  "persistent_menu":[
    {
      "locale":"default",
      "composer_input_disabled":false,
      "call_to_actions":[
        {
          "title":"'$menuname'",
          "type":"nested",
          "call_to_actions":[
            {
              "title":"Lugares de Entrega",
              "type":"postback",
              "payload":"AVAIABLE_LOCATIONS"
            },
            {
              "title":"Info de Contacto",
              "type":"postback",
              "payload":"CONTACT"
            }
          ]
        }
      ]
    }
  ]
}' "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=$accesstoken"