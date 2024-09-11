import * as bson from "bson";
import {Transform, TransformCallback, TransformOptions} from "node:stream";

type BsonStreamOptions = TransformOptions & {
  /**
   * default is max size of MongoDB document.
   * If the BSON might be larger than MongoDB BSON,
   *   you should configure this option.
   */
  maxDocumentLength?: number
};

/**
 *
 */
export class BsonTransform extends Transform {

  // options
  private readonly maxDocumentLength;

  // current statements
  private buffer: Buffer = new Buffer(0);
  private documentLength: number | null = null;

  public constructor(options: BsonStreamOptions = {objectMode: true}) {
    options.objectMode = options.objectMode ?? true;
    super(options);

    // Default is MongoDB Limits and Thresholds
    // https://www.mongodb.com/docs/manual/reference/limits/#bson-documents
    const maxDocumentLength = options.maxDocumentLength ?? 1024 * 1024 * 16;
    if (maxDocumentLength > 2147483647) { // 2 ** 32; signed 32bit maximum
      throw new Error('maxDocLength can not exceed 2147483647 bytes')
    }
    this.maxDocumentLength = maxDocumentLength;

    this.reset();
  }

  /**
   * This function MUST NOT be called by application code directly.
   *
   * This function is entry point of Transform Stream.
   *
   * @override
   * @internal
   */
  public _transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
    const newLength = this.buffer.length + chunk.length;

    this.buffer = Buffer.concat([this.buffer, chunk], newLength);
    this.parseDocs(callback);
  }

  /**
   * truncate internal buffer
   * @private
   */
  private reset() {
    this.buffer = Buffer.alloc(0);
    this.documentLength = null;
  }

  /**
   * read docLength bytes and parse to JavaScript Object
   * @param callback
   * @private
   */
  private parseDocs(callback: TransformCallback) {
    // BSON spec: https://bsonspec.org/spec.html

    // first, make sure the expected document length
    if (this.documentLength === null) {
      // first 4 bytes is the total number of bytes comprising the document.
      if (this.buffer.length < 4) {
        // wait to complete length
        callback();
        return;
      }

      const documentLength = this.buffer.readInt32LE(0);
      if(documentLength > this.maxDocumentLength) {
        // discard buffer
        this.reset();
        callback(new Error('document exceeds configured maximum length'));
        return;
      }
      this.documentLength = documentLength;
    }

    if (this.buffer.length < this.documentLength) {
      // wait to complete length
      callback();
      return;
    }

    // since the complete document is in the buffer, try to read nad parse it as BSON.
    try {
      const raw = this.buffer.subarray(0, this.documentLength);
      const parsedOrRaw = this.writableObjectMode ? bson.deserialize(raw) : raw;

      // if successfully complete to parse
      this.push(parsedOrRaw);
      this.buffer = this.buffer.subarray(this.documentLength); // shift buffer
      this.documentLength = null; // to parse next doc
    } catch (err) {
      this.reset();
      // Almost err is BSONError type.
      // If err is not BSONError or string, it's unexpected bug.
      const error = err instanceof Error ? err : new Error(err as string);
      callback(error);
      return;
    }

    // if there might be any document and parsable
    if (this.buffer.length > 4) {
      this.parseDocs(callback);
    } else {
      callback();
    }

  }

}
