const express = require("express");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const http = require("http");
const https = require('https');
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const jwt = require("jsonwebtoken");
const WebSocket = require("ws");
const fs = require("fs");
const sshSessionHandler = require("./controllers/ssh_session");
require("dotenv").config();
const users = [
  {
    id: 1,
    username: process.env.USERNAME,
    passwordHash: bcrypt.hashSync(process.env.PASSWORD, 10),
  },
];
const USE_HTTPS = process.env.USE_HTTPS === "true";

const app = express();

const server = USE_HTTPS
  ? https.createServer(
      {
        key: fs.readFileSync(process.env.HTTPS_KEY),
        cert: fs.readFileSync(process.env.HTTPS_CERT)
      },
      app
    )
  : http.createServer(app);

const cors = require("cors");
const { hostname } = require("os");

app.use(cors());
const wss = new WebSocket.Server({ server });
wss.on("connection", (socket) => {
  sshSessionHandler(socket);
});

mongoose.set("strictPopulate", false);
const mongoDB = process.env.DATABASE;
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "your_jwt_secret",
};
app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

passport.use(
  new JwtStrategy(jwtOptions, (jwtPayload, done) => {
    const user = users.find((user) => user.id === jwtPayload.id);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  })
);

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find((user) => user.id === id);
  done(null, user);
});

//routes for file manager
const routes = require("./routes/route")(path.join(__dirname, "uploads"));

//routes for sftp server manager
const sftpRouter = require("./routes/sftpRouter")();

app.use("/", routes);
app.use("/sftp", sftpRouter);

app.post("/apilogin", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((user) => user.username === username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // If the user is found and password matches, generate a JWT
  const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
    expiresIn: "8h",
  }); 
  return res.json({ token });
});

app.get("/apilogout", (req, res) => {
  req.logout(() => {
    return res.status(200).json({ message: "Use logged out" });
  });
});

app.use(express.static(path.join(__dirname, "client/build")));

// The "catchall" handler: for any request that doesn't match one above, send back index.html.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message); 

  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
