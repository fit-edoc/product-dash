/**
 * Encodes an object into a base64 string cursor
 * @param {Object} obj 
 * @returns {string|null}
 */
const encodeCursor = (obj) => {
  if (!obj) return null;
  try {
    return Buffer.from(JSON.stringify(obj)).toString('base64');
  } catch (err) {
    return null;
  }
};

/**
 * Decodes a base64 cursor string into an object
 * @param {string} cursorStr 
 * @returns {Object|null}
 */
const decodeCursor = (cursorStr) => {
  if (!cursorStr) return null;
  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf-8');
    return JSON.parse(jsonStr);
  } catch (err) {
    return null;
  }
};

module.exports = {
  encodeCursor,
  decodeCursor
};
