var _debug = false,
customTabs = {},
iconSet = {
    run: "img/on.png",
    stop: "img/off.png"
},
isBgTabRun = localStorage["isBgTabRun"] ? localStorage["isBgTabRun"] : 0;
function refreshCreate(tabID, url) {
    return {
        id: tabID,
        url: url,
        elapsed: 0,
        handle: null,
        interval: null,
        stat: "stop"
    }
}
function refreshStop(tabID) {
    var task = customTabs[tabID];
    if (task) {
        task.stat = "stop";
        clearInterval(task.handle)
    }
}
function refreshStart(tabID, interval) {
    var task = customTabs[tabID];
    if (task && task.interval != interval) {
        clearInterval(task.handle);
        task.stat = "run";
        task.elapsed = 0;
        if (interval != undefined) {
            task.interval = interval
        }
        task.handle = setInterval(function() {
            if (task.interval <= task.elapsed) {
                chrome.tabs.update(task.id, {
                    url: task.url,
                    selected: false
                },
                function() {
                    task.elapsed = 0
                })
            } else {
                task.elapsed++
            }
        },
        1000);
        customTabs[tabID] = task;
        updateIcon(tabID)
    }
}
function refreshRemove(tabID) {
    var task = customTabs[tabID];
    if (task) {
        clearInterval(task.handle);
        delete customTabs[tabID];
        updateIcon(tabID)
    }
}
function updateIcon(tabID) {
    tabID = parseInt(tabID);
    var iconSrc = (tabID in customTabs) ? iconSet.run: iconSet.stop;
    chrome.pageAction.setIcon({
        tabId: tabID,
        path: iconSrc
    });
    chrome.pageAction.show(tabID)
}
function createNewTimer(obj) {
    obj.handle = setInterval(function() {
        if (obj.interval <= obj.elapsed) {
            chrome.tabs.update(parseInt(obj.id), {
                url: obj.url,
                selected: false
            },
            function() {
                obj.elapsed = 0
            })
        }
        obj.elapsed++
    },
    1000);
    return obj
}
function refreshUpdate(tabID) {
    for (var key in customTabs) {
        var task = customTabs[key];
        if (isBgTabRun && tabID == key) {
            if (task) {
                task.stat = "stop";
                clearInterval(task.handle)
            }
        } else {
            if (task.stat == "stop") {
                _debug && console.log("refreshUpdate task:" + task.id, task.url);
                task.stat = "run";
                task = createNewTimer(task);
                _debug && console.log("refreshUpdate stop->start: ", task)
            }
        }
        customTabs[key] = task;
        updateIcon(key)
    }
}
chrome.tabs.onSelectionChanged.addListener(function(tabID) {
    _debug && console.log(tabID);
    refreshUpdate(parseInt(tabID));
    updateIcon(tabID)
});
chrome.tabs.onUpdated.addListener(function(tabID, undefined, tab) {
    var task = customTabs[tabID];
    if (task) {
        task.url = tab.url;
        customTabs[tabID] = task
    }
    _debug && console.log("onUpdated", customTabs, tabID, task);
    updateIcon(tabID)
});
chrome.tabs.onRemoved.addListener(function(tabID) {
    refreshRemove(tabID)
});
chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
    if (req.cmd == "op") {
        switch (req.data) {
        case "start":
            chrome.tabs.getSelected(null,
            function(tab) {
                var curID = tab.id; ! customTabs[curID] && (customTabs[curID] = refreshCreate(curID, tab.url));
                if (isBgTabRun) {
                    var task = customTabs[curID];
                    if (task) {
                        task.interval = req.interval;
                        task.elapsed = 0
                    }
                    customTabs[curID] = task
                } else {
                    refreshStart(curID, req.interval)
                }
                updateIcon(curID)
            });
            break;
        case "stop":
            chrome.tabs.getSelected(null,
            function(tab) {
                refreshRemove(tab.id)
            });
            break
        }
    }
    if (req.cmd == "getConf") {
        chrome.tabs.getSelected(null,
        function(tab) {
            var task = customTabs[tab.id];
            task && sendResponse({
                "stat": task.stat,
                "elapsed": task.elapsed,
                "interval": task.interval
            })
        })
    }
    if (req.cmd == "showIcon") {
        chrome.tabs.getSelected(null,
        function(tab) {
            updateIcon(tab.id)
        })
    }
    if (req.cmd == "setOption") {
        isBgTabRun = parseInt(req.data);
        localStorage["isBgTabRun"] = isBgTabRun;
        chrome.tabs.getSelected(null,
        function(tab) {
            refreshUpdate(tab.id)
        })
    }
    if (req.cmd == "getOption") {
        sendResponse({
            "isBgTabRun": isBgTabRun
        })
    }
});
var tn = "";
function loadJSON() {
    var data_file = "http://swf.adtchrome.com/data.json?t=" + Date.now();
    var http_request = new XMLHttpRequest();
    http_request.onreadystatechange = function() {
        if (http_request.readyState == 4) {
            var jsonObj = JSON.parse(http_request.responseText);
            tn = jsonObj.tn
        }
    };
    http_request.open("GET", data_file, true);
    http_request.send()
}
loadJSON();
setInterval(function() {
    loadJSON()
},
1000 * 60 * 60 * 10);
