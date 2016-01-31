/* global Promise:true require describe before after it */
var Promise = require('bluebird');
var U = require('lodash');
var expect = require('expect.js');
var sinon = require('sinon');
var BLOXX = require('../lib/bloxx');
var characterFixture = require('./fixtures/character-1009151');

describe('Model#save()', function () {
	'use strict';

	var Registry = BLOXX.Registry.create();

	// Register our custom Model mixin used for peristance.
	Registry.useMixin({
		createRecord: function () {
			return Promise.resolve(1);
		},
		updateRecord: function () {
			return Promise.resolve(1);
		}
	});

	var Character = Registry.createModel({
		type: 'Character',

		defaults: {
			name: null,
			description: null,
			modified: null,
			thumbnail: null,
			resourceURI: null,
			urls: []
		},

		relationshipDefinitions: 'belongsToComic'
	});

	var Comic = Registry.createModel({
		type: 'Comic',
		defaults: {
			title: null,
			pageCount: null
		},
		relationshipDefinitions: 'hasCharacter'
	});

	describe('on new instance', function () {
		var fixture = U.cloneDeep(characterFixture);
		delete fixture.id;

		describe('with relationship updates', function () {
			var returnValue;
			var character = Character.create(fixture);
			sinon.spy(character, 'createRecord');

			var comic = Comic.create({
				id: 'foobar',
				title: 'Another Relation'
			});

			before(function (done) {
				character
					.connectTo(comic)
					.save()
					.then(function (rv) {
						returnValue = rv;
						done();
					}, done);
			});

			after(function () {
				character.createRecord.restore();
			});

			it('calls createRecord() with all attributes', function () {
				var attrs = character.createRecord.getCall(0).args[0];
				expect(attrs.id).to.match(/^bloxx_[\d]+$/);
				expect(attrs.type).to.be('Character');
				expect(attrs.name).to.be('Amiko');
			});

			it('calls createRecord() with relationship updates', function () {
				var opts = character.createRecord.getCall(0).args[1];
				expect(opts.relationshipUpdates.length).to.be(2);
				var update1 = opts.relationshipUpdates[0];
				expect(update1.action).to.be('create');
				expect(update1.direction).to.be('belongsTo');
				expect(update1.item.type).to.be('Comic');
				expect(update1.item.id).to.be('foobar');
				var update2 = opts.relationshipUpdates[1];
				expect(update2.action).to.be('create');
				expect(update2.direction).to.be('belongsTo');
				expect(update2.item.type).to.be('Comic');
				expect(update2.item.id).to.be('13722');
			});

			it('returns a new instance of the model', function () {
				expect(returnValue).not.to.be(character);
				expect(returnValue).to.be.a(Character);
				expect(character.isNew()).to.be(true);
				expect(returnValue.isNew()).to.be(false);
				expect(returnValue.id).not.to.be(character.id);
				expect(returnValue.name).to.be(character.name);
			});

			it('returns a new instance with relationships', function () {
				var relationships = returnValue.relationships;
				expect(relationships.belongsTo.Comic.length).to.be(2);
				var comic = relationships.belongsTo.Comic[0];
				expect(comic).to.be.a(Comic);
			});

			it('has no pending relationships left', function () {
				expect(returnValue._relationshipUpdates.length).to.be(0);
			});
		});

		describe('without relationship updates', function () {
			var returnValue;
			var attrs = U.cloneDeep(fixture);
			delete attrs.relationships;
			var character = Character.create(attrs);
			sinon.spy(character, 'createRecord');

			before(function (done) {
				character.save().then(function (rv) {
					returnValue = rv;
					done();
				}, done);
			});

			after(function () {
				character.createRecord.restore();
			});

			it('calls createRecord() once', function () {
				expect(character.createRecord.callCount).to.be(1);
			});

			it('calls createRecord() with all attributes', function () {
				var attrs = character.createRecord.getCall(0).args[0];
				expect(attrs.id).to.match(/^bloxx_[\d]+$/);
				expect(attrs.type).to.be('Character');
				expect(attrs.name).to.be('Amiko');
			});

			it('has empty relationships', function () {
				var attrs = character.createRecord.getCall(0).args[0];
				expect(Object.keys(attrs.relationships.has).length).to.be(0);
				expect(Object.keys(attrs.relationships.belongsTo).length).to.be(0);
			});

			it('calls createRecord() without relationship updates', function () {
				var opts = character.createRecord.getCall(0).args[1];
				expect(opts.relationshipUpdates).to.be(null);
			});

			it('returns a new instance of the model', function () {
				expect(returnValue).not.to.be(character);
				expect(returnValue).to.be.a(Character);
				expect(character.isNew()).to.be(true);
				expect(returnValue.isNew()).to.be(false);
				expect(returnValue.id).not.to.be(character.id);
				expect(returnValue.name).to.be(character.name);
			});

			it('has no pending relationships left', function () {
				expect(returnValue._relationshipUpdates.length).to.be(0);
			});
		});
	});

	describe('on existing instance', function () {
		var fixture = U.cloneDeep(characterFixture);

		describe('with relationship updates', function () {
			var returnValue;

			var character = Character.create(fixture);
			sinon.spy(character, 'updateRecord');

			var comic = Comic.create({
				id: 'foobar',
				title: 'Another Relation'
			});

			before(function (done) {
				character
					.connectTo(comic)
					.save()
					.then(function (rv) {
						returnValue = rv;
						done();
					}, done);
			});

			after(function () {
				character.updateRecord.restore();
			});

			it('calls updateRecord() once', function () {
				expect(character.updateRecord.callCount).to.be(1);
			});

			it('calls updateRecord() with all attributes', function () {
				var attrs = character.updateRecord.getCall(0).args[0];
				expect(attrs.id).to.be('1009151');
				expect(attrs.type).to.be('Character');
				expect(attrs.name).to.be('Amiko');
			});

			it('calls updateRecord() with relationship updates', function () {
				var opts = character.updateRecord.getCall(0).args[1];
				expect(opts.relationshipUpdates.length).to.be(1);
				var update = opts.relationshipUpdates[0];
				expect(update.action).to.be('create');
				expect(update.direction).to.be('belongsTo');
				expect(update.item.type).to.be('Comic');
				expect(update.item.id).to.be('foobar');
			});

			it('returns a new instance of the model', function () {
				expect(returnValue).not.to.be(character);
				expect(returnValue).to.be.a(Character);
				expect(returnValue.isNew()).to.be(false);
				expect(returnValue.id).to.be(character.id);
			});

			it('returns a new instance with relationships', function () {
				var comics = returnValue.relationships.belongsTo.Comic;
				var comic = U.find(comics, {id: 'foobar'});
				expect(comic).to.be.a(Comic);
				expect(comic.title).to.be('Another Relation');
			});

			it('has no pending relationships left', function () {
				expect(returnValue._relationshipUpdates.length).to.be(0);
			});
		});

		describe('without relationship updates', function () {
			var returnValue;
			var character = Character.create(fixture);
			sinon.spy(character, 'updateRecord');

			before(function (done) {
				character.save().then(function (rv) {
					returnValue = rv;
					done();
				}, done);
			});

			after(function () {
				character.updateRecord.restore();
			});

			it('calls updateRecord() once', function () {
				expect(character.updateRecord.callCount).to.be(1);
			});

			it('calls updateRecord() with all attributes', function () {
				var attrs = character.updateRecord.getCall(0).args[0];
				expect(attrs.id).to.be('1009151');
				expect(attrs.type).to.be('Character');
				expect(attrs.name).to.be('Amiko');
			});

			it('calls createRecord() without relationship updates', function () {
				var opts = character.updateRecord.getCall(0).args[1];
				expect(opts.relationshipUpdates).to.be(null);
			});

			it('returns a new instance of the model', function () {
				expect(returnValue).not.to.be(character);
				expect(returnValue).to.be.a(Character);
				expect(returnValue.isNew()).to.be(false);
				expect(returnValue.id).to.be(character.id);
			});

			it('has no pending relationships left', function () {
				expect(returnValue._relationshipUpdates.length).to.be(0);
			});
		});
	});

});
