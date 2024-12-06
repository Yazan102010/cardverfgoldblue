// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config(); // Load environment variables

// Declare the 'app' object
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());  // Ensure JSON parsing is enabled for POST requests

const PORT = process.env.PORT || 4000;

// Connect to MongoDB using environment variable for URI
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB connection error:', err));

// Define the Profile Schema
const profileSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate usernames
        trim: true, // Removes extra whitespace
    },
    name: String,
    jobTitle: String,
    profileImage: String,
    headerImage: String,
    phone: String,
    email: String,
    isVerified: {
        type: Boolean,
        default: false,
        validate: {
            validator: function (value) {
                // Allow `isVerified` to be true only if `isCompany` is true
                return !value || this.isCompany;
            },
            message: "Only companies can be verified.",
        },
    },
    isCompany: {
        type: Boolean,
        default: false,
    },
    socialLinks: {
        website: String,
        instagram: String,
        facebook: String,
        telegram: String,
        tiktok: String,
        youtube: String,
        whatsapp: String,
        maps: String,
        snapchat: String,
    },
});

const Profile = mongoose.model("Profile", profileSchema);

// Routes

// Create a new profile
app.post("/api/save-profile", async (req, res) => {
    const { username, name, jobTitle, profileImage, headerImage, phone, email, isVerified, isCompany, socialLinks } = req.body;
    if (!username || username.trim().length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters long." });
    }

    // Generate a profile key based on the name (slug format)
    const profileKey = username.toLowerCase().replace(/\s+/g, '-'); // Convert spaces to hyphens

    const existingProfile = await Profile.findOne({ username });
    if (existingProfile) {
        return res.status(400).json({ message: "Username is already taken." });
    }

    const newProfile = new Profile({
        username,
        name,
        jobTitle,
        profileImage,
        headerImage,
        phone,
        email,
        isVerified,
        isCompany,
        socialLinks,
    });

    try {
        const savedProfile = await newProfile.save();
        res.status(201).json({ message: "Profile saved successfully", profileKey });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Profile key or username already exists." });
        }
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Get all profiles
app.get("/", async (req, res) => {
    try {
        const profiles = await Profile.find();
        res.status(200).json(profiles);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get a profile by unique name (profileKey)
app.get("/:profileKey", async (req, res) => {
    const profileKey = req.params.profileKey;

    try {
        const profile = await Profile.findOne({ username: profileKey });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: "Error fetching profile", error });
    }
});

// Delete a profile by profileKey
app.delete("/api/profiles/:profileKey", async (req, res) => {
    const { profileKey } = req.params;

    try {
        const profile = await Profile.findOneAndDelete({
            username: new RegExp(`^${profileKey.replace('-', ' ')}$`, 'i')
        });

        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update an existing profile by profileKey
app.put("/api/update-profile/:profileKey", async (req, res) => {
    const profileKey = req.params.profileKey;  // Get the profileKey from the URL params
    const { username, name, jobTitle, profileImage, headerImage, phone, email, isVerified, isCompany, socialLinks } = req.body;

    try {
        // Perform the update operation on the profile
        const updatedProfile = await Profile.findOneAndUpdate(
            { username: new RegExp(`^${profileKey}$`, "i") },
            { username, name, jobTitle, profileImage, headerImage, phone, email, isVerified, isCompany, socialLinks },
            { new: true } // This returns the updated profile
        );

        if (!updatedProfile) {
            return res.status(404).json({ message: "Profile not found" });
        }

        // Send the updated profile back in the response
        res.status(200).json(updatedProfile);
    } catch (error) {
        res.status(500).json({ message: "Error updating profile", error });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
