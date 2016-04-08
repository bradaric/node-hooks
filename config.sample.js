var config = {};

config.webhook = {};
config.mailchimp = {};
config.capsule = {};

// port   - The port the server is going to listen on. Defaults to 8100.
// secret - Secret key as suggested on the Webhook page which is then simply added as a pathname to the Webhook URL in your MailChimp account and checked for. Nothing too fancy but a small enhancement to security. Leave empty (default setting) if you don't want to use a secret key. Example: If you set the secret to 'ChimpSecret' you need to enter the Webhook URL http://www.yourdomain.com/ChimpSecret in the MailChimp Webhook settings.
// secure - Credentials as generated by the crypto module. If present HTTPS support is enabled for the server. Defaults to false.
config.webhook.port = 8100;
config.webhook.secret = '';
config.webhook.secure = false;

// lists - MailChimp list id with corresponding list name and the tag to be used in other services (see Capsule below)
config.mailchimp.lists = {
    'a0b1c2d3e4': {
        name: 'Mailchimp List Name',
        tag: 'Capsule Data Tag'
    }
};

// account  - Subdomain for your Capsule account (e.g. example from https://example.capsulecrm.com)
// token    - Your API Authentication token from My Preferences page
// datatags - One datatag for each MailChimp list above - it should match the tag value (e.g. 'Sapsule Data Tag'). Array values should match list segments from MailChimp. Always include 'unsubscribed' & 'cleaned' at the bottom
config.capsule.account = '';
config.capsule.token = '';
config.capsule.datatags = {
    'Capsule Data Tag': [
        'List Segment 1',
        'List Segment 2',
        'unsubscribed',
        'cleaned'
    ]
};

module.exports = config;
