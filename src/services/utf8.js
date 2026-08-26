/*
  UTF-8 byte-length helper for browser and Node.

  The Node global `Buffer` is not available in the browser, so byte counting
  (used by the Memo set-name byte counter and length check) must not depend on
  it. TextEncoder is available in both environments and reports the UTF-8 byte
  length of a string.
*/

// Return the number of UTF-8 bytes in a string.
function byteLength (str) {
  return new TextEncoder().encode(String(str)).length
}

module.exports = { byteLength }
