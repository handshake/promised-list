(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(["exports"], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports);
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports);
        global.index = mod.exports;
    }
})(this, function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    var PromisedList = function () {
        /**
         * @param {Array}     list               An array of Promises.
         * @param {Function}  [promiseWrapper]   A function which will wrap or decorate a Promise.
         * @param {Function}  [callbackWrapper]  A function which will wrap callbacks.
         */

        function PromisedList(list, promiseWrapper, callbackWrapper) {
            _classCallCheck(this, PromisedList);

            this.__list__ = list || [];
            this.__promiseWraper__ = promiseWrapper;
            this.__callbackWrapper__ = callbackWrapper;
        }

        /**
         * Return the current length of the internal list.
         *
         * @return {Number}
         */


        _createClass(PromisedList, [{
            key: "__each__",
            value: function __each__(callback) {
                var _this = this;

                var actualCallback = callback;
                if (this.__callbackWrapper__) {
                    actualCallback = this.__callbackWrapper__(callback);
                }

                var promise = new Promise(function (resolve, reject) {
                    var iter = _this[Symbol.iterator]();
                    var i = 0;
                    var result = iter.next();
                    var returnValues = [];

                    var wrapper = function wrapper(item) {
                        var stopped = false;
                        Promise.resolve(actualCallback({
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

                if (this.__promiseWraper__) {
                    return this.__promiseWraper__(promise);
                }
                return promise;
            }
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
        }, {
            key: "each",
            value: function each(callback) {
                return this.__each__(function (obj) {
                    return callback(obj.item, obj.index);
                }).then(function () {
                    return undefined;
                });
            }
        }, {
            key: "map",
            value: function map(callback) {
                return this.__each__(function (obj) {
                    return callback(obj.item, obj.index);
                });
            }
        }, {
            key: "pluck",
            value: function pluck(key) {
                return this.__each__(function (obj) {
                    if (obj.item.get) {
                        return obj.item.get(key);
                    }
                    return obj.item[key];
                });
            }
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
        }, {
            key: "at",
            value: function at(n) {
                return Promise.resolve(this.__list__[n]);
            }
        }, {
            key: "toString",
            value: function toString() {
                // IDEA: if type of each resolved value is consistent, and known,
                //       the following would be a better representation:
                //           `PromisedList<KNOWN_TYPE>{length=${this.length}}`
                //       however, this requires knowing the type and if it is consistent.
                return "PromisedList{length=" + this.length + "}";
            }
        }, {
            key: "toJSON",
            value: function toJSON() {
                return {
                    // IDEA: if the type of each resolve value is consistent, and known,
                    //       we could include that type here.
                    length: this.length
                };
            }
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
        }, {
            key: Symbol.toPrimitive,
            value: function value(hint) {
                if (hint === "string") {
                    return this.toString();
                } else if (hint === "number") {
                    return this.length;
                }

                // disabled because both Chrome & Firefox are sending "default"
                // as a hint when their docs say they should be sending "string",
                // so, until this is fixed, I'm going to return a string for the
                // "default" hint (which is supposed to return a plain object, apparently).

                // return this.toJSON();
                return this.toString();
            }
        }, {
            key: "length",
            get: function get() {
                return this.__list__.length;
            }
        }, {
            key: Symbol.toStringTag,
            get: function get() {
                return "PromisedList";
            }
        }]);

        return PromisedList;
    }();

    exports.default = PromisedList;
});
