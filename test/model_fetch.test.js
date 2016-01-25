/* global Promise:true require describe before after it */
var Promise = require('bluebird');
var U = require('lodash');
var expect = require('expect.js');
var sinon = require('sinon');
var BLOXX = require('../lib/bloxx');

var characterFixture1 = require('./fixtures/character-1009151');

var characterFixture2 = require('./fixtures/character-1009718');
var comicFixture = require('./fixtures/comic-13722');
var creatorFixture = require('./fixtures/creator-44');

describe('Model#fetch()', function () {
	'use strict';

	var Registry = BLOXX.Registry.create();

	// Register our custom Model mixin used for peristance.
	Registry.useMixin({
		getRecord: function (attrs, options) {
			var data = U.cloneDeep(comicFixture);
			if (options.include) {
				data.relationships = [
					{type: 'Character', direction: 'has', items: [
						characterFixture1, characterFixture2
					]},
					{type: 'Creator', direction: 'belongsTo', items: [
						creatorFixture
					]}
				];
				return Promise.resolve(data);
			}
			return Promise.resolve(data);
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
		relationshipDefinitions: 'hasCharacter belongsToCreator'
	});

	var Creator = Registry.createModel({
		type: 'Creator',
		defaults: {
			firstName: null,
			lastName: null,
			thumbnail: null
		},
		relationshipDefinitions: 'hasComic'
	});

	describe('without includes', function () {
		var returnValue;
		var fixture = U.cloneDeep(comicFixture);
		var comic = Comic.create({id: fixture.id});
		sinon.spy(comic, 'getRecord');

		before(function (done) {
			comic.fetch()
				.then(function (rv) {
					returnValue = rv;
					done();
				}, done);
		});

		after(function () {
			comic.getRecord.restore();
		});

		it('calls getRecord once', function () {
			expect(comic.getRecord.callCount).to.be(1);
		});

		it('calls getRecord with at least the id attribute', function () {
			var attrs = comic.getRecord.getCall(0).args[0];
			expect(attrs.id).to.be('13722');
		});

		it('does not pass options.include', function () {
			var opts = comic.getRecord.getCall(0).args[1];
			expect(opts.include).to.be(undefined);
		});

		it('returns a new instance', function () {
			expect(returnValue).not.to.be(comic);
			expect(returnValue).to.be.a(Comic);
			expect(returnValue.id).to.be('13722');
		});

		it('returns instance with empty relationships', function () {
			var relationships = returnValue.relationships;
			var characters = relationships.has.Character;
			var creators = relationships.belongsTo.Creator;
			expect(characters.length).to.be(0);
			expect(creators.length).to.be(0);
		});
	});

	describe('with includes', function () {
		var returnValue;
		var fixture = U.cloneDeep(comicFixture);
		var comic = Comic.create({id: fixture.id});
		sinon.spy(comic, 'getRecord');

		before(function (done) {
			comic
				.fetch({include: 'hasCharacter belongsToCreator'})
				.then(function (rv) {
					returnValue = rv;
					done();
				}, done);
		});

		after(function () {
			comic.getRecord.restore();
		});

		it('calls getRecord once', function () {
			expect(comic.getRecord.callCount).to.be(1);
		});

		it('calls getRecord with at least the id attribute', function () {
			var attrs = comic.getRecord.getCall(0).args[0];
			expect(attrs.id).to.be('13722');
		});

		it('passes options.include', function () {
			var opts = comic.getRecord.getCall(0).args[1];
			expect(opts.include.length).to.be(2);
			expect(opts.include[0].direction).to.be('has');
			expect(opts.include[0].type).to.be('Character');
			expect(opts.include[1].direction).to.be('belongsTo');
			expect(opts.include[1].type).to.be('Creator');
		});

		it('returns a new instance', function () {
			expect(returnValue).not.to.be(comic);
			expect(returnValue).to.be.a(Comic);
			expect(returnValue.id).to.be('13722');
		});

		it('returns instance with relationships', function () {
			var characters = returnValue.relationships.has.Character;
			expect(characters.length).to.be(2);
			var character = characters[0];
			expect(character).to.be.a(Character);
			expect(character.name).to.be('Amiko');

			var creators = returnValue.relationships.belongsTo.Creator;
			expect(creators.length).to.be(1);
			var creator = creators[0];
			expect(creator).to.be.a(Creator);
			expect(creator.firstName).to.be('Chris');
		});
	});
});
