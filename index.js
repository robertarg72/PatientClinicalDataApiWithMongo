/*
 * index.js
 * Project: Patient Clinical Data RESTful API
 * Authors: 
 *      KAMALPREET SINGH   300976062
 *      MEHMET FATIH INAN  300966544
 *      ROBERT ARGUME      300949529
 * version: 1.0.0
 * Description: RESTful API for managing a patient clinical data 
 * Curl example:
 *   - curl -d '{"FirstName":"John", "LastName":"Doe"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:8000/patients
 */

let SERVER_NAME = 'patient-clinical-data-api-with-mongo'

// Port variable is prepared to work with Heroku. Also HOST variable commented to enable Heroky without problems
let PORT = process.env.PORT || 5000
//let HOST = '127.0.0.1'

// MONGOOSE  SETUP
var http = require ('http');
var mongoose = require ("mongoose");
var ipaddress = process.env.IP; 

// Here we find an appropriate database to connect to, defaulting to
// localhost if we don't find one.  
var uristring = 
  process.env.MONGODB_URI || 
  'mongodb://localhost/patient-db';

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Successfully connected to: ' + uristring);
  }
});

// Data Schemas

var patientSchema = new mongoose.Schema({
  FirstName: String, 
  LastName: String, 
  Address: String,
  DateOfBirth: String,
  Gender: String,
  Telephone: String,
  InsurancePlan: String,
  EmergencyContact: {
    Name: String,
    Address: String,
    Relationship: String,
    Telephone: String
  },
  BloodType: String,
  IsInCritcalCondition: Boolean
});

var clinicalDataSchema = new mongoose.Schema({
    PatientId: String,
    Practitioner: String,
    MedicalCenter: String,
    DateTime: String,
    DataType: String,
    Reading: String
});

// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'Patients' collection in the MongoDB database
var Patient = mongoose.model('Patient', patientSchema);
var ClinicalData = mongoose.model('ClinicalData', clinicalDataSchema);


let restify = require('restify')

  // Get a persistence engine for the patients and their clinical data
  , patientsSave = require('save')('patients')
  , clinicalDataSave = require('save')('clinical-data')

  // Create the restify server
  , server = restify.createServer({ name: SERVER_NAME})

  // if (typeof ipaddress === "undefined") {
	// 	//  Log errors on OpenShift but continue w/ 127.0.0.1 - this
	// 	//  allows us to run/test the app locally.
	// 	console.warn('No process.env.IP var, using default: ' + DEFAULT_HOST);
	// 	ipaddress = DEFAULT_HOST;
	// };

	// if (typeof port === "undefined") {
	// 	console.warn('No process.env.PORT var, using default port: ' + DEFAULT_PORT);
	// 	port = DEFAULT_PORT;
	// };

// We are not using HOST parameter for avoiding problems with Heroku deployment
//server.listen(PORT, HOST, function () {
  server.listen(PORT, function () {
  console.log('Server %s listening at %s', server.name, server.url)
  console.log('Resources:')
  console.log(' /patients        method: GET')
  console.log(' /patients        method: POST')
  console.log(' /patients/:id    method: GET')  
  console.log(' /patients/:id    method: PUT')
  console.log(' /patients/:id    method: DEL')
  console.log(' /patients/criticalCondition         method: GET')  
  console.log(' /patients/:patientId/records        method: GET')
  console.log(' /patients/:patientId/records        method: POST')
  console.log(' /patients/:patientId/records/:id    method: GET')
  console.log(' /patients/:patientId/records/:id    method: PUT')
  console.log(' /patients/:patientId/records/:id    method: DEL')
})

server
  // Allow the use of POST
  .use(restify.fullResponse())

  // Maps req.body to req.params so there is no switching between them
  .use(restify.bodyParser())


//#region FOR CATCHING OTHER ROUTES
// Catch all other routes and return a default message
server.get('/', function (req, res, next) {
  res.send('Patient RESTful API')
});
//#endregion

//#region PATIENT API

// Get all patients in the system
server.get('/patients', function (req, res, next) {

  // Find every patient within the given collection
  Patient.find({}).exec(function (error, patients) {
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
    // Return all of the patients in the system
    res.send(patients)
  })
})

// Get all patients in critical condition in the system
server.get('/patients/criticalCondition', function (req, res, next) {
  
    // Find every patient within the given collection
    Patient.find({IsInCritcalCondition: true}).exec(function (error, patients) {
  
      // Return all of the patients in the system
      res.send(patients)
    })
  })

