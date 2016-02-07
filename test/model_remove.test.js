/* global Promise:true require describe before after it */
var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');
var BLOXX = require('../lib/bloxx');

var comicFixture = require('./fixtures/comic-13722');

describe('Model#remove()', function () {
	'use strict';

	var Registry = BLOXX.Registry.create();

	// Register our custom Model mixin used for peristance.
	Registry.useMixin({
		removeRecord: function () {
			return Promise.resolve(true);
		}
	});

	var Comic = Registry.createModel({
		type: 'Comic',
		allowedKeys: [
			'title',
			'pageCount'
		],
		relationshipDefinitions: 'hasCharacter belongsToCreator'
	});

	Registry.createModel({
		type: 'Character'
	});

	Registry.createModel({
		type: 'Creator',
		allowedKeys: []
	});

	var returnValue;
	var comic = Comic.create(comicFixture);
	sinon.spy(comic, 'removeRecord');

	before(function (done) {
		comic.remove().then(function (rv) {
			returnValue = rv;
			done();
		}, done);
	});

	after(function () {
		comic.removeRecord.restore();
	});

	it('calls removeRecord once', function () {
		expect(comic.removeRecord.callCount).to.be(1);
	});

	it('calls removeRecord with all instance attributes', function () {
		var attrs = comic.removeRecord.getCall(0).args[0];
		expect(attrs.id).to.be('13722');
		expect(attrs.type).to.be('Comic');
	});

	it('passes options.include for defined relationships', function () {
		var opts = comic.removeRecord.getCall(0).args[1];
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

	it('returns instance with empty relationships', function () {
		var characters = returnValue.relationships.has.Character;
		var creators = returnValue.relationships.belongsTo.Creator;
		expect(characters.length).to.be(0);
		expect(creators.length).to.be(0);
	});
});