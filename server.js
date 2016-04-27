var MailChimpWebhook = require('mailchimp').MailChimpWebhook;
var CapsuleCRM = require('capsule-crm');
var Config = require('config');

var config_webhook = Config.get('webhook');
var config_mailchimp = Config.get('mailchimp');
var config_capsule = Config.get('capsule');

var webhook = new MailChimpWebhook(config_webhook);
var capsule = CapsuleCRM.createConnection(config_capsule.account, config_capsule.token);

// console.log('UCN Hooks server listening on port ' + config_webhook.port + '...');


var _syncPartyDataTags = function(type, party_data, webhook_data) {
    console.log('type', type);
    console.log('party_data', party_data);
    console.log('webhook_data', webhook_data);

    if (typeof party_data.parties.person !== 'undefined' && party_data.parties.person.id) {
        var person_id = party_data.parties.person.id;
        var mailing_list = config_mailchimp.lists[webhook_data.list_id];

        var skip_note = false;
        if (typeof webhook_data.skip_note !== 'undefined' && webhook_data.skip_note === 'true') {
            skip_note = true;
        }
        else {
            console.log('mailing_list.skip_note', mailing_list.skip_note);
            console.log('mailing_list.skip_note.indexOf(' + type + ')', mailing_list.skip_note.indexOf(type));
            if (typeof mailing_list.skip_note !== 'undefined' && mailing_list.skip_note.indexOf(type) >= 0) {
                skip_note = true;
            }
        }
        console.log('skip_note', skip_note);

        var note_action = '';
        var segments = [];
        switch (type) {
            case 'subscribe':
                note_action = 'subscribed to';
                segments = _extractSegments(webhook_data);
                break;
            case 'profile':
                note_action = 'updated their preferences for';
                segments = _extractSegments(webhook_data);
                break;
            case 'unsubscribe':
                note_action = 'unsubscribed from';
                segments = [ 'unsubscribed' ];
                break;
            case 'cleaned':
                if (webhook_data.reason == 'hard' && !skip_note) {
                    var hard_note = { historyItem: { note: 'Cannot deliver to email address ' + webhook_data.email + ' for mailing list ' + mailing_list.name + '' } };
                    capsule.addHistoryFor('party', person_id, hard_note, function(err, history_data, res) {
                        console.log('addHistoryFor err', err);
                        console.log('addHistoryFor data', history_data);
                        console.log('addHistoryFor x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
                        console.log('addHistoryFor x-ratelimit-reset', res.headers['x-ratelimit-reset']);
                    });
                }
                note_action = 'been cleaned from';
                segments = [ 'cleaned' ];
                break;
            default:
                break;
        }

        if (note_action && !skip_note) {
            var note = { historyItem: { note: 'Contact has ' + note_action + ' mailing list ' + mailing_list.name + '' } };
            capsule.addHistoryFor('party', person_id, note, function(err, history_data, res) {
                console.log('addHistoryFor err', err);
                console.log('addHistoryFor data', history_data);
                console.log('addHistoryFor x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
                console.log('addHistoryFor x-ratelimit-reset', res.headers['x-ratelimit-reset']);
            });
        }

        var tag_name = mailing_list.tag;
        if (tag_name && config_capsule.datatags[tag_name]) {
            var tags = { customFields: { customField: _segmentsToFields(segments, tag_name) } };
            console.log('tags', tags);
            capsule.setCustomFieldFor('party', person_id, tags, function(err, custom_field_data, res) {
                console.log('setCustomFieldFor err', err);
                console.log('setCustomFieldFor data', custom_field_data);
                console.log('setCustomFieldFor x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
                console.log('setCustomFieldFor x-ratelimit-reset', res.headers['x-ratelimit-reset']);
                capsule.setPartyTag(person_id, tag_name, function(err, party_tag_data, res) {
                    console.log('setPartyTag err', err);
                    console.log('setPartyTag data', party_tag_data);
                    console.log('setPartyTag x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
                    console.log('setPartyTag x-ratelimit-reset', res.headers['x-ratelimit-reset']);
                });
            });
        }
    }
};

var _extractSegments = function(data) {
    var segments = [];
    if (typeof data.merges !== 'undefined' && data.merges.GROUPINGS) {
        console.log('GROUPINGS', data.merges.GROUPINGS);
        data.merges.GROUPINGS.forEach(function(grouping) {
            console.log('grouping', grouping);
            if (grouping.groups) {
                var groups = grouping.groups.split(',');
                groups.forEach(function(group) {
                    segments.push(group.trim());
                });
            }
        });
    }
    console.log('segments', segments);
    return segments;
};

var _segmentsToFields = function(segments, tag_name) {
    var fields = [];
    config_capsule.datatags[tag_name].forEach(function(tag_label) {
        var field = {
            tag: tag_name,
            label: tag_label
        };

        if (tag_label == 'unsubscribed' && segments.length === 0) {
            field.boolean = true;
        }
        else {
            if (segments.indexOf(tag_label) >= 0) {
                field.boolean = true;
            }
        }
        fields.push(field);
    });
    console.log('fields', fields);
    return fields;
};

var _addPartyEmailAddress = function(party_data, webhook_data) {
    console.log('party_data', party_data);
    console.log('webhook_data', webhook_data);

    if (typeof party_data.parties.person !== 'undefined' && party_data.parties.person.id) {
        var person_id = party_data.parties.person.id;
        var mailing_list = config_mailchimp.lists[webhook_data.list_id];

        var skip_note = false;
        if (typeof webhook_data.skip_note !== 'undefined' && webhook_data.skip_note === 'true') {
            skip_note = true;
        }
        else {
            if (typeof mailing_list.skip_note !== 'undefined' && typeof mailing_list.skip_note.indexOf(type) >= 0) {
                skip_note = true;
            }
        }

        if (!skip_note) {
            var note = { historyItem: { note: 'Email address updated by mailchimp from ' + webhook_data.old_email + ' to ' + webhook_data.new_email + ' on mailing list ' + mailing_list.name + '' } };
            capsule.addHistoryFor('party', person_id, note, function(err, history_data, res) {
                console.log('addHistoryFor err', err);
                console.log('addHistoryFor data', history_data);
                console.log('addHistoryFor x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
                console.log('addHistoryFor x-ratelimit-reset', res.headers['x-ratelimit-reset']);
            });
        }

        capsule.addEmailFor('person', person_id, webhook_data.new_email, function(err, email_data, res) {
            console.log('addEmailFor err', err);
            console.log('addEmailFor data', email_data);
            console.log('addEmailFor x-ratelimit-remaining', res.headers['x-ratelimit-remaining']);
            console.log('addEmailFor x-ratelimit-reset', res.headers['x-ratelimit-reset']);
        });
    }
};



webhook.on('error', function (error) {
    console.log('error', error);
});

webhook.on('subscribe', function (webhook_data, webhook_meta) {
    console.log(webhook_data.email + ' subscribed to your newsletter!');
    capsule.personByEmail(webhook_data.email, function(err, party_data) {
        console.log('personByEmail err', err);
        if (!err) {
            _syncPartyDataTags(webhook_meta.type, party_data, webhook_data);
        }
    });
});
webhook.on('unsubscribe', function (webhook_data, webhook_meta) {
    console.log(webhook_data.email + ' unsubscribed from your newsletter!');
    capsule.personByEmail(webhook_data.email, function(err, party_data) {
        console.log('personByEmail err', err);
        if (!err) {
            _syncPartyDataTags(webhook_meta.type, party_data, webhook_data);
        }
    });
});

webhook.on('profile', function (webhook_data, webhook_meta) {
    console.log(webhook_data.email + ' updated his profile!');
    capsule.personByEmail(webhook_data.email, function(err, party_data) {
        console.log('personByEmail err', err);
        if (!err) {
            _syncPartyDataTags(webhook_meta.type, party_data, webhook_data);
        }
    });
});
webhook.on('upemail', function (webhook_data, webhook_meta) {
    console.log('[ upemail ] ' + webhook_data.old_email + ' updated his email address to ' + webhook_data.new_email + '!');
    console.log('[ upemail ] webhook_data', webhook_data);
    console.log('[ upemail ] webhook_meta', webhook_meta);
    capsule.personByEmail(webhook_data.old_email, function(err, party_data) {
        if (!err) {
            _addPartyEmailAddress(party_data, webhook_data);
        }
    });
});

webhook.on('cleaned', function (webhook_data, webhook_meta) {
    console.log(webhook_data.email + ' has been cleaned from your newsletter!');
    capsule.personByEmail(webhook_data.email, function(err, party_data) {
        console.log('personByEmail err', err);
        if (!err) {
            _syncPartyDataTags(webhook_meta.type, party_data, webhook_data);
        }
    });
});

webhook.on('campaign', function (webhook_data, webhook_meta) {
    console.log('status of campaign \'' + data.subject + '\' has been changed!');
    console.log('webhook_data', webhook_data);
    console.log('webhook_meta', webhook_meta);
});
