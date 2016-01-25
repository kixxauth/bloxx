/* global require describe it */
var U = require('lodash');
var expect = require('expect.js');
var BLOXX = require('../lib/bloxx');
var characterFixture = require('./fixtures/character-1009151');

describe('Model initalization', function () {
	'use strict';

	var Registry = BLOXX.Registry.create();

	var Character = Registry.createModel({
		type: 'Character',
		defaults: {
			name: null,
			description: null,
			modified: null,
			urls: []
		}
	});

	describe('when record is new', function () {
		var attrs = U.cloneDeep(characterFixture);
		delete attrs.id;
		var character = Character.create(attrs);

		it('does not have an .id', function () {
			expect(character.id).to.be(null);
			expect(character.isNew()).to.be(true);
		});

		it('has a .name', function () {
			expect(character.name).to.be('Amiko');
		});

		it('has nested .urls', function () {
			var url = character.urls[0];
			expect(url.type).to.be('detail');
			expect(typeof url.url).to.be('string');
		});
	});

	describe('when record has an id', function () {
		var character = Character.create(characterFixture);

		it('has an .id', function () {
			expect(character.id).to.be('1009151');
			expect(character.isNew()).to.be(false);
		});

		it('has a .name', function () {
			expect(character.name).to.be('Amiko');
		});

		it('has nested .urls', function () {
			var url = character.urls[0];
			expect(url.type).to.be('detail');
			expect(typeof url.url).to.be('string');
		});
	});

	describe('without relationships', function () {
		var Character = Registry.createModel({
			type: 'Character',
			defaults: {
				name: null,
				description: null,
				modified: null,
				thumbnail: null,
				resourceURI: null,
				urls: []
			}
		});

		var Comic = Registry.createModel({
			type: 'Comic',
			defaults: {}
		});

		var character = Character.create(characterFixture);
		var comic = character.relationships.belongsTo.Comic[0];

		it('relationships are not model instances', function () {
			expect(comic).not.to.be.a(Comic);
			expect(comic.save).to.be(undefined);
		});
	});

	describe('with relationships', function () {
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
			relationshipDefinitions: 'belongsToCreator hasCharacter'
		});

		Registry.createModel({
			type: 'Creator',
			defaults: {
				firstName: null,
				lastName: null,
				thumbnail: null
			},
			relationshipDefinitions: 'hasComic'
		});

		var character = Character.create(characterFixture);
		var comic = character.relationships.belongsTo.Comic[0];

		it('relationships are Comic instances', function () {
			expect(comic).to.be.a(Comic);
			expect(comic.save).to.be.a(Function);
		});
	});
});