// Get a single patient by their patient id
server.get('/patients/:id', function (req, res, next) {

  // Find a single patient by their id within save
  Patient.find({ _id: req.params.id }).exec(function (error, patient) {

    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    if (patient) {
      // Send the patient if no issues
      res.send(patient[0])
    } else {
      // Send 404 header if the patient doesn't exist
      res.send(404)
    }
  })
})

// Create a new patient
server.post('/patients', function (req, res, next) {
  console.log('POST request: patient');
  // Get new patient data from the request object
  let newPatient = ''
  try {
      newPatient = getPatientData(req)
  } catch (error) {
      return next(new restify.InvalidArgumentError(JSON.stringify(error.message)))
  }

  // Create the patient using the persistence engine
  newPatient.save(function (error, patient) {

    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    // Send the patient if no issues
    res.send(201, patient)
  })
})

// Update a patient by their id
server.put('/patients/:id', function (req, res, next) {
  // Ge patient updated data and create a new patient object
  let updatedPatient = getPatientData(req)
  updatedPatient._id = req.params.id

  // Update the patient with the persistence engine
  Patient.update({_id:req.params.id}, updatedPatient, { multi: false }, function (error, patient) {

    // If there are any errors, pass them to next in the correct format
    if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))

    // Send a 200 OK response
    res.send(200)
  })
})

// Delete patient with the given id
server.del('/patients/:id', function (req, res, next) {
    // Find every clinical data record that belongs to this patient
    ClinicalData.find({PatientId: req.params.id}, function (error, records) {
       
        // First Delete every clinical data record 
        records.forEach(function(record, index){

            // Delete the record with the persistence engine
            ClinicalData.remove({_id: record._id}, function (error, deletedRecord) {
                // If there are any errors, pass them to next in the correct format
                if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
            })
            console.log("All Clinical data for patientId=" + record.PatientID + " DELETED")
        })

        // Now Delete the patient with the persistence engine
        Patient.remove({_id: req.params.id}, function (error, patient) {
          // If there are any errors, pass them to next in the correct format
          if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
      
          // Send a 200 OK response
          res.send()
        })
        
    })
})
//#endregion

//#region CLINICAL DATA API
// Get all clinical data for a specific patient in the system
server.get('/patients/:id/records', function (req, res, next) {
  
    // Find every clinical data record that belongs to the pateint within the given collection
    ClinicalData.find({PatientId: req.params.id}).exec( function (error, records) {
  
    // Return all of the clinical data records for the patient
    res.send(records)
    })
  })
  
  // Get a single clinical data record for a specific patient 
  server.get('/patients/:patientId/records/:id', function (req, res, next) {
  
    // Find a single clinical data record from the save, based on recordId and patientId
    ClinicalData.find({ _id: req.params.id, PatientId: req.params.patientId }).exec(function (error, record) {
  
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
  
      if (record) {
        // Send the record if no issues
        res.send(record)
      } else {
        // Send 404 header if the record doesn't exist
        res.send(404)
      }
    })
  })
  
  // Create a new clinical data record for a specific patient
  server.post('/patients/:patientId/records', function (req, res, next) {
    // Get new clinical data from the request object
    let newRecord = ''
    try {
        newRecord = getClinicalData(req)
    } catch (error) {
        return next(new restify.InvalidArgumentError(JSON.stringify(error.message)))
    }
  
    // Create the record using the persistence engine
    newRecord.save( function (error, record) {
  
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
  
      // Send the record if no issues
      res.send(201, record)
    })
  })
  
  // Update a specific patient's clinical data record by their id
  server.put('/patients/:patientId/records/:id', function (req, res, next) {
    // Ge patient updated data and create a new patient object
    let updatedRecord = getClinicalData(req)
    updatedRecord._id = req.params.id
    updatedRecord.PatientId = req.params.patientId
    
    // Update the record with the persistence engine
    ClinicalData.update({_id:req.params.id}, updatedRecord, { multi: false }, function (error, record) {
  
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
  
      // Send a 200 OK response
      res.send(200)
    })
  })
  
  // Delete a specific patient's clinical data record by using both patient id and record id
  server.del('/patients/:patientId/records/:id', function (req, res, next) {
  
    //TODO: Check delete logic. It seems we dont need the patientId
    // Delete the record with the persistence engine
    ClinicalData.remove({_id: req.params.id}, function (error, record) {
  
      // If there are any errors, pass them to next in the correct format
      if (error) return next(new restify.InvalidArgumentError(JSON.stringify(error.errors)))
  
      // Send a 200 OK response
      res.send()
    })
  })
