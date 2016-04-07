(function() {
    'use strict';

    var MailChimpWebhook = require('mailchimp').MailChimpWebhook;
    var CapsuleCRM = require('capsule-crm');

    var config = require('./config');

    var webhook = new MailChimpWebhook(config.webhook);
    var capsule = CapsuleCRM.createConnection(config.capsule.account, config.capsule.token);

    console.log('UCN Hooks server listening on port ' + config.webhook.port + '...');


    var _extractSegments = function(data) {
        var segments = [];
        data.merges.GROUPINGS.forEach(function(grouping) {
            console.log('grouping', grouping);
            if (grouping.groups) {
                var groups = grouping.groups.split(',');
                groups.forEach(function(group) {
                    segments.push(group.trim());
                });
            }
        });
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
            if (segments.indexOf(tag_label) >= 0) {
                field.boolean = true;
            }
            fields.push(field);
        });
        console.log('fields', fields);
        return fields;
    };

    webhook.on('error', function (error) {
        console.log('error', error);
    });

    webhook.on('subscribe', function (data, meta) {
        console.log(data.email + ' subscribed to your newsletter!');
        console.log('data', data);
        console.log('GROUPINGS', data.merges.GROUPINGS);
        console.log('meta', meta);

        capsule.personByEmail(data.email, function(err, data) {
            console.log('personByEmail err', err);
            console.log('personByEmail data', data);
            if (typeof data.parties.person !== 'undefined' && data.parties.person.id) {
                var person_id = data.parties.person.id;
                var mailing_list = config.mailchimp.lists[data.list_id];

                var note = { historyItem: { note: 'Contact has subscribed to mailing list ' + mailing_list.name } };
                capsule.addHistoryFor('party', person_id, note, function(err, data) {
                    console.log('addHistoryFor err', err);
                    console.log('addHistoryFor data', data);
                });

                var tag_name = mailing_list.tag;
                if (tag_name && config.capsule.datatags[tag_name]) {
                    var tags = { customFields: { customField: _segmentsToFields(_extractSegments(data), tag_name) } };
                    console.log('tags', tags);
                    capsule.setCustomFieldFor('party', person_id, tags, function(err, data) {
                        console.log('setCustomFieldFor err', err);
                        console.log('setCustomFieldFor data', data);
                        capsule.setPartyTag(person_id, tag_name, function(err, data) {
                            console.log('setPartyTag err', err);
                            console.log('setPartyTag data', data);
                        });
                    });
                }
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
        console.log('status of campaign \'' + data.subject + '\' has been changed!');
        console.log('data', data);
        console.log('meta', meta);
    });
})();
