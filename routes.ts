import { Router } from 'express';
import { User, Assignment, Submission } from './db.js';

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
      return res.json(user);
    }
    return res.status(401).json({ error: "Invalid email or password" });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const userData = req.body;
    let user = await User.findOne({ uid: userData.uid });
    
    if (user) {
      user = await User.findOneAndUpdate({ uid: userData.uid }, userData, { new: true });
      return res.json(user);
    }
    
    user = new User(userData);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to save user" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    res.json(user || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find({});
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

router.post("/assignments", async (req, res) => {
  try {
    const assignmentData = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
    const assignment = new Assignment(assignmentData);
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.get("/submissions", async (req, res) => {
  try {
    const submissions = await Submission.find({});
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/submissions", async (req, res) => {
  try {
    const submissionData = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
    const submission = new Submission(submissionData);
    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.patch("/submissions/:id", async (req, res) => {
  try {
    const submission = await Submission.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!submission) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: "Failed to update submission" });
  }
});

export default router;
