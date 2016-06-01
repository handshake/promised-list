"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* JSDoc Definitions */
/**
 * @callback PromisedList~eachCallback
 * @param  {Model}    item - The current item.
 * @param  {Integer}  index - Index of the current item.
 * @return {Boolean}  `false` if iteration should stop.
 */

/**
 * @callback PromisedList~mapCallback
 * @param  {Model}    item - The current item.
 * @param  {Integer}  index - Index of the current item.
 * @return {Mixed}
 */

/**
 * @callback PromisedList~reduceCallback
 * @param  {Mixed}    memo - Current result value.
 * @param  {Model}    item - The current item.
 * @param  {Integer}  index - Index of the current item.
 * @return {Mixed}    Next reuslt value.
 */

/**
 * @callback PromisedList~filterCallback
 * @param  {Model}    item - The current item.
 * @param  {Integer}  index - Index of the current item.
 * @return {Boolean}  `true` if item passes a test.
 */

var PromisedList = function () {
    function PromisedList(list) {
        _classCallCheck(this, PromisedList);

        this.__list__ = list;
    }

    _createClass(PromisedList, [{
        key: "__each__",


        /**
         * Helper method for the `each`, `map` and `reduce` methods below.
         *
         * @param  {Function}  callback
         * @return {Promise.<Mixed[]>}
         */
        value: function __each__(callback) {
            var _this = this;

            return new Promise(function (resolve, reject) {
                var iter = _this[Symbol.iterator]();
                var i = 0;
                var result = iter.next();
                var returnValues = [];

                var wrapper = function wrapper(item) {
                    var stopped = false;
                    Promise.resolve(callback({
                        item: item,
                        index: i,
                        stop: function stop() {
                            stopped = true;
                        }
                    })).then(function (value) {
                        returnValues.push(value);
                        if (!stopped) {
                            i += 1;
                            result = iter.next();
                            if (!result.done) {
                                result.value.then(wrapper);
                            } else {
                                Promise.all(returnValues).then(resolve, reject);
                            }
                        } else {
                            Promise.all(returnValues).then(resolve, reject);
                        }
                    }, reject);
                };

                if (!result.done) {
                    result.value.then(wrapper);
                } else {
                    resolve(returnValues);
                }
            });
        }

        // TODO: tests and docs for push/pop/shift/unshift & toArray

    }, {
        key: "pop",
        value: function pop() {
            var result = this.at(this.length - 1); // use .at so result gets wrapped properly
            this.__list__.pop();
            return result;
        }
    }, {
        key: "push",
        value: function push() {
            var _list__;

            (_list__ = this.__list__).push.apply(_list__, arguments);
            return this.length;
        }
    }, {
        key: "shift",
        value: function shift() {
            var result = this.at(0); // use .at so result gets wrapped properly
            this.__list__.shift();
            return result;
        }
    }, {
        key: "unshift",
        value: function unshift() {
            var _list__2;

            (_list__2 = this.__list__).unshift.apply(_list__2, arguments);
            return this.length;
        }
    }, {
        key: "toArray",
        value: function toArray() {
            return this.__each__(function (obj) {
                return obj.item;
            });
        }

        /**
         * Call the provided function for each result. Resolves when done. Also passes the index of the
         * current result. Will stop iterating if the callback returns `false`.
         *
         * @param  {PromisedList~eachCallback}  callback
         * @return {Promise}
         *
         * @example
         * myOrders.each((order, i) => {
         *     order.whatever();
         * });
         */

    }, {
        key: "each",
        value: function each(callback) {
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === false) {
                        obj.stop();
                    }
                });
            }).then(function () {
                return undefined;
            });
        }

        /**
         * Resolves with the results of passing each result to a callback function.
         * If the return value is a Promise, it will resolve with the result of that Promise.
         *
         * @param  {PromisedList~mapCallback}  callback
         * @return {Promise.<Mixed[]>}
         *
         * @example
         * lines.map(line => order.get("sku")).then(skus => { ... });
         */

    }, {
        key: "map",
        value: function map(callback) {
            return this.__each__(function (obj) {
                return callback(obj.item, obj.index);
            });
        }

        /**
         * Resolves with each value named `key` on each result.
         * Equivalent to using `map` to get a single attribute.
         *
         * @param  {String}  key
         * @return {Promise.<Mixed[]>}
         *
         * @example
         * lines.pluck("sku").then(skus => { ... });
         */

    }, {
        key: "pluck",
        value: function pluck(key) {
            return this.__each__(function (obj) {
                if (obj.item.hasRel(key)) {
                    return obj.item.getRel(key);
                }
                return obj.item.get(key);
            });
        }

        /**
         * Resolves with the result of passing each result to a callback function
         * along with an interim value.
         *
         * @param  {PromisedList~reduceCallback}  callback
         * @param  {Mixed}                          initial
         * @return {Promise.<Mixed>}
         *
         * @example
         * lines.reduce((qty, line) => qty + line.get("qty"))
         *     .then(totalQty => console.log(totalQty))
         */

    }, {
        key: "reduce",
        value: function reduce(callback, initial) {
            var memo = initial;
            return this.__each__(function (obj) {
                return Promise.resolve(callback(memo, obj.item, obj.index)).then(function (result) {
                    memo = result;
                });
            }).then(function () {
                return memo;
            });
        }

        /**
         * Resolves with the first result that passes a predicate.
         *
         * @param  {PromisedList~filterCallback}  callback
         * @return {Promise.<Model>}
         *
         * @example
         * orders.find(order => order.get("status") === "Draft")
         *     .then(draftOrder => { ... });
         */

    }, {
        key: "find",
        value: function find(callback) {
            var result = void 0;
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === true) {
                        result = obj.item;
                        obj.stop();
                    }
                });
            }).then(function () {
                return result;
            });
        }

        /**
         * Resolves with all results that pass a predicate.
         *
         * @param  {PromisedList~filterCallback}  callback
         * @return {Promise.<Model[]>}
         *
         * @example
         * items.filter(item => item.get("unitPrice") < 10)
         *     .then(cheapStuff => { ... });
         */

    }, {
        key: "filter",
        value: function filter(callback) {
            var results = [];
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === true) {
                        results.push(obj.item);
                    }
                });
            }).then(function () {
                return results;
            });
        }

        /**
         * Resolves with all results that fail a predicate.
         *
         * @param  {PromisedList~filterCallback}  callback
         * @return {Promise.<Model[]>}
         *
         * @example
         * items.reject(item => item.get("unitPrice") < 1000)
         *     .then(expensiveStuff => { ... });
         */

    }, {
        key: "reject",
        value: function reject(callback) {
            var results = [];
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === false) {
                        results.push(obj.item);
                    }
                });
            }).then(function () {
                return results;
            });
        }

        /**
         * Resolves `true` if and only if every result passes a predicate.
         * Will stop early if any result fails.
         *
         * @param  {PromisedList~filterCallback}  callback
         * @return {Promise.<Boolean>}
         *
         * @example
         * addresses.all(addr => addr.get("country") === "US")
         *     then(areAllAddressesAmerican => { ... });
         */

    }, {
        key: "all",
        value: function all(callback) {
            var result = true;
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === false) {
                        result = false;
                        obj.stop();
                    }
                });
            }).then(function () {
                return result;
            });
        }

        /**
         * Resolves `true` if and only if any result passes a function.
         * Will stop early if any result passes.
         *
         * @param  {PromisedList~filterCallback}  callback
         * @return {Promise.<Boolean>}
         *
         * @example
         * orders.any(order => order.get("status") === "Open")
         *     .then(areThereAnyOpenOrders => { ... });
         */

    }, {
        key: "any",
        value: function any(callback) {
            var result = false;
            return this.__each__(function (obj) {
                return Promise.resolve(callback(obj.item, obj.index)).then(function (answer) {
                    if (answer === true) {
                        result = true;
                        obj.stop();
                    }
                });
            }).then(function () {
                return result;
            });
        }

        /**
         * Resolves with the object found at index `n`.
         * Override this function if getting the nth object
         * is not a synchronous operation (use-case this
         * class was actually written for).
         *
         * @param  {Integer}  n
         * @return {Promise.<Mixed>}
         *
         * @example
         * myOrders.at(123).then(order123 => { ... });
         */

    }, {
        key: "at",
        value: function at(n) {
            return Promise.resolve(this.__list__[n]);
        }

        /**
         * Yields Promises for each result.
         * It is recommended that you use the `each` or `map` methods instead, as those will process
         * each result sequentially, instead of all at once.
         *
         * @return {Promise.<DBModel>}
         *
         * @example
         * for (const p of myOrders) {
         *     p.then(order => { ... });
         * }
         */

    }, {
        key: Symbol.iterator,
        value: function value() {
            var i = 0;
            var self = this;
            return {
                next: function next() {
                    if (i === self.length) {
                        return { done: true };
                    }
                    var value = self.at(i);
                    i += 1;
                    return { done: false, value: value };
                }
            };
        }

        // With generators, the above function becomes:
        // *[Symbol.iterator] () {
        //     for (let i = 0; i < this.length; i += 1) {
        //         yield this.at(i);
        //     }
        // }

    }, {
        key: "length",
        get: function get() {
            return this.__list__.length;
        }
    }]);

    return PromisedList;
}();

exports.default = PromisedList;