//#endregion

//#region  PRIVATE METHODS
function getPatientData(req){
  // Make sure first name, last name, date of birth, insurance plan and blood type are defined
  if (req.params.FirstName === undefined) {
    throw new Error('FirstName must be supplied')
  }
  if (req.params.LastName === undefined) {
    throw new Error('LastName must be supplied')
  }
  if (req.params.DateOfBirth === undefined) {
    throw new Error('DateOfBirth must be supplied')
  }
  if (req.params.Gender === undefined) {
    throw new Error('Gender must be supplied')
  }
  if (req.params.Telephone === undefined) {
    throw new Error('Telephone must be supplied')
  }
  if (req.params.InsurancePlan === undefined) {
    throw new Error('InsurancePlan must be supplied')
  }
  if (req.params.BloodType === undefined) {
    throw new Error('BloodType must be supplied')
  }

   // All other pieces of information that are not mandatory and are not defined will be empty or false
  if (req.params.Address === undefined ) {
    req.params.Address = '';
  }
  if (req.params.IsInCritcalCondition === undefined || !req.params.IsInCritcalCondition || req.params.IsInCritcalCondition == "false" || req.params.IsInCritcalCondition == "no" || req.params.IsInCritcalCondition == false ) {
    req.params.IsInCritcalCondition = false;
  }
  else {
    req.params.IsInCritcalCondition = true;
  }

  let newPatient = new Patient({
		FirstName: req.params.FirstName, 
    LastName: req.params.LastName,
    Address: req.params.Address,
    DateOfBirth: req.params.DateOfBirth,
    Gender: req.params.Gender,
    Telephone: req.params.Telephone,
    InsurancePlan: req.params.InsurancePlan,
    BloodType: req.params.BloodType,
    EmergencyContact: req.params.EmergencyContact === undefined ? '' : getEmergencyContactData(req.params.EmergencyContact),
    IsInCritcalCondition: req.params.IsInCritcalCondition
  });

  return newPatient
}

function getEmergencyContactData(contactData){
  if (contactData.Name === undefined) {
      contactData.Name = ''
  }
  if (contactData.Address === undefined) {
    contactData.Address = ''
  }
  if (contactData.Relationship === undefined) {
    contactData.Relationship = ''
  }
  if (contactData.Telephone === undefined) {
    contactData.Telephone = ''
  }

  let newEmergencyContact = {
      Name: contactData.Name,
      Address: contactData.Address,
      Relationship: contactData.Relationship,
      Telephone: contactData.Telephone 
  }

  return newEmergencyContact;
}


function getClinicalData(req){
  // Make sure Practitioner, Medical Center DateTime, DataType and Reading are defined
  if (req.params.Practitioner === undefined) {
    throw new Error('Practitioner must be supplied')
  }
  if (req.params.MedicalCenter === undefined) {
    throw new Error('Medical Center must be supplied')
  }
  if (req.params.DateTime === undefined) {
    throw new Error('DateTime must be supplied')
  }
  if (req.params.DataType === undefined) {
    throw new Error('DataType must be supplied')
  }
  if (req.params.Reading === undefined) {
    throw new Error('Reading must be supplied')
  }
 
  let record = new ClinicalData({
		PatientId: req.params.patientId, 
    Practitioner: req.params.Practitioner,
    MedicalCenter: req.params.MedicalCenter,
    DateTime: req.params.DateTime,
    DataType: req.params.DataType,
    Reading: req.params.Reading
  });

  return record
}

//#endregion

//#region JSON EXAMPLES 
let patientDataExample = 
{
    "FirstName": "John",
    "LastName": "Doe",
    "Address": "345 Yonge Street",
    "DateOfBirth": "11-27-2017",
    "Gender": "female",
    "Telephone": "416-345-9033",
    "InsurancePlan": "BlueCross - 202",
        "EmergencyContact": {
        "Name": "Jane Doe",
        "Address": "",
        "Relationship": "wife",
        "Telephone": "416-222-7755" 
    },
    "BloodType": "A+",
    "IsInCritcalCondition": "No"    // or false
}

let clinicalDataExample =
{
    "PatientID": "567",
    "Practitioner": "Amanda Fox",
    "MedicalCenter": "Maple Walk in Clinic",
    "DateTime": "10/10/2017 10:35 am",
    "DataType": "Temperature",
    "Reading": "37.2"
}
  
//#endregion