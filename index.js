chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("randomPartyButton").addEventListener("click", () => {
    generateRandomParty();
  });

  function checkCurrentTab() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let currentTab = tabs[0];
      let url = currentTab.url;

      if (url && url.includes("geoguessr.com")) {
        document.getElementById("sidepanel-content").style.display = "block";
        document.getElementById("warning-message").style.display = "none";
      } else {
        document.getElementById("sidepanel-content").style.display = "none";
        document.getElementById("warning-message").style.display = "block";
      }
    });
  }

  checkCurrentTab();

  chrome.tabs.onActivated.addListener(() => {
    checkCurrentTab();
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      checkCurrentTab();
    }
  });

  document
    .querySelector(".generator-title i")
    .addEventListener("mouseover", function () {
      document.querySelector(".generator-informations").style.visibility =
        "visible";
      document.querySelector(".generator-informations").style.opacity = "1";
    });

  document
    .querySelector(".generator-title i")
    .addEventListener("mouseout", function () {
      document.querySelector(".generator-informations").style.visibility =
        "hidden";
      document.querySelector(".generator-informations").style.opacity = "0";
    });

  const checkboxIds = ["map", "time", "move", "pan", "zoom", "rounds"];
  const checkboxes = {};

  checkboxIds.forEach((id) => {
    const checkbox = document.getElementById(id);
    loadCheckboxState(checkbox);
    checkboxes[id] = checkbox.checked;
    checkbox.addEventListener("change", () => {
      checkboxes[id] = checkbox.checked;
      saveCheckboxState(checkbox);
    });
  });

  async function generateRandomParty() {
    console.log("checkboxes", checkboxes);

    const getRandomUrlMap = async () => {
      if (checkboxes.map) {
        const mapPlayUrl = await generateRandomMap();
        return `https://www.geoguessr.com/maps${mapPlayUrl}`;
      }
    };

    const mapUrl = await getRandomUrlMap();

    console.log("mapUrl", mapUrl);

    const currentSettings = await getLocalStorageFromTab();

    const settings = JSON.stringify(
      generateRandomSettings(JSON.parse(currentSettings))
    );

    console.log("settings", settings);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: setLocalStorage,
        args: ["game-settings", settings],
      });
      if (checkboxes.map) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: goToUrl,
          args: [mapUrl],
        });
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: realoadPage,
        });
      }
    });
  }

  async function fetchData() {
    try {
      let responseData = [];

      for (let page = 0; page < 3; page++) {
        const response = await fetch(
          `https://www.geoguessr.com/api/v3/social/maps/browse/popular/official?count=54&page=${page}`
        );
        const data = await response.json();
        responseData = responseData.concat(data);
      }

      return responseData;
    } catch (error) {
      console.error("Erreur lors de la requête vers l'API externe :", error);
    }
  }

  async function generateRandomMap() {
    const data = await fetchData();
    if (data && data.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.length);
      const randomMap = data[randomIndex];

      return randomMap.playUrl;
    } else {
      console.error("Aucune carte trouvée.");
    }
  }

  function getLocalStorageFromTab() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: getLocalStorage,
            args: ["game-settings"],
          },
          (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result[0].result);
            }
          }
        );
      });
    });
  }

  function setLocalStorage(name, value) {
    localStorage.setItem(name, value);
  }

  function getLocalStorage(name) {
    return localStorage.getItem(name);
  }

  function goToUrl(url) {
    window.location.replace(url);
  }

  function realoadPage() {
    window.location.reload();
  }

  function saveCheckboxState(checkbox) {
    localStorage.setItem(checkbox.id, checkbox.checked);
  }

  function loadCheckboxState(checkbox) {
    const savedState = localStorage.getItem(checkbox.id);
    if (savedState !== null) {
      checkbox.checked = savedState === "true";
    }
  }

  function generateRandomSettings(currentSettings) {
    console.log("currentSettings", currentSettings);

    const randomData = (type, id, localName) => {
      if (checkboxes[id]) {
        if (type === "randomBoolean") {
          return Math.random() >= 0.5;
        } else if (type === "randomTime") {
          return Math.floor(Math.random() * (600 / 10 + 1)) * 10;
        } else if (type === "randomRounds") {
          return Math.floor(Math.random() * 5 + 1);
        }
      } else {
        return currentSettings[localName];
      }
    };

    const forbidMoving = randomData("randomBoolean", "move", "forbidMoving");
    const forbidRotating = randomData("randomBoolean", "pan", "forbidRotating");
    const forbidZooming = randomData("randomBoolean", "zoom", "forbidZooming");
    const timeLimit = randomData("randomTime", "time", "timeLimit");
    const rounds = randomData("randomRounds", "rounds", "rounds");

    return {
      forbidMoving,
      forbidRotating,
      forbidZooming,
      timeLimit,
      rounds,
    };
  }
});
