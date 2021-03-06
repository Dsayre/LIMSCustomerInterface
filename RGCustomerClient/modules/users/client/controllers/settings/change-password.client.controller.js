'use strict';

angular.module('users').controller('ChangePasswordController', ['$scope', '$rootScope', '$timeout', '$window', '$http', 'Authentication', 'PasswordValidator',
  function ($scope, $rootScope, $timeout, $window,  $http, Authentication, PasswordValidator) {
    $scope.Authentication = Authentication;
    $scope.user = Authentication.user;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    $scope.checkForTempPassword = function() {
      if ($scope.user.tempPassword !== '') {
				$scope.tempPassword = true;
        $scope.passwordDetails = {};
        $scope.passwordDetails.currentPassword = $scope.user.tempPassword;
      }
    };

    // Change user password
    $scope.changeUserPassword = function (isValid) {
      $scope.success = $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'passwordForm');

        return false;
      }
      
      $http.post('/api/users/password', $scope.passwordDetails).success(function (response) {
        
        // If successful show success message and clear form
        $scope.$broadcast('show-errors-reset', 'passwordForm');
        $scope.passwordSuccess = true;

        if(response.message === 'Password changed successfully'){
          $scope.tempPassword = false;
          $scope.user.tempPassword = '';
        }
					
        $timeout(function () {
            $scope.passwordSuccess = false;
        }, 3000);
        $scope.passwordDetails = null;
        //$window.location.reload();
      }).error(function (response) {
        $scope.passwordError = response.message;
      });
    };
  }
]);
