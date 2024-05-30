const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel");
require("dotenv").config();

const uri = process.env.MONGODB_URI || "url";

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function seedAdmin() {
  try {
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const adminDetails = {
      fullName: "adminLw",
      email: "adminlw@yopmail.com",
      mobile: "1234567890",
      password: "password123",
      otp: null,
      role: "admin", // or 'superadmin'
    };

    const existingAdmin = await Admin.findOne({ email: adminDetails.email });
    if (existingAdmin) {
      console.log("Admin with this email already exists");
    } else {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      adminDetails.password = await bcrypt.hash(adminDetails.password, salt);

      if (!adminDetails.otp) {
        adminDetails.otp = "777777";
      }

      const admin = new Admin(adminDetails);
      await admin.save();
      console.log("Admin Seeded Successfully via Script");
    }
  } catch (error) {
    console.error("Error Seeding Admin Via Script:", error);
  } finally {
    mongoose.connection.close();
  }
}

seedAdmin();
