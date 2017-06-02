'use strict';

var express = require('express');
var wrap = require('co-express');
var braintree = require('braintree');
var router = express.Router(); // eslint-disable-line new-cap
var gateway = require('../lib/gateway');
var Oauth = require('../models/oauth');


var TRANSACTION_SUCCESS_STATUSES = [
  braintree.Transaction.Status.Authorizing,
  braintree.Transaction.Status.Authorized,
  braintree.Transaction.Status.Settled,
  braintree.Transaction.Status.Settling,
  braintree.Transaction.Status.SettlementConfirmed,
  braintree.Transaction.Status.SettlementPending,
  braintree.Transaction.Status.SubmittedForSettlement
];

function formatErrors(errors) {
  var formattedErrors = '';

  for (var i in errors) { // eslint-disable-line no-inner-declarations, vars-on-top
    if (errors.hasOwnProperty(i)) {
      formattedErrors += 'Error: ' + errors[i].code + ': ' + errors[i].message + '\n';
    }
  }
  return formattedErrors;
}

function createResultObject(transaction) {
  var result;
  var status = transaction.status;

  if (TRANSACTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
    result = {
      header: 'Sweet Success!',
      icon: 'success',
      message: 'Your test transaction has been successfully processed. See the Braintree API response and try again.'
    };
  } else {
    result = {
      header: 'Transaction Failed',
      icon: 'fail',
      message: 'Your test transaction has a status of ' + status + '. See the Braintree API response and try again.'
    };
  }

  return result;
}

router.get('/', function (req, res) {
  res.redirect('/checkouts/new');
});

router.get('/oauth', function (req, res) {

  var gateway = braintree.connect({
    clientId: process.env.BT_CLIENT_ID,
    clientSecret: process.env.BT_CLIENT_SECRET
  });

  var url = gateway.oauth.connectUrl({
    redirectUri: "https://iqxbraintree.localtunnel.me/oauth/callback",
    scope: ["read_write", "grant_payment_method"],
    state: "foo_state",
    landingPage: "signup",
    paymentMethods: ["credit_card", "paypal"]
  });

  res.redirect(url);
});

router.get('/oauth/callback', function (req, res) {

  var gateway = braintree.connect({
    clientId: process.env.BT_CLIENT_ID,
    clientSecret: process.env.BT_CLIENT_SECRET
  });

  gateway.oauth.createTokenFromCode({
    code: req.query.code
  }, function (err, response) {

    var accessToken = response.credentials.accessToken;
    var expiresAt = response.credentials.expiresAt;
    var refreshToken = response.credentials.refreshToken;

    Oauth.save({
      accessToken :accessToken,
      expiresAt :expiresAt,
      refreshToken :refreshToken,
    }, function(){

      res.redirect('/checkouts/new');
    });
  });

});

router.get('/checkouts/new', function (req, res) {
  gateway.clientToken.generate({}, function (err, response) {
    res.render('checkouts/new', {clientToken: response.clientToken, messages: req.flash('error')});
  });
});

router.get('/checkouts/:id', function (req, res) {
  var result;
  var transactionId = req.params.id;

  gateway.transaction.find(transactionId, function (err, transaction) {
    result = createResultObject(transaction);
    res.render('checkouts/show', {transaction: transaction, result: result});
  });
});

router.post('/checkouts', function (req, res) {
  var transactionErrors;
  var amount = req.body.amount; // In production you should not take amounts directly from clients
  var nonce = req.body.payment_method_nonce;

  // Oauth.findFirst({}, function(err, result) {
  //
  // })

  // gateway.customer.create({
  //   // paymentMethodNonce: nonce,
  //   firstName: "Jen",
  //   lastName: "Smith",
  //   company: "Braintree",
  //   email: "jen@example.com",
  //   phone: "312.555.1234",
  //   fax: "614.555.5678",
  //   website: "www.example.com",
  //   creditCard: {
  //
  //     cardholderName : "Jen Smith",
  //     cvv: "3000",
  //     expirationDate : "12/22",
  //     number: "378282246310005",
  //     billingAddress: {
  //       firstName: "Jen",
  //       lastName: "Smith",
  //       company: "Braintree",
  //       streetAddress: "123 Address",
  //       locality: "City",
  //       region: "State",
  //       postalCode: "12345"
  //     }
  //   }
  // }, function (err, result) {
  //
  //   console.log(result, "result");
  //   console.log(err, "err");
  //   Oauth.save(result, function(){
  //
  //     res.redirect('/checkouts/new');
  //   });
  // });

  var gateway = braintree.connect({
    accessToken: "access_token$sandbox$cygxgg9pztnsx8gk$27ada21d8d19bd76801f519cd240432b"
  });

  gateway.paymentMethod.grant(
    "77x6q8",
    { allow_vaulting: true, include_billing_postal_code: true },
    function (err, result) {
      Oauth.save(result, function(){

        res.redirect('/checkouts/new');
      });
      console.log(result, "result");
      console.log(err, "err");
    }
  );

  // gateway.transaction.sale({
  //   amount: amount,
  //   paymentMethodNonce: nonce,
  //   options: {
  //     submitForSettlement: true
  //   }
  // }, function (err, result) {
  //   if (result.success || result.transaction) {
  //     res.redirect('checkouts/' + result.transaction.id);
  //   } else {
  //     transactionErrors = result.errors.deepErrors();
  //     req.flash('error', {msg: formatErrors(transactionErrors)});
  //     res.redirect('checkouts/new');
  //   }
  // });
});

module.exports = router;
