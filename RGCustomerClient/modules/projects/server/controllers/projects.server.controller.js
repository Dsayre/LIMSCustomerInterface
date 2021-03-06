'use strict';

var path = require('path'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  Project = mongoose.model('Project'),
  Plate = mongoose.model('Plate'),
  Sample = mongoose.model('Sample'),
  async = require('async'),
  _ = require('lodash'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  Q = require('q');

//   send projects, if not admin filters based on isGroupLeader permission
exports.listProjects = function(req, res) {
  if (!(req && req.user && req.user._id)) {
    res.status(200).send('Not logged in.');
    return;
  }
  User.findById(req.user._id).exec(function(err, user) { // find current user
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    if (user) {
      var isAdmin = false;
      for (var i = 0; i < user.roles.length; i++) { // check for admin role
        if (user.roles[i] === 'admin') {
          isAdmin = true;
        }
      }
      if (isAdmin === true) {
        Project.find().exec(function(err, projects) { // send all projects
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          }
          console.log("All projects have been found successfully");
          res.send(projects);
        });
      } else {
        var projectNames = Object.keys(user.clientSitePermissions); // send projects based on permissions
        var responseArray = [];
        async.each(projectNames, function(projectName, callback) {
          Project.find({
            projectCode: projectName
          }).exec(function(err, project) {
            if (err) {
              return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
              });
            }
            if (user.clientSitePermissions[projectName].isGroupLeader === true) {
              responseArray.push(project[0]);
            }
            callback();
          });
        }, function(err) {
          if (err) {
            console.log('A project failed to be sent');
          } else {
            console.log('All projects have been found successfully');
            res.send(responseArray);
          }
        });
      }
    }
  });
};

//Return a user found by ID
var findUserByID = function(ID) {
  var deferred = Q.defer();
  User.findById(ID).exec(function(err, user) {
    if (err) deferred.reject(err);
    else deferred.resolve(user);
  });
  return deferred.promise;
};

//Return a project with or without plates populated based on platesPermission
var findProjectByName = function(projectName, options) {
  var deferred = Q.defer();
	if (/*options.admin || */(options.project && options.plates && options.samples) ) {
    Project.find({
      projectCode: projectName
    }).deepPopulate('plates, plates.samples').exec(function(err, project) {
      if (err) deferred.reject(err);
      else deferred.resolve(project[0]);
    });

  } else if (options.project && options.plates) {

    Project.find({
      projectCode: projectName
    }).deepPopulate('plates').exec(function(err, project) {
      if (err) deferred.reject(err);
      else deferred.resolve(project[0]);
    });

  } else if (options.project) {

		Project.find({
      projectCode: projectName
    }).exec(function(err, project) {
      if (err) deferred.reject(err);
      else deferred.resolve(project[0]);
    });

	} else {
		deferred.resolve('');
	}
  return deferred.promise;
};

//Return projects belonging to the individual user with plates and samples populated according to the user's permissions
exports.projectAccess = function(req, res) {
  var undefinedRequest = !(req && req.user && req.user._id);
  if (undefinedRequest) {
    res.status(500).send('req.user or req.user._id undefined');
    return;
  }

  console.log('Request was defined');

  findUserByID(req.user._id).then(function(user) {
    if (!user) throw new Error('Found user is not valid.');
    var adminPermission = user.roles.indexOf('admin') > -1 ? true : false;
    if(!adminPermission){ // not admin, find projects based on permissions
      var projectNames = Object.keys(user.clientSitePermissions);
      var responseArray = []; //Final list of projects that will be send in res.send
      var projectPromises = [];

      projectNames.forEach(function(projectName, index) {

        var projectsDeferred = Q.defer();
        projectPromises.push(projectsDeferred.promise);

        var projectPermission = user.clientSitePermissions[projectName].projectAccess === true;
        var platesPermission = user.clientSitePermissions[projectName].platesAccess === true;
        var samplesPermission = user.clientSitePermissions[projectName].samplesAccess === true;
//			var adminPermission = user.roles.indexOf('admin') > -1 ? true : false;
        var options = {
          project: projectPermission,
          plates: platesPermission,
          samples: samplesPermission,
//				admin: adminPermission
        };

        findProjectByName(projectName, options).then(function(project) {
  				if (project !== '') responseArray.push(project);
          projectsDeferred.resolve();
        }, function(err) {
          console.log(err);
          projectsDeferred.reject('Could not complete query for project: ' + projectName);
        });

      });

      Q.allSettled(projectPromises).then(function() {
        res.status(200).send(responseArray);
        console.log('All projects have been sent successfully');
      }, function(err) {
        console.log(err);
        res.status(500).send(err);
      });

    }
    else{  // admin, send all projects
      Project.find().deepPopulate('plates, plates.samples').exec(function(err, projects) {
        if(err){
        console.log(err);
        } 
        else{
          if(projects){
            var finalSend = [];
            finalSend = projects;
            console.log('All projects found successfully');
            res.status(200).send(finalSend);
          } 
          else{
            console.log('No projects found');
            res.status(404).send();
          }
        }
      });
    }

  }).catch(function(err) {
    console.log(err);
    return res.status(500).send({
      message: errorHandler.getErrorMessage(err)
  });
  });

};

