/*global ServerlessChatApp _config*/

var ServerlessChatApp = window.ServerlessChatApp;

'use strict';

angular.
  module('serverlessChatApp').
  component('personalChat', {
    templateUrl:'js/angular/personal-chat/personal-chat.template.html',
    controller: function PersonalChatController($scope, $element, $document, $window) {

      var newFriendElement = angular.element($('#newFriendInput'))[0];
      var newFriendMessageElement = angular.element($('#newFriendMessageInput'))[0];
      var messageElement = angular.element($('#messageInput'))[0];
      var friendsListElement = angular.element($('#friendsList'))[0];
      var authToken;

      var messageColors = ['primary', 'success', 'warning', 'info', 'light'];

      $scope.messages = [];
      $scope.username = '';
      $scope.friends = [];
      $scope.sendPersonalChatMessage = sendPersonalChatMessage;
      $scope.newPersonalChatMessage = newPersonalChatMessage;
      $scope.getFullChat = getFullChat;
      $scope.getTime = getTime;
      $scope.timeDifference = timeSince;
      $scope.getMessageColor = getMessageColor;
      $scope.pendingFriend = '';
      $scope.pendingFriendAdded = false;
      $scope.currentChat = '';

      $scope.$watch('messages');
      $scope.$watch('username');
      $scope.$watch('friends');
      $scope.$watch('pendingFriend');
      $scope.$watch('pendingFriendAdded');
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
              if ($window.location.pathname == '/personalchat.html') {
                $window.location.href = '/signin.html';
              }
          }
      }).catch(function handleTokenError(error) {
          alert(error);
          $window.loggedIn = false;
          $window.location.href = '/signin.html';
      });

      function sendPersonalChatMessage() {
        const chosenFriendInput = friendsListElement.value;
        const messageInput = messageElement.value;

        if (chosenFriendInput == 'Choose Friend To Chat') {
          alert("Whom to send the message?!");
        } else if (messageInput == ''){
          alert("Please type something in the message box!")
        } else if (messageInput != '') {
          sendAjaxRequest(chosenFriendInput, messageInput);
          messageElement.value = '';
        } else {
          getFullChat();
        }

      }

      function newPersonalChatMessage() {
        const newFriendInput = newFriendElement.value;
        const newFriendMessageInput = newFriendMessageElement.value;

        if (newFriendInput == '') {
          alert("Please add email of your new friend!");
        } else if (newFriendMessageInput == '') {
          alert("Please enter a message to add your new friend!")
        } else {
          $scope.pendingFriend = newFriendInput;
          sendAjaxRequest(newFriendInput, newFriendMessageInput);
          newFriendElement.value = '';
          newFriendMessageElement.value = '';
        }

      }

      function getFullChat() {
        sendAjaxRequest('', '');
      }

      function sendAjaxRequest(receiverInput, messageInput) {
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/ride',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                  chat: {
                    receiver: receiverInput,
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

          personalChatMessages = getPersonalChatMessages(messages);
          friends = getFriendsList(personalChatMessages);

          $scope.messages = filterMessages(friendsListElement.value, friends, messages);
          $scope.friends = friends;
          $scope.currentChat = getCurrentChatFriend(friendsListElement.value);

          $scope.$digest();
          if ($scope.pendingFriend != '') {
            $scope.pendingFriendAdded = isPendingFriendAdded(friends);
            $scope.pendingFriend = '';
            $scope.$digest();
            $scope.pendingFriendAdded = '';
          }
      }

      function getCurrentChatFriend(friendValue) {
        if (friendValue == 'Choose Friend To Chat') return '';
        return friendValue;
      }

      function isPendingFriendAdded(friendsList) {
        if (friendsList.includes($scope.pendingFriend)) {
          friendsListElement.value = $scope.pendingFriend;
          return $scope.pendingFriend;
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

      function getPersonalChatMessages(messages) {
        return messages.filter((message) => { return message.Sender != undefined && message.Receiver != undefined })
      }

      function getFriendsList(messages) {
        let friendsList = messages.map((message) => { return message.Sender == $scope.username ? message.Receiver : message.Sender });
        return [...new Set(friendsList)].sort();

      }

      function filterMessages(chosenFriend, friends, messages) {
        if (friends.includes(chosenFriend)) {
          return messages.filter((message) => (message.Sender == chosenFriend || message.Receiver == chosenFriend) && (message.ChatRoom == undefined && message.Receiver != undefined));
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
        const colorIndex = $scope.friends.indexOf(message.Sender) % messageColors.length;
        return messageColors[colorIndex];
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
