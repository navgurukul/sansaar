const CryptoJS = require('crypto-js');

const CONSTANTS = require('../../config/index')
const Key = CONSTANTS.auth.password.passwordSecretKey;

const algorithm = 'aes-256-cbc'; // This is just a placeholder, not used directly in crypto-js
const key = CryptoJS.enc.Hex.parse(Key);


const encrypt = (password) => {
    const iv = CryptoJS.lib.WordArray.random(16); // Generate a new IV each time
    const encrypted = CryptoJS.AES.encrypt(password, key, { iv: iv });
    return {
        iv: iv.toString(),
        encryptedData: encrypted.toString()
    };
}

const decrypt = (encryptedPassword) => {
    const iv = CryptoJS.enc.Hex.parse(encryptedPassword.iv);
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword.encryptedData, key, { iv: iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

const verifyPassword = (inputPassword, storedEncryptedPassword) => {
    const decryptedStoredPassword = decrypt(storedEncryptedPassword);
    return inputPassword === decryptedStoredPassword;
};

module.exports = {
    encrypt,
    decrypt,
    verifyPassword
}