// sends project 
exports.projectNames = function(req, res) {
  User.findById(req.user._id).exec(function(err, user) {
    if(err){
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    if(user){
      var isAdmin = user.roles.indexOf('admin') > -1 ? true : false;
      if(isAdmin){
        Project.find({}, { projectCode: 1, _id: 0 }).exec(function(err, projects) {
          var finalSend = [];
          for(var i = 0; i < projects.length; i++){
            finalSend.push(projects[i].projectCode);
          }
          res.status(200).send(finalSend);
        });
      }
      else{
        return res.status(403).send({});
      }
    }
    else{
      return res.status(400).send({});
    }
  });
};

// checks permissions and returns a single project, takes away fields that a user does not have permission to view
exports.singleProject = function(req, res) {
  var name = req.query.pCode;
  User.findById(req.user._id).exec(function(err, user) {
    if(err){
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    if(user){
      Project.find({projectCode: name}).deepPopulate('plates, plates.samples').exec(function(err, project) {
        var isAdmin = user.roles.indexOf('admin') > -1 ? true : false;
        if(isAdmin){
          res.status(200).send(project);
        }
        else{
          if(user.clientSitePermissions[name]){
            res.status(200).send(project);
          }
          else{
            return res.status(403)({});
          }
        }
      });
    }
    else{
      return res.status(400).send({});
    }
  });
};

exports.otherUserProjects = function(req, res) {
  
  User.findById(req.query.userId).exec(function(err, user) {
    if (err) {
      //console.log(err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    if (user) {
		  if (user.clientSitePermissions) {
			  var projectNames = Object.keys(user.clientSitePermissions);
			  console.log('All projects have been sent successfully');
			  res.send(projectNames);
		  }
    }
    else{
      return res.status(404).send({});
    }
  });
};

exports.updatePermissions = function(req, res) {
  
  var userNew = req.body.params.user;
  User.findById(req.user._id).exec(function(err, currentUser) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }
    if (currentUser) {
      User.findById(userNew._id).exec(function(err, userOld) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }
        if (userOld) {
          var Keys = Object.keys(userNew.clientSitePermissions);
          for (var j = 0; j < Keys.length; j++) {
            if (userNew.clientSitePermissions[Keys[j]] === undefined) {
              return res.status(403).send({
                message: errorHandler.getErrorMessage(err)
              });
            }
          }
          /*for (var i = 0; i < currentUser.clientSitePermissions.length; i++) {
            for (var j = 0; j < userNew.clientSitePermissions.length; j++) {
              if (currentUser.clientSitePermissions[i] != userNew.clientSitePermissions[j]) {

              }
            }
          }*/
          userOld.clientSitePermissions = userNew.clientSitePermissions;
          userOld.save(function(err) {
            if (err) {
              return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
              });
            }
          });
        }
      });
    }
  });
};

exports.userByID = function(req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'User is invalid'
    });
  }

  User.findById(id, '-salt -password').exec(function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Failed to load user ' + id));
    }

    req.model = user;
    next();
  });
};
