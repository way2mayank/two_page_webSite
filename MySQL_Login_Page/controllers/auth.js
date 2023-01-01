const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { promisify } = require("util");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "sql_login",
});

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).sendFile(__dirname + "/login.html", {
        message: "Please Provide an email and password",
      });
    }
    db.query(
      "SELECT * FROM userss WHERE email = ?",
      [email],
      async (err, results) => {
        console.log(results);
        if (
          !results ||
          !(await bcrypt.compare(password, results[0].password))
        ) {
          res.status(401).sendFile(__dirname + "/login.html", {
            message: "Email or Password is incorrect",
          });
        } else {
          const id = results[0].id;

          const token = jwt.sign({ id }, "sql_project", {
            expiresIn: 24*60*60,
          });

          console.log("the token is " + token);

          const cookieOptions = {
            expires: new Date(
              Date.now()
            ),
            httpOnly: true,
          };
          res.cookie("userSave", token, cookieOptions);
          res.status(200).redirect("/");
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
};




exports.register = (req, res) => {
  console.log(req.body);
  const { name, email, password, passwordConfirm } = req.body;
  db.query(
    "SELECT email from userss WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.log(err);
      } else {
        if (results.length > 0) {
          return res.sendFile(__dirname + "request.html", {
            message: "The email is already in use",
          });
        } else if (password != passwordConfirm) {
          return res.sendFile(__dirname + "request.html", {
            message: "Password dont match",
          });
        }
      }

      let hashedPassword = await bcrypt.hash(password, 8);
      console.log(hashedPassword);

      db.query(
        "INSERT INTO userss SET ?",
        { name: name, email: email, password: hashedPassword },
        (err, results) => {
          if (err) {
            console.log(err);
          } else {
            return res.sendFile(__dirname + "request.html", {
              message: "User registered",
            });
          }
        }
      );
    }
  );
  res.send("Form submitted");
};

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.userSave) {
    try {
      // 1. Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.userSave,
        process.env.JWT_SECRET
      );
      console.log(decoded);

      // 2. Check if the user still exist
      db.query(
        "SELECT * FROM userss WHERE id = ?",
        [decoded.id],
        (err, results) => {
          console.log(results);
          if (!results) {
            return next();
          }
          req.user = results[0];
          return next();
        }
      );
    } catch (err) {
      console.log(err);
      return next();
    }
  } else {
    next();
  }
};



exports.logout = (req, res) => {
  res.cookie("userSave", "logout", {
    expires: new Date(Date.now() + 2 * 1000),
    httpOnly: true,
  });
  res.status(200).redirect("/");
};
