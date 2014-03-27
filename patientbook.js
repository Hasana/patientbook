/*jshint bitwise:true, browser:true, curly:true, eqeqeq:true, evil:true, forin:true, indent:2, latedef: true, maxerr:50, noarg:true, noempty:true, plusplus:true, regexp:false, undef:true, white:true */
/*global $, jQuery, _, Meteor, Session, Template, amplify */

// Set up a collection to contain patient information. On the server,
// it is backed by a MongoDB collection named "patients".

var Patients = new Meteor.Collection('patients');

var Patientbook = {};
Patientbook.getRandomPriority = function () {
  return Math.floor(Math.random() * 10) * 5;
};
Patientbook.resetPatients = function () {
  Patients.remove({});
  var names = [
    'Ada Luna',
    'Koli Jannat',
    'Mariam Fathie',
    'Nimra Farukh',
    'Ayesha Habib',
    'Jinat Aman'
  ];
  for (var i = 0; i < names.length; i += 1) {
    Patients.insert({name: names[i], priority: Patientbook.getRandomPriority()});
  }
};
Patientbook.randomizePriority = function () {
  Patients.find().forEach(function (patient) {
    Patients.update(patient._id, {$set: {priority: Patientbook.getRandomPriority()}});
  });
};
Patientbook.addPatient = function (patient_name) {
  var trimmed = $.trim(patient_name);
  if (trimmed.length) {
    Patients.insert({name: trimmed, priority: Patientbook.getRandomPriority()});
  }
};

if (Meteor.isClient) {

  // A version of Session that also store the key/value pair to local storage
  // using Amplify
  var AmplifiedSession = _.extend({}, Session, {
    keys: _.object(_.map(amplify.store(), function (value, key) {
      return [key, JSON.stringify(value)];
    })),
    set: function (key, value) {
      Session.set.apply(this, arguments);
      amplify.store(key, value);
    }
  });

  Template.navbar.sort_by_is = function (sort_by) {
    return (AmplifiedSession.get('sort_by') || 'priority') === sort_by;
  };
  Template.navbar.events({
    'click .sort_by_priority': function () {
      AmplifiedSession.set('sort_by', 'priority');
    },
    'click .sort_by_name': function () {
      AmplifiedSession.set('sort_by', 'name');
    },
    'click .randomize': function () {
      Patientbook.randomizePriority();
    },
    'click .reset': function () {
      Patientbook.resetPatients();
    },
    'click .add_user': function (event, template) {
      var patient = template.find('input.patient_name');
      Patientbook.addPatient(patient.value);
      patient.value = '';
    }
  });

  Template.patientbook.patients = function () {
    var sort_by = AmplifiedSession.get('sort_by');
    var sort_options = sort_by === 'name' ? {name: 1, priority: 1} : {priority: -1, name: 1};
    return Patients.find({}, {sort: sort_options});
  };

  Template.patient.selected = function () {
    return AmplifiedSession.equals('selected_patient', this._id);
  };
  Template.patient.is_max = function () {
    var max = Patients.findOne({}, {sort: {'priority': -1, name: 1}});
    return max && max._id === this._id;
  };
  Template.patient.is_min = function () {
    var min = Patients.findOne({}, {sort: {'priority': 1, name: -1}});
    return min && min._id === this._id;
  };
  Template.patient.events({
    'click .increment': function () {
      Patients.update(this._id, {$inc: {priority: 5}});
      return false;
    },
    'click .decrement': function () {
      Patients.update(this._id, {$inc: {priority: -5}});
      return false;
    },
    'click .remove': function (event, template) {
      var self = this;
      $(template.find('tr')).fadeOut('fast', function () {
        Patients.remove(self._id);
      });
      return false;
    },
    'click': function () {
      AmplifiedSession.set('selected_patient', this._id);
    }
  });
  Template.patient.rendered = function () {
    $(this.findAll('[rel=tooltip]')).tooltip();
  };
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // On server startup, create some patients if the database is empty.
    if (Patients.find().count() === 0) {
      Patientbook.resetPatients();
    }
  });
}
