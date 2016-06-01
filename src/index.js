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

/**
 * @class PromisedList
 */
class PromisedList {
    constructor (list) {
        this.__list__ = list;
    }

    get length () {
        return this.__list__.length;
    }

    /**
     * Helper method for the `each`, `map` and `reduce` methods below.
     *
     * @param  {Function}  callback
     * @return {Promise.<Mixed[]>}
     */
    __each__ (callback) {
        return new Promise((resolve, reject) => {
            const iter = this[Symbol.iterator]();
            let i = 0;
            let result = iter.next();
            const returnValues = [];

            const wrapper = item => {
                let stopped = false;
                Promise.resolve(callback({
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
    }

    // TODO: tests and docs for push/pop/shift/unshift & toArray

    pop () {
        const result = this.at(this.length - 1); // use .at so result gets wrapped properly
        this.__list__.pop();
        return result;
    }

    push (...items) {
        this.__list__.push(...items);
        return this.length;
    }

    shift () {
        const result = this.at(0); // use .at so result gets wrapped properly
        this.__list__.shift();
        return result;
    }

    unshift (...items) {
        this.__list__.unshift(...items);
        return this.length;
    }

    toArray () {
        return this.__each__(obj => obj.item);
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
    each (callback) {
        return this.__each__(obj =>
            Promise.resolve(callback(obj.item, obj.index)).then(answer => {
                if (answer === false) {
                    obj.stop();
                }
            })
        ).then(() => undefined);
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
}

export default PromisedList;
