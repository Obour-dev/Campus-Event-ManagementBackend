const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const verifyAdmin = require("../middleware/verifyAdmin");

// POST /register - Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, preferences, isAdmin } = req.body;
    
    console.log('Registration request body:', {
      name,
      email,
      preferences,
      isAdmin: !!isAdmin // Log the boolean conversion
    });

    if (!name || !email || !password || !preferences) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Force isAdmin to true for this specific email
    const isAdminUser = email === "admintest@test.com" ? true : false;
    
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      preferences,
      isAdmin: isAdminUser // Use our forced value
    });

    console.log('About to save user with isAdmin:', newUser.isAdmin);

    await newUser.save();
    
    const savedUser = await User.findOne({ email }).lean();
    console.log('Saved user:', {
      email: savedUser.email,
      isAdmin: savedUser.isAdmin
    });

    res.status(201).json({ 
      message: "User registered successfully!",
      isAdmin: savedUser.isAdmin // Include in response
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /signin - Authenticate a user
router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin }, // Include isAdmin for role-based access
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ message: "Sign-in successful!", token });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET /:userId - Fetch user details
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean(); // Add .lean() for better performance
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Ensure default values for preferences and RSVPs
    if (!user.preferences) user.preferences = "";
    if (!user.rsvps) user.rsvps = [];

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// PATCH /:userId - Update user details
router.patch("/:userId/preferences", async (req, res) => {
    try {
      const { userId } = req.params;
      const { preferences } = req.body;
  
      if (!preferences) {
        return res.status(400).json({ message: "Preferences are required." });
      }
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      user.preferences = preferences;
      await user.save();
  
      res.status(200).json(user);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  });
  
  

module.exports = router;
