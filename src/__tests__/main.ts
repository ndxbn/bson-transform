import * as fs from "node:fs"
import {BsonTransform} from "../";
import * as path from "node:path";

describe("BsonStream Usage", () => {
  test("read BSON file", (done) => {
    const bsonReadStream = fs.createReadStream(path.resolve(__dirname, "testing_collection.bson"));
    const bsonTransform = new BsonTransform();

    bsonReadStream.pipe(bsonTransform).on("data", (jsonString) => {
      const obj = JSON.parse(jsonString);
      expect(obj).toHaveProperty("name");
    }).on("end", () => {
      done();
    });
  });
});
