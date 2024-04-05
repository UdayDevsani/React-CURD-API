const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'udev',
  database: 'crud'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to MySQL');
});

app.post('/register', async (req, res) => {
  const { name, dob, email, password } = req.body;

  if (!name || !dob || !email || !password) {
    return res.status(400).json({ error: 'Please fill in all fields' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const user = { name, dob, email, password: hash };
    const sql = 'INSERT INTO users SET ?';
    await db.query(sql, user);
    console.log('User registered successfully');
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = results[0];
    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const secretKey = '8ed15b4361efcad7705435b9d39cd82ff75a135a0d698e895114e855e2ea9ecf';
      const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });
      res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error('Error during password comparison:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/companies', (req, res) => {
  const query = 'SELECT * FROM companies';
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).send('Error fetching data from database');
      throw err;
    }
    
    const formattedResult = result.map(company => {
      return {
        ...company,
        startDate: new Date(company.startDate).toLocaleDateString()
      };
    });

    res.json(formattedResult);
  });
});

let companies = [];

app.post('/api/companies/add', (req, res) => {
  const { name, companyName, position, age, startDate } = req.body;

  if (!name || !companyName || !position || !age || !startDate) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  const sql = 'INSERT INTO companies (name, companyName, position, age, startDate) VALUES (?, ?, ?, ?, ?)';
  const values = [name, companyName, position, age, startDate];
  
  db.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error adding company:', error);
      return res.status(500).json({ error: 'Failed to add company' });
    }
    
    const newCompany = {
      id: results.insertId,
      name,
      companyName,
      position,
      age,
      startDate
    };
    
    res.status(201).json(newCompany);
  });
});

app.get('/api/companies/:id', (req, res) => {
  const companyId = req.params.id;

  const sql = 'SELECT * FROM companies WHERE id = ?';
  db.query(sql, [companyId], (err, result) => {
    if (err) {
      console.error('Error fetching company data:', err);
      return res.status(500).json({ error: 'Error fetching company data' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(result[0]);
  });
});

app.put('/api/companies/edit/:id', (req, res) => {
  const companyId = req.params.id;
  const { name, companyName, position, age, startDate } = req.body;

  if (!name || !companyName || !position || !age || !startDate) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }

  const sql = 'UPDATE companies SET name=?, companyName=?, position=?, age=?, startDate=? WHERE id=?';
  const values = [name, companyName, position, age, startDate, companyId];

  db.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error updating company:', error);
      return res.status(500).json({ error: 'Failed to update company' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updatedCompany = {
      id: companyId,
      name,
      companyName,
      position,
      age,
      startDate
    };

    res.status(200).json(updatedCompany);
  });
});

app.delete('/api/companies/delete/:id', (req, res) => {
  const companyId = req.params.id;

  const sql = 'DELETE FROM companies WHERE id = ?';
  db.query(sql, [companyId], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Error deleting company' });
      throw err;
    }
    res.status(200).json({ message: 'Company deleted successfully' });
  });
});

app.get('/logout', (req, res) => {
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
