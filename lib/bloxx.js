/* global module exports require define */
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
		factory: BRIXX.factory
	};

	var hasOwn = Object.prototype.hasOwnProperty;

	function indexOf(list, attr, val) {
		var i = 0;
		for (i; i < list.length; i += 1) {
			if (list[i][attr] === val) {
				return i;
			}
		}
		return -1;
	}

	function assignArrayElements(list, items) {
		items = items.filter(function (x) {
			return list.indexOf(x) === -1;
		});
		return list.concat(items);
	}

	function deepCopyAttributes(x) {
		if (typeof x === 'string' ||
				typeof x === 'number' ||
				typeof x === 'boolean') {
			return x;
		}
		if (Array.isArray(x)) {
			return x.map(deepCopyAttributes);
		}
		if (x && typeof x === 'object') {
			return JSON.parse(JSON.stringify(x));
		}
		if (x === null) {
			return null;
		}
		return x;
	}

	function objectToString(obj, depth) {
		function recurse(obj) {
			return objectToString(obj, depth + 1);
		}

		if (Array.isArray(obj)) {
			if (depth < 1) {
				return Object.prototype.toString.call(obj);
			}
			return '[' + obj.map(recurse).join(', ') + ']';
		}
		if (obj && typeof obj === 'object') {
			if (depth < 1) {
				return Object.prototype.toString.call(obj);
			}
			return '{' + Object.keys(obj).join(', ') + '}';
		}
		if (typeof obj === 'undefined') {
			return 'undefined';
		}
		if (obj === null) {
			return 'null';
		}
		return obj.toString();
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
		initialize: function (spec) {
			spec = deepCopyAttributes(spec);

			function sortKeys(a, b) {
				if (a === 'type') return -1;
				if (b === 'type') return +1;
				if (a === 'id') return -1;
				if (b === 'id') return +1;
				if (a === 'relationships') return +1;
				if (b === 'relationships') return -1;
				return 0;
			}

			Object.defineProperties(this, {
				keys: {
					value: assignArrayElements(this.allowedKeys, [
						'type',
						'id',
						'relationships'
					]).sort(sortKeys)
				},
				relationshipDefinitions: {
					value: deepCopyAttributes(this.relationshipDefinitions)
				},
				_relationshipUpdates: {
					value: []
				}
			});

			spec.relationships = this.mapRelationships(spec.relationships);

			if (typeof this.preInitialize === 'function') {
				this.preInitialize(spec);
			}

			Object.defineProperty(this, 'type', {
				enumerable: true,
				value: Object.getPrototypeOf(this).type
			});

			BRIXX.deepFreeze(this.relationshipDefinitions);
			BRIXX.deepFreeze(spec.relationships);
			Object.freeze(this.keys);

			var self = this;
			this.keys.forEach(function (key) {
				if (hasOwn.call(spec, key) && key !== 'type') {
					var val = spec[key];
					Object.defineProperty(self, key, {
						enumerable: true,
						get: function () {
							return val;
						},
						set: function () {
							throw new Error(
								'Cannot set by reference on an immutable record.');
						}
					});
				}
			});
		},

		mapRelationships: function (spec) {
			spec = BRIXX.ensure(spec);

			var relationships = Object.create(null);
			relationships.has = Object.create(null);
			relationships.belongsTo = Object.create(null);

			var self = this;
			this.relationshipDefinitions.reduce(function (relationships, def) {
				var type;
				var direction;

				if (def.indexOf('has') === 0) {
					type = def.replace(/^has/, '');
					direction = 'has';
				} else if (def.indexOf('belongsTo') === 0) {
					type = def.replace(/^belongsTo/, '');
					direction = 'belongsTo';
				}

				var list = (spec[direction] || {})[type] || [];
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

			return relationships;
		},

		toString: function () {
			return '[' + this.type + ' ' + this.id + ']';
		},

		inspect: function (depth) {
			if (depth < 1) {
				return this.toString();
			}

			var pad = Array(depth).join('  ');
			var self = this;

			var blob = this.keys.map(function (key) {
				if (key === 'relationships') {
					var keys = Object.keys(self.relationships.has)
						.map(function (key) {
							var count = self.relationships.has[key].length;
							return pad + '  has.' + key + ' [' + count + ']';
						});
					keys = keys.concat(Object.keys(self.relationships.belongsTo)
						.map(function (key) {
							var count = self.relationships.belongsTo[key].length;
							return pad + '  belongsTo.' + key + ' [' + count + ']';
						}));
					return pad + 'relationships:\n' + keys.join('\n');
				}
				return pad + key + ': ' + objectToString(self[key], depth - 1);
			});

			return '[' + this.type + ']\n' + blob.join('\n');
		},

		toJSON: function toJSON() {
			var self = this;
			return this.keys.reduce(function (attrs, key) {
				var x = self[key];
				if (Array.isArray(x)) {
					attrs[key] = x.map(deepCopyAttributes);
				} else if (typeof x !== 'function') {
					attrs[key] = deepCopyAttributes(x);
				}
				return attrs;
			}, {});
		},

		clone: function (attrs) {
			var newInstance = Object.create(Object.getPrototypeOf(this));
			newInstance.initialize(attrs);
			this._relationshipUpdates.forEach(newInstance._relationshipUpdates.push);
			return newInstance;
		},

		valueOf: function () {
			return this.toJSON();
		},

		has: function (key) {
			return this.keys.indexOf(key) >= 0 && hasOwn.call(this, key);
		},

		isNew: function isNew() {
			return !(this.id || typeof this.id === 'number');
		},

		generateId: BLOXX.uniqueId,

		set: function (key, value) {
			var values;
			var keys;
			if (key && typeof key === 'object') {
				values = key;
				keys = Object.keys(values);
			} else if (typeof key === 'string') {
				values = Object.create(null);
				values[key] = value;
				keys = [key];
			} else {
				throw new Error(
					'.set() must be called with key, value or an Object');
			}

			var i = 0;
			for (i; i < keys.length; i += 1) {
				if (this.keys.indexOf(keys[i]) === -1) {
					throw new Error('Cannot set un-Allowed key "' +
													keys[i] + '" on ' + this.type);
				}
			}

			var attrs = keys.reduce(function (attrs, key) {
				attrs[key] = values[key];
				return attrs;
			}, this.toJSON());

			return this.clone(attrs);
		},

		fetch: function fetch(options) {
			options = options || Object.create(null);

			if (this.isNew()) {
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
			if (this.isNew()) {
				throw new Error(
					'The .id property must be present for .remove()');
			}

			options = options || Object.create(null);

			options.include = this.relationshipDefinitions.map(function (def) {
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

			return this._removeRecord(options);
		},

		addItem: function (item) {
			item = BRIXX.ensure(item);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			// We don't want duplicate relationship updates.
			var i = 0;
			var rel;
			for (i; i < this._relationshipUpdates.length; i += 1) {
				rel = this._relationshipUpdates[i];
				if (rel.action === 'create' &&
						rel.direction === 'has' &&
						rel.type === item.type &&
						rel.item.id === item.id) {
					return this;
				}
			}

			this._relationshipUpdates.push({
				action: 'create',
				direction: 'has',
				type: item.type,
				item: item
			});

			return this;
		},

		removeItem: function (item) {
			item = BRIXX.ensure(item);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			// We don't want duplicate relationship updates.
			var i = 0;
			var rel;
			for (i; i < this._relationshipUpdates.length; i += 1) {
				rel = this._relationshipUpdates[i];
				if (rel.action === 'remove' &&
						rel.direction === 'has' &&
						rel.type === item.type &&
						rel.item.id === item.id) {
					return this;
				}
			}

			this._relationshipUpdates.push({
				action: 'remove',
				direction: 'has',
				type: item.type,
				item: item
			});

			return this;
		},

		connectTo: function (item) {
			item = BRIXX.ensure(item);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			// We don't want duplicate relationship updates.
			var i = 0;
			var rel;
			for (i; i < this._relationshipUpdates.length; i += 1) {
				rel = this._relationshipUpdates[i];
				if (rel.action === 'create' &&
						rel.direction === 'belongsTo' &&
						rel.type === item.type &&
						rel.item.id === item.id) {
					return this;
				}
			}

			this._relationshipUpdates.push({
				action: 'create',
				direction: 'belongsTo',
				type: item.type,
				item: item
			});

			return this;
		},

		removeFrom: function (item) {
			item = BRIXX.ensure(item);
			if (!item.type || typeof item.type !== 'string') {
				throw new Error('The .type property must be present on an item');
			}
			if (!(item.id || typeof item.id === 'number')) {
				throw new Error('The .id property must be present on an item');
			}

			// We don't want duplicate relationship updates.
			var i = 0;
			var rel;
			for (i; i < this._relationshipUpdates.length; i += 1) {
				rel = this._relationshipUpdates[i];
				if (rel.action === 'remove' &&
						rel.direction === 'belongsTo' &&
						rel.type === item.type &&
						rel.item.id === item.id) {
					return this;
				}
			}

			this._relationshipUpdates.push({
				action: 'remove',
				direction: 'belongsTo',
				type: item.type,
				item: item
			});

			return this;
		},

		_createRecord: function createRecord(options) {
			var attrs = this.toJSON();
			attrs.id = this.generateId();

			// We don't want to save the relationships hash to the DB.
			var relationships = attrs.relationships;
			delete attrs.relationships;

			var self = this;

			// Add currently defined relationships to relationship updates.
			this.relationshipDefinitions.forEach(function (def) {
				var type;

				if (def.indexOf('has') === 0) {
					type = def.replace(/^has/, '');
					relationships.has[type].map(self.addItem.bind(self));
				} else if (def.indexOf('belongsTo') === 0) {
					type = def.replace(/^belongsTo/, '');
					relationships.belongsTo[type].map(self.connectTo.bind(self));
				} else {
					throw new Error('Invalid relationship definition: ' + def);
				}
			});

			options.relationshipUpdates = this._relationshipUpdates.length ?
				this._relationshipUpdates : null;

			// Add relationship updates to the currently defined relationships.
			if (options.relationshipUpdates) {
				options.relationshipUpdates.reduce(function (relationships, update) {
					var list = relationships[update.direction][update.type];
					var i = indexOf(list, 'id', update.item.id);
					if (i >= 0 && update.action === 'remove') {
						list.splice(i, 1);
					} else if (i === -1 && update.action === 'create') {
						list.push(update.item);
					}
					return relationships;
				}, relationships);
			}

			var newInstance = Object.create(Object.getPrototypeOf(this));

			function createRecord() {
				var privateAttrs = deepCopyAttributes(attrs);
				privateAttrs.relationships = relationships;
				return self.createRecord(attrs, options).then(function () {
					newInstance.initialize(privateAttrs);
					return newInstance;
				});
			}

			var promise = Promise.resolve();

			if (typeof this.beforeCreate === 'function') {
				promise = Promise.resolve(this.beforeCreate(attrs));
			}
			if (typeof this.beforeSave === 'function') {
				promise = promise.then(function () {
					return self.beforeSave(attrs);
				});
			}

			return promise.then(createRecord);
		},

		_updateRecord: function updateRecord(options) {
			var attrs = this.toJSON();

			// We don't want to save the relationships hash to the DB.
			var relationships = attrs.relationships;
			delete attrs.relationships;

			options.relationshipUpdates = this._relationshipUpdates.length ?
				this._relationshipUpdates : null;

			// Add/Remove relationship updates from currently defined relationships.
			if (options.relationshipUpdates) {
				options.relationshipUpdates.reduce(function (relationships, update) {
					var list = relationships[update.direction][update.type] || [];
					var i = indexOf(list, 'id', update.item.id);
					if (i >= 0 && update.action === 'remove') {
						list.splice(i, 1);
					} else if (i === -1 && update.action === 'create') {
						list.push(update.item);
					}
					relationships[update.direction][update.type] = list;
					return relationships;
				}, relationships);
			}

			var newInstance = Object.create(Object.getPrototypeOf(this));
			var self = this;

			function updateRecord() {
				var privateAttrs = deepCopyAttributes(attrs);
				privateAttrs.relationships = relationships;
				return self.updateRecord(attrs, options).then(function () {
					newInstance.initialize(privateAttrs);
					return newInstance;
				});
			}

			var promise = Promise.resolve();

			if (typeof this.beforeUpdate === 'function') {
				promise = Promise.resolve(this.beforeUpdate(attrs));
			}
			if (typeof this.beforeSave === 'function') {
				promise = promise.then(function () {
					return self.beforeSave(attrs);
				});
			}

			return promise.then(updateRecord);
		},

		_getRecord: function getRecord(options) {
			var attrs = this.toJSON();
			var newInstance = Object.create(Object.getPrototypeOf(this));
			var self = this;

			function getRecord() {
				return self.getRecord(attrs, options).then(function (data) {
					var relationships = {
						has: {},
						belongsTo: {}
					};

					if (Array.isArray(data.relationships)) {
						data.relationships.reduce(function (relationships, rel) {
							relationships[rel.direction][rel.type] = rel.items;
							return relationships;
						}, relationships);
					}

					data.relationships = relationships;
					newInstance.initialize(data);
					return newInstance;
				});
			}

			var promise = Promise.resolve();
			if (typeof this.beforeFetch === 'function') {
				promise = Promise.resolve(this.beforeFetch(attrs));
			}

			return promise.then(getRecord);
		},

		_removeRecord: function removeRecord(options) {
			var attrs = this.toJSON();
			delete attrs.relationships;

			var self = this;
			var newInstance = Object.create(Object.getPrototypeOf(this));
			function removeRecord() {
				var privateAttrs = deepCopyAttributes(attrs);
				return self.removeRecord(attrs, options).then(function () {
					newInstance.initialize(privateAttrs);
					return newInstance;
				});
			}

			var promise = Promise.resolve();
			if (typeof this.beforeRemove === 'function') {
				promise = Promise.resolve(this.beforeRemove(attrs));
			}

			return promise.then(removeRecord);
		}
	};

	BLOXX.Registry = BLOXX.factory({
		initialize: function () {
			this.constructors = Object.create(null);
			this.modelMixins = [BLOXX.ModelMixin];
		},

		useMixin: function (mixin) {
			this.modelMixins.push(mixin);
		},

		createModel: function (mixin) {
			var constructor = BLOXX.factory(this.modelMixins, mixin);

			var proto = constructor.prototype;
			if (!proto.type || typeof proto.type !== 'string') {
				throw new Error('The .type property must be a defined String');
			}
			if (!proto.allowedKeys || !Array.isArray(proto.allowedKeys)) {
				proto.allowedKeys = [];
			}

			// Typecast relationship definitions.
			if (!Array.isArray(proto.relationshipDefinitions)) {
				if (typeof proto.relationshipDefinitions === 'string') {
					proto.relationshipDefinitions =
						proto.relationshipDefinitions.split(' ');
				} else {
					proto.relationshipDefinitions = [];
				}
			}

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
