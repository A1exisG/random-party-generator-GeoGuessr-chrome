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

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("randomPartyButton").addEventListener("click", () => {
    generateRandomParty();
  });

  updateHistory();

  function getChromeStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["generatedGames"], function (result) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.generatedGames);
        }
      });
    });
  }

  async function updateHistory() {
    try {
      const datas = await getChromeStorage();
      const container = document.getElementById("history-cards-container");
      document.getElementById("generated-games-number").innerText = `(${
        datas ? datas.length : 0
      })`;

      if (datas) {
        container.innerHTML = datas
          .map((data, index) => {
            return `
          <div>
            <div class='history-card' id='card-${index}'>
              <img src='${data.imgUrl}' alt='picture of ${data.map}' />
              <div class='settings-container'>
                <span>
                  ${
                    data.map && data.settings.rounds
                      ? `${data.map} - ${data.settings.rounds} ${
                          data.settings.rounds > 1 ? "rounds" : "round"
                        }`
                      : data.map ||
                        `${data.settings.rounds} ${
                          data.settings.rounds > 1 ? "rounds" : "round"
                        }`
                  }
                </span>
                <div class='settings-items-container'>
                  <div class='settings-item'>
                    <img src='img/time-limit.png' />
                    <span>${data.settings.timeLimit} sec</span>
                  </div>
                  ${
                    data.settings.forbidMoving !== undefined
                      ? `<div class='settings-item'>
                          <img src='img/${
                            data.settings.forbidMoving
                              ? "no-move.png"
                              : "moving-allowed.png"
                          }' />
                          <span>${
                            data.settings.forbidMoving ? "No move" : "Move"
                          }</span>
                        </div>`
                      : ""
                  }
                  ${
                    data.settings.forbidRotating !== undefined
                      ? `<div class='settings-item'>
                          <img src='img/${
                            data.settings.forbidRotating
                              ? "no-pan.png"
                              : "panning-allowed.png"
                          }' />
                          <span>${
                            data.settings.forbidRotating ? "No pan" : "Pan"
                          }</span>
                        </div>`
                      : ""
                  }
                  ${
                    data.settings.forbidZooming !== undefined
                      ? `<div class='settings-item'>
                          <img src='img/${
                            data.settings.forbidZooming
                              ? "no-zoom.png"
                              : "zooming-allowed.png"
                          }' />
                          <span>${
                            data.settings.forbidZooming ? "No Zoom" : "Zoom"
                          }</span>
                        </div>`
                      : ""
                  }
                </div>
              </div>
              <div class='buttons-container'>
                <button class='green-button' id='play-${index}'>
                  <i class='fa-solid fa-play'></i>
                </button>
                <button class='red-button' id='delete-${index}'>
                  <i class='fa-regular fa-trash-can'></i>
                </button>
              </div>
            </div>
            <span class="history-date"
                >Created on ${new Date(data.createdAt).toUTCString()}</span
              >
          </div>`;
          })
          .join("");

        datas.forEach((data, index) => {
          document
            .getElementById(`delete-${index}`)
            .addEventListener("click", () => {
              deleteGeneratedGame(index);
            });
          document
            .getElementById(`play-${index}`)
            .addEventListener("click", () => {
              lunchHistoryGame(data);
            });
        });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données : ", error);
    }
  }

  function addGeneratedGame(generatedGame) {
    chrome.storage.local.get(["generatedGames"], function (result) {
      let allGeneratedGames = result.generatedGames || [];
      allGeneratedGames.unshift(generatedGame);
      chrome.storage.local.set(
        { generatedGames: allGeneratedGames },
        function () {
          updateHistory();
        }
      );
    });
  }

  function deleteGeneratedGame(index) {
    chrome.storage.local.get(["generatedGames"], function (result) {
      let allGeneratedGames = result.generatedGames || [];
      allGeneratedGames.splice(index, 1);
      chrome.storage.local.set(
        { generatedGames: allGeneratedGames },
        function () {
          updateHistory();
        }
      );
    });
    updateHistory();
  }

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
    const getRandomMap = async () => {
      if (checkboxes.map) {
        const result = await generateRandomMap();
        const data = {
          playUrl: `https://www.geoguessr.com/maps${result.playUrl}`,
          imgUrl: `https://www.geoguessr.com/images/resize:auto:220:220/gravity:ce/plain/${result.images.backgroundLarge}`,
          map: result.name,
        };
        return data;
      } else {
        return {
          playUrl: undefined,
          imgUrl: "https://alexisg.fr/img/geoguessrlab-no-image.jpg",
          map: undefined,
        };
      }
    };

    const randomMap = await getRandomMap();

    const currentSettings = await getLocalStorageFromTab();

    const settings = generateRandomSettings(JSON.parse(currentSettings));

    const newGeneratedGame = {
      createdAt: Date.now(),
      imgUrl: randomMap.imgUrl,
      map: randomMap.map,
      playUrl: randomMap.playUrl,
      settings: settings.storage,
    };

    addGeneratedGame(newGeneratedGame);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: setLocalStorage,
        args: ["game-settings", JSON.stringify(settings.localStorage)],
      });
      if (checkboxes.map) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: goToUrl,
          args: [randomMap.playUrl],
        });
      } else {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: realoadPage,
        });
      }
    });
  }

  async function lunchHistoryGame(data) {
    const currentSettings = await getLocalStorageFromTab();

    const settings = {
      ...JSON.parse(currentSettings),
      ...data.settings,
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: setLocalStorage,
        args: ["game-settings", JSON.stringify(settings)],
      });
      if (data.playUrl) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: goToUrl,
          args: [data.playUrl],
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

      return randomMap;
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
    const randomData = (type, id) => {
      if (checkboxes[id]) {
        if (type === "randomBoolean") {
          return Math.random() >= 0.5;
        } else if (type === "randomTime") {
          return Math.floor(Math.random() * (600 / 10 + 1)) * 10;
        } else if (type === "randomRounds") {
          return Math.floor(Math.random() * 5 + 1);
        }
      } else {
        return undefined;
      }
    };

    const storage = {
      forbidMoving: randomData("randomBoolean", "move"),
      forbidRotating: randomData("randomBoolean", "pan"),
      forbidZooming: randomData("randomBoolean", "zoom"),
      timeLimit: randomData("randomTime", "time"),
      rounds: randomData("randomRounds", "rounds"),
    };

    const localStorage = {
      ...currentSettings,
      ...(storage && Object.keys(storage).length > 0
        ? Object.fromEntries(
            Object.entries(storage).filter(([_, value]) => value !== undefined)
          )
        : {}),
    };

    return {
      localStorage,
      storage,
    };
  }
});
