import {BsonDeserializeStream} from "./BsonDeserializeStream";

const bsonDeserializer = new BsonDeserializeStream();

describe("Web Stream API BsonDeserializeStream basic usage", () => {
  test("", (done) => {
    const res = await fetch("./playlogs.bson");
    res.body.pipeThrough()
  })
});
