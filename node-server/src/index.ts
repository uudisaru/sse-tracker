import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { loadCoordinates, Location, locationGenerator } from './geo-utlis';

interface LocationData {
  locations: Location[];
}

const locationData: LocationData = {
  locations: []
};
const port = 8128 || process.env.PORT;
const corsOptions = {
  origin: 'http://localhost:1234'
}

const app = express();
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("Hi!");
});

app.get("/locations", async (req, res) => {
  res.status(200).set({
    "connection": "keep-alive",
    "cache-control": "no-cache",
    "Content-Type": "text/event-stream"
  });

  let speed = 1.4; // Speed in m/s
  if (req.query.speed) {
    speed = (Number(req.query.speed) * 1000) / 3600;
  }
  console.debug("Speed:", speed);
  const asyncIterator = locationGenerator(locationData.locations, speed);
  for await (const position of asyncIterator) {
    if (res.socket.destroyed) {
      break;
    }
    const id = position.i;
    delete position.i;
    const message = `id: ${id}\nevent: pos\ndata: ${JSON.stringify(position)}\n\n`
    res.write(message);
  }
  res.write('id: end\nevent: end\ndata: end\n\n');
});

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`server started at http://localhost:${port}`);
  const data = path.join(__dirname, "./data/tew.csv");
  fs.readFile(data, 'utf-8', (err, csv) => {
    if (err) {
      throw err;
    }

    locationData.locations = loadCoordinates(csv);
  });
});