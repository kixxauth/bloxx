B L O X X
=========
> JavaScript Models for [podjs](https://github.com/kixxauth/podjs) compliant datastores.

[![NPM][npm-banner]][npm-banner-url]

[![npm version][npm-badge]][npm-url]

BLOXX Models are not part of any larger MVC framework. Just plain JavaScript data structures with a built in persistence API. Designed to work in both the Browser (IE9+) and Node.js.

__Built by [@kixxauth](https://twitter.com/kixxauth)__

## API

#### #fetch(options)
Fetches an object from the datastore. The difference from [#load](#load) is that #fetch() will return `null` instead of raising an exception if the object cannot be found in the store.

Returns a resolved Promise for a new instance of the same model type. If the object cannot be found, the returned promise will resolve to `null`.

The options object will be passed through to the underlying store.

```js
Character.create({id: 'spider-man'})
  .fetch()
  .then(function (character) {
    console.log(character.name); // 'Spider Man'
  });

Character.create({id: 'foobar'})
  .fetch()
  .then(function (character) {
    console.log(character === null); // true
  });
```

#### #load(options)
Loads an object from the datastore. The difference from [#fetch](#fetch) is that #load() will return a rejected Promise instead of `null` if the object cannot be found in the store.

Returns a resolved Promise for a new instance of the same model type. If the object cannot be found, #load() will return a rejected promise with error code "NOT_FOUND".

The options object will be passed through to the underlying store.

```js
Character.create({id: 'spider-man'})
  .fetch()
  .then(function (character) {
    console.log(character.name); // 'Spider Man'
  });

Character.create({id: 'foobar'})
  .fetch()
  .catch(function (err) {
    console.log(err.code); // 'NOT_FOUND'
  });
```

#### #loadHasMany(options)
Fetches related objects from the datstore and loads them into the #hasMany property.

If an `options.include` Array is present #loadHasMany will only query for the types listed in `options.include`. If `options.include` is not present, then #loadHasMany will query for all the hasMany types configured for the Model class.

```js
Series.create({id: 'spectacular-spider-man'})
  .loadHasMany({include: ['Character']})
  .then(function (characters) {
    console.log(characters[0].id); // 'spider-man'
    console.log(characters[0].type); // 'Character'
    console.log(characters[0].name); // 'Spider Man'
  });
```

#### #loadBelongsTo(options)
Fetches related objects from the datastore and loads them into the #blongsTo property.

If an `options.include` Array is present #loadBelongsTo will only query for the types listed in `options.include`. If `options.include` is not present, then #loadBelongsTo will query for all the belongsTo types configured for the Model class.

```js
Series.create({id: 'spider-man'})
  .loadBelongsTo({include: ['Series']})
  .then(function (series) {
    console.log(series[0].id); // 'spectacular-spider-man'
    console.log(series[0].type); // 'Series'
    console.log(series[0].title); // 'The Spectacular Spider Man'
  });
```

#### #fetchHasMany(options)
Fetches related object IDs from the datastore. The difference from [#loadHasMany](#loadhasmany) is that #fetchHasMany() does not hydrate the attributes of the objects, it only returns the base Objects `{id: "STRING", type: "STRING"}`.

If an `options.include` Array is present #fetchHasMany will only query for the types listed in `options.include`. If `options.include` is not present, then #fetchHasMany will query for all the hasMany types configured for the Model class.

Returns a Promise which resolves to an Array of base Objects. If none are found, the Array will be empty.

```js
Series.create({id: 'spectacular-spider-man'})
  .fetchHasMany({include: ['Character']})
  .then(function (characters) {
    console.log(characters[0].id); // 'spider-man'
    console.log(characters[0].type); // 'Character'
  });
```

#### #fetchBelongsTo(options)
Fetches parent object IDs from the datastore. The difference from [#loadBelongsTo](#loadbelongsto) is that #fetchBelongsTo() does not hydrate the attributes of the objects, it only returns the base Objects `{id: "STRING", type: "STRING"}`.

If an `options.include` Array is present #fetchBelongsTo will only query for the types listed in `options.include`. If `options.include` is not present, then #fetchBelongsTo will query for all the blongsTo types configured for the Model class.

Returns a Promise which resolves to an Array of base Objects. If none are found, the Array will be empty.

```js
Series.create({id: 'spider-man'})
  .fetchBelongsTo({include: ['Series']})
  .then(function (series) {
    console.log(series[0].id); // 'spectacular-spider-man'
    console.log(series[0].type); // 'Series'
  });
```

Copyright and License
---------------------
Copyright: (c) 2016 by Kris Walker (http://www.kixx.name)

Unless otherwise indicated, all source code is licensed under the MIT license. See MIT-LICENSE for details.

[npm-banner]: https://nodei.co/npm/bloxx.png?compact=true
[npm-banner-url]: https://nodei.co/npm/bloxx/
[npm-badge]: https://badge.fury.io/js/bloxx.svg
[npm-url]: https://badge.fury.io/js/bloxx

