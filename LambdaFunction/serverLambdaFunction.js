const randomBytes = require('crypto').randomBytes;

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) {
      errorResponse('Authorization not configured', context.awsRequestId, callback);
      return;
    }

    const rideId = toUrlString(randomBytes(16));
    const username = event.requestContext.authorizer.claims['cognito:username'];
    const requestBody = JSON.parse(event.body);

    const chatMessage = requestBody.chat;

    if (chatMessage.chatRoom == '' && chatMessage.message == '' && chatMessage.receiver == undefined) {
        var fullChatParams = {
                      TableName: 'Rides',
                      FilterExpression: 'Sender = :username',
                      ExpressionAttributeValues: {
                        ':username': username
                        }
                    };

        ddb.scan(fullChatParams).promise().then(function(data) {
                var userChatRooms = data.Items.filter((message) => message.ChatRoom != undefined).map((message) => message.ChatRoom);
                userChatRooms = [...new Set(userChatRooms)];

                if(userChatRooms.length == 0) {
                  callback(null, {
                                      statusCode: 201,
                                      body: JSON.stringify({
                                          data: {},
                                          username: username
                                      }),
                                      headers: {
                                          'Access-Control-Allow-Origin': '*',
                                      }
                                  });
                    return;
                }


                const listToObjectMappings = (list) => {
                      let x = {}
                      list.map(item => x[':' + item] = item)
                      return x
                  }

                  let mappings = listToObjectMappings(userChatRooms);
                  let joined = Object.keys(mappings).join();


                var chatRoomsParams = {
                      TableName: 'Rides',
                      FilterExpression: 'ChatRoom IN (' + joined + ')',
                      ExpressionAttributeValues: mappings
                    };


                      ddb.scan(chatRoomsParams, function(err, chatRoomsData) {
                      if (err) {
                                  console.log("Error : ", err);
                                  callBackWithError(callback, "There was an error while processing your request.");
                      } else {
                                  callback(null, {
                                      statusCode: 201,
                                      body: JSON.stringify({
                                          data: chatRoomsData,
                                          username: username
                                      }),
                                      headers: {
                                          'Access-Control-Allow-Origin': '*',
                                      }
                                  });
                        }
                    });


            }).catch((err) => {
              console.log("Error : ", err);
              callBackWithError(callback, "There was an error while processing your request.");
            });
            return;
    } else if (chatMessage.receiver == '' && chatMessage.message == '' && chatMessage.chatMessage == undefined) {
          var fullChatParams = {
                      TableName: 'Rides',
                      FilterExpression: 'Sender = :username OR Receiver = :username',
                      ExpressionAttributeValues: {
                        ':username': username
                        }
                    };

          ddb.scan(fullChatParams, function(err, data) {
                      if (err) {
                                  console.log("Error : ", err);
                                  callBackWithError(callback, "There was an error while processing your request.");
                      } else {
                                  console.log(data);
                                  callback(null, {
                                      statusCode: 201,
                                      body: JSON.stringify({
                                          data: data,
                                          username: username
                                      }),
                                      headers: {
                                          'Access-Control-Allow-Origin': '*',
                                      }
                                  });
                      }
            });
            return;
      }


    if (chatMessage.message != '' && chatMessage.chatRoom != undefined) {
        recordChatRoomMessage(rideId, username, chatMessage).then(() => {

                    ddb.scan({
                              TableName: 'Rides',
                              FilterExpression: 'Sender = :username OR Receiver = :username',
                              ExpressionAttributeValues: {
                                ':username': username
                                }
                            }, function(err, data) {
                              if (err){
                                          console.log("Error : ", err);
                                          callBackWithError(callback, "There was an error while processing your request.");
                              } else {
                                          console.log(data);
                                          callback(null, {
                                              statusCode: 201,
                                              body: JSON.stringify({
                                                  data: data,
                                                  username: username
                                              }),
                                              headers: {
                                                  'Access-Control-Allow-Origin': '*',
                                              }
                                          });
                              }
                            });
            }).catch((err) => {
              console.error(err);
              errorResponse(err.message, context.awsRequestId, callback)
            });
            return;
    }



    checkIfUserExists(chatMessage).then(function(data) {
        const userEmailsList = data.Users.map((user) => user.Username);
        console.log("Username : ", username);
        console.log("Receiver : ", chatMessage.receiver);
        console.log("Email list", userEmailsList);

        if (!userEmailsList.includes(chatMessage.receiver)) {
            callBackWithError(callback, "User doesn't exist.");
        } else {
            console.log("Well it does exist");
            recordPersonalChatMessage(rideId, username, chatMessage).then(() => {

                    ddb.scan({
                              TableName: 'Rides',
                              FilterExpression: 'Sender = :username OR Receiver = :username',
                              ExpressionAttributeValues: {
                                ':username': username
                                }
                            }, function(err, data) {
                              if (err){
                                          console.log("Error : ", err);
                                          callBackWithError(callback, "There was an error while processing your request.");
                              } else {
                                          console.log(data);
                                          callback(null, {
                                              statusCode: 201,
                                              body: JSON.stringify({
                                                  data: data,
                                                  username: username
                                              }),
                                              headers: {
                                                  'Access-Control-Allow-Origin': '*',
                                              }
                                          });
                              }
                            });
            }).catch((err) => {
              console.error(err);
              errorResponse(err.message, context.awsRequestId, callback)
            });
        }
    }).catch((err) => {
      console.error(err);
      errorResponse(err.message, context.awsRequestId, callback)
    });

};

function callBackWithError(callback, errorMessage) {
  callback(null, {
                        statusCode: 400,
                        body: JSON.stringify({
                            errorMessage: errorMessage
                        }),
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                        },
                    });
}

function checkIfUserExists(callback, chatMessage) {
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

    var userListParams = {
        UserPoolId: 'us-east-1_YuG97ybVT',
        AttributesToGet: [
          'email'
        ]
      };

    return cognitoidentityserviceprovider.listUsers(userListParams).promise();
}


function recordPersonalChatMessage(rideId, username, chatMessage) {

      return ddb.put({
                            TableName: 'Rides',
                            Item: {
                                RideId: rideId,
                                User: username,
                                Sender: username,
                                Receiver: chatMessage.receiver,
                                Message: chatMessage.message,
                                RequestTime: new Date().toISOString(),
                            },
                        }).promise();

}

function recordChatRoomMessage(rideId, username, chatMessage) {

      return ddb.put({
                            TableName: 'Rides',
                            Item: {
                                RideId: rideId,
                                User: username,
                                Sender: username,
                                ChatRoom: chatMessage.chatRoom,
                                Message: chatMessage.message,
                                RequestTime: new Date().toISOString(),
                            },
                        }).promise();

}

function toUrlString(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
