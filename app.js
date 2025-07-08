const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Brand = require("./models/brand");
const multer = require("multer");
const path = require("path");
const Product = require("./models/product");
const ProductPart = require("./models/productParts");
const User = require("./models/user");
const StockLedger = require("./models/stcokLedger");
const Razorpay = require('razorpay')

// Set up storage engine for image uploads
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '')}`);
  },
});


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const app = express();
const PORT = process.env.PORT || 8000;

// MongoDB Connection Setup
mongoose
.connect("mongodb+srv://root:Shubu%40123@testing.rdqvgba.mongodb.net/inventory_db")
// .connect('mongodb://localhost:27017/inventory_db')
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

app.use('/uploads', express.static('uploads'));

// CORS Middleware Setup
app.use(
  cors({
    origin: ["http://localhost:3001",'http://localhost:5173','https://jovial-bublanina-0badd9.netlify.app'], // Allow requests only from this origin
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type",
  })
);

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Setup Nodemailer Transporter (Use your email service)
const transporter = nodemailer.createTransport({
  service: "gmail", // You can replace this with any service (e.g., Outlook, SMTP)
  auth: {
    user: "sumitsahumech6@gmail.com", // Your email
    pass: "xacj smwu fqzg zosf", // Your email password or app-specific password
  },
});

// POST Route for Contact Form
app.post("/api/send-email", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required!" });
    }

    // Save contact to MongoDB
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();

    // Send Email to YOU (Admin)
    const adminMailOptions = {
      from: email,
      to: "sumitsahumech6@gmail.com", // Your email to receive the message
      subject: `New Contact Form Submission: ${subject}`,
      text: `You got a new message from ${name} (${email}):\n\n${message}`,
    };

    // Send "Thank You" Email to the User
    const userMailOptions = {
      from: "sumitsahumech6@gmail.com",
      to: email,
      subject: "Thank You for Contacting Us!",
      text: `Hi ${name},\n\nThank you for reaching out! We received your message and will get back to you soon.\n\nBest regards,\nYour Company Name`,
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(201).json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User Registration
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
      });
  
      await newUser.save();

      res.json({ message: "User registered successfully", user: newUser });
  } catch (error) {
      res.status(500).json({ error: "Registration failed" });
  }
});

// User Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.status(401).json({ error: "Please enter a valid email address" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
          return res.status(401).json({ error: "please enter a valid password" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, 'process.env.JWT_SECRET', { expiresIn: "1h" });
      res.json({ message: "Login successful", token, user });
  } catch (error) {
    console.log(error);
      res.status(500).json({ error: "Login failed" });
  }
});

//Create Brand Api
app.post("/api/brands", upload.single("image"), async (req, res) => {
  try {
    const { brandName } = req.body;

    if (!brandName) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    // Check if brand already exists (case-insensitive match)
    const existingBrand = await Brand.findOne({ brandName: { $regex: new RegExp(`^${brandName}$`, 'i') } });

    if (existingBrand) {
      return res.status(409).json({ message: "Brand name already exists" });
    }

    let image = null;
    if (req.file) {
      image = req.file.filename;
    }

    const newBrand = new Brand({
      brandName,
      image
    });

    const savedBrand = await newBrand.save();

    res.status(201).json({ message: "Brand created successfully!", brand: savedBrand });

  } catch (error) {
    console.error("Error creating brand:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Update Brand api
app.put("/api/brands/:id", upload.single("image"), async (req, res) => {
  try {
    const brandId = req.params.id;
    const { brandName } = req.body;

    if (!brandName) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Update fields
    brand.brandName = brandName;
    brand.updatedAt = Date.now();
    if (req.file) {
      brand.image = req.file.filename;
    }

    const updatedBrand = await brand.save();

    res.status(200).json({ message: "Brand updated successfully", brand: updatedBrand });

  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Delete Brand Api
app.put("/api/brands/:id/delete", async (req, res) => {
  try {
    const brandId = req.params.id;

    const deletedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { isDeleted: true, deletedOn: Date.now() },
      { new: true }
    );

    if (!deletedBrand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.status(200).json({ message: "Brand deleted successfully", brand: deletedBrand });

  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get All Brands
app.get("/api/brands", async (req, res) => {
  try {
    const {limit} = req.query;

    let brands = await Brand.find({
      isDeleted: false
    }).limit(parseInt(limit) || 0).lean();

    brands = brands.map(brand => ({
      ...brand,
      image : brand.image || null
    }));


    res.json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create Product API
app.post("/api/products", upload.array("images", 5), async (req, res) => {
  try {
    const { itemName, brand, model, description } = req.body;

    if (!itemName || !description || !model || !brand) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let imageFilenames = [];
    if (req.files && req.files.length > 0) {
      imageFilenames = req.files.map(file => file.filename);
    }

    // Save product data to DB with images
    const newProduct = new Product({
      itemName,
      brand,
      model,
      description,
      images: imageFilenames
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({ message: "Product created successfully!", product: savedProduct });

  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Product Api
app.put("/api/products/:id", upload.array("images", 5), async (req, res) => {
  try {
    const { itemName, brand, model, description } = req.body;
    const productId = req.params.id;

    if (!itemName || !description || !model || !brand) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find existing product
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Process uploaded images (optional)
    let imageFilenames = existingProduct.images || [];

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.filename);
      imageFilenames = imageFilenames.concat(newImages);
    }

    // Update product fields
    existingProduct.itemName = itemName;
    existingProduct.brand = brand;
    existingProduct.model = model;
    existingProduct.description = description;
    existingProduct.images = imageFilenames;
    existingProduct.updatedAt = Date.now();

    const updatedProduct = await existingProduct.save();

    res.status(200).json({ message: "Product updated successfully!", product: updatedProduct });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//delete product api
app.put("/api/products/:id/delete", async (req, res) => {
  try {
    const productId = req.params.id;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: true, deletedOn: Date.now() },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product soft-deleted successfully", product: updatedProduct });

  } catch (error) {
    console.error("Error soft deleting product:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create Product Part
app.post("/api/productPart", upload.array("images", 5), async (req, res) => {
  try {
    const { productId, partName, category, description } = req.body;

    if (!productId || !partName || !category || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let imageFilenames = [];
    if (req.files && req.files.length > 0) {
      imageFilenames = req.files.map(file => file.filename);
    }

    // Save product data to DB with images
    const newProductPart = new ProductPart({
      productId,
      partName,
      description,
      category,
      images: imageFilenames
    });

    await newProductPart.save();
    const populated = await ProductPart.populate(newProductPart, "productId");


    res.status(201).json({ message: "Product part created successfully!", productPart: populated });

  } catch (error) {
    console.error("Error creating product part:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Update product part api
app.put("/api/productPart/:id", upload.array("images", 5), async (req, res) => {
  try {
    const partId = req.params.id;
    const { productId, partName, category, description } = req.body;

    if (!productId || !partName || !category || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const productPart = await ProductPart.findById(partId);
    if (!productPart) {
      return res.status(404).json({ message: "Product part not found" });
    }

    // Prepare new images (if any uploaded)
    let imageFilenames = productPart.images || [];
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.filename);
      imageFilenames = imageFilenames.concat(newImages);
    }

    // Update fields
    productPart.productId = productId;
    productPart.partName = partName;
    productPart.category = category;
    productPart.description = description;
    productPart.images = imageFilenames;
    productPart.updatedAt = Date.now();

    const updatedPart = await productPart.save();

    res.status(200).json({ message: "Product part updated successfully!", productPart: updatedPart });

  } catch (error) {
    console.error("Error updating product part:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Delete product part api
app.put("/api/productPart/:id/delete", async (req, res) => {
  try {
    const partId = req.params.id;

    const deletedPart = await ProductPart.findByIdAndUpdate(
      partId,
      { isDeleted: true, deletedOn: Date.now() },
      { new: true }
    );

    if (!deletedPart) {
      return res.status(404).json({ message: "Product part not found" });
    }

    res.status(200).json({ message: "Product part deleted successfully!", productPart: deletedPart });

  } catch (error) {
    console.error("Error deleting product part:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All products
app.get("/api/products", async (req, res) => {
  try {
    const { limit, brand } = req.query;

    const filter = {isDeleted:false};
    if (brand) {
      filter.brand = brand;
    }

    let products = await Product.find(filter)
      .populate({ path: 'brand', select: 'brandName image' })
      .limit(parseInt(limit) || 0)
      .lean();

    products = products.map(product => ({
      ...product,
      images : product.images || [],
      brand: product.brand ? {
        brandName: product.brand.brandName,
        image: product.brand.image || null
      } : null
    }))

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//get product details with product parts with its category
app.get("/api/products/:id", async (req, res) => {
  try {
      const product = await Product.findById(req.params.id)
      .populate({path: 'brand', select: 'brandName image'})
      .lean();

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      // Attach brand image URL
      if (product.brand) {
        product.brand = {
          brandId: product.brand._id,
          brandName: product.brand.brandName,
          image: product.brand.image || null
        };
      }

      let productParts = await ProductPart.find({productId : product._id, isDeleted:false}).lean();

      productParts = productParts.map(part => ({
        ...part,
        images : part.images || null,
      }))

      res.json({ 
        message: "Product details get successfully", 
        product, 
        productParts 
      });

  } catch (error) {
    console.log(error)
      res.status(500).json({ error: "Address request failed" });
  }
});

//Get all product parts 
app.get("/api/productPart", async (req, res) => {
  try {
      const productParts = await ProductPart.find({isDeleted:false})
      .populate({path: 'productId', select: 'itemName'})
      .lean();

      res.json({ 
        message: "Product part details get successfully", 
        productParts, 
      });

  } catch (error) {
    console.log(error)
      res.status(500).json({ error: "Address request failed" });
  }
});

//get product part details with product details
app.get("/api/productPart/:id", async (req, res) => {
  try {
      const productPart = await ProductPart.findById(req.params.id).lean();

      let productDetails = await Product.find({_id : productPart.productId})
      .populate({path: 'brand', select: 'brandName image'})
      .lean();

      productDetails = productDetails.map(product => ({
        ...product,
        images : product.images || [],
        brand: product.brand ? {
          brandId: product.brand._id,
          brandName: product.brand.brandName,
          image: product.brand.image || null
        } : null
      }))

      res.json({ 
        message: "Product part details get successfully", 
        productPart, 
        productDetails 
      });

  } catch (error) {
    console.log(error)
      res.status(500).json({ error: "Address request failed" });
  }
});

//add inventory api
app.post("/api/inventory/add", async (req, res) => {
  try {
    const items = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one inventory item is required" });
    }

    const stockEntries = [];

    for (const item of items) {
      const { productId, productPartId, qty, remark } = item;

      if (!qty || (!productId && !productPartId)) {
        continue; // Skip invalid items
      }

      const stockEntry = new StockLedger({
        productId: productId,
        productPartId: productPartId,
        stockType: 'In',
        qty: qty,
        remark
      });

      const savedStock = await stockEntry.save();

      const populatedStock = await savedStock
        .populate([
          { path: 'productId', select: 'itemName' },
          { path: 'productPartId', select: 'partName' }
        ])

      stockEntries.push(populatedStock);
    }

    res.status(200).json({
      message: "Inventory added successfully",
      stockEntries
    });

  } catch (error) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Update add stock api
app.put("/api/inventory/:id", async (req, res) => {
  try {
    const inventoryId = req.params.id;
    const { qty } = req.body;

    if (qty === undefined || qty === null) {
      return res.status(400).json({ message: "Quantity (qty) is required" });
    }

    // Find the existing stock ledger entry
    const stockEntry = await StockLedger.findById(inventoryId);
    if (!stockEntry) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    // Update only the quantity
    stockEntry.qty = qty;
    stockEntry.updatedAt = Date.now();

    const updatedEntry = await stockEntry.save();

    res.status(200).json({ message: "Inventory quantity updated successfully", stockEntry: updatedEntry });

  } catch (error) {
    console.error("Error updating inventory quantity:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Delete stock api
app.put("/api/inventory/:id/delete", async (req, res) => {
  try {
    const inventoryId = req.params.id;

    const deletedEntry = await StockLedger.findByIdAndUpdate(
      inventoryId,
      { isDeleted: true,
        deletedOn: Date.now()
       },
      { new: true }
    );

    if (!deletedEntry) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.status(200).json({ message: "Inventory entry deleted successfully", stockEntry: deletedEntry });

  } catch (error) {
    console.error("Error soft deleting inventory:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Get inventory
app.get("/api/inventory", async (req, res) => {
  try {
      const inventory = await StockLedger.find({isDeleted:false})
      .populate({path: 'productId', select: 'itemName'})
      .populate({path: 'productPartId', select: 'partName'})
      .lean();

      res.json({ 
        message: "Inventory details get successfully", 
        inventory 
      });

  } catch (error) {
    console.log(error)
      res.status(500).json({ error: "Address request failed" });
  }
});

//Get Products from Inventory
app.get("/api/inventory/products", async (req, res) => {
  try {
    //unique product ids
    const productIds = await StockLedger.distinct('productId', { isDeleted: false });

    const products = await Product.find({ _id: { $in: productIds } }, { itemName: 1 });

    res.status(200).json({
      message: "Products fetched successfully from inventory",
      products,
    });

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products from inventory" });
  }
});

//Get productParts from this inventory based on this productId
app.get("/api/inventory/productParts/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }


    const partIds = await StockLedger.distinct('productPartId', { 
      productId, 
      isDeleted: false 
    });

    if (partIds.length === 0) {
      return res.status(404).json({ message: "No parts found for this product in inventory" });
    }

    const productParts = await ProductPart.find({ _id: { $in: partIds } }, { partName: 1 });

    res.status(200).json({
      message: "Product Parts fetched successfully",
      productParts,
    });

  } catch (error) {
    console.error("Error fetching product parts:", error);
    res.status(500).json({ error: "Failed to fetch product parts from inventory" });
  }
});

//deduct inventory api
app.post("/api/inventory/deduct", async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one inventory item is required" });
    }

    const stockEntries = [];

    for (const item of items) {
      const { productId, productPartId, qty, remark } = item;

      if (!qty || (!productId && !productPartId)) {
        continue; // Skip invalid items
      }

      const stockEntry = new StockLedger({
        productId: productId,
        productPartId: productPartId,
        stockType: 'Out',
        qty: qty,
        remark
      });

      const savedStock = await stockEntry.save();

      const populatedStock = await savedStock
        .populate([
          { path: 'productId', select: 'itemName' },
          { path: 'productPartId', select: 'partName' }
        ])
      stockEntries.push(populatedStock);
    }

    res.status(200).json({
      message: "Inventory deduct successfully",
      stockEntries
    });

  } catch (error) {
    console.error("Error deducting inventory:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//calculate stock qty respect to productId productPartId
app.post("/api/inventory/calculateStock", async (req, res) => {
  try {
    const { productId, productPartId} = req.body;

    if ((!productId && !productPartId)) {
      return res.status(400).json({ message: "Product and Part are required" });
    }

    const matchCondition = {isDeleted: false};
    if (productId) matchCondition.productId = productId;
    if (productPartId) matchCondition.productPartId = productPartId;

    const result = await StockLedger.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: [{ $eq: ["$stockType", "In"] }, "$qty", 0]
            }
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ["$stockType", "Out"] }, "$qty", 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          stockQuantity: { $subtract: ["$totalIn", "$totalOut"] }
        }
      }
    ]);

    const stockQuantity = result.length > 0 ? result[0].stockQuantity : 0;

    res.status(200).json({
      stockQuantity
    });

  } catch (error) {
    console.error("Error calculating stock:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//Inventory Stock Report
app.get("/api/stock-report", async (req, res) => {
  try {

    const stockData = await StockLedger.aggregate([
      { $match: { isDeleted: false } }, 
      {
        $group: {
          _id: { productId: "$productId", productPartId: "$productPartId" },
          totalIn: {
            $sum: { $cond: [{ $eq: ["$stockType", "In"] }, "$qty", 0] }
          },
          totalOut: {
            $sum: { $cond: [{ $eq: ["$stockType", "Out"] }, "$qty", 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productPartId: "$_id.productPartId",
          stockQty: { $subtract: ["$totalIn", "$totalOut"] }
        }
      }
    ]);

    const finalReport = [];

    for (const item of stockData) {
      let productName = null;
      let productPartName = null;

      if (item.productId) {
        const product = await Product.findById(item.productId).lean();
        productName = product ? product.itemName : null;
      }

      if (item.productPartId) {
        const productPart = await ProductPart.findById(item.productPartId).lean();
        productPartName = productPart ? productPart.partName : null;
      }

      finalReport.push({
        productName: productName,
        productPartName: productPartName,
        stockQty: item.stockQty
      });
    }

    res.status(200).json({ stockReport: finalReport });

  } catch (error) {
    console.error("Error generating stock report:", error);
    res.status(500).json({ message: "Server error" });
  }
});



let otpStore = {};
// Forgot Password - Send OTP
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      

      // Send "Thank You" Email to the User
      const userMailOptions = {
        from: "sumitsahumech6@gmail.com",
        to: email,
        subject: "Password Reset OTP",
        text: `Hi ${user.name},\n Your OTP is: ${otp}`,
      };

      // Send both emails
      await transporter.sendMail(userMailOptions);

      otpStore[email] = otp;
      user.otp = otp;

      await user.save()

      res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
      console.log(error)
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// Verify OTP
app.post('/api/verify-otp', async(req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check OTP
  if (user.otp !== otp) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // Generate OTP token
  const otpToken = jwt.sign({ email }, 'process.env.JWT_SECRET', { expiresIn: '1h' });

  // Clear OTP
  user.otp = null;
  await user.save();

  res.status(200).json({ message: "OTP verified successfully", otpToken });
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  const { newPassword, otpToken} = req.body;
  try {
      const decoded = jwt.verify(otpToken, 'process.env.JWT_SECRET');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const user = await User.findOneAndUpdate(
        { email: decoded.email },
        { password: hashedPassword },
        { new: true }
      );

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
      console.log(error)
      res.status(400).json({ error: "Invalid token or token expired" });
  }
});


// Start the Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
