import {BsonDeserializeStream} from "./BsonDeserializeStream";

const bsonDeserializer = new BsonDeserializeStream();

describe("Web Stream API BsonDeserializeStream basic usage", () => {
  test("", async (done) => {
    const res = await (Bun.file("./playlogs.bson")).text();
    console.log("ff");
    res.body.pipeThrough(bsonDeserializer).pipeTo(new WritableStream<unknown>({
      write: chunk => console.log(JSON.stringify(chunk)),
      close: () => done()
    }));
  })
});
