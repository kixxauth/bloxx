/* global module require define */
; // eslint-disable-line
(function (global, factory) {
	'use strict';

	// Support CommonJS, AMD, and global script loading.
	if (typeof exports === 'object' && typeof module !== 'undefined') {
		module.exports = factory(require('brixx'));
	} else if (typeof define === 'function' && define.amd) {
		define(['brixx'], factory);
	} else {
		global.BLOXX = factory(global.BRIXX);
	}
})(this, function (BRIXX) {
	'use strict';

	var BLOXX = {
		BRIXX: BRIXX,
		factory: BRIXX.factory,
		BaseModelMixin: {
			toString: BRIXX.Model.toString,
			has: BRIXX.Model.has,
			set: BRIXX.Model.set,
			diff: BRIXX.Model.diff,
			valueOf: BRIXX.Model.valueOf
		}
	};

	function indexOf(list, attr, val) {
		var i = 0;
		for (i; i < list.length; i += 1) {
			if (list[i][attr] === val) {
				return i;
			}
		}
		return -1;
	}

	BLOXX.uniqueId = (function () {
		var counter = 0;
		var prefix = 'bloxx_';

		return function uniqueId() {
			counter += 1;
			return prefix + counter;
		};
	})();

	BLOXX.ModelMixin = {
		initializePrototype: function initializePrototype(proto) {
			if (!proto.type || typeof proto.type !== 'string') {
				throw new Error('The .type property must be a defined String');
			}
			if (!proto.defaults || typeof proto.defaults !== 'object') {
				throw new Error('The .defaults property must be a defined Object');
			}

			proto.defaults.id = null;
			Object.freeze(proto.defaults);

			// Typecast relationship definitions.
			if (!Array.isArray(proto.relationshipDefinitions)) {
				if (typeof proto.relationshipDefinitions === 'string') {
					proto.relationshipDefinitions =
						proto.relationshipDefinitions.split(' ');
				} else {
					proto.relationshipDefinitions = [];
				}
			}

			Object.freeze(proto.relationshipDefinitions);

			return this;
		},

		initialize: function initialize(spec) {
			var self = this;
			var defaults = this.defaults;
			var values = Object.create(null);
			var keys;

			try {
				keys = Object.keys(defaults);
			} catch (err) {
				throw new Error('Invalid "defaults" attribute on prototype.');
			}

			var relationships = JSON.parse(JSON.stringify(spec.relationships || {}));
			relationships.belongsTo = relationships.belongsTo || {};
			relationships.has = relationships.has || {};

			// Set spec.relationships based on relationship definitions.
			this.relationshipDefinitions.reduce(function (relationships, def) {
				var type;
				var direction;

				if (def.indexOf('has') === 0) {
					type = def.replace(/^has/, '');
					direction = 'has';
				}
				if (def.indexOf('belongsTo') === 0) {
					type = def.replace(/^belongsTo/, '');
					direction = 'belongsTo';
				}

				var list = relationships[direction][type] || [];
				var constructor = self.getConstructorFor(type);
				if (typeof constructor !== 'function') {
					throw new Error('No constructor available for type "' + type + '"');
				}

				relationships[direction][type] = list.map(function (item) {
					if (item && typeof item === 'object') {
						if (!(item.id || typeof item.id === 'number')) {
							throw new Error(
								'An id attribute is required in relationships data');
						}
						return constructor(item);
					}
					return constructor({id: item});
				});

				return relationships;
			}, relationships);

			spec.relationships = BRIXX.deepFreeze(relationships);
			keys.push('relationships');

			keys.push('type');
			Object.freeze(keys);

			values = keys.reduce(function (values, k) {
				values[k] = Object.prototype.hasOwnProperty.call(spec, k) ?
										spec[k] : defaults[k];
				return values;
			}, values);

			values.type = this.type;

			Object.defineProperties(this, {
				_keys: {
					value: keys
				},
				_relationshipUpdates: {
					value: []
				}
			});

			keys.forEach(function (key) {
				var val = values[key];
				Object.defineProperty(self, key, {
					enumerable: true,
					get: function () {
						return val;
					},
					set: function () {
						throw new Error('Cannot set by reference on an immutable record.');
					}
				});
			});
		},

		hasId: function () {
			return !!(this.id || typeof this.id === 'number');
		},

		isNew: function isNew() {
			return !this.hasId();
		},

		generateId: BLOXX.uniqueId,

		fetch: function fetch(options) {
			options = options || Object.create(null);

			if (!this.hasId()) {
				throw new Error(
					'The .id property must be present for .fetch()');
			}

			var self = this;

			if (options.include) {
				options.include = options.include.split(' ').map(function (def) {
					if (self.relationshipDefinitions.indexOf(def) === -1) {
						throw new Error('Relationship ' + def +
							' not defined on ' + self.type);
					}
					if (def.indexOf('has') === 0) {
						return {
							direction: 'has',
							type: def.replace(/^has/, '')
						};
					}
					if (def.indexOf('belongsTo') === 0) {
						return {
							direction: 'belongsTo',
							type: def.replace(/^belongsTo/, '')
						};
					}
				});
			}

			return this._getRecord(options);
		},

		save: function save(options) {
			options = options || Object.create(null);

			return this.isNew() ?
				this._createRecord(options) :
				this._updateRecord(options);
		},

		remove: function remove(options) {
			if (!this.hasId()) {
				throw new Error(
					'The .id property must be present for .remove()');
			}

			options = options || Object.create(null);

			return this._removeRecord();
		},

		addItem: function (item) {
			item = item || Object.create(null);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			this._relationshipUpdates.push({
				action: 'create',
				direction: 'has',
				type: item.type,
				item: item
			});

			var newInstance = Object.create(this);
			newInstance.initialize(this.toJSON());
			return newInstance;
		},

		removeItem: function (item) {
			item = item || Object.create(null);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			this._relationshipUpdates.push({
				action: 'remove',
				direction: 'has',
				type: item.type,
				item: item
			});

			var newInstance = Object.create(this);
			newInstance.initialize(this.toJSON());
			return newInstance;
		},

		connectTo: function (item) {
			item = item || Object.create(null);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			this._relationshipUpdates.push({
				action: 'create',
				direction: 'belongsTo',
				type: item.type,
				item: item
			});

			var newInstance = Object.create(this);
			newInstance.initialize(this.toJSON());
			return newInstance;
		},

		removeFrom: function (item) {
			item = item || Object.create(null);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			this._relationshipUpdates.push({
				action: 'remove',
				direction: 'belongsTo',
				type: item.type,
				item: item
			});

			var newInstance = Object.create(this);
			newInstance.initialize(this.toJSON());
			return newInstance;
		},

		_createRecord: function createRecord(options) {
			var attrs = this.toJSON();
			attrs.id = this.generateId();

			var rUpdates = this._relationshipUpdates.filter(function (update) {
				return update.action === 'create';
			});

			var relationships = attrs.relationships;

			// Concatenate all the relationship updates.
			Object.keys(relationships).forEach(function (direction) {
				Object.keys(relationships[direction]).forEach(function (type) {
					var list = relationships[direction][type];
					rUpdates = rUpdates.concat(list.map(function (item) {
						return {
							action: 'create',
							direction: direction,
							type: type,
							item: item
						};
					}));
				});
			});

			// Set relationships hash for the new instance.
			if (rUpdates.length) {
				options.relationshipUpdates = rUpdates;
				rUpdates.reduce(function (relationships, update) {
					var list = relationships[update.direction][update.type] || [];
					list.push(update.item);
					relationships[update.direction][update.type] = list;
					return relationships;
				}, attrs.relationships);
			} else {
				options.relationshipUpdates = null;
			}

			var newInstance = Object.create(Object.getPrototypeOf(this));

			return this.createRecord(attrs, options).then(function () {
				newInstance.initialize(attrs);
				return newInstance;
			});
		},

		_updateRecord: function updateRecord(options) {
			var attrs = this.toJSON();
			var relationshipUpdates = this._relationshipUpdates.length ?
				this._relationshipUpdates : null;

			options.relationshipUpdates = relationshipUpdates;

			var newInstance = Object.create(Object.getPrototypeOf(this));

			return this.updateRecord(attrs, options).then(function () {
				// Set relationships hash for the new instance.
				relationshipUpdates.reduce(function (relationships, update) {
					var list = relationships[update.direction][update.type] || [];
					var i = indexOf(list, 'id', update.item.id);
					if (i === -1) {
						list.push(update.item);
					} else if (update.action === 'remove') {
						list.splice(i, 1);
					} else {
						list[i] = update.item;
					}
					relationships[update.direction][update.type] = list;
					return relationships;
				}, attrs.relationships);

				newInstance.initialize(attrs);
				return newInstance;
			});
		},

		_getRecord: function getRecord(options) {
			var attrs = this.toJSON();
			var newInstance = Object.create(Object.getPrototypeOf(this));

			return this.getRecord(attrs, options).then(function (data) {
				var relationships = {
					has: {},
					belongsTo: {}
				};

				if (data.relationships) {
					data.relationships.reduce(function (relationships, rel) {
						relationships[rel.direction][rel.type] = rel.items;
						return relationships;
					}, relationships);

					data.relationships = relationships;
				}
				newInstance.initialize(data);
				return newInstance;
			});
		},

		_removeRecord: function removeRecord(options) {
			var attrs = this.toJSON();
			var relationships = attrs.relationships;
			var rUpdates = [];

			// Concatenate all the relationship updates.
			Object.keys(relationships).forEach(function (direction) {
				Object.keys(relationships[direction]).forEach(function (type) {
					var list = relationships[direction][type];
					rUpdates = rUpdates.concat(list.map(function (item) {
						return {
							action: 'remove',
							direction: direction,
							type: type,
							item: item
						};
					}));
				});
			});

			options.relationshipUpdates = rUpdates;
			var newInstance = Object.create(Object.getPrototypeOf(this));

			return this.removeRecord(attrs, options).then(function () {
				delete attrs.relationships;
				newInstance.initialize(attrs);
				return newInstance;
			});
		},

		toJSON: function toJSON() {
			var self = this;

			var relationships = Object.create(null);
			relationships.has = Object.create(null);
			relationships.belongsTo = Object.create(null);

			return this._keys.reduce(function (attrs, k) {
				var v = self[k];

				if (k === 'relationships') {
					attrs.relationships = self.relationshipDefinitions
						.reduce(function (relationships, def) {
							var type;
							var direction;

							if (def.indexOf('has') === 0) {
								type = def.replace(/^has/, '');
								direction = 'has';
							}
							if (def.indexOf('belongsTo') === 0) {
								type = def.replace(/^belongsTo/, '');
								direction = 'belongsTo';
							}

							var list = self.relationships[direction][type] || [];

							relationships[direction][type] = list.map(function (item) {
								if (item && typeof item === 'object') {
									return item;
								}
								return {id: item};
							});

							return relationships;
						}, relationships);

				} else if (v && typeof v === 'object') {
					attrs[k] = typeof v.toJSON === 'function' ? v.toJSON() : v;
				} else {
					attrs[k] = v;
				}

				return attrs;
			}, Object.create(null));
		}
	};

	BLOXX.Registry = BLOXX.factory({
		initialize: function () {
			this.constructors = Object.create(null);
			this.modelMixins = [BLOXX.BaseModelMixin, BLOXX.ModelMixin];
		},

		useMixin: function (mixin) {
			this.modelMixins.push(mixin);
		},

		createModel: function (mixin) {
			var constructor = BLOXX.factory(this.modelMixins, mixin);
			constructor.prototype.initializePrototype(constructor.prototype);

			constructor.create = function createInstance(spec) {
				return constructor(spec);
			};

			this.register(constructor);
			return constructor;
		},

		register: function (constructor) {
			var type = constructor.prototype.type;
			if (!type) {
				throw new Error('constructor.prototype must have a .type property');
			}

			this.constructors[type] = constructor;

			var self = this;
			constructor.prototype.getConstructorFor = function (type) {
				return self.constructors[type];
			};

			return this;
		}
	});

	BLOXX.Registry.create = function () {
		return BLOXX.Registry();
	};

	return BLOXX;
});
