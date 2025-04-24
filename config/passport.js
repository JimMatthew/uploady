const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");

module.exports = function (passport, secret) {
  const users = [
    {
      id: 1,
      username: process.env.USERNAME,
      passwordHash: require("bcryptjs").hashSync(process.env.PASSWORD, 10),
    },
  ];

  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret,
  };

  passport.use(
    new JwtStrategy(opts, (jwtPayload, done) => {
      const user = users.find((u) => u.id === jwtPayload.id);
      done(null, user || false);
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    const user = users.find((u) => u.id === id);
    done(null, user);
  });
};