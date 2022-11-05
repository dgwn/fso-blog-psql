const jwt = require("jsonwebtoken");
const router = require("express").Router();

const { SECRET } = require("../util/config");
const User = require("../models/user");
const ActiveSession = require("../models/activeSessions");

router.post("/", async (req, res) => {
  const body = req.body;
  const user = await User.findOne({ where: { username: body.username } });

  const passwordCorrect = body.password === "secret";

  if (!(user && passwordCorrect)) {
    return res.status(401).json({
      error: "invalid username or password"
    });
  }

  const userForToken = {
    username: user.username,
    id: user.id
  };

  const token = jwt.sign(userForToken, SECRET);
  const checkSessions = await ActiveSession.findOne({
    where: { user_id: userForToken.id }
  });
  if (!checkSessions) {
    const activeSession = await ActiveSession.create({
      user_id: userForToken.id
    });
  }

  res.status(200).send({ token, username: user.username, name: user.name });
});

module.exports = router;
