# bson-transform
Transform BSON to JavaScript Native Object.
[`node:stream/Transform`](https://nodejs.org/api/stream.html#class-streamtransform) and [`node:stream/web/TransformStream`](https://nodejs.org/api/webstreams.html#class-transformstream). 

## Example

```typescript
import * as fs from "node:fs"
import * as path from "node:path";

import {BsonTransform} from "bson-transform";

const bsonReadStream = fs.createReadStream(path.resolve(__dirname, "archive.bson"));
const bsonTransform = new BsonTransform();

bsonReadStream.pipe(bsonTransform).on("data", (doc) => {
  // do something
  });
```

If you want to only take each document by Raw BSON Buffer, turn off `ObjectMode`.

```typescript
import * as fs from "node:fs"
import * as path from "node:path";

import * as bson from "bson";

import {BsonTransform} from "bson-transform";

const bsonReadStream = fs.createReadStream(path.resolve(__dirname, "archive.bson"));
// if passed `ObjectMode: false` option, you can take BSON Bynary Buffer of each documents. 
const bsonTransform = new BsonTransform({ObjectMode: false});

bsonReadStream.pipe(bsonTransform).on("data", (documentBuffer) => {
    // deserializable. 
    const doc = bson.deserialize(documentBuffer);
    // ... and do something
  });

```
