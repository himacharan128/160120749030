const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

let clientID = "";
let clientSecret = "";
let authorizationToken = "";
app.post("/train/register", async (req, res) => {
  const registrationData = req.body;

  try {
    const registrationResponse = await axios.post(
      process.env.REGISTRATION_API_URL,
      registrationData
    );

    clientID = registrationResponse.data.clientID;
    clientSecret = registrationResponse.data.clientSecret;

    const authResponse = await axios.post(process.env.AUTH_API_URL, {
      ...registrationData,
      clientID,
      clientSecret,
    });

    authorizationToken = authResponse.data.access_token;
    console.log("Authorization successful:", authorizationToken);

    res.json({ message: "Registration and authorization successful" });
  } catch (error) {
    console.error("Registration or Authorization error:", error.message);
    res.status(500).json({ error: "Registration or Authorization error" });
  }
});

app.get("/train/trains", async (req, res) => {
  try {
    if (!authorizationToken) {
      throw new Error("Authorization token not available");
    }

    const trainDataResponse = await axios.get(
      process.env.TRAIN_DATA_API_URL,
      {
        headers: {
          Authorization: `Bearer ${authorizationToken}`,
        },
      }
    );

    const processedTrainData = processTrainData(trainDataResponse.data);

    res.json(processedTrainData);
  } catch (error) {
    console.error("Error fetching train data:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

function processTrainData(rawData) {
  const currentTime = new Date();
  const twelveHoursLater = new Date();
  twelveHoursLater.setHours(currentTime.getHours() + 12);

  const filteredTrains = rawData.filter((train) => {
    const departureTime = new Date(train.departureTime);
    return departureTime > currentTime && departureTime <= twelveHoursLater;
  });

  const processedData = filteredTrains.map((train) => {
    const { trainNumber, departureTime, seatAvailability, pricing } = train;

    return {
      trainNumber,
      departureTime,
      seatAvailability: {
        sleeper: seatAvailability.sleeper,
        AC: seatAvailability.AC,
      },
      pricing: {
        sleeper: pricing.sleeper,
        AC: pricing.AC,
      },
    };
  });

  return processedData;
}
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
