exports.toMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
