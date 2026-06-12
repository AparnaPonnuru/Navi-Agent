async function test() {
  try {
    console.log("Testing POST /states...");
    const resStatesPost = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: "India" })
    });
    const statesPostJson = await resStatesPost.json();
    console.log("POST /states result error status:", statesPostJson.error);
    console.log("POST /states states count:", statesPostJson.data?.states?.length);

    console.log("\nTesting GET /states with query parameter...");
    const resStatesGet = await fetch("https://countriesnow.space/api/v0.1/countries/states/?country=India");
    const statesGetJson = await resStatesGet.json();
    console.log("GET /states result error status:", statesGetJson.error);
    console.log("GET /states states count:", statesGetJson.data?.states?.length);

    console.log("\nTesting POST /state/cities...");
    const resCitiesPost = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: "India", state: "Telangana" })
    });
    const citiesPostJson = await resCitiesPost.json();
    console.log("POST /state/cities result error status:", citiesPostJson.error);
    console.log("POST /state/cities cities count:", citiesPostJson.data?.length);

    console.log("\nTesting GET /state/cities with query parameters...");
    const resCitiesGet = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities/?country=India&state=Telangana");
    const citiesGetJson = await resCitiesGet.json();
    console.log("GET /state/cities result error status:", citiesGetJson.error);
    console.log("GET /state/cities cities count:", citiesGetJson.data?.length);

  } catch (err) {
    console.error("Error during test:", err);
  }
}
test();
