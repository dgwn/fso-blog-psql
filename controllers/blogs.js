const router = require("express").Router();

const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { SECRET } = require("../util/config");

const { Blog, User } = require("../models");
const ActiveSession = require("../models/activeSessions");

const errorHandler = (error, req, res, next) => {
  console.error(`Error(s): [${error.message}]`);
  res.status(400).json({ error });
  next();
};

const tokenExtractor = (req, res, next) => {
  const authorization = req.get("authorization");
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    try {
      req.decodedToken = jwt.verify(authorization.substring(7), SECRET);
    } catch {
      res.status(401).json({ error: "token invalid " });
    }
  } else {
    res.status(401).json({ error: "token missing" });
  }
  next();
};

router.get("/", async (req, res) => {
  const where = {};

  if (req.query.search) {
    where[Op.or] = {
      title: {
        [Op.iLike]: "%" + req.query.search + "%"
      },
      author: {
        [Op.iLike]: "%" + req.query.search + "%"
      }
    };
  }
  const blogs = await Blog.findAll({
    order: [["likes", "DESC"]],
    attributes: { exclude: ["userId"] },
    include: {
      model: User,
      attributes: ["name"]
    },
    where
  });
  res.json(blogs);
});

router.post("/", tokenExtractor, async (req, res) => {
  try {
    const user = await User.findByPk(req.decodedToken.id);
    const session = await ActiveSession.findOne({
      where: { user_id: Number(user.id) }
    });
    if (session) {
      if (user.disabled == false) {
        const blog = await Blog.create({ ...req.body, userId: user.id });
        return res.json(blog);
      } else {
        return res.status(400).json("user is disabled");
      }
    } else {
      return res.status(401).json({ message: "You must be logged in" });
    }
  } catch (error) {
    return res.status(400).json({ error });
  }
});

router.delete("/:id", tokenExtractor, async (req, res) => {
  try {
    const user = await User.findByPk(req.decodedToken.id);
    const blog = await Blog.findOne({ where: { id: Number(req.params.id) } });
    const session = await ActiveSession.findOne({
      where: { user_id: Number(user.id) }
    });
    if (session) {
      if (user.disabled == false) {
        if (blog) {
          if (blog.userId == user.id) {
            await blog.destroy();
            return res.status(200).json({ message: "Resource Deleted" });
          } else {
            return res
              .status(401)
              .json({ message: "Sorry, you most be the blog's poster" });
          }
        }
        return res.status(404).json({ message: "Resource does not exist" });
      } else {
        return res.status(400).json("user is disabled");
      }
    } else {
      return res.status(401).json({ message: "You must be logged in" });
    }
  } catch (error) {
    return res.status(400).json({ error });
  }
});

router.put("/:id", async (req, res) => {
  const blog = await Blog.findOne({ where: { id: Number(req.params.id) } });
  if (blog) {
    if (req.body.likes) {
      await blog.update({ likes: req.body.likes });
      return res.json(blog);
    }

    const e = new Error("'likes' parameter is invalid");
    e.name = "invalid parameters";
    throw e;
  }
  return res.status(404).json({ message: "Resource does not exist" });
});

router.use(errorHandler);

module.exports = router;
