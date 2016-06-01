import PromisedList from "../src";

describe("PromisedList", () => {
    it("should be able to return a specific result", () =>
        new PromisedList([
            Promise.resolve("a"),
            Promise.resolve("b"),
        ]).at(1).should.eventually.equal("b")
    );

    it("should cache results", done => {
        const results = new PromisedList([{}, {}]);
        Promise.all([results.at(1), results.at(1)]).then(([foo1, foo2]) => {
            foo1.should.eql(foo2);
            done();
        });
    });

    it("should have an iterator that returns Promises", () => {
        const results = new PromisedList([
            Promise.resolve("a"),
            Promise.resolve("b"),
        ]);
        let numIterations = 0;
        for (const foo of results) {
            foo.should.be.instanceof(Promise);
            numIterations += 1;
        }
        numIterations.should.equal(2);
    });

    it("should have an `each` method", () => {
        const expected = ["a", "b"];
        return new PromisedList([
            Promise.resolve("a"),
            Promise.resolve("b"),
        ]).each((actual, i) => {
            actual.should.equal(expected[i]);
        });
    });

    it("should have a `map` method", () =>
        new PromisedList([
            Promise.resolve("a"),
            Promise.resolve("b"),
        ]).map(foo => `${foo}2`)
            .should.eventually.deep.equal(["a2", "b2"])
    );

    it("should have a `pluck` method", () =>
        new PromisedList([
            Promise.resolve({ a: 1 }),
            Promise.resolve({ a: 2 }),
        ]).pluck("a")
            .should.eventually.deep.equal([1, 2])
    );

    it("should have a `reduce` method", () =>
        new PromisedList([
            Promise.resolve({ a: 1 }),
            Promise.resolve({ a: 2 }),
        ]).reduce((memo, foo) => memo + foo.a, 0)
            .should.eventually.deep.equal(3)
    );

    it("should have a `find` method", () =>
        new PromisedList([
            Promise.resolve({ a: 1 }),
            Promise.resolve({ a: 2 }),
        ]).find(foo => foo.a === 2)
            .should.eventually.deep.equal({ a: 2 })
    );

    it("should have a `filter` method", () =>
        new PromisedList([
            Promise.resolve({ a: 1 }),
            Promise.resolve({ a: 2 }),
        ]).filter(foo => foo.a === 2)
            .should.eventually.deep.equal([{ a: 2 }])
    );

    it("should have a `filter` method", () =>
        new PromisedList([
            Promise.resolve({ a: 1 }),
            Promise.resolve({ a: 2 }),
        ]).reject(foo => foo.a === 2)
            .should.eventually.deep.equal([{ a: 1 }])
    );

    it("should have an `all` method", () =>
        Promise.all([
            new PromisedList([
                Promise.resolve({ a: 1 }),
                Promise.resolve({ a: 2 }),
            ]).all(foo => foo.a === 1)
                .should.eventually.be.false,
            new PromisedList([
                Promise.resolve({ a: 1 }),
                Promise.resolve({ a: 1 }),
            ]).all(foo => foo.a === 1)
                .should.eventually.be.true,
        ])
    );

    it("should have an `any` method", () =>
        Promise.all([
            new PromisedList([
                Promise.resolve({ a: 1 }),
                Promise.resolve({ a: 2 }),
            ]).any(foo => foo.a === 2)
                .should.eventually.be.true,
            new PromisedList([
                Promise.resolve({ a: 1 }),
                Promise.resolve({ a: 1 }),
            ]).any(foo => foo.a === 2)
                .should.eventually.be.false,
        ])
    );
});
