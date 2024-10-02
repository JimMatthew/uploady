const express = require("express");
const path = require("path");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
const ConfigStorageType = require("./ConfigStorageType");
const sshController = require("./controllers/sshController");

const users = [
  { id: 1, username: "admin", passwordHash: bcrypt.hashSync("123", 10) },
];

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

io.on("connection", sshController);

mongoose.set("strictPopulate", false);
const mongoDB = "mongodb://192.168.1.237:27017/myapp";
main().catch((err) => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}

app.use(
  session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

passport.use(
  new LocalStrategy((username, password, done) => {
    const user = users.find((user) => user.username === username);
    if (!user) {
      return done(null, false, { message: "Incorrect username." });
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return done(null, false, { message: "Incorrect password." });
    }
    return done(null, user);
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

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

const routes = require("./routes/route")(
  path.join(__dirname, "uploads"),
  isAuthenticated,
  ConfigStorageType.DATABASE
);
const sftpRouter = require("./routes/sftpRouter")(isAuthenticated);
//const routes = require('./routes/route')(path.join(__dirname, 'uploads'), isAuthenticated, ConfigStorageType.LOCAL)

app.use("/", routes);

app.use("/sftp", sftpRouter);

app.get("/login", (req, res) => {
  res.render("login", { message: req.session.messages || "" });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/files",
    failureRedirect: "/login",
    failureMessage: true,
  })
);

// Logout route
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/login");
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Error handler middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render("error", {
    errorMessage: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
