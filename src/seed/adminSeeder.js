const mongoose = require("mongoose");
const Admin = require("../models/adminModel");

const uri = process.env.MONGODB_URI;

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

async function seedAdmin() {
  try {
    await mongoose.connect(
      `mongodb+srv://pchetan839:Developer123%23@cluster0.xboeayk.mongodb.net/lyrics-web-db?retryWrites=true&w=majority&appName=Cluster0`,
      clientOptions
    );
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
      if (!adminDetails.otp) {
        adminDetails.otp = "777777";
      }
      const admin = new Admin(adminDetails);
      await admin.save();
      console.log("Admin seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
  //   finally {
  //     mongoose.connection.close();
  //   }
}

seedAdmin();
