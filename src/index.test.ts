import * as fs from "node:fs"
import * as path from "node:path";

import * as bson from "bson";

import {BsonTransform} from "./";

describe("BsonStream Usage", () => {
  test("read BSON file", (done) => {
    const bsonReadStream = fs.createReadStream(path.resolve(__dirname, "testing_collection.bson"));
    const bsonTransform = new BsonTransform();

    bsonReadStream.pipe(bsonTransform).on("data", (chunk) => {
      expect(chunk).toHaveProperty("name");
    }).on("end", () => {
      done();
    });
  });

  test("turn off ObjectMode, chunk should be RAW BSON Buffer", (done) => {
    const bsonReadStream = fs.createReadStream(path.resolve(__dirname, "testing_collection.bson"));
    const bsonTransform = new BsonTransform({objectMode: false});

    bsonReadStream.pipe(bsonTransform).on("data", (chunk) => {
      expect(() => {
        // chunk should be deserializable
        bson.deserialize(chunk);
      }).not.toThrowError();
    }).on("end", () => {
      done();
    });
  });
});
