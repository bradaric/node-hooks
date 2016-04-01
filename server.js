var MailChimpWebhook = require('mailchimp').MailChimpWebhook;
var CapsuleCRM = require('capsule-crm');

var config = require('./config');

var webhook = new MailChimpWebhook(config.webhook);
var capsule = CapsuleCRM.createConnection(config.capsule.account, config.capsule.token);


webhook.on('error', function (error) {
    console.log(error.message);
    console.log('error', error);
});

webhook.on('subscribe', function (data, meta) {
    var user_email = data.email;
    console.log(user_email + ' subscribed to your newsletter!');
    console.log('data', data);
    console.log('GROUPINGS', data.merges.GROUPINGS);
    console.log('meta', meta);

    capsule.personByEmail(user_email, function(err, data) {
        console.log('personByEmail err', err);
        console.log('personByEmail data', data);
        if (typeof data.parties.person !== 'undefined' && data.parties.person.id) {
            var person_id = data.parties.person.id;
            var note = { historyItem: { note: user_email + ' subscribed to your newsletter!' } };
            capsule.addHistoryFor('party', person_id, note, function(err, data) {
                console.log('addHistoryFor err', err);
                console.log('addHistoryFor data', data);
            });
        }
    });

});
webhook.on('unsubscribe', function (data, meta) {
    console.log(data.email + ' unsubscribed from your newsletter!');
    console.log('data', data);
    console.log('GROUPINGS', data.merges.GROUPINGS);
    console.log('meta', meta);
});

webhook.on('profile', function (data, meta) {
    console.log(data.email + ' updated his profile!');
    console.log('data', data);
    console.log('GROUPINGS', data.merges.GROUPINGS);
    console.log('meta', meta);
});
webhook.on('upemail', function (data, meta) {
    console.log(data.email + ' updated his email address!');
    console.log('data', data);
    console.log('meta', meta);
});
webhook.on('cleaned', function (data, meta) {
    console.log(data.email + ' has been cleaned from your newsletter!');
    console.log('data', data);
    console.log('GROUPINGS', data.merges.GROUPINGS);
    console.log('meta', meta);
});

webhook.on('campaign', function (data, meta) {
    console.log('status of campaign "' + data.subject + '" has been changed!');
    console.log('data', data);
    console.log('meta', meta);
});
