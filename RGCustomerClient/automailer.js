var nodemailer = require('nodemailer'); 
var http = require('http');
// var SMTPConnection = require('smtp-connection'); 

function send_email() {   

// var connection = new SMTPConnection(); // can include options 
// https://github.com/nodemailer/smtp-connection this has info 
// Actually this probably isn't a good idea. 
// connection.connect(function() {} ); // obsoleted 

var name = 'Name goes here'; 
var invName = 'Name of inviter goes here'; 
var project = 'Project string goes here';  
var securityString = 'AxFvsE42Fr6gfFG5herf34#$gergg34rFDSFFB'; 
var mailTo = 'christopher.falk@gmail.com' // Using my own email to test 
// Ideas: there are 26 capital letters, 26 lowercase letters, 10 digits. 
// So its (62)^(number of characters in string) possibilites. 
var url = 'http://www.Rapid-Genomics.com/somepath/' + securityString; 

// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport('smtps://RapidGenomMailer@gmail.com:cook123ies@smtp.gmail.com');
// var transporter = nodemailer.createTransport(options[defaults]); 
// This is a "connection url" to gmail's smtp server (Send mail transfer protocol)
// Syntax:   'smtps://<Username@gmail.com>:password@smtp.gmail.com' 

var body = 	name + ',\n\nYou have been invited to a RAPiD Genomics project by ' 
			+ invName + '.\n Project details: ' + project + '.\n\nPlease click here ' +
			'to accept the invitation and register your user profile.\n\n' + url +
			'\n\n- The RAPiD Genomics Team'; 

var mailOptions = {
    from: 'Mailer <@rapidgenommailer@gmail.com>', // sender address
    to: mailTo, // list of receivers
    subject: 'You have been invited to a RAPiD Genomics Project', // Subject line
    html: body // html body
	// This is just a big string that is parsed as an html. 
	// We can use variables from above, which can be set from a webpage and such. 
};  

transporter.sendMail(mailOptions, function(error, info){
	if(error) {
		return console.log(error); 

		}}); 

}; 


send_email(); 
