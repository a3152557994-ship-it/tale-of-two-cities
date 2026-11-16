/** Mini-tool build: no external-URL QR code on the share card (ShareCard.js skips it). */
export default {
  toDataURL() {
    return Promise.reject(new Error('QR code disabled in mini-tool build'));
  }
};
