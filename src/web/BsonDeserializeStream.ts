import * as bson from "bson";

type BsonStreamOptions = {
  /**
   * default is max size of MongoDB document.
   * If the BSON might be larger than MongoDB BSON,
   *   you should configure this option.
   */
  maxDocumentLength?: number
};

export class BsonDeserializeStream<I = Buffer, O> implements Transformer<I,O> {
  // options
  private readonly maxDocumentLength;

  // current statements
  private buffer: Buffer;
  private documentLength: number | null = null;

  public constructor(options: BsonStreamOptions) {
    // Default is MongoDB Limits and Thresholds
    // https://www.mongodb.com/docs/manual/reference/limits/#bson-documents
    const maxDocumentLength = options.maxDocumentLength ?? 1024 * 1024 * 16;
    if (maxDocumentLength > 2147483647) { // 2 ** 32; signed 32bit maximum
      throw new Error('maxDocLength can not exceed 2147483647 bytes')
    }
    this.maxDocumentLength = maxDocumentLength;

    this.buffer = Buffer.alloc(0); // Compiler
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
  public transform(chunk: I, controller: TransformStreamDefaultController<O>) {
    const newLength = this.buffer.length + chunk.length;

    this.buffer = Buffer.concat([this.buffer, chunk], newLength);
    this.parseDocs(controller);
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
   */
  private parseDocs(controller: TransformStreamDefaultController) {
    // BSON spec: https://bsonspec.org/spec.html

    // first, make sure the expected document length
    if (this.documentLength === null) {
      // first 4 bytes is the total number of bytes comprising the document.
      if (this.buffer.length < 4) {
        // wait to complete length
        return;
      }

      const documentLength = this.buffer.readInt32LE(0);
      if (documentLength > this.maxDocumentLength) {
        // discard buffer
        this.reset();
        controller(new Error('document exceeds configured maximum length'));
        return;
      }
      this.documentLength = documentLength;
    }

    if (this.buffer.length < this.documentLength) {
      // wait to complete length
      return;
    }

    // since the complete document is in the buffer, try to read nad parse it as BSON.
    try {
      const raw = this.buffer.subarray(0, this.documentLength);
      const parsed = bson.deserialize(raw);

      // if successfully complete to parse
      this.push(parsed);
      this.buffer = this.buffer.subarray(this.documentLength); // shift buffer
      this.documentLength = null; // to parse next doc
    } catch (err) {
      this.reset();
      // Almost err is BSONError type.
      // If err is not BSONError or string, it's unexpected bug.
      const error = err instanceof Error ? err : new Error(err as string);
      controller(error);
      return;
    }

    // if there might be any document and parsable
    if (this.buffer.length > 4) {
      this.parseDocs(controller);
    } else {
      controller();
    }

  }

}
