(function() {
    'use strict';

    var MailChimpWebhook = require('mailchimp').MailChimpWebhook;
    var CapsuleCRM = require('capsule-crm');

    var config = require('./config');

    var webhook = new MailChimpWebhook(config.webhook);
    var capsule = CapsuleCRM.createConnection(config.capsule.account, config.capsule.token);

    console.log('UCN Hooks server listening on port ' + config.webhook.port + '...');


    var _syncPartyDataTags = function(type, party_data, webhook_data) {
        console.log('type', type);
        console.log('party_data', party_data);
        console.log('webhook_data', webhook_data);
        console.log('GROUPINGS', webhook_data.merges.GROUPINGS);

        if (typeof party_data.parties.person !== 'undefined' && party_data.parties.person.id) {
            var person_id = party_data.parties.person.id;
            var mailing_list = config.mailchimp.lists[webhook_data.list_id];

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
                    note_action = 'been cleaned from';
                    segments = [ 'cleaned' ];
                    break;
                default:
                    break;
            }

            if (note_action) {
                var note = { historyItem: { note: 'Contact has ' + note_action + ' mailing list "' + mailing_list.name + '"' } };
                capsule.addHistoryFor('party', person_id, note, function(err, history_data) {
                    console.log('addHistoryFor err', err);
                    console.log('addHistoryFor data', history_data);
                });
            }

            var tag_name = mailing_list.tag;
            if (tag_name && config.capsule.datatags[tag_name]) {
                var tags = { customFields: { customField: _segmentsToFields(segments, tag_name) } };
                console.log('tags', tags);
                capsule.setCustomFieldFor('party', person_id, tags, function(err, custom_field_data) {
                    console.log('setCustomFieldFor err', err);
                    console.log('setCustomFieldFor data', custom_field_data);
                    capsule.setPartyTag(person_id, tag_name, function(err, party_tag_data) {
                        console.log('setPartyTag err', err);
                        console.log('setPartyTag data', party_tag_data);
                    });
                });
            }
        }
    };

    var _extractSegments = function(data) {
        var segments = [];
        if (typeof data.merges !== 'undefined' && data.merges.GROUPINGS) {
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
        config.capsule.datatags[tag_name].forEach(function(tag_label) {
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
            console.log('[ upemail ] personByEmail err', err);
            if (!err) {
                console.log('[ upemail ] personByEmail party_data', err);
                if (typeof party_data.parties.person !== 'undefined' && party_data.parties.person.id) {
                    var person_id = party_data.parties.person.id;
                    console.log('[ upemail ] person_id', person_id);
                    var mailing_list = config.mailchimp.lists[webhook_data.list_id];
                    console.log('[ upemail ] mailing_list', mailing_list);
                    var update = {
                        person: {
                            email: {
                                emailAddress: webhook_data.new_email
                            }
                        }
                    };
                    console.log('[ upemail ] update', update);

                    self.request({
                        path: '/person/' + person_id,
                        method: 'POST',
                        data: update
                    }, function(cb) {
                        console.log('[ upemail ] cb', cb);
                    });
                }
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
})();
