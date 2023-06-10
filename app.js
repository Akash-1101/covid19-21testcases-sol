const express = require("express");
const bcrypt = require("bcrypt");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const jwt = require("jsonwebtoken");
const initializeServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("The server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(e.message);
  }
};
initializeServer();
const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "blackBoxKey", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
//API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const CheckUserQuery = `SELECT * FROM user WHERE username='${username}'`;
  const dbuser = await db.get(CheckUserQuery);
  if (dbuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbuser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "blackBoxKey");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API 2
app.get("/states/", authentication, async (request, response) => {
  const GetQuery = `SELECT state_id AS stateId,state_name AS stateName ,population FROM state ORDER BY state_id`;
  const dbresponse = await db.all(GetQuery);
  response.send(dbresponse);
});
//API 3
app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const GetQuery = `SELECT state_id AS stateId,state_name AS stateName ,population FROM state WHERE state_id=${stateId}`;
  const dbresponse = await db.get(GetQuery);
  response.send(dbresponse);
});
//API4
app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const CreateQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  await db.run(CreateQuery);
  response.send("District Successfully Added");
});
//API 5
app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const GetQuery = `SELECT district_id AS districtId,district_name AS districtName,state_id AS stateId,cases,cured,active,deaths FROM district WHERE district_id=${districtId}`;
    const dbresponse = await db.get(GetQuery);
    response.send(dbresponse);
  }
);
//API 6
app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const GetQuery = `DELETE FROM district WHERE district_id=${districtId}`;
    const dbresponse = await db.all(GetQuery);
    response.send("District Removed");
  }
);
//API 7
app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const CreateQuery = `UPDATE district SET district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} WHERE district_id=${districtId}`;
    await db.run(CreateQuery);
    response.send("District Details Updated");
  }
);
//API 8
app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const getQuery = `SELECT 
                        SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,SUM(deaths) AS totalDeaths 
                    FROM 
                        district 
                    WHERE 
                        state_id=${stateId}`;
    const dbresponse = await db.get(getQuery);
    response.send(dbresponse);
  }
);
module.exports = app;
