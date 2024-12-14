const express = require("express");
const Event = require("../models/event");
const verifyAdmin = require("../middleware/verifyAdmin");
const router = express.Router();
const auth = require("../middleware/auth");

// POST /create - Admin-only route to create events
router.post("/create", auth, verifyAdmin, async (req, res) => {
  try {
    const { name, date, location, capacity, eventType } = req.body;

    if (!name || !date || !location || !capacity || !eventType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const event = new Event({ name, date, location, capacity, eventType });
    await event.save();

    res.status(201).json({ message: "Event created successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// GET / - Fetch all events
router.get("/", async (req, res) => {
  try {
    const { eventType } = req.query;
    const filter = eventType ? { eventType } : {};
    const events = await Event.find(filter);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// POST /:eventId/rsvp - RSVP for an event
router.post("/:eventId/rsvp", async (req, res) => {
  try {
    const { userId } = req.body;
    const { eventId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (event.capacity <= 0) {
      return res.status(400).json({ message: "No seats available." });
    }

    if (event.rsvps.includes(userId)) {
      return res.status(400).json({ message: "User has already RSVP'd for this event." });
    }

    await Event.updateOne(
      { _id: eventId },
      {
        $push: { rsvps: userId },
        $inc: { capacity: -1 },
      }
    );

    const updatedEvent = await Event.findById(eventId);
    res.status(200).json({ message: "RSVP successful!", event: updatedEvent });
  } catch (error) {
    res.status(500).json({ message: "Failed to RSVP for the event." });
  }
});

// GET /user/:userId - Fetch RSVP'd events for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.find({ rsvps: userId })
    .populate("rsvps", 'name email')
    .exec();

    if (!events || events.length === 0) {
        return res.status(404).json({ message: "No RSVP'd events found." });
      }
      
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// DELETE route to delete an event (protected, admin only)
router.delete('/delete/:id', auth, verifyAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
