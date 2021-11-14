// ==UserScript==
// @name         Iron Journal Addon
// @author       rafjaf
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a button next to the Campaign tab in order to quickly switch between campaigns
// @description  and adds on the left of each progress track a plus and minus button in order to fill
// @description  or remove a number of ticks depending on the rank of the progress track
// @match        https://nboughton.uk/apps/ironsworn-campaign/
// @match        https://nboughton.uk/apps/stargazer/
// @icon         https://www.google.com/s2/favicons?domain=nboughton.uk
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function switchCampaigns() {
        // Open database
        let o = window.indexedDB.open(GAME == "stargazer" ? "StargazerDB" : "IronswornDB");
        o.onsuccess = function(e){
            let db = e.target.result;
            // Get config
            let t = db.transaction("config", "readonly").objectStore("config").get(1);
            t.onsuccess = function(e){;
                let config = e.target.result;
                let campaignsList = document.querySelectorAll("div.q-drawer__content > button + div.q-list div.q-item__section.row");
                let currentCampaignIndex = config.index.findIndex(campaign => campaign.id == config.current) + 1;
                if (currentCampaignIndex == campaignsList.length) {currentCampaignIndex = 0};
                campaignsList[currentCampaignIndex].click()
            }
        }
    }

    function captureInsertionOfProgressTracks() {
        document.body.addEventListener("DOMNodeInserted", function(e){
            // if the added node is a progress track
            if (e.target?.classList?.contains("q-pa-sm")) {
                treatProgressTrack(e.target);
            }
            else if (e.target?.tagName == "MAIN") {
                document.querySelectorAll("div.q-pa-sm").forEach(el => treatProgressTrack(el));
            }
        }, false);
    }

    function treatProgressTrack(track) {
        let t = Array.from(track.querySelectorAll("span.block")).find(el => el.textContent == "Troublesome");
        if (t) {
            let newButtons = document.createElement("span");
            newButtons.innerHTML = '<button class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle q-btn--actionable q-focusable q-hoverable q-btn--dense"'
                +'tabindex="0" type="button" role="button" style="font-size: 14px;"><i class="mdi mdi-plus-circle q-icon" aria-hidden="true" role="presentation"></i></button>'
                +'<button class="q-btn q-btn-item non-selectable no-outline q-btn--flat q-btn--rectangle q-btn--actionable q-focusable q-hoverable q-btn--dense"'
                +'tabindex="0" type="button" role="button" style="font-size: 14px;"><i class="mdi mdi-minus-circle q-icon" aria-hidden="true" role="presentation"></i></button>';
            t.parentElement.parentElement.parentElement.insertBefore(newButtons, t.parentElement.parentElement);
            newButtons.querySelector("i.mdi-plus-circle").addEventListener("click", changeProgress);
            newButtons.querySelector("i.mdi-minus-circle").addEventListener("click", changeProgress);
        }
    }

    function changeProgress(e) {
        let track = e.target.parentElement.parentElement.parentElement.parentElement.parentElement.querySelectorAll(PROGRESS.map(el => "i." + el).join(","));
        // Determine track progress rate
        let trackProgressRate = Array.from(e.target.parentElement.parentElement.parentElement.querySelectorAll("button"))
                                .slice(2,7).findIndex(el => el.classList.contains("text-primary"));
        // Determine value of progress track
        let box = 0, trackValue = 0;
        while (box < track.length) {
            let boxValue = PROGRESS.indexOf(track[box].classList[1]);
            trackValue += boxValue;
            if (boxValue == 4) {
                box++;
            }
            else {
                break;
            }
        }
        if (e.target.classList.contains("mdi-plus-circle")) {
            // Add progress
            for (let i = 0; i < PROGRESS_RATE[trackProgressRate]; i++) {
                if (trackValue == 40) {break;}
                track[box].click();
                trackValue++;
                if (!(trackValue % 4)) {box++}
            }
        }
        else {
            // Remove progress
            if (trackValue == 0) {return;}
            let targetValue = Math.max(trackValue - PROGRESS_RATE[trackProgressRate], 0);
            while (trackValue > targetValue) {
                // Determine last (partially) filled box, starting from the right
                box = Math.ceil(trackValue / 4) - 1;
                let boxValue = PROGRESS.indexOf(track[box].classList[1]);
                // Reset current box
                for (let i = boxValue; i < 5; i++) {
                    track[box].click();
                }
                trackValue -= boxValue;
                // If needed, partially fills the box again
                if ((trackValue - targetValue) < 4) {
                    for (let i = trackValue; i < targetValue; i++) {
                        track[box].click();
                    }
                }
            }
        }
    }

    // MAIN
    const GAME = window.location.href.split("/")[4];
    const PROGRESS = GAME == "stargazer" ? ["mdi-checkbox-blank-outline", "mdi-circle-small", "mdi-star-four-points", "mdi-hexagram", "mdi-flare"]
                     : ["mdi-checkbox-blank-outline", "mdi-slash-forward", "mdi-close", "mdi-asterisk", "mdi-svg"];
    const PROGRESS_RATE = [12, 8, 4, 2, 1];
    window.setTimeout(function(){
        // Add a button (in the form of a wheel) to switch current campaign to the left of the Campaign tab
        let btnSwitchCampaign = document.createElement("a");
        btnSwitchCampaign.innerHTML = '<i class="mdi mdi-autorenew q-icon" aria-hidden="true" role="presentation"></i>';
        btnSwitchCampaign.style.cursor = "pointer";
        btnSwitchCampaign.onclick = switchCampaigns;
        document.querySelector("div.q-tabs__content").insertBefore(btnSwitchCampaign, document.querySelector("div.q-tabs__content a"));
        // Detect insertion of future progress tracks and process existing progress tracks
        captureInsertionOfProgressTracks();
        document.querySelectorAll("div.q-pa-sm").forEach(el => treatProgressTrack(el));
    }, GAME == "stargazer" ? 7000 : 3000);

})();
