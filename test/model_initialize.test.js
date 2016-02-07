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
		allowedKeys: [
			'name',
			'description',
			'modified',
			'urls'
		]
	});

	describe('when record is new', function () {
		var attrs = U.cloneDeep(characterFixture);
		delete attrs.id;
		var character = Character.create(attrs);

		it('does not have an .id', function () {
			expect(character.id).to.be(undefined);
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
			allowedKeys: [
				'name',
				'description',
				'modified',
				'thumbnail',
				'resourceURI',
				'urls'
			]
		});

		var character = Character.create(characterFixture);
		var belongsTo = character.relationships.belongsTo;
		var has = character.relationships.has;

		it('has no belongsTo keys', function () {
			expect(Object.keys(belongsTo).length).to.be(0);
		});

		it('has no has keys', function () {
			expect(Object.keys(has).length).to.be(0);
		});
	});

	describe('with relationships', function () {
		var Character = Registry.createModel({
			type: 'Character',
			allowedKeys: [
				'name',
				'description',
				'modified',
				'thumbnail',
				'resourceURI',
				'urls'
			],
			relationshipDefinitions: 'belongsToComic'
		});

		var Comic = Registry.createModel({
			type: 'Comic',
			allowedKeys: [
				'title',
				'pageCount'
			],
			relationshipDefinitions: 'belongsToCreator hasCharacter'
		});

		Registry.createModel({
			type: 'Creator',
			allowedKeys: [
				'firstName',
				'lastName',
				'thumbnail'
			],
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
