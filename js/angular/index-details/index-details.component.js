'use strict';

angular.
  module('serverlessChatApp').
  component('indexDetails', {
    templateUrl:'js/angular/index-details/index-details.template.html',
    controller: function IndexDetailsController($scope, $window) {

      $scope.isLoggedIn = $window.loggedIn;

      $scope.$watch('isLoggedIn');

    }
  });
