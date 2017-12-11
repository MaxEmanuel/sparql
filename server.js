/**
 * Backend for the SPARQL web interface.
 */
var express = require('express'),
    util  = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs'),
    expressValidator = require('express-validator'),
    bodyParser = require('body-parser');

// read configuration file
var config = JSON.parse(fs.readFileSync('config.json','utf8')); 

var app = express();

// serve static content from the 'static' directory
app.use(express.static('public'));

// use body parser to get access to form data
app.use(bodyParser.urlencoded({ extended: true }));
// use the input validator
app.use(expressValidator());
app.use("/bower", express.static('bower_components'));

// add a 'endsWith' function to String
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// used to create temporary files
var counter = 0;
// SPARQL REST service
app.post('/datalog', function (req, res) {
  // log all queries
  counter++;
  // write the query to a temporary file
  var queryFile = config.tempDirectory + '/query-' + counter + '.sparql';
  fs.writeFile(queryFile, req.body.query, function(err) {
    if(err) {
      console.log(err);
    }
    // write the ruleset to a temporary file
    var tempFile = config.tempDirectory + '/ruleset-' + counter + '.n3';
    fs.writeFile(tempFile, req.body.ruleset, function(err) {
      if(err) {
        console.log(err);
      }
      // validate user input
      req.assert('ruleset', 'required').notEmpty();
      req.assert('ruleset', 'max. 4096 characters allowed').len(0, 4096);
      req.assert('query', 'required').notEmpty();
      req.assert('query', 'max. 1024 characters allowed').len(0, 1024);
      var validationErrors = req.validationErrors();
      if (validationErrors) {
        res.json({ 
          'answer': answer,
          'error': 'There have been validation errors: ' + util.inspect(validationErrors) });
        return;
      }
      // create database from input
      const rdf3xload = spawn('/opt/rdf3x/bin/rdf3xload', [config.tempDirectory + '/uni-tmp' + counter + '.db',tempFile],{cwd:config.tempDirectory});
      var rdfProcessIsRunning = true;
      var computationTimeExceeded = false;
      var answer = '';
      // terminates the process if the computation takes too much time
      setTimeout(function() {
        if (rdfProcessIsRunning) {
          computationTimeExceeded = true;
          console.log("Terminating RDF due to timeout.");
          rdf3xload.kill('SIGKILL');
        try {
          fs.unlinkSync(tempFile);
        } catch (err) {}
        }
      }, config.rdfTimeLimitMillis);
      rdf3xload.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      rdf3xload.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
        answer = answer + data;
      });
      rdf3xload.on('close', (code) => {
        console.log(`rdf3xload process exited with code ${code}`);
        // start querying on database
        const rdf3xquery = spawn('/opt/rdf3x/bin/rdf3xquery', [config.tempDirectory + '/uni-tmp' + counter + '.db',queryFile],{cwd:config.tempDirectory});
        setTimeout(function() {
          if (rdfProcessIsRunning) {
            computationTimeExceeded = true;
            console.log("Terminating RDF due to timeout.");
            rdf3xquery.kill('SIGKILL');
          try {
            fs.unlinkSync(tempFile);
          } catch (err) {}
          }
        }, config.rdfTimeLimitMillis);
        // wanted output
        rdf3xquery.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
          answer = answer + data;
        });
        rdf3xquery.stderr.on('data', (data) => {
          console.log(`stderr: ${data}`);
        });
        rdf3xquery.on('close', (code) => {
          console.log(`rdf3xquery process exited with code ${code}`);
        });
        rdf3xquery.on('exit', function (code) {
          console.log('exit');
          rdfProcessIsRunning = false;
          try {
          	fs.unlinkSync(tempFile);
          } catch (err) {}
          if (computationTimeExceeded) {
          	answer = answer + "---  Sorry, computation time exceeded...  ----"
          }
          answer=answer.replace(/^[^]*\{/,'{');
          answer=answer.replace(/}[^]*$/,'}');
          res.json({ 
            'answer': answer
          });
        });
      });
    });
  });
});

// Examples REST service. Delivers the examples to the client.
app.get('/examples', function (req, res) {
  // reads the contents of the examples directory
  // and sends a list to the client.

  // the examples are delivered as static content
  var exampleDescriptors = [];
  var exampleFiles = fs.readdirSync(config.examplesDirectory);
  exampleFiles.forEach(function(file) {
    if (file.endsWith(".json")) {
	  	var fileContents = fs.readFileSync(config.examplesDirectory + '/' + file,'utf8'); 
			var example = JSON.parse(fileContents);
			exampleDescriptors.push({
				"name": example.name,
				"description": example.description,
				"source": example.source,
				"url": "/examples" + "/" + file,
			});
		}
  });
	res.json(exampleDescriptors);
});

app.listen(config.port);
