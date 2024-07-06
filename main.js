const electron = require("electron");
const url = require("url");
const path = require("path");
const db = require("./lib/connection").db;
const moment = require("moment");

const { app, BrowserWindow, ipcMain } = electron;

let mainWindow, receptionWindow, addWindow;

app.on("ready", () => {
  createMainWindow();

  ipcMain.on("submit", (e, data) => {
    db.all("SELECT * FROM main", (err, results) => {
      if (err) {
        console.log("Database error:", err);
        return;
      }
      let success = false;
      let x = "";
      for (let i = 0; i < results.length; i++) {
        if (
          data[0] === results[i].username &&
          data[1] === results[i].password
        ) {
          success = true;
          x = results[i].position;
          break;
        }
      }
      if (success) {
        console.log("Success");
        mainWindow.webContents.send("successlogin", x);
        setTimeout(() => {
          createReceptionWindow();
          mainWindow.close();
          mainWindow = null;
        }, 1500);
      } else {
        console.log("Fail");
        mainWindow.webContents.send("faillogin");
      }
    });
  });

  ipcMain.on("create_add_window", () => {
    createAddWindow();
  });

  ipcMain.on("close_submit", () => {
    addWindow.close();
    addWindow = null;
  });

  ipcMain.on("new_patient", (event, data) => {
    let id = -1;

    db.all("SELECT * FROM patients", (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }

      id = rows.length + 1;
      console.log(id);

      const userData = {
        fullName: data["fullName"],
        email: data["email"],
        phone: data["phone"],
        date: data["date"],
        gender: data["gender"],
        address: data["address"],
        country: data["country"],
        epd: data["epd"],
        related_doctor: data["related_doctor"],
        about: data["about"],
      };

      const query = `
                INSERT INTO patients 
                (id, full_name, email, number, about, birthdate, doctor, address, country, epd, gender, reg_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      db.run(
        query,
        [
          id,
          userData.fullName,
          userData.email,
          userData.phone,
          userData.about,
          userData.date,
          userData.related_doctor,
          userData.address,
          userData.country,
          userData.epd,
          userData.gender,
          moment().format("YYYY-MM-DD"),
        ],
        function (err) {
          if (err) {
            return console.error(err.message);
          }
          console.log(`A row has been inserted with rowid ${this.lastID}`);
        }
      );
    });
  });

  ipcMain.on("refresh_requests", () => {
    refreshing();
  });

  ipcMain.on("delete_request", (err, data) => {
    delete_row(data);
  });

  ipcMain.on("newAboutWindow", (err, data) => {
    newAboutWindow();
  });

  ipcMain.on("search_request", (event, searchInput) => {
    if (!isNaN(searchInput)) {
      db.all(
        "SELECT * FROM patients WHERE id = ?",
        searchInput,
        (err, rows) => {
          receptionWindow.webContents.send("search_data", rows);
        }
      );
    } else {
        db.all('SELECT * FROM patients WHERE full_name LIKE ?', [`%${searchInput}%`], (err, row) => {
            receptionWindow.webContents.send("search_data", row)
        })
  }});
});

function newAboutWindow(id) {
  newAboutWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    fullscreen: true,
  });

  newAboutWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/newAboutWindow.html"),
      protocol: "file:",
      slashes: true,
    })
  );
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/mainWindow.html"),
      protocol: "file:",
      slashes: true,
    })
  );
}

function createReceptionWindow() {
  receptionWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    resizable: true,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  receptionWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/reception_window.html"),
      protocol: "file:",
      slashes: true,
    })
  );
}

function createAddWindow() {
  addWindow = new BrowserWindow({
    width: 1000,
    height: 1300,
    resizable: false,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  addWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/addWindow.html"),
      protocol: "file:",
      slashes: true,
    })
  );

  if (addWindow) {
    addWindow.on("close", () => {
      addWindow = null;
      receptionWindow.webContents.send("add_window_closed");
    });
  }
}

function refreshing() {
  db.all("SELECT * FROM patients", (err, rows) => {
    if (err) {
      console.log("Error while connecting to the db: " + err.message);
    } else {
      if (receptionWindow) {
        receptionWindow.webContents.send("refreshing", rows);
      }
    }
  });
}

function delete_row(id) {
  db.all("DELETE FROM patients WHERE id=(?)", id, (err) => {
    if (err) {
      console.log("Error about -> " + err.message);
    } else {
      console.log("Deleted succesfully");
    }
  });
}
