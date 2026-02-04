const CryptoJS = require("crypto-js");

function encryptCCAvenue(data, workingKey) {
  const key = CryptoJS.enc.Utf8.parse(workingKey);
  const iv = CryptoJS.enc.Utf8.parse(workingKey.substring(0, 16));

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
}

module.exports = { encryptCCAvenue };
