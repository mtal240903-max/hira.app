// Évite d'écrire try/catch dans chaque controller :
// on enveloppe la fonction async, toute erreur est transmise à next()
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
