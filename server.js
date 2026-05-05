require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'swift_ride',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT middleware
const verifyToken = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Role-based authorization
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Routes
app.post('/api/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim().escape(),
  body('phone').optional().isMobilePhone()
], validateRequest, async (req, res) => {
  const { email, password, role = 'customer', name, phone } = req.body;

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE User_Email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute('INSERT INTO users (User_Email, User_Password, User_Role, User_Name, User_Phone) VALUES (?, ?, ?, ?, ?)', 
      [email, hashedPassword, role, name, phone]);
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
});
// GET all users (Admin Only)
app.get('/api/users', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT User_ID, User_Name, User_Email, User_Role FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE User_Email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.User_Password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.User_ID, role: user.User_Role }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token, role: user.User_Role });
  } catch (error) {
    res.status(500).json({ message: 'Error during login' });
  }
});

app.get('/api/bookings', verifyToken, async (req, res) => {
  try {
    const [bookings] = await pool.query('SELECT * FROM bookings');
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});





app.post('/api/assign-driver', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const { bookingId, driverId } = req.body;
  try {
    const [result] = await pool.execute('UPDATE bookings SET Booking_DriverID = ?, Booking_Status = "confirmed" WHERE Booking_ID = ?', [driverId, bookingId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ message: 'Error assigning driver' });
  }
});
app.delete('/api/bookings/:id', verifyToken, authorizeRoles('customer'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM bookings WHERE Booking_ID = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json({ message: 'Booking canceled successfully' });
  } catch (error) {
    console.error('Error canceling booking:', error);
    res.status(500).json({ message: 'Error canceling booking' });
  }
});
// Customer books a new ride
// Customer books a new ride
app.post('/api/bookings', verifyToken, authorizeRoles('customer'), async (req, res) => {
  const { pickupLocation, dropoffLocation, fare } = req.body;
  const userId = req.user.userId;

  try {
    const [result] = await pool.execute(
      `INSERT INTO bookings (Booking_CustomerID, Booking_PickupLocation, Booking_DropoffLocation, Booking_Status, Booking_Date, Booking_Fare)
       VALUES (?, ?, ?, 'pending', NOW(), ?)`,
      [userId, pickupLocation, dropoffLocation, fare]
    );
    res.status(201).json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error('Error booking ride:', error);
    res.status(500).json({ message: 'Error booking ride' });
  }
});

// Customer fetch their own bookings
app.get('/api/my-bookings', verifyToken, authorizeRoles('customer'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [bookings] = await pool.execute('SELECT * FROM bookings WHERE Booking_CustomerID = ?', [userId]);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({ message: 'Error fetching your bookings' });
  }
});

// Driver fetch their assigned bookings
app.get('/api/driver-bookings', verifyToken, authorizeRoles('driver'), async (req, res) => {
  try {
    const driverId = req.user.userId;
    const [bookings] = await pool.execute('SELECT * FROM bookings WHERE Booking_DriverID = ?', [driverId]);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    res.status(500).json({ message: 'Error fetching driver bookings' });
  }
});
// Driver updates status of assigned booking
app.put('/api/bookings/:id/status', verifyToken, authorizeRoles('driver'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const driverId = req.user.userId;

  try {
    // Only allow updating if the driver is assigned to the booking
    const [bookings] = await pool.execute('SELECT * FROM bookings WHERE Booking_ID = ? AND Booking_DriverID = ?', [id, driverId]);
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'Booking not found or not assigned to you' });
    }

    // Update the booking status
    await pool.execute('UPDATE bookings SET Booking_Status = ? WHERE Booking_ID = ?', [status, id]);
    res.json({ message: 'Booking status updated successfully' });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Error updating booking status' });
  }
});
// Driver fetch their assigned bookings
app.get('/api/driver-bookings', verifyToken, authorizeRoles('driver'), async (req, res) => {
  try {
    const driverId = req.user.userId;
    const [bookings] = await pool.execute('SELECT * FROM bookings WHERE Booking_DriverID = ?', [driverId]);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    res.status(500).json({ message: 'Error fetching driver bookings' });
  }
});


// Add Vehicle
// Add Vehicle
app.post('/api/vehicles', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const { model, plate, type, capacity } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('SAVEPOINT before_insert');

    await connection.execute(
      'INSERT INTO vehicles (Vehicle_Model, Vehicle_RegNo, Vehicle_Type, Vehicle_Capacity) VALUES (?, ?, ?, ?)',
      [model, plate, type, capacity]
    );

    await connection.commit();
    res.status(201).json({ message: 'Vehicle added successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error adding vehicle:', error);
    res.status(500).json({ message: 'Failed to add vehicle' });

  } finally {
    connection.release();
  }
});



// Get All Vehicles
app.get('/api/vehicles', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [vehicles] = await pool.execute('SELECT * FROM vehicles');
    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching vehicles' });
  }
});

// Delete Vehicle
app.delete('/api/vehicles/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction(); // Start transaction
    await connection.query('SAVEPOINT before_delete'); // Savepoint

    const [result] = await connection.execute('DELETE FROM vehicles WHERE Vehicle_ID = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback(); // If not found, rollback
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    await connection.commit(); // Success
    res.json({ message: 'Vehicle deleted successfully' });

  } catch (error) {
    await connection.rollback(); // Rollback on error
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: 'Failed to delete vehicle' });

  } finally {
    connection.release();
  }
});
// Check if email already exists
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE User_Email = ?', [email]);
    if (users.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ message: 'Error checking email' });
  }
});




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
