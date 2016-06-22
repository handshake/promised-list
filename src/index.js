/* JSDoc Definitions */

/**
 * @callback PromisedList~internalCallback
 * @param  {Object}   obj
 * @param  {Model}    obj.item - The current item.
 * @param  {Integer}  obj.index - Index of the current item.
 * @param  {Function} obj.stop - Call this to stop iteration
 */


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

/**
 * @class PromisedList
 */
class PromisedList {
    /**
     * @param {Array}     list               An array of Promises.
     * @param {Function}  [promiseWrapper]   A function which will wrap or decorate a Promise.
     * @param {Function}  [callbackWrapper]  A function which will wrap callbacks.
     */
    constructor (list, promiseWrapper, callbackWrapper) {
        this.__list__ = list || [];
        this.__promiseWraper__ = promiseWrapper;
        this.__callbackWrapper__ = callbackWrapper;
    }

    /**
     * Return the current length of the internal list.
     *
     * @return {Number}
     */
    get length () {
        return this.__list__.length;
    }

    /**
     * Helper method for the `each`, `map` and `reduce` methods below.
     *
     * @private
     * @param  {PromisedList~internalCallback}  callback
     * @return {Promise.<Mixed[]>}
     */
    __each__ (callback) {
        let actualCallback = callback;
        if (this.__callbackWrapper__) {
            actualCallback = this.__callbackWrapper__(callback);
        }

        const promise = new Promise((resolve, reject) => {
            const iter = this[Symbol.iterator]();
            let i = 0;
            let result = iter.next();
            const returnValues = [];

            const wrapper = item => {
                let stopped = false;
                Promise.resolve(actualCallback({
                    item,
                    index: i,
                    stop: () => { stopped = true; },
                })).then(value => {
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

    /**
     * Removes the last promise from the list and returns it.
     *
     * @return {Promise.<Mixed>}
     *
     * @example
     * const myPromise = myList.pop();
     */
    pop () {
        const result = this.at(this.length - 1); // use .at so result gets wrapped properly
        this.__list__.pop();
        return result;
    }

    /**
     * Appends the list with one or more promises.
     *
     * @param  {...Promise}  items - Promises to be appended.
     * @return {Number}              New length of the list.
     *
     * @example
     * lines.push(aNewLinePromise, anotherNewLinePromise);
     */
    push (...items) {
        this.__list__.push(...items);
        return this.length;
    }

    /**
     * Removes the first promise from the list and returns it.
     *
     * @return {Promise.<Mixed>}
     *
     * @example
     * const myPromise = myList.shift();
     */
    shift () {
        const result = this.at(0); // use .at so result gets wrapped properly
        this.__list__.shift();
        return result;
    }

    /**
     * Prepends the list with one or more promises.
     *
     * @param  {...Promise}  items - Promises to be prepended.
     * @return {Number}              New length of the list.
     *
     * @example
     * lines.unshift(aNewLinePromise, anotherNewLinePromise);
     */
    unshift (...items) {
        this.__list__.unshift(...items);
        return this.length;
    }

    /**
     * Resolves with an array of each item.
     *
     * @return {Promise.<Mixed[]>}
     *
     * @example
     * lines.toArray().then(arrayOfLines => { ... });
     */
    toArray () {
        return this.__each__(obj => obj.item);
    }

    /**
     * Call the provided function for each result. Resolves when done. Also passes the index of the
     * current result.
     *
     * @param  {PromisedList~eachCallback}  callback
     * @return {Promise}
     *
     * @example
     * myOrders.each((order, i) => {
     *     order.whatever();
     * });
     */
    each (callback) {
        return this.__each__(obj => callback(obj.item, obj.index)).then(() => undefined);
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
    map (callback) {
        return this.__each__(obj => callback(obj.item, obj.index));
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
    pluck (key) {
        return this.__each__(obj => {
            if (obj.item.get) {
                return obj.item.get(key);
            }
            return obj.item[key];
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
    reduce (callback, initial) {
        let memo = initial;
        return this.__each__(obj =>
            Promise.resolve(callback(memo, obj.item, obj.index)).then(result => {
                memo = result;
            })
        ).then(() => memo);
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
    find (callback) {
        let result;
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === true) {
                    result = obj.item;
                    obj.stop();
                }
            })
        ).then(() => result);
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
    filter (callback) {
        const results = [];
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === true) {
                    results.push(obj.item);
                }
            })
        ).then(() => results);
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
    reject (callback) {
        const results = [];
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === false) {
                    results.push(obj.item);
                }
            })
        ).then(() => results);
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
    all (callback) {
        let result = true;
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === false) {
                    result = false;
                    obj.stop();
                }
            })
        ).then(() => result);
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
    any (callback) {
        let result = false;
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === true) {
                    result = true;
                    obj.stop();
                }
            })
        ).then(() => result);
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
    at (n) {
        return Promise.resolve(this.__list__[n]);
    }

    /**
     * Returns a string representation of this PromisedList.
     *
     * @return {String}
     */
    toString () {
        // IDEA: if type of each resolved value is consistent, and known,
        //       the following would be a better representation:
        //           `PromisedList<KNOWN_TYPE>{length=${this.length}}`
        //       however, this requires knowing the type and if it is consistent.
        return `PromisedList{length=${this.length}}`;
    }

    /**
     * Returns a plain object representation of this PromisedList.
     * Unfortunately, we can't serialize the actual underlying list w/o awaiting it.
     *
     * @return {Object}
     */
    toJSON () {
        return {
            // IDEA: if the type of each resolve value is consistent, and known,
            //       we could include that type here.
            length: this.length,
        };
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
    [Symbol.iterator] () {
        let i = 0;
        const self = this;
        return {
            next () {
                if (i === self.length) {
                    return { done: true };
                }
                const value = self.at(i);
                i += 1;
                return { done: false, value };
            },
        };
    }

    // With generators, the above function becomes:
    // *[Symbol.iterator] () {
    //     for (let i = 0; i < this.length; i += 1) {
    //         yield this.at(i);
    //     }
    // }

    // With generators, and async/await, we can add the following:
    // @see https://github.com/tc39/proposal-async-iteration
    // async *[Symbol.asyncIterator] () {
    //     for (let i = 0; i < this.length; i += 1) {
    //         yield await this.at(i);
    //     }
    // }

    /**
     * This symbol is used by the default `Object.toString()` method, and will result in
     * `[object PromisedList]`.
     *
     * @see http://blog.keithcirkel.co.uk/metaprogramming-in-es6-symbols/#symboltostringtag
     *
     * @return {String}
     */
    get [Symbol.toStringTag] () {
        return "PromisedList";
    }

    /**
     * This symbol is used when trying to coerce this object into another type.
     * If you try to cast a PromisedList as a string, e.g. `"" + myList`,
     * you'll get a string representation of the list, and if you try to cast it as a number,
     * e.g. `+myList`, you'll get the length of the list, and if you try to cast it some other way,
     * you'll get the json representation, e.g. `myList + ""`
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/toPrimitive
     *
     * @param  {String}  hint  One of "string", "number", or "default"
     * @return {Mixed}
     */
    [Symbol.toPrimitive] (hint) {
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
}

export default PromisedList;
