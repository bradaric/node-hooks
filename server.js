var MailChimpWebhook = require('mailchimp').MailChimpWebhook;
var CapsuleCRM = require('capsule-crm');

var config = require('./config');

var webhook = new MailChimpWebhook(config.webhook);
var capsule = CapsuleCRM.createConnection(config.capsule.account, config.capsule.token);


webhook.on('error', function (error) {
    console.log(error.message);
    console.log('error', error);

    capsule.request({ path: '/party', search: 'email=ab@undercurrentnews.com' }, function(err, data) {
        console.log('capsule err', err);
        console.log('capsule data', data);
    });
});

webhook.on('subscribe', function (data, meta) {
    console.log(data.email + ' subscribed to your newsletter!');
    console.log('data', data);
    console.log('GROUPINGS', data.merges.GROUPINGS);
    console.log('meta', meta);
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
