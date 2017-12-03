const 
bodyParser = require('body-parser'),
config = require('config'),
express = require('express'),
crypto = require('crypto'),
https = require('https'),  
request = require('request'),
ua = require('universal-analytics');

var visitor = ua('UA-110548154-1');

var app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/app"));
app.set('views', __dirname + '/app/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(bodyParser.urlencoded({extended: true})); 
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/app/views"));


// Initialize bot options
var botOptions = {};


// Server frontpage
app.get('/terms', function (req, res) {
  res.render('index', {});
});


// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
(process.env.SERVER_URL) :
config.get('serverURL');

const validationToken = (process.env.VALIDATION_TOKEN) ?
(process.env.VALIDATION_TOKEN) :
config.get('validationToken');


/* *
 * Weebhock de conexión a KDABRA según page
 * */
app.get('/webhook', function(req, res) {
  // Token único para proceso de registrar
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === validationToken) {
    // Registrar evento en Google Analytics
    trackEvent('Validacion', 'OK', 'Validacion completa', 100, '/webhook', (response) => {
      res.status(200).send(req.query['hub.challenge']);
    });
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    // Registrar evento en Google Analytics
    trackEvent('Validacion', 'Fallida', 'Validacion incompleta', 0, '/webhook', (response) => {
      res.sendStatus(403);
    }); 
  }  
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
 function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];
    // debemos conseguir el app secret según el page id
    var urlPageId = 'https://kdabraapi.herokuapp.com/users/pageid/{page_id}'.replace(/{page_id}/g, encodeURIComponent(req.body.page_id)) ;

      request({
        uri: urlPageId,
        method: 'GET'

      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

          var expectedHash = crypto.createHmac('sha1', "fc54e78765d094b1740350073166443f")
          .update(buf)
          .digest('hex');

          if (signatureHash != expectedHash) {
            throw new Error("Couldn't validate the request signature.");
          }
        } else {
          console.error("Failed calling Send API");
        }
      });  
  }
}

app.post('/webhook', function (req, res) {
  var data = req.body;
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    console.log(JSON.stringify(data));
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        botOptions.sessionId = messagingEvent.sender.id;
        if (messagingEvent.optin) {
          //receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          //receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          //receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          //receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */
 function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;


  if (isEcho) {
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;

    switch(quickReplyPayload){
      case "AVAIABLE_LOCATIONS":
      sendTextMessage(senderID, "Hacemos envíos por toda la zona de Hurlingham!");
      ;break;
      case "CONTACT":
      sendTextMessage(senderID, "Podés contactarte al 11 6805 9706");
      ;break;
    }

    return;
  }

  if (messageText) {
    if(senderID != 1419776951420132){
      console.log("Received message %s and app %d with metadata");
    }else{
     userController.getAll(function(users){
      for (var i = 0; i < users.length; i++) {
        sendTextMessage(users[i].id, messageText);
      }
    });
   }


 } else if (messageAttachments) {
 }
}

/*
* Mandar Mensaje de texto al messenger de fb
*/
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
}

/*
* Mandar cualquier tipo de mensaje
*/
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
        console.log("Successfully called Send API for recipient %s", 
          recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

function userStartPostback(senderID){
  var messageData = {
    recipient: {
      id: senderID
    },
    message: {
      text:  "Hola, y bienvenido al Almacén de Pán y Café. Clickea sobre el menú y mirá todas la info que te podemos dar!",
      quick_replies:[
      {
        content_type:"text",
        title:"Contacto",
        payload:"CONTACT"
      },
      {
        content_type:"text",
        title:"Lugares de Entrega",
        payload:"AVAIABLE_LOCATIONS"
      }
      ]
    }
  };

  callSendAPI(messageData);
}

function receivedPostback(messagingEvent){
  var postBackObject = {};
  console.log("recibi postback:" + JSON.stringify(messagingEvent.postback.payload));
  console.log("que tiene el payload " + messagingEvent.postback.payload);
  try {
   postBackObject =  JSON.parse(messagingEvent.postback.payload);
  } catch (e) {
  postBackObject.payload = messagingEvent.postback.payload;
  }

  var senderID = messagingEvent.sender.id;

  switch(postBackObject.payload){
    case "GET_STARTED_PAYLOAD":
      sendTextMessage(senderID, "Hola, y bienvenido al Almacén de Pán y Café. Clickea sobre el menú y mirá todas la info que te podemos dar!");
    
    ;break;

    case "AVAIABLE_LOCATIONS":
      sendTextMessage(senderID, "Hacemos envíos por toda la zona de Hurlingham!");
    ;break;

    case "CONTACT":
    var messageData = {
      recipient: {
        id: senderID
      },
      message: {
        attachment:{
          type:"template",
          payload:{
            template_type:"button",
            text:"Queres hablar con alguien del Almacen de Pan y Cafe?",
            buttons:[
            {
              "type":"phone_number",
              "title":"Apreta para llamar!",
              "payload":"+541168059706"
            }
            ]
          }
        }
      }
    };

    callSendAPI(messageData);
    ;break;

    userStartPostback(senderID);
    ;break;
  }     
}

function trackEvent (category, action, label, value, path, cb) {
  var data = {
    // Event category.
    ec: category,
    // Event action.
    ea: action,
    // Event label.
    el: label,
    // Event value.
    ev: value,
    dp: path,
  };

  //visitor.pageview("/test", "http://kdabraapp.com", "Welcome", function (err) {
    return visitor.event(data, function(err){
      var status = true;
      if(err)
        status = false;

      var response = {
        body : status,
        error : err
      };

      cb(response);
    });
  //});
}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;









