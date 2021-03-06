import _ from 'lodash'
import angular from 'angular'
import { loadUser } from '../services/userv3.service.js'

(function () {
  'use strict'

  angular.module('tc.listings').controller('ListingsCtrl', ListingsCtrl)

  ListingsCtrl.$inject = ['$location', '$scope', 'CONSTANTS', 'logger', '$q',
    'TcAuthService', 'UserService', 'UserStatsService', 'ProfileService', 'ChallengeService', 'ExternalAccountService',
    'ngDialog', '$anchorScroll'
  ]

  function ListingsCtrl($location, $scope, CONSTANTS, logger, $q, TcAuthService,
  UserService, UserStatsService,ProfileService, ChallengeService, ExternalAccountService, ngDialog, $anchorScroll) {
    var vm = this
    var handle
    vm.neverParticipated = false
    vm.loading = true
    vm.userHasChallenges = true
    vm.challengeView = 'tile'

    activate()

    function activate() {

      // add usersnap widget to /listings/ route
      (function() {
        var s = document.createElement('script')
        s.type = 'text/javascript'
        s.async = true
        s.src = '//api.usersnap.com/load/'+
                '3e7c8f0c-6cf6-41b6-9f2c-e8e4e60dfc59.js'
        var x = document.getElementById('react-component')
        x.appendChild(s, x)
      })()

      $scope.myChallenges = []
      $scope.reactProps = {
        config: CONSTANTS,
        filterFromUrl: $location.hash(),
        isAuth: false,
        myChallenges: [],
        onSaveFilterToUrl: function(filter) {
          $location.hash(filter)
        }
      }
      logger.debug('Calling ListingsController activate()')
      vm.myChallenges = []
      loadUser().then(function(token) {
        handle = UserService.getUserIdentity().handle

        // update auth flag and get challenges
        if(TcAuthService.isAuthenticated()) {
          getChallenges(handle)
        }
      }, function(error) {
        // do nothing, just show non logged in state of navigation bar
      })
    }

    function getChallenges(handle) {
      var marathonMatchParams = {
        limit: 8,
        filter: 'status=active'
      }

      var challengeParams = {
        limit: 8,
        orderBy: 'submissionEndDate',
        filter: 'status=active'
      }

      $q.all([
        ChallengeService.getUserMarathonMatches(handle, marathonMatchParams),
        ChallengeService.getUserChallenges(handle, challengeParams)
      ]).then(function(challenges){
        var marathonMatches = challenges[0]
        var devDesignChallenges = challenges[1]

        if (!marathonMatches.length && !devDesignChallenges.length) {
          vm.userHasChallenges = false
          _checkForParticipation().then(function() {
            vm.loading = false
          })
        } else {
          ChallengeService.processActiveDevDesignChallenges(devDesignChallenges)
          ChallengeService.processActiveMarathonMatches(marathonMatches)
          var userChallenges = marathonMatches.concat(devDesignChallenges)

          userChallenges = _.sortBy(userChallenges, function(n) {
            return n.registrationEndDate
          })
          vm.myChallenges = userChallenges.reverse().slice(0, 8)

          // update myChallenges
          $scope.reactProps = {
            config: CONSTANTS,
            filterFromUrl: $location.hash(),
            isAuth: true,
            myChallenges: vm.myChallenges,
            onSaveFilterToUrl: function(filter) {
              $location.hash(filter)
            }
          }

          vm.userHasChallenges = true
          vm.loading = false
        }
      })
      .catch(function(err) {
        logger.error('Error getting challenges and marathon matches', err)

        vm.userHasChallenges = true
        vm.loading = false
      })
    }

    function _checkForParticipation() {
      return ChallengeService.checkChallengeParticipation(handle, function(participated) {
        vm.neverParticipated = !participated
      })
    }
  }

})()
