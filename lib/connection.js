const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./main.db', (err) => {
    if (err) {
        console.error('Error connecting to the SQLite database:', err);
        return;
    }
    console.log('Connected to the SQLite database');
});

function getById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM patients WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function getByFullName(fullName) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM patients WHERE full_name LIKE ?', [`%${fullName}%`], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

module.exports = {
    db,
    getById,
    getByFullName
};
