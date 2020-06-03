/*global ServerlessChatApp _config*/

var ServerlessChatApp = window.ServerlessChatApp;

'use strict';

angular.
  module('serverlessChatApp').
  component('groupChat', {
    templateUrl:'js/angular/group-chat/group-chat.template.html',
    controller: function GroupChatController($scope, $element, $document, $window) {

      var newChatRoomElement = angular.element($('#newChatRoomInput'))[0];
      var newChatRoomMessageElement = angular.element($('#newChatRoomMessageInput'))[0];
      var messageElement = angular.element($('#messageInput'))[0];
      var chatRoomsListElement = angular.element($('#chatRoomsList'))[0];
      var authToken;

      var messageColors = ['primary', 'success', 'warning', 'info', 'light'];

      $scope.messages = [];
      $scope.username = '';
      $scope.chatRooms = [];
      $scope.chatRoomFriends = [];
      $scope.sendChatRoomMessage = sendChatRoomMessage;
      $scope.newChatRoomMessage = newChatRoomMessage;
      $scope.getFullChat = getFullChat;
      $scope.getTime = getTime;
      $scope.timeDifference = timeSince;
      $scope.getMessageColor = getMessageColor;
      $scope.pendingChatRoom = '';
      $scope.pendingChatRoomAdded = false;
      $scope.currentChat = '';

      $scope.$watch('messages');
      $scope.$watch('username');
      $scope.$watch('chatRooms');
      $scope.$watch('chatRoomFriends');
      $scope.$watch('pendingChatRoom');
      $scope.$watch('pendingChatRoomAdded');
      $scope.$watch('currentChat');

      ServerlessChatApp.authToken.then(function setAuthToken(token) {
          if (token) {
              authToken = token;
              $window.loggedIn = true;
              $scope.getFullChat();

              setTimeout(function() {

                $([document.documentElement, document.body]).animate({
                scrollTop: $("#chatJumbotron").offset().top
                }, 1000);

                $([document.documentElement, document.body]).animate({
                scrollTop: $("main-navbar").offset().top
                }, 1000);

              }, 1500);

              window.setInterval($scope.getFullChat, 2000);

          } else {
              $window.loggedIn = false;
              if ($window.location.pathname == '/groupchat.html') {
                $window.location.href = '/signin.html';
              }
          }
      }).catch(function handleTokenError(error) {
          alert(error);
          $window.loggedIn = false;
          $window.location.href = '/signin.html';
      });

      function sendChatRoomMessage() {
        const chosenChatRoomInput = chatRoomsListElement.value;
        const messageInput = messageElement.value;

        if (chosenChatRoomInput == 'Choose Chat Room To Chat') {
          alert("Which chat room to send the message?!");
        } else if (messageInput == ''){
          alert("Please type something in the message box!")
        } else if (messageInput != '') {
          sendAjaxRequest(chosenChatRoomInput, messageInput);
          messageElement.value = '';
        } else {
          getFullChat();
        }

      }

      function newChatRoomMessage() {
        const newChatRoomInput = newChatRoomElement.value;
        const newChatRoomMessageInput = newChatRoomMessageElement.value;

        if (newChatRoomInput == '') {
          alert("Please enter name of chat room to join!");
        } else if (newChatRoomMessageInput == '') {
          alert("Please enter a message to join the chat room!")
        } else {
          $scope.pendingChatRoom = newChatRoomInput;
          sendAjaxRequest(newChatRoomInput, newChatRoomMessageInput);
          newChatRoomElement.value = '';
          newChatRoomMessageElement.value = '';
        }

      }

      function getFullChat() {
        sendAjaxRequest('', '');
      }

      function sendAjaxRequest(chatRoomInput, messageInput) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                  chat: {
                    chatRoom: chatRoomInput,
                    message: messageInput
                }
            }),
            contentType: 'application/json',
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting chat: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occured : \n' + JSON.parse(jqXHR.responseText).errorMessage);
            }
        });
      }

      function completeRequest(result) {
          var messages = result.data.Items;
          $scope.username = result.username;

          messages.sort((a, b) => new Date(b.RequestTime) - new Date(a.RequestTime));
          messages = markUserMessages(messages);

          console.log(messages);
          chatRoomMessages = getChatRoomMessages(messages);
          console.log(chatRoomMessages);

          chatRooms = getChatRoomsList(chatRoomMessages);

          $scope.chatRoomFriends = getChatRoomFriends(chatRoomMessages);
          $scope.messages = filterMessages(chatRoomsListElement.value, chatRooms, messages);
          $scope.chatRooms = chatRooms;
          $scope.currentChat = getCurrentChatRoom(chatRoomsListElement.value);

          $scope.$digest();
          if ($scope.pendingChatRoom != '') {
            $scope.pendingChatRoomAdded = isPendingChatRoomAdded(chatRooms);
            $scope.pendingChatRoom = '';
            $scope.$digest();
            $scope.pendingChatRoomAdded = '';
          }
      }

      function getCurrentChatRoom(chatRoomValue) {
        if (chatRoomValue == 'Choose Chat Room To Chat') return '';
        return chatRoomValue;
      }

      function isPendingChatRoomAdded(chatRoomsList) {
        if (chatRoomsList.includes($scope.pendingChatRoom)) {
          chatRoomsListElement.value = $scope.pendingChatRoom;
          return $scope.pendingChatRoom;
        }
        return '';
      }

      function markUserMessages(messages) {
        return messages.map((message) => {
          return {
            ...message,
            isSender: message.Sender == $scope.username
          };
        });
      }

      function getChatRoomMessages(messages) {
        return messages.filter((message) => { return message.ChatRoom != undefined })
      }

      function getChatRoomsList(messages) {
        let chatRoomsList = messages.map((message) => { return message.ChatRoom });
        return [...new Set(chatRoomsList)].sort();

      }

      function filterMessages(chosenChatRoom, chatRooms, messages) {
        if (chatRooms.includes(chosenChatRoom)) {
          return messages.filter((message) => (message.ChatRoom == chosenChatRoom) && (message.ChatRoom != undefined && message.Receiver == undefined));
        }
        return [];
      }

      function getTime(isoTimeString) {
        var time = new Date(isoTimeString);
        return time.toLocaleTimeString().slice(0,5) + ' ' + time.toDateString();
      }

      function getMessageColor(message) {

        if (message.isSender) {
          return 'secondary';
        }
        const colorIndex = $scope.chatRoomFriends.indexOf(message.Sender) % messageColors.length;
        return messageColors[colorIndex];
      }

      function getChatRoomFriends(chatRoomMessages) {
        let chatRoomFriendsList = chatRoomMessages.map((message) => message.Sender).filter((sender) => sender != $scope.username);
        return [...new Set(chatRoomFriendsList)].sort();

      }

      function timeSince(isoTimeString) {

          var seconds = Math.floor((new Date() - new Date(isoTimeString)) / 1000);
          var interval = Math.floor(seconds / 31536000);

          if (interval > 1) {
            return interval + " years";
          }
          interval = Math.floor(seconds / 2592000);
          if (interval > 1) {
            return interval + " months";
          }
          interval = Math.floor(seconds / 86400);
          if (interval > 1) {
            return interval + " days";
          }
          interval = Math.floor(seconds / 3600);
          if (interval > 1) {
            return interval + " hours";
          }
          interval = Math.floor(seconds / 60);
          if (interval > 1) {
            return interval + " minutes";
          }

          return Math.abs(Math.floor(seconds)) + " seconds";

        }

    }
  });
