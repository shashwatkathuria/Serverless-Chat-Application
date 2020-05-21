'use strict';

var ServerlessChatApp = window.ServerlessChatApp || {};

angular.
  module('serverlessChatApp').
  component('mainNavbar', {
    templateUrl:'js/angular/main-navbar/main-navbar.template.html',
    controller: function MainNavbarController($scope, $window) {

      $scope.isLoggedIn = $window.loggedIn;

      $scope.$watch('isLoggedIn');

      $scope.signOut = function() {
        ServerlessChatApp.signOut();
        alert("You have been signed out.");
        $window.loggedIn = false;
        $window.location = "signin.html";
        $scope.isLoggedIn = $window.loggedIn;
        $scope.$apply()
      }


      var authToken;
      ServerlessChatApp.authToken.then(function setAuthToken(token) {
          if (token) {
              authToken = token;
              $window.loggedIn = true;
              if (['/register.html', '/signin.html'].includes($window.location.pathname)) {
                $window.location.href = '/index.html';
              }
          } else {
              $window.loggedIn = false;
              if (['/personalchat.html', '/groupchat.html'].includes($window.location.pathname)) {
                $window.location.href = '/signin.html';
              }
          }
      }).catch(function handleTokenError(error) {
          alert(error);
          $window.loggedIn = false;
          $window.location.href = '/signin.html';
      }).finally(function assignScopeVariables() {
        $scope.isLoggedIn = $window.loggedIn;
        $scope.$apply();
      });



    }
  });
