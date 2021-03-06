process.env.NODETLSREJECTUNAUTHORIZED = "0"; // Don't do this in a production environment
const fetch = require("node-fetch");
const FormData = require("form-data");

const JenkinsURL = "https://example.com/";

//Adapted from https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g
async function get(url, api, sleepTime, attempts, prop) {
  console.info(`Calling ${api} API @`, url);
  try {
    const response = await fetch(url);
    const json = await response.json();
    //onst objProperty = await json[prop];
    const objProperty = json[prop]; //why await accessing a property on a json object? Not async
    if (objProperty === undefined) {
      //leave the possibility that number is zero??
      if (!attempts) throw new Error(`The ${api} api is not returning ${prop}`);
      attempts -= 1;
      await sleep(sleepTime);
      //return await get(url, api, sleepTime, attempts, prop); //tail end recursion
      return get(url, api, sleepTime, attempts, prop); //no need to await if you are returning result
    }
    return objProperty;
  } catch (err) {
    console.error(err);
  }
}

// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function triggerBuildReturnLocation(data) {
  const path = "job/jobname/buildWithParameters";
  const token = "?token="; //API requires a Token!
  const url = encodeURI(JenkinsURL + path + token);
  const formData = new FormData();
  // My Jenkins build requires a file.
  formData.append(
    "filepath/filename",
    JSON.stringify(data),
    "filepath/filename"
  );
  //return await postFormGrabLocation(url, formData);
  return postFormGrabLocation(url, formData); // no need to await
}

async function postFormGrabLocation(url, formData) {
  try {
    const response = await fetch(url, { method: "POST", body: formData });
    // return await response.headers.get("location");
    return response.headers.get("location"); //no need to await if returning
  } catch (err) {
    console.error(err);
  }
}

async function getBuildNumberFromQueue(location, attempts = 2) {
  const queueURL = location + "api/json";
  const executable = await get(queueURL, "Queue", 5000, attempts, "executable");
  return executable && executable.number;
}

async function getBuildStatus(number, attempts = 3) {
  const postFix = "job/jobname/" + number + "/api/json";
  const buildURL = encodeURI(JenkinsURL + postFix);
  //return await get(buildURL, "Build", 30000, attempts, "result");
  return get(buildURL, "Build", 30000, attempts, "result"); // no need to await if returning
}

// Used Async/Await for readability, code reuse, and debugging.
async function run() {
  const location = await triggerBuildReturnLocation({});
  await sleep(8000); // Build # isn't available immediately
  const number = await getBuildNumberFromQueue(location);
  await sleep(30000); // Builds take min 45sec max 95 seconds
  // return await getBuildStatus(number);
  return getBuildStatus(number); // no need to await
}

//console.log(run())//run would be expected to return a promise here!
run()
  .then(number => console.log(`successfully run with number ${number}`))
  .catch(err => console.error(err));

module.exports = {
  get,
  getBuildStatus,
  getBuildNumberFromQueue,
  JenkinsBaseURL: JenkinsURL,
  postFormGrabLocation,
  run,
  sleep,
  triggerBuildReturnLocation
};
